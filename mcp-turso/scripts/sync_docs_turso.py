#!/usr/bin/env python3
"""
Sincronização dos docs-turso com o banco de dados
"""

import os
import glob
import hashlib
import sqlite3
from datetime import datetime
from typing import Dict, List

def get_file_hash(file_path: str) -> str:
    """Calcula hash MD5 de um arquivo"""
    with open(file_path, 'rb') as f:
        return hashlib.md5(f.read()).hexdigest()

def read_file_content(file_path: str) -> str:
    """Lê conteúdo de um arquivo"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return f"Erro ao ler arquivo: {e}"

def extract_knowledge_from_file(file_info: Dict) -> Dict:
    """Extrai conhecimento estruturado de um arquivo"""
    content = file_info['content']
    file_path = file_info['path']
    
    # Determinar categoria baseada no caminho
    if 'configuration' in file_path:
        category = 'Configuration'
    elif 'documentation' in file_path:
        category = 'Documentation'
    elif 'migration' in file_path:
        category = 'Migration'
    else:
        category = 'General'
    
    # Extrair tópico do nome do arquivo
    filename = os.path.basename(file_path)
    topic = filename.replace('.md', '').replace('.txt', '').replace('_', ' ').title()
    
    # Gerar tags baseadas no conteúdo
    tags = extract_tags_from_content(content)
    
    # Calcular expertise baseada no tamanho
    expertise = 'expert' if len(content) > 5000 else 'intermediate' if len(content) > 2000 else 'beginner'
    
    return {
        'topic': topic,
        'content': content[:1000] + "..." if len(content) > 1000 else content,
        'category': category,
        'expertise_level': expertise,
        'tags': ','.join(tags),
        'source': file_path,
        'file_hash': file_info['hash'],
        'priority': calculate_priority(content, category)
    }

def extract_tags_from_content(content: str) -> List[str]:
    """Extrai tags relevantes do conteúdo"""
    tags = []
    content_lower = content.lower()
    
    keyword_tags = {
        'turso': ['turso', 'database', 'libsql'],
        'mcp': ['mcp', 'model context protocol'],
        'configuration': ['config', 'setup', 'install'],
        'security': ['security', 'auth', 'token', 'certificate'],
        'performance': ['performance', 'optimization', 'speed'],
        'documentation': ['documentation', 'guide', 'tutorial'],
        'migration': ['migration', 'migrate', 'upgrade'],
        'integration': ['integration', 'api', 'connect'],
        'monitoring': ['monitoring', 'logs', 'metrics']
    }
    
    for tag, keywords in keyword_tags.items():
        if any(keyword in content_lower for keyword in keywords):
            tags.append(tag)
    
    return tags

def calculate_priority(content: str, category: str) -> int:
    """Calcula prioridade baseada no conteúdo e categoria"""
    priority = 1
    
    # Aumentar prioridade baseado na categoria
    if category == 'Configuration':
        priority += 2
    elif category == 'Documentation':
        priority += 1
    
    # Aumentar prioridade baseado no tamanho
    if len(content) > 5000:
        priority += 2
    elif len(content) > 2000:
        priority += 1
    
    return min(priority, 5)  # Máximo 5

def sync_docs_turso():
    """Sincroniza os docs-turso com o banco de dados"""
    
    print("🔄 Iniciando sincronização dos docs-turso...")
    
    # Conectar ao banco
    db_path = "../../context-memory.db"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Escanear arquivos
    docs_files = []
    patterns = [
        "../../docs-turso/**/*.md",
        "../../docs-turso/**/*.txt"
    ]
    
    for pattern in patterns:
        for file_path in glob.glob(pattern, recursive=True):
            if os.path.isfile(file_path):
                file_hash = get_file_hash(file_path)
                file_info = {
                    'path': file_path,
                    'hash': file_hash,
                    'size': os.path.getsize(file_path),
                    'modified': datetime.fromtimestamp(os.path.getmtime(file_path)),
                    'content': read_file_content(file_path)
                }
                docs_files.append(file_info)
    
    print(f"📁 Encontrados {len(docs_files)} arquivos")
    
    # Processar cada arquivo
    sync_results = {
        'files_scanned': len(docs_files),
        'knowledge_extracted': 0,
        'updated_records': 0,
        'new_records': 0
    }
    
    for file_info in docs_files:
        print(f"🔄 Processando: {file_info['path']}")
        
        # Extrair conhecimento
        knowledge = extract_knowledge_from_file(file_info)
        
        # Verificar se já existe registro
        cursor.execute("""
            SELECT id, file_hash FROM turso_agent_knowledge 
            WHERE source = ?
        """, (knowledge['source'],))
        
        existing = cursor.fetchone()
        
        if existing:
            record_id, existing_hash = existing
            
            if existing_hash != knowledge['file_hash']:
                # Atualizar registro existente
                cursor.execute("""
                    UPDATE turso_agent_knowledge 
                    SET topic = ?, content = ?, category = ?, expertise_level = ?,
                        tags = ?, file_hash = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (
                    knowledge['topic'], knowledge['content'],
                    knowledge['category'], knowledge['expertise_level'],
                    knowledge['tags'], knowledge['file_hash'],
                    knowledge['priority'], record_id
                ))
                sync_results['updated_records'] += 1
                print(f"  ✅ Atualizado: {knowledge['topic']}")
            else:
                print(f"  ⏭️ Sem mudanças: {knowledge['topic']}")
        else:
            # Inserir novo registro
            cursor.execute("""
                INSERT INTO turso_agent_knowledge 
                (topic, content, category, expertise_level, tags, source, file_hash, priority)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                knowledge['topic'], knowledge['content'],
                knowledge['category'], knowledge['expertise_level'],
                knowledge['tags'], knowledge['source'],
                knowledge['file_hash'], knowledge['priority']
            ))
            sync_results['new_records'] += 1
            print(f"  ➕ Novo: {knowledge['topic']}")
        
        sync_results['knowledge_extracted'] += 1
    
    # Commit das mudanças
    conn.commit()
    conn.close()
    
    # Gerar relatório
    report = f"""
🔄 RELATÓRIO DE SINCRONIZAÇÃO DOCS-TURSO
{'='*50}

📊 RESULTADOS:
• Arquivos escaneados: {sync_results['files_scanned']}
• Conhecimento extraído: {sync_results['knowledge_extracted']}
• Registros atualizados: {sync_results['updated_records']}
• Novos registros: {sync_results['new_records']}

📝 ARQUIVOS PROCESSADOS:
"""
    
    for file_info in docs_files:
        report += f"• {file_info['path']}\n"
    
    report += f"""
⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
✅ Sincronização concluída!
"""
    
    print(report)
    
    # Salvar relatório
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_file = f"docs_turso_sync_report_{timestamp}.txt"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"📄 Relatório salvo em: {report_file}")

if __name__ == "__main__":
    sync_docs_turso() 