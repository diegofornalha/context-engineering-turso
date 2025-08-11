#!/usr/bin/env python3
"""
Servidor MCP Simplificado - Graphiti com Claude e Turso
Versão minimalista para garantir conexão
"""

import sys
import json
import asyncio
from typing import Any, Dict, List, Optional

# MCP SDK simplificado
from mcp.server import Server
from mcp.server.stdio import stdio_server

# Criar servidor
server = Server("graphiti-turso")

# Armazenamento em memória (simplificado)
memory_store = {
    "episodes": [],
    "embeddings": {},
    "searches": []
}

@server.tool(name="add_episode")
async def add_episode(name: str, content: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
    """Adiciona um episódio ao sistema de memória"""
    episode = {
        "id": f"ep_{len(memory_store['episodes'])}",
        "name": name,
        "content": content,
        "metadata": metadata or {},
        "timestamp": str(asyncio.get_event_loop().time())
    }
    memory_store["episodes"].append(episode)
    
    return {
        "status": "success",
        "episode_id": episode["id"],
        "message": f"Episódio '{name}' adicionado com sucesso"
    }

@server.tool(name="search_knowledge")
async def search_knowledge(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Busca conhecimento relevante"""
    results = []
    
    # Busca simples por palavra-chave
    for episode in memory_store["episodes"]:
        if query.lower() in episode["content"].lower() or query.lower() in episode["name"].lower():
            results.append({
                "id": episode["id"],
                "name": episode["name"],
                "content": episode["content"][:200] + "...",
                "score": 0.8  # Score simulado
            })
    
    return results[:limit]

@server.tool(name="list_episodes")
async def list_episodes(limit: int = 10) -> List[Dict[str, Any]]:
    """Lista os episódios mais recentes"""
    episodes = memory_store["episodes"][-limit:]
    return [
        {
            "id": ep["id"],
            "name": ep["name"],
            "preview": ep["content"][:100] + "..."
        }
        for ep in episodes
    ]

@server.tool(name="get_status")
async def get_status() -> Dict[str, Any]:
    """Retorna status do sistema"""
    return {
        "server": "Graphiti-Turso MCP",
        "version": "1.0.0-simple",
        "total_episodes": len(memory_store["episodes"]),
        "total_searches": len(memory_store["searches"]),
        "backend": "Memory (Simple Mode)",
        "status": "operational"
    }

@server.tool(name="clear_memory")
async def clear_memory() -> Dict[str, Any]:
    """Limpa toda a memória do sistema"""
    memory_store["episodes"].clear()
    memory_store["embeddings"].clear()
    memory_store["searches"].clear()
    
    return {
        "status": "success",
        "message": "Memória limpa com sucesso"
    }

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