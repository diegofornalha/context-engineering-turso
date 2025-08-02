#!/bin/bash

# Script de Automação de Sincronização dos docs-turso
# Executa sync automático e mantém conhecimento atualizado

set -e

# Configurações
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SYNC_SCRIPT="$SCRIPT_DIR/sync_docs_turso.py"
LOG_DIR="$PROJECT_ROOT/logs"
LOCK_FILE="$LOG_DIR/docs_sync.lock"
LAST_SYNC_FILE="$LOG_DIR/last_docs_sync.txt"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para logging
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCESSO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

# Criar diretório de logs se não existir
mkdir -p "$LOG_DIR"

# Verificar se já está rodando
if [ -f "$LOCK_FILE" ]; then
    PID=$(cat "$LOCK_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        error "Sync docs-turso já está rodando (PID: $PID)"
        exit 1
    else
        warning "Lock file encontrado mas processo não está rodando. Removendo..."
        rm -f "$LOCK_FILE"
    fi
fi

# Criar lock file
echo $$ > "$LOCK_FILE"

# Função de cleanup
cleanup() {
    log "Limpando arquivos temporários..."
    rm -f "$LOCK_FILE"
    log "Cleanup concluído"
}

# Trap para garantir cleanup
trap cleanup EXIT

# Verificar se deve executar sync
should_sync() {
    if [ ! -f "$LAST_SYNC_FILE" ]; then
        return 0  # Primeira execução
    fi
    
    last_sync=$(cat "$LAST_SYNC_FILE")
    current_time=$(date +%s)
    time_diff=$((current_time - last_sync))
    
    # Sync a cada 2 horas (7200 segundos)
    if [ $time_diff -gt 7200 ]; then
        return 0
    else
        return 1
    fi
}

# Função principal de sync
run_sync() {
    log "🔄 Iniciando sincronização automática dos docs-turso..."
    
    # Verificar se arquivo Python existe
    if [ ! -f "$SYNC_SCRIPT" ]; then
        error "Script de sync não encontrado: $SYNC_SCRIPT"
        exit 1
    fi
    
    # Verificar se Python está disponível
    if ! command -v python3 &> /dev/null; then
        error "Python3 não encontrado"
        exit 1
    fi
    
    # Executar sync
    log "📁 Executando sync dos docs-turso..."
    cd "$SCRIPT_DIR"
    
    # Executar sync
    python3 "$SYNC_SCRIPT" 2>&1 | tee "$LOG_DIR/docs_sync_$(date +%Y%m%d_%H%M%S).log"
    
    if [ $? -eq 0 ]; then
        success "Sincronização dos docs-turso concluída com sucesso!"
        echo $(date +%s) > "$LAST_SYNC_FILE"
    else
        error "Erro durante sincronização dos docs-turso"
        exit 1
    fi
}

# Função para verificar integridade
check_integrity() {
    log "🔍 Verificando integridade do conhecimento dos docs-turso..."
    
    cd "$SCRIPT_DIR"
    python3 -c "
import sqlite3
import sys

try:
    conn = sqlite3.connect('../../context-memory.db')
    cursor = conn.cursor()
    
    # Verificar total de registros
    cursor.execute('SELECT COUNT(*) FROM turso_agent_knowledge')
    total = cursor.fetchone()[0]
    
    # Verificar registros recentes
    cursor.execute('''
        SELECT COUNT(*) FROM turso_agent_knowledge 
        WHERE updated_at >= datetime('now', '-1 day')
    ''')
    recent = cursor.fetchone()[0]
    
    # Verificar registros por categoria
    cursor.execute('''
        SELECT category, COUNT(*) FROM turso_agent_knowledge 
        GROUP BY category
    ''')
    categories = cursor.fetchall()
    
    print(f'📊 INTEGRIDADE DOCS-TURSO:')
    print(f'   • Total de registros: {total}')
    print(f'   • Registros recentes (24h): {recent}')
    print(f'   • Distribuição por categoria:')
    for category, count in categories:
        print(f'     - {category}: {count}')
    
    if total > 0:
        print('✅ Integridade OK')
        sys.exit(0)
    else:
        print('⚠️  Nenhum registro encontrado')
        sys.exit(1)
        
except Exception as e:
    print(f'❌ Erro ao verificar integridade: {e}')
    sys.exit(1)
"
    
    if [ $? -eq 0 ]; then
        success "Integridade verificada com sucesso!"
    else
        warning "Problemas de integridade detectados"
    fi
}

# Função para mostrar status
show_status() {
    log "📊 Status do sistema de sync docs-turso:"
    
    if [ -f "$LAST_SYNC_FILE" ]; then
        last_sync=$(cat "$LAST_SYNC_FILE")
        last_sync_date=$(date -r "$last_sync" '+%Y-%m-%d %H:%M:%S')
        echo "   • Última sincronização: $last_sync_date"
    else
        echo "   • Última sincronização: Nunca"
    fi
    
    # Verificar se há arquivos de log recentes
    recent_logs=$(find "$LOG_DIR" -name "docs_sync_*.log" -mtime -1 | wc -l)
    echo "   • Logs recentes (24h): $recent_logs"
    
    # Verificar tamanho do banco
    if [ -f "$PROJECT_ROOT/context-memory.db" ]; then
        db_size=$(du -h "$PROJECT_ROOT/context-memory.db" | cut -f1)
        echo "   • Tamanho do banco: $db_size"
    fi
    
    # Verificar arquivos docs-turso
    docs_count=$(find "$PROJECT_ROOT/../docs-turso" -name "*.md" -o -name "*.txt" | wc -l)
    echo "   • Arquivos docs-turso: $docs_count"
}

# Função para limpar logs antigos
cleanup_logs() {
    log "🧹 Limpando logs antigos..."
    
    # Remover logs mais antigos que 7 dias
    find "$LOG_DIR" -name "docs_sync_*.log" -mtime +7 -delete
    
    log "Logs antigos removidos"
}

# Função para configurar automação
setup_automation() {
    log "⚙️ Configurando automação de sync docs-turso..."
    
    # Criar script de cron
    cron_script="$SCRIPT_DIR/sync_docs_turso_cron.sh"
    cat > "$cron_script" << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
./auto_sync_docs_turso.sh auto
EOF
    
    chmod +x "$cron_script"
    
    log "✅ Script de cron criado: $cron_script"
    log "💡 Para configurar execução automática:"
    log "   crontab -e"
    log "   # Adicionar linha: */2 * * * * $cron_script"
}

# Função principal
main() {
    case "${1:-help}" in
        "auto")
            if should_sync; then
                run_sync
                check_integrity
            else
                log "⏭️ Sync não necessário (executado recentemente)"
            fi
            ;;
        "manual")
            run_sync
            check_integrity
            ;;
        "status")
            show_status
            ;;
        "integrity")
            check_integrity
            ;;
        "cleanup")
            cleanup_logs
            ;;
        "setup")
            setup_automation
            ;;
        "help"|*)
            echo "🔄 Auto Sync Docs-Turso"
            echo "Uso: $0 [comando]"
            echo ""
            echo "Comandos:"
            echo "  auto      - Execução automática (com verificação de tempo)"
            echo "  manual    - Execução manual forçada"
            echo "  status    - Mostrar status do sistema"
            echo "  integrity - Verificar integridade do conhecimento"
            echo "  cleanup   - Limpar logs antigos"
            echo "  setup     - Configurar automação"
            echo "  help      - Mostrar esta ajuda"
            echo ""
            echo "Exemplos:"
            echo "  $0 auto        # Execução automática"
            echo "  $0 manual      # Execução manual"
            echo "  $0 status      # Ver status"
            echo "  $0 setup       # Configurar automação"
            ;;
    esac
}

# Executar função principal
main "$@" 