#!/usr/bin/env python3
"""
Script para migrar documentação das pastas docs-prp e docs-turso para o banco de dados
Estrutura simplificada: apenas duas tabelas (docs_prp e docs_turso)
"""

import os
import sqlite3
from pathlib import Path
from datetime import datetime
import re

def connect_database():
    """Conecta ao banco de dados"""
    return sqlite3.connect('context-memory.db')

def extract_tags_from_content(content):
    """Extrai tags do conteúdo do arquivo"""
    tags = []
    
    # Buscar por tags no conteúdo
    tag_patterns = [
        r'#(\w+)',  # Hashtags
        r'`([^`]+)`',  # Código inline
        r'\*\*([^*]+)\*\*',  # Negrito
        r'\[([^\]]+)\]',  # Links
    ]
    
    for pattern in tag_patterns:
        matches = re.findall(pattern, content)
        tags.extend(matches)
    
    # Remover duplicatas e limitar
    tags = list(set(tags))[:10]
    return ','.join(tags)

def determine_category(file_path, content):
    """Determina a categoria baseada no caminho e conteúdo"""
    path_lower = file_path.lower()
    content_lower = content.lower()
    
    if 'architecture' in path_lower or 'arquitetura' in content_lower:
        return 'architecture'
    elif 'mcp' in path_lower or 'mcp' in content_lower:
        return 'mcp'
    elif 'delegation' in path_lower or 'delegação' in content_lower:
        return 'delegation'
    elif 'cleanup' in path_lower or 'limpeza' in content_lower:
        return 'maintenance'
    elif 'example' in path_lower or 'exemplo' in content_lower:
        return 'examples'
    elif 'reference' in path_lower or 'referência' in content_lower:
        return 'reference'
    elif 'getting-started' in path_lower or 'início' in content_lower:
        return 'getting-started'
    else:
        return 'documentation'

def migrate_docs_prp():
    """Migra documentação da pasta docs-prp"""
    print("📚 Migrando documentação docs-prp...")
    
    conn = connect_database()
    cursor = conn.cursor()
    
    docs_prp_path = Path('prp-agent/docs-prp')
    if not docs_prp_path.exists():
        print("⚠️ Pasta prp-agent/docs-prp não encontrada")
        return
    
    migrated_count = 0
    
    for md_file in docs_prp_path.rglob('*.md'):
        if md_file.name == 'README.md':
            continue  # Pular README principal
            
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extrair cluster da estrutura de pastas
            cluster = md_file.parent.name
            
            # Determinar categoria
            category = determine_category(str(md_file), content)
            
            # Extrair tags
            tags = extract_tags_from_content(content)
            
            # Verificar se já existe
            cursor.execute('''
                SELECT id FROM docs_prp 
                WHERE file_path = ? AND title = ?
            ''', (str(md_file.relative_to(docs_prp_path)), md_file.stem))
            
            existing = cursor.fetchone()
            
            if existing:
                # Atualizar existente
                cursor.execute('''
                    UPDATE docs_prp 
                    SET content = ?, category = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (content, category, tags, existing[0]))
                print(f"  🔄 Atualizado: {md_file.name}")
            else:
                # Inserir novo
                cursor.execute('''
                    INSERT INTO docs_prp (title, content, file_path, cluster, category, tags)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    md_file.stem,
                    content,
                    str(md_file.relative_to(docs_prp_path)),
                    cluster,
                    category,
                    tags
                ))
                print(f"  ✅ Inserido: {md_file.name}")
            
            migrated_count += 1
            
        except Exception as e:
            print(f"  ❌ Erro ao processar {md_file.name}: {e}")
    
    conn.commit()
    conn.close()
    
    print(f"📊 Total docs-prp migrados: {migrated_count}")

def migrate_docs_turso():
    """Migra documentação da pasta docs-turso"""
    print("📚 Migrando documentação docs-turso...")
    
    conn = connect_database()
    cursor = conn.cursor()
    
    docs_turso_path = Path('turso-agent/docs-turso')
    if not docs_turso_path.exists():
        print("⚠️ Pasta turso-agent/docs-turso não encontrada")
        return
    
    migrated_count = 0
    
    for md_file in docs_turso_path.rglob('*.md'):
        if md_file.name == 'README.md':
            continue  # Pular README principal
            
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extrair cluster da estrutura de pastas
            cluster = md_file.parent.name
            
            # Determinar categoria
            category = determine_category(str(md_file), content)
            
            # Extrair tags
            tags = extract_tags_from_content(content)
            
            # Verificar se já existe
            cursor.execute('''
                SELECT id FROM docs_turso 
                WHERE file_path = ? AND title = ?
            ''', (str(md_file.relative_to(docs_turso_path)), md_file.stem))
            
            existing = cursor.fetchone()
            
            if existing:
                # Atualizar existente
                cursor.execute('''
                    UPDATE docs_turso 
                    SET content = ?, category = ?, tags = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (content, category, tags, existing[0]))
                print(f"  🔄 Atualizado: {md_file.name}")
            else:
                # Inserir novo
                cursor.execute('''
                    INSERT INTO docs_turso (title, content, file_path, cluster, category, tags)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    md_file.stem,
                    content,
                    str(md_file.relative_to(docs_turso_path)),
                    cluster,
                    category,
                    tags
                ))
                print(f"  ✅ Inserido: {md_file.name}")
            
            migrated_count += 1
            
        except Exception as e:
            print(f"  ❌ Erro ao processar {md_file.name}: {e}")
    
    conn.commit()
    conn.close()
    
    print(f"📊 Total docs-turso migrados: {migrated_count}")

def show_migration_summary():
    """Mostra resumo da migração"""
    print("\n📊 RESUMO DA MIGRAÇÃO:")
    print("=" * 50)
    
    conn = connect_database()
    cursor = conn.cursor()
    
    # Contar documentos por tabela
    cursor.execute("SELECT COUNT(*) FROM docs_prp")
    docs_prp_count = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM docs_turso")
    docs_turso_count = cursor.fetchone()[0]
    
    # Contar por cluster
    cursor.execute("""
        SELECT cluster, COUNT(*) as count 
        FROM docs_prp 
        GROUP BY cluster 
        ORDER BY cluster
    """)
    prp_clusters = cursor.fetchall()
    
    cursor.execute("""
        SELECT cluster, COUNT(*) as count 
        FROM docs_turso 
        GROUP BY cluster 
        ORDER BY cluster
    """)
    turso_clusters = cursor.fetchall()
    
    # Contar por categoria
    cursor.execute("""
        SELECT category, COUNT(*) as count 
        FROM docs_prp 
        GROUP BY category 
        ORDER BY count DESC
    """)
    prp_categories = cursor.fetchall()
    
    cursor.execute("""
        SELECT category, COUNT(*) as count 
        FROM docs_turso 
        GROUP BY category 
        ORDER BY count DESC
    """)
    turso_categories = cursor.fetchall()
    
    conn.close()
    
    print(f"📚 docs_prp: {docs_prp_count} documentos")
    print(f"📚 docs_turso: {docs_turso_count} documentos")
    print(f"📊 Total: {docs_prp_count + docs_turso_count} documentos")
    
    print("\n📁 Clusters docs_prp:")
    for cluster, count in prp_clusters:
        print(f"  • {cluster}: {count} docs")
    
    print("\n📁 Clusters docs_turso:")
    for cluster, count in turso_clusters:
        print(f"  • {cluster}: {count} docs")
    
    print("\n🏷️ Categorias docs_prp:")
    for category, count in prp_categories:
        print(f"  • {category}: {count} docs")
    
    print("\n🏷️ Categorias docs_turso:")
    for category, count in turso_categories:
        print(f"  • {category}: {count} docs")

def main():
    """Função principal"""
    print("🚀 MIGRAÇÃO DE DOCUMENTAÇÃO PARA BANCO DE DADOS")
    print("=" * 60)
    print("📋 Estrutura simplificada: docs_prp + docs_turso")
    print("🎯 Migrando arquivos .md das pastas docs-prp e docs-turso")
    print()
    
    # Migrar documentação
    migrate_docs_prp()
    print()
    migrate_docs_turso()
    print()
    
    # Mostrar resumo
    show_migration_summary()
    
    print("\n✅ Migração concluída com sucesso!")
    print("🎯 Estrutura simplificada implementada")
    print("📊 Documentação organizada no banco de dados")

if __name__ == "__main__":
    main() 