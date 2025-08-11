#!/usr/bin/env python3
"""
Servidor MCP Graphiti-Turso - Versão Funcional
Compatível com a API atual do MCP
"""

import sys
import json
import asyncio
from typing import Any, Dict, List, Optional

try:
    from mcp.server import Server
    from mcp.server.stdio import stdio_server
    from mcp.types import Tool, TextContent
except ImportError:
    print("Erro: MCP não instalado. Execute: pip install mcp", file=sys.stderr)
    sys.exit(1)

# Criar servidor
server = Server("graphiti-turso")

# Armazenamento em memória
memory_store = {
    "episodes": [],
    "embeddings": {},
    "searches": []
}

# Registrar ferramentas
@server.list_tools()
async def list_tools() -> List[Tool]:
    """Lista todas as ferramentas disponíveis"""
    return [
        Tool(
            name="add_episode",
            description="Adiciona um episódio ao sistema de memória Graphiti",
            input_schema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nome do episódio"},
                    "content": {"type": "string", "description": "Conteúdo do episódio"},
                    "metadata": {"type": "object", "description": "Metadados opcionais"}
                },
                "required": ["name", "content"]
            }
        ),
        Tool(
            name="search_knowledge",
            description="Busca conhecimento relevante no Graphiti",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Consulta de busca"},
                    "limit": {"type": "integer", "description": "Número máximo de resultados", "default": 5}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="list_episodes",
            description="Lista os episódios mais recentes",
            input_schema={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Número máximo de episódios", "default": 10}
                }
            }
        ),
        Tool(
            name="get_status",
            description="Retorna status do sistema Graphiti-Turso",
            input_schema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="clear_memory",
            description="Limpa toda a memória do sistema",
            input_schema={
                "type": "object",
                "properties": {}
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Executa uma ferramenta"""
    
    if name == "add_episode":
        episode = {
            "id": f"ep_{len(memory_store['episodes'])}",
            "name": arguments.get("name", ""),
            "content": arguments.get("content", ""),
            "metadata": arguments.get("metadata", {}),
            "timestamp": str(asyncio.get_event_loop().time())
        }
        memory_store["episodes"].append(episode)
        
        result = {
            "status": "success",
            "episode_id": episode["id"],
            "message": f"Episódio '{episode['name']}' adicionado com sucesso"
        }
        
    elif name == "search_knowledge":
        query = arguments.get("query", "").lower()
        limit = arguments.get("limit", 5)
        results = []
        
        for episode in memory_store["episodes"]:
            if query in episode["content"].lower() or query in episode["name"].lower():
                results.append({
                    "id": episode["id"],
                    "name": episode["name"],
                    "content": episode["content"][:200] + "..." if len(episode["content"]) > 200 else episode["content"],
                    "score": 0.8
                })
        
        result = results[:limit]
        
    elif name == "list_episodes":
        limit = arguments.get("limit", 10)
        episodes = memory_store["episodes"][-limit:]
        result = [
            {
                "id": ep["id"],
                "name": ep["name"],
                "preview": ep["content"][:100] + "..." if len(ep["content"]) > 100 else ep["content"]
            }
            for ep in episodes
        ]
        
    elif name == "get_status":
        result = {
            "server": "Graphiti-Turso MCP",
            "version": "1.0.0",
            "total_episodes": len(memory_store["episodes"]),
            "total_searches": len(memory_store["searches"]),
            "backend": "Memory (Development Mode)",
            "status": "operational"
        }
        
    elif name == "clear_memory":
        memory_store["episodes"].clear()
        memory_store["embeddings"].clear()
        memory_store["searches"].clear()
        
        result = {
            "status": "success",
            "message": "Memória limpa com sucesso"
        }
    else:
        result = {"error": f"Ferramenta '{name}' não encontrada"}
    
    return [TextContent(type="text", text=json.dumps(result, ensure_ascii=False, indent=2))]

async def main():
    """Função principal"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServidor encerrado", file=sys.stderr)
    except Exception as e:
        print(f"Erro: {e}", file=sys.stderr)
        sys.exit(1)