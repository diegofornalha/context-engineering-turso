#!/usr/bin/env python3
"""
Criar tabela de conhecimento no banco de dados
"""

import sqlite3
import os

def create_knowledge_table():
    """Cria a tabela de conhecimento"""
    
    db_path = "../../context-memory.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Banco não encontrado: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Criar tabela de conhecimento
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS turso_agent_knowledge (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'General',
            expertise_level TEXT DEFAULT 'intermediate',
            tags TEXT,
            source TEXT,
            file_hash TEXT,
            priority INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Criar índices para performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_topic ON turso_agent_knowledge(topic)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_category ON turso_agent_knowledge(category)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_tags ON turso_agent_knowledge(tags)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_knowledge_updated ON turso_agent_knowledge(updated_at)")
    
    conn.commit()
    conn.close()
    
    print("✅ Tabela de conhecimento criada com sucesso!")
    print("📋 Estrutura criada:")
    print("  • turso_agent_knowledge - Tabela principal")
    print("  • Índices de performance criados")
    print("  • Campos: topic, content, category, expertise_level, tags, source, file_hash, priority, created_at, updated_at")

if __name__ == "__main__":
    create_knowledge_table() 