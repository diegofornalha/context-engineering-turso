#!/bin/bash

# Script de Simplificação do Banco de Dados Turso
# Uso: ./simplify.sh [--backup] [--dry-run]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
DB_NAME="claude-swarm-v2"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Funções auxiliares
print_header() {
    echo -e "\n${GREEN}=== $1 ===${NC}\n"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Verificar se turso está instalado
if ! command -v turso &> /dev/null; then
    print_error "Turso CLI não encontrado. Instale com: curl -sSfL https://get.tur.so/install.sh | bash"
    exit 1
fi

# Processar argumentos
BACKUP=false
DRY_RUN=false

for arg in "$@"; do
    case $arg in
        --backup)
            BACKUP=true
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --help)
            echo "Uso: $0 [--backup] [--dry-run]"
            echo "  --backup    Criar backup antes de simplificar"
            echo "  --dry-run   Mostrar o que seria feito sem executar"
            exit 0
            ;;
    esac
done

print_header "Simplificação do Banco de Dados Turso"

# Mostrar estado atual
print_header "Estado Atual do Banco"
echo "Tabelas existentes:"
turso db shell $DB_NAME "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" | grep -v sqlite_sequence || true

# Fazer backup se solicitado
if [ "$BACKUP" = true ]; then
    print_header "Criando Backup"
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"
    
    print_warning "Criando backup em: $BACKUP_FILE"
    turso db dump $DB_NAME > "$BACKUP_FILE"
    
    if [ -f "$BACKUP_FILE" ]; then
        print_success "Backup criado com sucesso!"
        echo "Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"
    else
        print_error "Falha ao criar backup!"
        exit 1
    fi
fi

# Modo dry-run
if [ "$DRY_RUN" = true ]; then
    print_header "Modo Dry-Run - Ações que seriam executadas:"
    echo "1. Remover tabelas: conversations, distributed_transactions, edge_replicas, knowledge_base, performance_tests"
    echo "2. Manter tabela: docs_turso"
    echo "3. Criar tabela: sessions"
    echo "4. Criar índices otimizados"
    echo "5. Executar VACUUM e ANALYZE"
    exit 0
fi

# Confirmar execução
print_warning "Esta operação irá:"
echo "  - Remover várias tabelas do banco de dados"
echo "  - Manter apenas 'docs_turso'"
echo "  - Criar nova tabela 'sessions'"
echo ""
read -p "Tem certeza que deseja continuar? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Operação cancelada."
    exit 0
fi

# Executar simplificação
print_header "Executando Simplificação"

# Verificar se o arquivo SQL existe
SQL_FILE="./scripts/simplify-database.sql"
if [ ! -f "$SQL_FILE" ]; then
    SQL_FILE="./simplify-database.sql"
fi

if [ ! -f "$SQL_FILE" ]; then
    print_error "Arquivo SQL não encontrado: simplify-database.sql"
    exit 1
fi

# Executar SQL
print_warning "Executando script SQL..."
turso db shell $DB_NAME < "$SQL_FILE"

# Verificar resultado
print_header "Verificando Resultado"

echo "Tabelas após simplificação:"
turso db shell $DB_NAME "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" | grep -v sqlite_sequence || true

echo ""
echo "Contagem de documentos em docs_turso:"
turso db shell $DB_NAME "SELECT COUNT(*) as total FROM docs_turso;" || true

print_success "Simplificação concluída com sucesso!"

# Dicas finais
print_header "Próximos Passos"
echo "1. Verifique se seus dados estão intactos"
echo "2. Atualize sua aplicação para usar apenas as tabelas restantes"
echo "3. Teste a integração MCP-Turso"
echo ""
echo "Para reverter, use o backup criado:"
echo "  turso db shell $DB_NAME < $BACKUP_FILE"