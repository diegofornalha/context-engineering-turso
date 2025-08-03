#!/bin/bash

# Script para iniciar PRP Agent com integração MCP real

cd "$(dirname "$0")"

# Ativar ambiente virtual
if [ -d "../venv" ]; then
    source ../venv/bin/activate
else
    echo "❌ Ambiente virtual não encontrado"
    exit 1
fi

echo "🚀 Iniciando PRP Agent com MCPs Reais..."
echo "📡 API: http://localhost:5678"
echo "📊 Features:"
echo "   - Claude Flow MCP: Orquestração e Memória"
echo "   - Turso MCP: Armazenamento e Busca"
echo "   - Delegação 100% para MCPs"
echo ""

# Verificar se Sentry está disponível
if python -c "import sentry_sdk" 2>/dev/null; then
    echo "✅ Sentry disponível para monitoramento"
    uvicorn main_ai_agents_real:app --host 0.0.0.0 --port 5678 --reload
else
    echo "⚠️ Sentry não disponível, usando versão simples"
    uvicorn main_simple:app --host 0.0.0.0 --port 5678 --reload
fi