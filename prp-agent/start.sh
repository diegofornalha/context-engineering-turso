#!/bin/bash
# 🚀 Script para Iniciar o PRP Agent
# =================================

echo "🚀 Iniciando PRP Agent..."

# Mover para o diretório do script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Verificar se main.py existe
if [ ! -f "main.py" ]; then
    echo "❌ Erro: main.py não encontrado!"
    echo "Execute este script do diretório prp-agent/"
    exit 1
fi

# Verificar se o ambiente virtual existe
if [ ! -d "../venv" ]; then
    echo "❌ Erro: Ambiente virtual não encontrado em ../venv"
    exit 1
fi

# Ativar ambiente virtual
echo "📦 Ativando ambiente virtual..."
source ../venv/bin/activate

# Verificar se a porta está livre
if lsof -ti:5678 > /dev/null 2>&1; then
    echo "❌ Erro: Porta 5678 já está em uso!"
    echo "Use './stop.sh' para parar o servidor existente"
    exit 1
fi

# Escolher qual arquivo main usar
if python -c "import sentry_sdk" 2>/dev/null; then
    echo "✅ Usando main.py com Sentry"
    MAIN_FILE="main"
else
    echo "⚠️  Sentry não instalado, usando main_simple.py"
    MAIN_FILE="main_simple"
fi

# Iniciar o servidor
echo "🌐 Iniciando servidor na porta 5678..."
echo ""
echo "📍 Acesse: http://localhost:5678"
echo "📍 Docs: http://localhost:5678/docs"
echo ""
echo "💡 Pressione Ctrl+C para parar o servidor"
echo ""

# Executar o servidor
uvicorn ${MAIN_FILE}:app --host 0.0.0.0 --port 5678 --reload