#!/usr/bin/env python3
"""
Script para buscar informações sobre Turso no banco de dados
"""

import os
import sqlite3
from datetime import datetime

def search_turso_knowledge():
    """Busca informações sobre Turso no banco de dados"""
    
    print("🔍 BUSCANDO INFORMAÇÕES SOBRE TURSO NO BANCO")
    print("=" * 50)
    
    # Conectar ao banco local (para demonstração)
    db_path = "sql/data/context-memory.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Banco não encontrado em {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Buscar na tabela knowledge_base
    print("\n📚 Buscando na base de conhecimento...")
    
    # Buscar por "turso" em diferentes campos
    queries = [
        ("Tópicos com 'turso'", "SELECT * FROM knowledge_base WHERE topic LIKE '%turso%'"),
        ("Conteúdo com 'turso'", "SELECT * FROM knowledge_base WHERE content LIKE '%turso%'"),
        ("Tags com 'turso'", "SELECT * FROM knowledge_base WHERE tags LIKE '%turso%'"),
        ("JWT tokens", "SELECT * FROM knowledge_base WHERE content LIKE '%jwt%' OR content LIKE '%token%'"),
        ("Autenticação", "SELECT * FROM knowledge_base WHERE content LIKE '%auth%' OR content LIKE '%login%'"),
        ("RS256 EdDSA", "SELECT * FROM knowledge_base WHERE content LIKE '%rs256%' OR content LIKE '%eddsa%'")
    ]
    
    found_items = []
    
    for title, query in queries:
        try:
            cursor.execute(query)
            rows = cursor.fetchall()
            
            if rows:
                print(f"\n✅ {title}:")
                for row in rows:
                    print(f"  📄 ID: {row[0]}")
                    print(f"  📝 Tópico: {row[1]}")
                    print(f"  📄 Conteúdo: {row[2][:100]}...")
                    print(f"  🏷️ Tags: {row[6]}")
                    print(f"  📅 Criado: {row[4]}")
                    print()
                    found_items.append({
                        'id': row[0],
                        'topic': row[1],
                        'content': row[2],
                        'tags': row[6],
                        'created_at': row[4]
                    })
            else:
                print(f"❌ {title}: Nenhum resultado")
                
        except Exception as e:
            print(f"❌ Erro na query '{title}': {e}")
    
    # Buscar nas conversas
    print("\n💬 Buscando nas conversas...")
    try:
        cursor.execute("SELECT * FROM conversations WHERE message LIKE '%turso%' OR response LIKE '%turso%'")
        conversations = cursor.fetchall()
        
        if conversations:
            print(f"✅ Encontradas {len(conversations)} conversas sobre Turso:")
            for conv in conversations:
                print(f"  💬 [{conv[5]}] {conv[3]}")
                if conv[4]:  # response
                    print(f"  📝 Resposta: {conv[4][:100]}...")
                print()
        else:
            print("❌ Nenhuma conversa sobre Turso encontrada")
            
    except Exception as e:
        print(f"❌ Erro ao buscar conversas: {e}")
    
    conn.close()
    
    # Resumo
    print("\n📊 RESUMO DA BUSCA")
    print("=" * 30)
    print(f"📚 Itens encontrados na base de conhecimento: {len(found_items)}")
    
    if found_items:
        print("\n🎯 Recomendação:")
        print("  ✅ Informações sobre Turso já existem no banco")
        print("  📝 Considere atualizar/consolidar em vez de criar novo")
        print("  🔄 Verifique se há informações sobre JWT tokens")
    else:
        print("\n🎯 Recomendação:")
        print("  ✅ Nenhuma informação sobre Turso encontrada")
        print("  📝 Pode criar novo arquivo .md com segurança")
        print("  🗄️ Adicione ao banco via MCP Turso")
    
    return found_items

if __name__ == "__main__":
    search_turso_knowledge() 