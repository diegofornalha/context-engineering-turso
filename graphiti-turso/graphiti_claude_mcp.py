#!/usr/bin/env python3
"""
Graphiti MCP Server com Claude Nativo
Versão adaptada para usar Claude do Claude Code ao invés de OpenAI
"""

import argparse
import asyncio
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Optional, Dict, List
import json
import subprocess

from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, Field

# Importa o adaptador Claude
from claude_adapter import (
    ClaudeGraphitiAdapter,
    ClaudeLLMClient,
    ClaudeEmbedder,
    ClaudeConfig
)

load_dotenv()

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurações padrão
DEFAULT_NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
DEFAULT_NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
DEFAULT_NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'demodemo')

# Servidor MCP
mcp = FastMCP(
    name="graphiti-claude",
    description="Graphiti Knowledge Graph with Claude Native Integration"
)

# Adapter global
graphiti_adapter: Optional[ClaudeGraphitiAdapter] = None

class Episode(BaseModel):
    """Modelo para episódios"""
    name: str = Field(..., description="Nome do episódio")
    content: str = Field(..., description="Conteúdo do episódio")
    source: str = Field(default="text", description="Fonte do episódio (text, json, message)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Metadados do episódio")

class SearchResult(BaseModel):
    """Modelo para resultados de busca"""
    id: str
    content: str
    score: float
    metadata: Dict[str, Any]

# Ferramenta: Adicionar Episódio
@mcp.tool(
    name="add_episode",
    description="Adiciona um episódio ao grafo de conhecimento usando Claude"
)
async def add_episode(
    name: str = Field(..., description="Nome do episódio"),
    episode_body: str = Field(..., description="Conteúdo do episódio"),
    source: str = Field(default="text", description="Tipo de fonte: text, json, ou message"),
    source_description: Optional[str] = Field(None, description="Descrição da fonte"),
    group_id: Optional[str] = Field(None, description="ID do grupo para organização")
) -> Dict[str, Any]:
    """
    Adiciona um novo episódio ao grafo de conhecimento
    """
    global graphiti_adapter
    
    if not graphiti_adapter:
        return {"error": "Adaptador não inicializado"}
    
    try:
        # Usa Claude para processar o episódio
        llm_client = graphiti_adapter.get_llm_client()
        
        # Extrai entidades e relações usando Claude
        extraction_prompt = f"""
Analise o seguinte episódio e extraia:
1. Entidades principais (pessoas, lugares, organizações, conceitos)
2. Relações entre as entidades
3. Contexto temporal (se houver)
4. Sentimento geral

Episódio: {episode_body[:1000]}  # Limita para economizar tokens

Responda em formato JSON com a estrutura:
{{
    "entities": ["lista de entidades"],
    "relations": [["entidade1", "relação", "entidade2"]],
    "temporal_context": "contexto temporal se houver",
    "sentiment": "positivo/neutro/negativo"
}}
"""
        
        response = await llm_client.generate_response(extraction_prompt)
        
        # Parse da resposta
        try:
            # Remove marcadores de código se houver
            response = response.strip()
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
                
            extracted_data = json.loads(response.strip())
        except json.JSONDecodeError:
            extracted_data = {
                "entities": [],
                "relations": [],
                "temporal_context": None,
                "sentiment": "neutro"
            }
        
        # Aqui você integraria com o Neo4j para salvar os dados
        # Por enquanto, retornamos uma confirmação
        
        result = {
            "status": "success",
            "episode_id": f"ep_{datetime.now().timestamp()}",
            "name": name,
            "source": source,
            "group_id": group_id or "default",
            "extracted": extracted_data,
            "message": "Episódio processado com Claude e pronto para ser adicionado ao Neo4j"
        }
        
        logger.info(f"Episódio adicionado: {result['episode_id']}")
        return result
        
    except Exception as e:
        logger.error(f"Erro ao adicionar episódio: {e}")
        return {"error": str(e)}

# Ferramenta: Buscar Conhecimento
@mcp.tool(
    name="search_knowledge",
    description="Busca conhecimento no grafo usando Claude para entender a query"
)
async def search_knowledge(
    query: str = Field(..., description="Query de busca"),
    limit: int = Field(default=10, description="Número máximo de resultados"),
    group_id: Optional[str] = Field(None, description="Filtrar por grupo")
) -> List[Dict[str, Any]]:
    """
    Busca conhecimento relevante no grafo
    """
    global graphiti_adapter
    
    if not graphiti_adapter:
        return [{"error": "Adaptador não inicializado"}]
    
    try:
        llm_client = graphiti_adapter.get_llm_client()
        
        # Usa Claude para entender e expandir a query
        expansion_prompt = f"""
Analise a seguinte query de busca e:
1. Identifique as palavras-chave principais
2. Sugira sinônimos ou termos relacionados
3. Determine a intenção da busca

Query: {query}

Responda em formato JSON:
{{
    "keywords": ["lista de palavras-chave"],
    "synonyms": ["lista de sinônimos"],
    "intent": "descrição da intenção"
}}
"""
        
        response = await llm_client.generate_response(expansion_prompt)
        
        # Parse da resposta
        try:
            response = response.strip()
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                response = response.split("```")[1].split("```")[0]
                
            search_data = json.loads(response.strip())
        except json.JSONDecodeError:
            search_data = {
                "keywords": [query],
                "synonyms": [],
                "intent": "busca geral"
            }
        
        # Aqui você faria a busca real no Neo4j
        # Por enquanto, retornamos resultados simulados
        
        results = [
            {
                "id": f"result_{i}",
                "content": f"Resultado relacionado a: {query}",
                "score": 0.9 - (i * 0.1),
                "keywords_matched": search_data["keywords"],
                "metadata": {
                    "group_id": group_id or "default",
                    "intent": search_data["intent"]
                }
            }
            for i in range(min(3, limit))
        ]
        
        logger.info(f"Busca realizada: {query}, {len(results)} resultados")
        return results
        
    except Exception as e:
        logger.error(f"Erro na busca: {e}")
        return [{"error": str(e)}]

# Ferramenta: Analisar Grafo
@mcp.tool(
    name="analyze_graph",
    description="Analisa o grafo de conhecimento usando Claude"
)
async def analyze_graph(
    analysis_type: str = Field(
        default="summary",
        description="Tipo de análise: summary, patterns, connections"
    ),
    group_id: Optional[str] = Field(None, description="Analisar grupo específico")
) -> Dict[str, Any]:
    """
    Realiza análise do grafo usando Claude
    """
    global graphiti_adapter
    
    if not graphiti_adapter:
        return {"error": "Adaptador não inicializado"}
    
    try:
        llm_client = graphiti_adapter.get_llm_client()
        
        # Aqui você pegaria dados reais do Neo4j
        # Por enquanto, vamos simular
        
        if analysis_type == "summary":
            prompt = """
Gere um resumo do estado atual do grafo de conhecimento.
Inclua: número de nós, arestas, principais tópicos, e insights gerais.
"""
        elif analysis_type == "patterns":
            prompt = """
Identifique padrões no grafo de conhecimento.
Procure por: clusters de informação, relações frequentes, e anomalias.
"""
        else:  # connections
            prompt = """
Analise as conexões no grafo de conhecimento.
Identifique: nós centrais, pontes entre clusters, e caminhos importantes.
"""
        
        response = await llm_client.generate_response(prompt)
        
        result = {
            "analysis_type": analysis_type,
            "group_id": group_id or "all",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "analysis": response,
            "powered_by": "Claude Native"
        }
        
        logger.info(f"Análise realizada: {analysis_type}")
        return result
        
    except Exception as e:
        logger.error(f"Erro na análise: {e}")
        return {"error": str(e)}

# Ferramenta: Status
@mcp.tool(
    name="get_status",
    description="Verifica o status do servidor Graphiti com Claude"
)
async def get_status() -> Dict[str, Any]:
    """
    Retorna o status do servidor e conexões
    """
    global graphiti_adapter
    
    status = {
        "server": "Graphiti Claude MCP",
        "version": "1.0.0",
        "claude_integration": "Native Claude Code",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if graphiti_adapter:
        # Testa conexão com Claude
        try:
            llm_client = graphiti_adapter.get_llm_client()
            response = await llm_client.generate_response("Responda: OK")
            status["claude_status"] = "connected" if "OK" in response else "error"
        except Exception as e:
            status["claude_status"] = f"error: {e}"
            
        status["neo4j_uri"] = graphiti_adapter.neo4j_uri
        status["adapter_status"] = "initialized"
    else:
        status["adapter_status"] = "not initialized"
        status["claude_status"] = "not connected"
        
    return status

# Inicialização
async def initialize_adapter():
    """
    Inicializa o adaptador Graphiti com Claude
    """
    global graphiti_adapter
    
    try:
        graphiti_adapter = ClaudeGraphitiAdapter(
            neo4j_uri=DEFAULT_NEO4J_URI,
            neo4j_user=DEFAULT_NEO4J_USER,
            neo4j_password=DEFAULT_NEO4J_PASSWORD
        )
        
        logger.info("Adaptador Graphiti-Claude inicializado com sucesso")
        
        # Testa a conexão
        if await graphiti_adapter.test_connection():
            logger.info("Conexão com Claude verificada")
        else:
            logger.warning("Não foi possível verificar a conexão com Claude")
            
    except Exception as e:
        logger.error(f"Erro ao inicializar adaptador: {e}")
        graphiti_adapter = None

async def main():
    """
    Função principal
    """
    parser = argparse.ArgumentParser(
        description='Graphiti MCP Server com Claude Nativo'
    )
    
    parser.add_argument(
        '--transport',
        choices=['stdio', 'sse'],
        default='stdio',
        help='Tipo de transporte MCP'
    )
    
    parser.add_argument(
        '--port',
        type=int,
        default=8000,
        help='Porta para SSE (padrão: 8000)'
    )
    
    args = parser.parse_args()
    
    # Inicializa o adaptador
    await initialize_adapter()
    
    # Inicia o servidor MCP
    if args.transport == 'stdio':
        logger.info("Iniciando servidor MCP com transporte stdio")
        await mcp.run(transport='stdio')
    else:
        logger.info(f"Iniciando servidor MCP com SSE na porta {args.port}")
        await mcp.run(
            transport='sse',
            sse_config={'host': '0.0.0.0', 'port': args.port}
        )

if __name__ == "__main__":
    asyncio.run(main())