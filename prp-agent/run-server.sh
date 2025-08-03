#!/bin/bash

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Diretório base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${BASE_DIR}/../venv"

# Verificar se está no diretório correto
if [[ ! -f "${BASE_DIR}/prp_agent.py" ]]; then
    echo -e "${RED}❌ Erro: Execute este script do diretório prp-agent/${NC}"
    exit 1
fi

# Ativar ambiente virtual
if [[ -f "${VENV_DIR}/bin/activate" ]]; then
    source "${VENV_DIR}/bin/activate"
else
    echo -e "${RED}❌ Erro: Ambiente virtual não encontrado${NC}"
    exit 1
fi

# Iniciar servidor
echo -e "${BLUE}🚀 Iniciando PRP Agent...${NC}"
echo -e "${GREEN}📡 API: http://localhost:5678${NC}"
echo ""

# Executar o servidor Python
python prp_agent.py