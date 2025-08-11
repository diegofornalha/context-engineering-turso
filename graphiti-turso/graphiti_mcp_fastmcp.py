#!/usr/bin/env python3
"""
Servidor MCP Graphiti-Turso usando FastMCP
Versão simplificada e funcional
"""

import sys
import json
from typing import Any, Dict, List, Optional
from mcp.server import FastMCP

# Criar servidor
mcp = FastMCP("graphiti-turso")

# Armazenamento em memória
memory_store = {
    "episodes": [],
    "embeddings": {},
    "searches": []
}

@mcp.tool()
async def add_episode(name: str, content: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
    """Adiciona um episódio ao sistema de memória Graphiti"""
    episode = {
        "id": f"ep_{len(memory_store['episodes'])}",
        "name": name,
        "content": content,
        "metadata": metadata or {},
        "timestamp": str(len(memory_store['episodes']))
    }
    memory_store["episodes"].append(episode)
    
    return {
        "status": "success",
        "episode_id": episode["id"],
        "message": f"Episódio '{name}' adicionado com sucesso"
    }

@mcp.tool()
async def search_knowledge(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Busca conhecimento relevante no Graphiti"""
    results = []
    query_lower = query.lower()
    
    for episode in memory_store["episodes"]:
        if query_lower in episode["content"].lower() or query_lower in episode["name"].lower():
            results.append({
                "id": episode["id"],
                "name": episode["name"],
                "content": episode["content"][:200] + "..." if len(episode["content"]) > 200 else episode["content"],
                "score": 0.8
            })
    
    return results[:limit]

@mcp.tool()
async def list_episodes(limit: int = 10) -> List[Dict[str, Any]]:
    """Lista os episódios mais recentes"""
    episodes = memory_store["episodes"][-limit:]
    return [
        {
            "id": ep["id"],
            "name": ep["name"],
            "preview": ep["content"][:100] + "..." if len(ep["content"]) > 100 else ep["content"]
        }
        for ep in episodes
    ]

@mcp.tool()
async def get_status() -> Dict[str, Any]:
    """Retorna status do sistema Graphiti-Turso"""
    return {
        "server": "Graphiti-Turso MCP",
        "version": "1.0.0-fastmcp",
        "total_episodes": len(memory_store["episodes"]),
        "total_searches": len(memory_store["searches"]),
        "backend": "Memory (Development Mode)",
        "status": "operational"
    }

@mcp.tool()
async def clear_memory() -> Dict[str, Any]:
    """Limpa toda a memória do sistema"""
    memory_store["episodes"].clear()
    memory_store["embeddings"].clear()
    memory_store["searches"].clear()
    
    return {
        "status": "success",
        "message": "Memória limpa com sucesso"
    }

if __name__ == "__main__":
    try:
        # Executar servidor em modo stdio (padrão para Claude)
        mcp.run()
    except KeyboardInterrupt:
        print("\nServidor encerrado", file=sys.stderr)
    except Exception as e:
        print(f"Erro: {e}", file=sys.stderr)
        sys.exit(1)