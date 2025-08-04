#!/usr/bin/env python3
"""
Script para inserir todos os arquivos .md do diretório docs-turso na tabela docs_turso
"""

import os
import json
import subprocess
from pathlib import Path

def extract_title_from_content(content):
    """Extrai o título do conteúdo markdown (primeira linha # )"""
    lines = content.split('\n')
    for line in lines:
        if line.strip().startswith('# '):
            return line.replace('#', '').strip()
    return "Sem título"

def get_category_from_path(file_path):
    """Determina a categoria baseado no caminho do arquivo"""
    if 'configuration' in file_path:
        return 'configuration'
    elif 'documentation' in file_path:
        return 'documentation'
    elif 'learnings' in file_path:
        return 'learnings'
    elif 'migration' in file_path:
        return 'migration'
    elif 'tutorial' in file_path.lower():
        return 'tutorial'
    else:
        return 'general'

def extract_tags_from_filename(filename):
    """Extrai tags do nome do arquivo"""
    base = filename.replace('.md', '').lower()
    words = base.replace('_', ' ').replace('-', ' ').split()
    # Remove palavras muito comuns
    stop_words = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']
    tags = [word for word in words if word not in stop_words and len(word) > 2]
    return json.dumps(tags)

def escape_sql_string(s):
    """Escapa strings para SQL"""
    if s is None:
        return 'NULL'
    # Duplica aspas simples para escape SQL
    return s.replace("'", "''")

def insert_document(file_path, base_dir):
    """Gera comando SQL para inserir um documento"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        file_name = os.path.basename(file_path)
        title = extract_title_from_content(content)
        category = get_category_from_path(file_path)
        tags = extract_tags_from_filename(file_name)
        file_size = os.path.getsize(file_path)
        
        # Primeiros 200 caracteres como descrição
        description = content.replace('\n', ' ')[:200].strip() + '...' if len(content) > 200 else content.replace('\n', ' ').strip()
        
        # Escapa strings para SQL
        title_escaped = escape_sql_string(title)
        description_escaped = escape_sql_string(description)
        content_escaped = escape_sql_string(content)
        
        sql = f"""
INSERT INTO docs_turso (file_name, title, description, content, category, tags, file_path, file_size) 
VALUES (
    '{file_name}',
    '{title_escaped}',
    '{description_escaped}',
    '{content_escaped}',
    '{category}',
    '{tags}',
    '{file_path}',
    {file_size}
);"""
        
        return sql
    except Exception as e:
        print(f"Erro ao processar {file_path}: {e}")
        return None

def main():
    base_dir = "/Users/agents/Desktop/context-engineering-turso/docs-turso"
    sql_commands = []
    
    # Percorre todos os arquivos .md no diretório e subdiretórios
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                sql = insert_document(file_path, base_dir)
                if sql:
                    sql_commands.append(sql)
    
    # Salva todos os comandos SQL em um arquivo
    output_file = os.path.join(base_dir, 'insert_all_docs_complete.sql')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Script gerado automaticamente para inserir todos os documentos .md\n")
        f.write("-- Total de documentos: {}\n\n".format(len(sql_commands)))
        
        for sql in sql_commands:
            f.write(sql)
            f.write("\n")
    
    print(f"Script SQL gerado: {output_file}")
    print(f"Total de documentos a inserir: {len(sql_commands)}")
    
    # Executa automaticamente
    print("\nExecutando script SQL...")
    try:
        cmd = f'turso db shell context-memory < {output_file}'
        subprocess.run(cmd, shell=True, check=True)
        print("✅ Documentos inseridos com sucesso!")
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao executar: {e}")

if __name__ == "__main__":
    main()