#!/usr/bin/env python3
"""
Script para atualizar documentação para usar apenas banco da nuvem
"""

import os
import re
from pathlib import Path

def update_file(file_path):
    """Atualiza um arquivo removendo referências a banco local"""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Substituições para remover referências a banco local
    replacements = [
        # Remover referências a .db
        (r'\.db', ''),
        (r'sqlite3\.connect\([^)]+\)', 'self.client.execute'),
        (r'conn = sqlite3\.connect\([^)]+\)', 'result = self.client.execute'),
        (r'cursor = conn\.cursor\(\)', ''),
        (r'conn\.commit\(\)', ''),
        (r'conn\.close\(\)', ''),
        (r'cursor\.execute', 'self.client.execute'),
        (r'cursor\.fetchall\(\)', 'result.rows'),
        (r'cursor\.fetchone\(\)', 'result.rows[0] if result.rows else None'),
        (r'cursor\.lastrowid', 'result.lastInsertRowid'),
        
        # Atualizar comentários
        (r'# Para demonstração, usaremos SQLite local', '# Usar banco Turso da nuvem'),
        (r'# Em produção, usaríamos o cliente Turso', '# Usar cliente Turso da nuvem'),
        (r'# Para demonstração, usar SQLite local', '# Usar banco Turso da nuvem'),
        
        # Remover referências a local_path
        (r'local_path.*description.*Local.*path', 'database: { type: "string", description: "Database name" }'),
        (r'required.*local_path', 'required: ["database"]'),
        
        # Atualizar nomes de funções
        (r'sync_embedded_replica', 'sync_cloud_database'),
        (r'get_replica_status', 'get_sync_status'),
        (r'create_embedded_replica', 'sync_cloud_database'),
        
        # Atualizar descrições
        (r'Manually sync embedded replica with remote', 'Manually sync cloud database with latest changes'),
        (r'Get embedded replica sync status', 'Get cloud database sync status'),
        (r'Local replica path', 'Database name to sync'),
        (r'Local path for replica', 'Database name'),
        
        # Remover referências a desenvolvimento local
        (r'🔄 Desenvolvimento Local.*Embedded replicas', '🔄 Sincronização de Nuvem: Cloud database sync'),
        (r'create_embedded_replica.*Replicação local', 'sync_cloud_database - Sincronização de nuvem'),
    ]
    
    # Aplicar substituições
    for old_pattern, new_pattern in replacements:
        content = re.sub(old_pattern, new_pattern, content, flags=re.IGNORECASE)
    
    # Escrever arquivo atualizado
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Atualizado: {file_path}")

def main():
    """Atualiza todos os arquivos da documentação"""
    
    docs_dir = Path("docs-turso")
    
    print("🧹 REMOVENDO REFERÊNCIAS A BANCO LOCAL")
    print("=" * 50)
    
    # Lista de arquivos para atualizar
    files_to_update = [
        "ADDITIONAL_TOOLS_PLAN.md",
        "GUIA_COMPLETO_TURSO_MCP.md"
    ]
    
    for filename in files_to_update:
        file_path = docs_dir / filename
        if file_path.exists():
            update_file(file_path)
        else:
            print(f"⚠️ Arquivo não encontrado: {file_path}")
    
    print()
    print("✅ ATUALIZAÇÃO CONCLUÍDA!")
    print("📋 Arquivos atualizados para usar apenas banco da nuvem")
    print("🗑️ Referências a banco local removidas")

if __name__ == "__main__":
    main() 