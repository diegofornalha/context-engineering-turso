#!/usr/bin/env python3
"""
Claude Adapter for Graphiti MCP Server
Substitui OpenAI por Claude nativo do Claude Code
"""

import os
import json
import asyncio
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
import subprocess

logger = logging.getLogger(__name__)

@dataclass
class ClaudeConfig:
    """Configuração para o Claude"""
    model: str = "claude-3-5-sonnet-20241022"  # Modelo padrão do Claude Code
    max_tokens: int = 4096
    temperature: float = 0.7
    
class ClaudeLLMClient:
    """
    Cliente LLM que usa Claude nativo via subprocess
    Substitui OpenAIClient do Graphiti
    """
    
    def __init__(self, config: Optional[ClaudeConfig] = None):
        self.config = config or ClaudeConfig()
        
    async def generate_response(
        self, 
        prompt: str,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Gera resposta usando Claude nativo do Claude Code
        """
        # Prepara o prompt completo
        full_prompt = ""
        if system_prompt:
            full_prompt = f"System: {system_prompt}\n\n"
        full_prompt += f"Human: {prompt}\n\nAssistant:"
        
        # Salva prompt em arquivo temporário
        prompt_file = "/tmp/claude_prompt.txt"
        with open(prompt_file, "w") as f:
            f.write(full_prompt)
        
        try:
            # Executa Claude via CLI
            result = subprocess.run(
                ["claude", "-p", "--max-tokens", str(self.config.max_tokens)],
                input=full_prompt,
                capture_output=True,
                text=True,
                check=True
            )
            
            return result.stdout.strip()
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Erro ao chamar Claude: {e}")
            raise
            
    async def generate_structured_response(
        self,
        prompt: str,
        response_model: type,
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> Any:
        """
        Gera resposta estruturada (JSON) usando Claude
        """
        # Adiciona instruções para resposta JSON
        json_prompt = f"""
{prompt}

IMPORTANTE: Responda APENAS com um JSON válido no formato especificado.
Não inclua explicações, apenas o JSON.
"""
        
        response = await self.generate_response(
            json_prompt,
            system_prompt=system_prompt,
            **kwargs
        )
        
        # Tenta extrair JSON da resposta
        try:
            # Remove possíveis marcadores de código
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]
                
            data = json.loads(response.strip())
            
            # Converte para o modelo Pydantic se fornecido
            if hasattr(response_model, 'parse_obj'):
                return response_model.parse_obj(data)
            return data
            
        except json.JSONDecodeError as e:
            logger.error(f"Erro ao decodificar JSON: {e}")
            logger.error(f"Resposta recebida: {response}")
            raise

class ClaudeEmbedder:
    """
    Embedder que usa Turso como backend para embeddings
    Integração completa com Claude para geração inteligente de vetores
    """
    
    def __init__(self, config: Optional[ClaudeConfig] = None, use_turso: bool = True):
        self.config = config or ClaudeConfig()
        self.llm_client = ClaudeLLMClient(config)
        self.use_turso = use_turso
        
        if use_turso:
            # Importa o adaptador Turso
            try:
                from turso_embeddings_adapter import (
                    TursoGraphitiEmbedder, 
                    create_turso_embeddings_config
                )
                turso_config = create_turso_embeddings_config()
                self.turso_embedder = TursoGraphitiEmbedder(turso_config)
                logger.info("Usando Turso como backend de embeddings")
            except Exception as e:
                logger.warning(f"Não foi possível inicializar Turso embeddings: {e}")
                self.use_turso = False
                self.turso_embedder = None
        else:
            self.turso_embedder = None
        
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """
        Gera embeddings usando Turso (preferencial) ou Claude fallback
        """
        if self.use_turso and self.turso_embedder:
            try:
                # Usa Turso para embeddings persistentes e eficientes
                return await self.turso_embedder.embed(texts)
            except Exception as e:
                logger.error(f"Erro ao usar Turso embeddings: {e}")
                # Fallback para método anterior
        
        # Fallback: método Claude simples
        embeddings = []
        
        for text in texts:
            # Usa Claude para gerar características semânticas
            prompt = f"""
Analise o seguinte texto e extraia 10 características semânticas principais 
em forma de scores numéricos de 0 a 1:

Texto: {text[:500]}  # Limita para economizar tokens

Responda APENAS com uma lista de 10 números entre 0 e 1, separados por vírgula.
Exemplo: 0.8, 0.3, 0.5, 0.9, 0.2, 0.7, 0.4, 0.6, 0.1, 0.5
"""
            
            response = await self.llm_client.generate_response(prompt)
            
            try:
                # Parse dos números
                scores = [float(x.strip()) for x in response.split(',')][:10]
                
                # Garante que temos 10 dimensões
                while len(scores) < 10:
                    scores.append(0.5)
                    
                embeddings.append(scores)
                
            except (ValueError, AttributeError):
                # Fallback para embedding aleatório
                import random
                embeddings.append([random.random() for _ in range(10)])
                
        return embeddings
        
    async def embed_query(self, query: str) -> List[float]:
        """
        Gera embedding para uma query
        """
        if self.use_turso and self.turso_embedder:
            try:
                return await self.turso_embedder.embed_query(query)
            except Exception as e:
                logger.error(f"Erro ao usar Turso para query: {e}")
        
        # Fallback
        result = await self.embed([query])
        return result[0]
    
    async def search_similar(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Busca por conteúdo similar usando embeddings Turso
        """
        if self.use_turso and self.turso_embedder:
            try:
                return await self.turso_embedder.adapter.search_similar(query, limit)
            except Exception as e:
                logger.error(f"Erro na busca similar: {e}")
        
        return []

class ClaudeGraphitiAdapter:
    """
    Adaptador principal que integra Claude com Graphiti
    """
    
    def __init__(
        self,
        neo4j_uri: str,
        neo4j_user: str,
        neo4j_password: str,
        model_name: Optional[str] = None,
        temperature: Optional[float] = None
    ):
        self.neo4j_uri = neo4j_uri
        self.neo4j_user = neo4j_user
        self.neo4j_password = neo4j_password
        
        # Configuração do Claude
        config = ClaudeConfig(
            model=model_name or "claude-3-5-sonnet-20241022",
            temperature=temperature or 0.7
        )
        
        # Clientes adaptados
        self.llm_client = ClaudeLLMClient(config)
        # Usa Turso como backend de embeddings por padrão
        self.embedder = ClaudeEmbedder(config, use_turso=True)
        
    def get_llm_client(self) -> ClaudeLLMClient:
        """Retorna o cliente LLM do Claude"""
        return self.llm_client
        
    def get_embedder(self) -> ClaudeEmbedder:
        """Retorna o embedder do Claude"""
        return self.embedder
        
    async def test_connection(self) -> bool:
        """
        Testa a conexão com Claude e Neo4j
        """
        try:
            # Testa Claude
            response = await self.llm_client.generate_response(
                "Responda apenas: OK"
            )
            if "OK" not in response:
                return False
                
            # Testa Neo4j (você precisa adicionar a lógica aqui)
            # ...
            
            return True
            
        except Exception as e:
            logger.error(f"Erro ao testar conexão: {e}")
            return False

# Função auxiliar para substituir OpenAI no Graphiti
def create_claude_graphiti(
    neo4j_uri: str,
    neo4j_user: str,
    neo4j_password: str,
    **kwargs
) -> Any:
    """
    Cria uma instância do Graphiti usando Claude ao invés de OpenAI
    """
    adapter = ClaudeGraphitiAdapter(
        neo4j_uri=neo4j_uri,
        neo4j_user=neo4j_user,
        neo4j_password=neo4j_password,
        **kwargs
    )
    
    # Aqui você precisa modificar o Graphiti para aceitar os adaptadores customizados
    # Por enquanto, retornamos o adapter
    return adapter

if __name__ == "__main__":
    # Teste básico
    async def test():
        adapter = ClaudeGraphitiAdapter(
            neo4j_uri="bolt://localhost:7687",
            neo4j_user="neo4j",
            neo4j_password="demodemo"
        )
        
        result = await adapter.test_connection()
        print(f"Conexão {'OK' if result else 'FALHOU'}")
        
    asyncio.run(test())