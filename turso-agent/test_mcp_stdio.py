#!/usr/bin/env python3
"""
Teste de comunicação com MCP via stdio
"""

import asyncio
import sys
from pathlib import Path

# Adicionar diretório ao path
sys.path.append(str(Path(__file__).parent))

from tools.mcp_stdio_adapter import MCPStdioAdapter

async def test_mcp_communication():
    """Testa comunicação com servidor MCP"""
    
    print("🧪 TESTE DE COMUNICAÇÃO MCP VIA STDIO")
    print("="*50)
    
    # Criar adaptador
    adapter = MCPStdioAdapter()
    
    try:
        # Iniciar servidor
        print("\n1️⃣ Iniciando servidor MCP...")
        await adapter.start()
        print("✅ Servidor iniciado")
        
        # Testar list_databases
        print("\n2️⃣ Testando list_databases...")
        databases = await adapter.list_databases()
        print(f"✅ Databases encontrados: {len(databases) if isinstance(databases, list) else 'N/A'}")
        if databases:
            for db in databases[:3]:  # Mostrar apenas os 3 primeiros
                print(f"   - {db}")
        
        # Testar list_tables
        print("\n3️⃣ Testando list_tables...")
        tables = await adapter.list_tables()
        print(f"✅ Tabelas encontradas: {len(tables) if isinstance(tables, list) else 'N/A'}")
        if tables:
            for table in tables[:5]:  # Mostrar apenas as 5 primeiras
                print(f"   - {table}")
        
        # Testar query simples
        print("\n4️⃣ Testando execute_read_only_query...")
        result = await adapter.execute_read_only_query("SELECT 1 as test")
        print(f"✅ Query executada: {result}")
        
        # Testar get_conversations
        print("\n5️⃣ Testando get_conversations...")
        conversations = await adapter.get_conversations("test-session", limit=5)
        print(f"✅ Conversas encontradas: {len(conversations) if isinstance(conversations, list) else 0}")
        
        print("\n✅ TODOS OS TESTES PASSARAM!")
        
    except Exception as e:
        print(f"\n❌ Erro durante teste: {str(e)}")
        import traceback
        traceback.print_exc()
        
    finally:
        # Parar servidor
        print("\n🛑 Parando servidor MCP...")
        await adapter.stop()
        print("✅ Servidor parado")

if __name__ == "__main__":
    asyncio.run(test_mcp_communication())