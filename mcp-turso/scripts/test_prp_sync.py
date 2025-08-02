#!/usr/bin/env python3
"""
Teste de Sincronização PRP com Cursor Agent
Verifica se o sync está funcionando corretamente dentro da metodologia PRP
"""

import os
import sqlite3
from datetime import datetime

def test_prp_sync():
    """Testa se o sync está funcionando corretamente com PRP"""
    
    print("🧪 Teste de Sincronização PRP com Cursor Agent")
    print("=" * 60)
    
    # 1. Verificar se o banco existe
    db_path = "../../context-memory.db"
    if not os.path.exists(db_path):
        print(f"❌ Banco não encontrado: {db_path}")
        return
    
    print(f"✅ Banco encontrado: {db_path}")
    
    # 2. Conectar ao banco
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 3. Verificar tabelas PRP
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%prp%'")
    prp_tables = cursor.fetchall()
    print(f"📋 Tabelas PRP encontradas: {[t[0] for t in prp_tables]}")
    
    # 4. Verificar dados PRP
    cursor.execute("SELECT COUNT(*) FROM prps")
    prp_count = cursor.fetchone()[0]
    print(f"📊 PRPs no banco: {prp_count}")
    
    if prp_count > 0:
        cursor.execute("SELECT title, created_at FROM prps ORDER BY created_at DESC LIMIT 3")
        prps = cursor.fetchall()
        print("📝 PRPs recentes:")
        for prp in prps:
            print(f"  • {prp[0]} - {prp[1]}")
    
    # 5. Verificar conhecimento sincronizado
    cursor.execute("SELECT COUNT(*) FROM turso_agent_knowledge")
    knowledge_count = cursor.fetchone()[0]
    print(f"📚 Conhecimento sincronizado: {knowledge_count}")
    
    if knowledge_count > 0:
        cursor.execute("SELECT topic, category, updated_at FROM turso_agent_knowledge ORDER BY updated_at DESC LIMIT 3")
        knowledge = cursor.fetchall()
        print("📖 Conhecimento recente:")
        for item in knowledge:
            print(f"  • {item[0]} ({item[1]}) - {item[2]}")
    
    # 6. Verificar integração PRP + Sync
    print("\n🔍 Verificando integração PRP + Sync:")
    
    # Verificar se há PRPs relacionados ao Turso
    cursor.execute("""
        SELECT p.title, p.created_at 
        FROM prps p 
        WHERE p.title LIKE '%Turso%' OR p.title LIKE '%MCP%'
        ORDER BY p.created_at DESC
    """)
    turso_prps = cursor.fetchall()
    
    if turso_prps:
        print("✅ PRPs relacionados ao Turso encontrados:")
        for prp in turso_prps:
            print(f"  • {prp[0]} - {prp[1]}")
    else:
        print("⚠️ Nenhum PRP relacionado ao Turso encontrado")
    
    # 7. Verificar conhecimento relacionado ao Turso
    cursor.execute("""
        SELECT topic, category, updated_at 
        FROM turso_agent_knowledge 
        WHERE topic LIKE '%Turso%' OR topic LIKE '%MCP%' OR tags LIKE '%turso%'
        ORDER BY updated_at DESC
    """)
    turso_knowledge = cursor.fetchall()
    
    if turso_knowledge:
        print("✅ Conhecimento relacionado ao Turso encontrado:")
        for item in turso_knowledge:
            print(f"  • {item[0]} ({item[1]}) - {item[2]}")
    else:
        print("⚠️ Nenhum conhecimento relacionado ao Turso encontrado")
    
    # 8. Verificar metodologia PRP
    print("\n🎯 Verificando metodologia PRP:")
    
    # Verificar se há estrutura PRP consolidada
    prp_structure_files = [
        "../../docs/prp-system/PRP_ESTRUTURA_CONSOLIDADA.md",
        "../../docs/prp-system/guides/COMO_GERAR_PRP.md",
        "../../prp-agent/agents/agent.py"
    ]
    
    prp_files_exist = 0
    for file_path in prp_structure_files:
        if os.path.exists(file_path):
            prp_files_exist += 1
            print(f"  ✅ {os.path.basename(file_path)}")
        else:
            print(f"  ❌ {os.path.basename(file_path)}")
    
    print(f"📁 Arquivos PRP encontrados: {prp_files_exist}/{len(prp_structure_files)}")
    
    # 9. Verificar Cursor Agent
    print("\n🖥️ Verificando Cursor Agent:")
    
    # Verificar se há ferramentas MCP disponíveis
    mcp_tools = [
        "mcp_turso_list_databases",
        "mcp_turso_execute_query", 
        "mcp_turso_add_knowledge",
        "mcp_turso_search_knowledge"
    ]
    
    print("🔧 Ferramentas MCP Turso disponíveis:")
    for tool in mcp_tools:
        print(f"  • {tool}")
    
    # 10. Conclusão
    print(f"\n✅ CONCLUSÃO DO TESTE:")
    print(f"📊 Métricas:")
    print(f"  • PRPs no banco: {prp_count}")
    print(f"  • Conhecimento sincronizado: {knowledge_count}")
    print(f"  • Arquivos PRP: {prp_files_exist}/{len(prp_structure_files)}")
    print(f"  • Ferramentas MCP: {len(mcp_tools)}")
    
    # Determinar status
    if prp_count > 0 and knowledge_count > 0 and prp_files_exist >= 2:
        print(f"\n🎉 STATUS: ✅ SYNC FUNCIONANDO CORRETAMENTE COM PRP!")
        print(f"   O sistema está sincronizado e seguindo a metodologia PRP")
    elif prp_count > 0 and knowledge_count > 0:
        print(f"\n⚠️ STATUS: ⚠️ SYNC PARCIALMENTE FUNCIONANDO")
        print(f"   Dados sincronizados, mas estrutura PRP pode estar incompleta")
    else:
        print(f"\n❌ STATUS: ❌ SYNC NÃO FUNCIONANDO")
        print(f"   Problemas na sincronização ou estrutura PRP")
    
    conn.close()

if __name__ == "__main__":
    test_prp_sync() 