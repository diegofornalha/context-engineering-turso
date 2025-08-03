#!/bin/bash

echo "🧹 LIMPEZA DE SCRIPTS DE BANCO LOCAL"
echo "======================================"

# Lista de scripts para remover (que usam banco local)
SCRIPTS_TO_REMOVE=(
    "sync_docs_turso.py"
    "execute-sync-batches.py"
    "execute-turso-sync.py"
    "sync-docs-simple.py"
    "sync-remaining-docs.py"
    "test_prp_sync.py"
    "test_sync.py"
    "sync-knowledge-via-mcp.py"
    "sync-turso-knowledge.py"
    "sync-turso-knowledge-mcp.py"
    "auto-sync-knowledge.sh"
    "auto_sync_docs_turso.sh"
    "quick-sync.sh"
    "create_knowledge_table.py"
)

echo "📋 Scripts que serão removidos:"
for script in "${SCRIPTS_TO_REMOVE[@]}"; do
    if [ -f "scripts/$script" ]; then
        echo "  🗑️ $script"
        rm "scripts/$script"
    fi
done

# Remover arquivos de relatório de sync
echo ""
echo "📄 Removendo relatórios de sync antigos..."
find scripts -name "*sync_report*" -delete
find scripts -name "*mcp_sync_report*" -delete

# Remover arquivos de backup local
echo ""
echo "🗄️ Removendo arquivos de backup local..."
find . -name "*.db" -delete 2>/dev/null || true

echo ""
echo "✅ Limpeza concluída!"
echo "📝 Scripts restantes (apenas nuvem):"
ls scripts/*.py scripts/*.sh 2>/dev/null | grep -v "cleanup" || echo "  Nenhum script restante" 