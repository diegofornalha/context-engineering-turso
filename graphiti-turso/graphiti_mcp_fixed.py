#!/usr/bin/env python3
"""
Servidor MCP Graphiti-Turso - Versão Corrigida para MCP Atual
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
            name="graphiti_add_episode",
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
            name="graphiti_search",
            description="Busca conhecimento relevante no Graphiti",
            input_schema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Query de busca"},
                    "limit": {"type": "integer", "description": "Limite de resultados", "default": 5}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="graphiti_list_episodes",
            description="Lista os episódios mais recentes do Graphiti",
            input_schema={
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Limite de episódios", "default": 10}
                }
            }
        ),
        Tool(
            name="graphiti_status",
            description="Retorna status do sistema Graphiti-Turso",
            input_schema={
                "type": "object",
                "properties": {}
            }
        ),
        Tool(
            name="graphiti_clear",
            description="Limpa toda a memória do sistema Graphiti",
            input_schema={
                "type": "object",
                "properties": {}
            }
        )
    ]

# Implementar chamadas de ferramentas
@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Executa uma ferramenta"""
    
    if name == "graphiti_add_episode":
        episode = {
            "id": f"ep_{len(memory_store['episodes'])}",
            "name": arguments.get("name"),
            "content": arguments.get("content"),
            "metadata": arguments.get("metadata", {}),
            "timestamp": str(asyncio.get_event_loop().time())
        }
        memory_store["episodes"].append(episode)
        
        result = {
            "status": "success",
            "episode_id": episode["id"],
            "message": f"Episódio '{episode['name']}' adicionado com sucesso ao Graphiti"
        }
        
    elif name == "graphiti_search":
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
        
        result = {
            "query": query,
            "total_results": len(results),
            "results": results[:limit]
        }
        
    elif name == "graphiti_list_episodes":
        limit = arguments.get("limit", 10)
        episodes = memory_store["episodes"][-limit:]
        result = {
            "total_episodes": len(memory_store["episodes"]),
            "showing": len(episodes),
            "episodes": [
                {
                    "id": ep["id"],
                    "name": ep["name"],
                    "preview": ep["content"][:100] + "..." if len(ep["content"]) > 100 else ep["content"]
                }
                for ep in episodes
            ]
        }
        
    elif name == "graphiti_status":
        result = {
            "server": "Graphiti-Turso MCP",
            "version": "2.0.0",
            "total_episodes": len(memory_store["episodes"]),
            "total_searches": len(memory_store["searches"]),
            "backend": "Memory (Turso-ready)",
            "status": "operational",
            "features": [
                "Episode Management",
                "Knowledge Search",
                "Memory Storage",
                "Turso Integration Ready"
            ]
        }
        
    elif name == "graphiti_clear":
        count = len(memory_store["episodes"])
        memory_store["episodes"].clear()
        memory_store["embeddings"].clear()
        memory_store["searches"].clear()
        result = {
            "status": "success",
            "message": f"Memória limpa com sucesso. {count} episódios removidos."
        }
        
    else:
        result = {"error": f"Ferramenta desconhecida: {name}"}
    
    return [TextContent(type="text", text=json.dumps(result, indent=2, ensure_ascii=False))]

async def main():
    """Função principal"""
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Erro: {e}", file=sys.stderr)
        sys.exit(1)