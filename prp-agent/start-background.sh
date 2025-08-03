#!/bin/bash
# 🚀 Script para Iniciar o PRP Agent em Background
# ===============================================

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando PRP Agent em background...${NC}"

# Verificar se estamos no diretório correto
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

if [ ! -f "main.py" ]; then
    echo -e "${RED}❌ Erro: main.py não encontrado!${NC}"
    exit 1
fi

# Verificar se o servidor já está rodando
if [ -f "prp-agent.pid" ]; then
    PID=$(cat prp-agent.pid)
    if ps -p $PID > /dev/null 2>&1; then
        echo -e "${RED}❌ Servidor já está rodando! (PID: $PID)${NC}"
        echo "Use './stop.sh' para parar o servidor"
        exit 1
    else
        rm -f prp-agent.pid
    fi
fi

# Verificar se a porta está livre
if lsof -ti:5678 > /dev/null 2>&1; then
    echo -e "${RED}❌ Porta 5678 já está em uso!${NC}"
    exit 1
fi

# Ativar ambiente virtual e iniciar servidor em background
echo -e "${YELLOW}📦 Iniciando servidor em background...${NC}"

# Criar comando para executar
CMD="source ../venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 5678"

# Executar em background e salvar PID
nohup bash -c "$CMD" > prp-agent.log 2>&1 &
PID=$!

# Salvar PID
echo $PID > prp-agent.pid

# Aguardar servidor iniciar
echo -e "${YELLOW}⏳ Aguardando servidor iniciar...${NC}"
sleep 3

# Verificar se o servidor está rodando
if ps -p $PID > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor iniciado com sucesso!${NC}"
    echo -e "${GREEN}📋 PID: $PID${NC}"
    echo ""
    echo -e "${YELLOW}📍 Acesse: http://localhost:5678${NC}"
    echo -e "${YELLOW}📍 Docs: http://localhost:5678/docs${NC}"
    echo -e "${YELLOW}📍 Logs: tail -f prp-agent.log${NC}"
    echo ""
    echo -e "${YELLOW}💡 Use './stop.sh' para parar o servidor${NC}"
else
    echo -e "${RED}❌ Falha ao iniciar o servidor!${NC}"
    echo "Verifique o arquivo prp-agent.log para mais detalhes"
    rm -f prp-agent.pid
    exit 1
fi