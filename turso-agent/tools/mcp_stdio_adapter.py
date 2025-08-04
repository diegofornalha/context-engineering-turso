"""
MCP Stdio Adapter - Permite comunicação direta com servidor MCP via stdio
"""

import asyncio
import subprocess
import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List
import uuid

class MCPStdioAdapter:
    """
    Adaptador para comunicação com servidor MCP via stdio (entrada/saída padrão)
    Simula as ferramentas MCP que normalmente estariam disponíveis no Claude Code/Cursor
    """
    
    def __init__(self, mcp_server_path: str = None):
        """
        Inicializa o adaptador
        Args:
            mcp_server_path: Caminho para o servidor MCP (index-unified.js)
        """
        self.mcp_server_path = mcp_server_path or self._find_mcp_server()
        self.process = None
        self.request_id = 0
        
    def _find_mcp_server(self) -> str:
        """Encontra o servidor MCP no projeto"""
        base_path = Path(__file__).parent.parent.parent
        mcp_path = base_path / "mcp-turso" / "dist" / "index-unified.js"
        
        if mcp_path.exists():
            return str(mcp_path)
        else:
            raise FileNotFoundError(f"Servidor MCP não encontrado em {mcp_path}")
    
    async def start(self):
        """Inicia o processo do servidor MCP"""
        try:
            # Comando para iniciar o servidor MCP
            cmd = ["node", self.mcp_server_path]
            
            # Iniciar processo com pipes para stdin/stdout
            self.process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            # Aguardar inicialização
            await asyncio.sleep(1)
            
            # Ler mensagem de inicialização
            init_line = await self.process.stdout.readline()
            if init_line:
                print(f"🚀 MCP Server iniciado: {init_line.decode().strip()}")
                
            return True
            
        except Exception as e:
            print(f"❌ Erro ao iniciar servidor MCP: {str(e)}")
            return False
    
    async def stop(self):
        """Para o processo do servidor MCP"""
        if self.process:
            self.process.terminate()
            await self.process.wait()
            self.process = None
    
    async def send_request(self, method: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Envia requisição JSON-RPC para o servidor MCP
        """
        if not self.process:
            raise RuntimeError("Servidor MCP não está rodando")
        
        # Criar requisição JSON-RPC
        self.request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self.request_id,
            "method": method,
            "params": params or {}
        }
        
        # Enviar requisição
        request_json = json.dumps(request) + "\n"
        self.process.stdin.write(request_json.encode())
        await self.process.stdin.drain()
        
        # Ler resposta
        response_line = await self.process.stdout.readline()
        if response_line:
            response = json.loads(response_line.decode())
            
            if "error" in response:
                raise Exception(f"MCP Error: {response['error']}")
            
            return response.get("result", {})
        else:
            raise Exception("Nenhuma resposta do servidor MCP")
    
    # Implementar as ferramentas MCP como métodos
    
    async def list_databases(self) -> List[Dict[str, Any]]:
        """Lista todos os bancos de dados disponíveis"""
        return await self.send_request("mcp__turso-unified__list_databases")
    
    async def execute_read_only_query(self, query: str, database: str = None) -> Dict[str, Any]:
        """Executa query somente leitura (SELECT, PRAGMA, etc)"""
        params = {"query": query}
        if database:
            params["database"] = database
        return await self.send_request("mcp__turso-unified__execute_read_only_query", params)
    
    async def execute_query(self, query: str, database: str = None) -> Dict[str, Any]:
        """Executa qualquer query SQL (incluindo operações destrutivas)"""
        params = {"query": query}
        if database:
            params["database"] = database
        return await self.send_request("mcp__turso-unified__execute_query", params)
    
    async def get_database_info(self, database: str) -> Dict[str, Any]:
        """Obtém informações sobre um banco de dados específico"""
        return await self.send_request("mcp__turso-unified__get_database_info", {"database": database})
    
    async def list_tables(self, database: str = None) -> List[str]:
        """Lista todas as tabelas no banco de dados"""
        params = {}
        if database:
            params["database"] = database
        return await self.send_request("mcp__turso-unified__list_tables", params)
    
    async def describe_table(self, table_name: str, database: str = None) -> Dict[str, Any]:
        """Descreve a estrutura de uma tabela"""
        params = {"table_name": table_name}
        if database:
            params["database"] = database
        return await self.send_request("mcp__turso-unified__describe_table", params)
    
    async def setup_memory_tables(self, database: str = None) -> Dict[str, Any]:
        """Configura as tabelas de memória (conversations e knowledge_base)"""
        params = {}
        if database:
            params["database"] = database
        return await self.send_request("mcp__turso-unified__setup_memory_tables", params)
    
    async def add_conversation(self, session_id: str, role: str, content: str, 
                              metadata: Dict = None) -> Dict[str, Any]:
        """Adiciona uma mensagem à memória de conversas"""
        params = {
            "session_id": session_id,
            "role": role,
            "content": content
        }
        if metadata:
            params["metadata"] = metadata
        return await self.send_request("mcp__turso-unified__add_conversation", params)
    
    async def get_conversations(self, session_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Busca conversas por sessão"""
        params = {
            "session_id": session_id,
            "limit": limit
        }
        return await self.send_request("mcp__turso-unified__get_conversations", params)
    
    async def add_knowledge(self, category: str, topic: str, content: str, 
                           tags: List[str] = None, metadata: Dict = None) -> Dict[str, Any]:
        """Adiciona conhecimento à base"""
        params = {
            "category": category,
            "topic": topic,
            "content": content
        }
        if tags:
            params["tags"] = tags
        if metadata:
            params["metadata"] = metadata
        return await self.send_request("mcp__turso-unified__add_knowledge", params)
    
    async def search_knowledge(self, query: str, category: str = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Busca na base de conhecimento"""
        params = {
            "query": query,
            "limit": limit
        }
        if category:
            params["category"] = category
        return await self.send_request("mcp__turso-unified__search_knowledge", params)


# Criar instância global para uso no agente
mcp_adapter = None

async def get_mcp_adapter() -> MCPStdioAdapter:
    """Obtém instância do adaptador MCP"""
    global mcp_adapter
    
    if not mcp_adapter:
        mcp_adapter = MCPStdioAdapter()
        await mcp_adapter.start()
    
    return mcp_adapter