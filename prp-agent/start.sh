#!/bin/bash
# 🚀 Script para Iniciar o PRP Agent
# =================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando PRP Agent...${NC}"

# Verificar se estamos no diretório correto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ ! -f "main.py" ]; then
    echo -e "${RED}❌ Erro: main.py não encontrado!${NC}"
    echo "Execute este script do diretório prp-agent/"
    exit 1
fi

# Verificar se o ambiente virtual existe
if [ ! -d "../venv" ]; then
    echo -e "${RED}❌ Erro: Ambiente virtual não encontrado em ../venv${NC}"
    echo "Por favor, crie o ambiente virtual primeiro."
    exit 1
fi

# Ativar ambiente virtual
echo -e "${YELLOW}📦 Ativando ambiente virtual...${NC}"
source ../venv/bin/activate

# Verificar se FastAPI está instalado
if ! python -c "import fastapi" 2>/dev/null; then
    echo -e "${RED}❌ Erro: FastAPI não está instalado!${NC}"
    echo "Execute: pip install -r requirements.txt"
    exit 1
fi

# Verificar se a porta está livre
if lsof -ti:5678 > /dev/null 2>&1; then
    echo -e "${RED}❌ Erro: Porta 5678 já está em uso!${NC}"
    PID=$(lsof -ti:5678)
    echo "Processo usando a porta: PID $PID"
    echo "Use './stop.sh' para parar o servidor existente"
    exit 1
fi

# Iniciar o servidor
echo -e "${GREEN}✅ Ambiente virtual ativado${NC}"
echo -e "${GREEN}🌐 Iniciando servidor na porta 5678...${NC}"
echo ""
echo -e "${YELLOW}📍 Acesse: http://localhost:5678${NC}"
echo -e "${YELLOW}📍 Docs: http://localhost:5678/docs${NC}"
echo -e "${YELLOW}📍 Sentry Debug: http://localhost:5678/sentry-debug${NC}"
echo ""
echo -e "${YELLOW}💡 Pressione Ctrl+C para parar o servidor${NC}"
echo ""

# Executar o servidor
uvicorn main:app --host 0.0.0.0 --port 5678 --reload