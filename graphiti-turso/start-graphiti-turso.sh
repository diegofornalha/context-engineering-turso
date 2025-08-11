#!/bin/bash

# Script para iniciar o servidor Graphiti com Turso e Claude

echo "🚀 Iniciando Graphiti-Turso MCP Server..."

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Verificar Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 não encontrado. Por favor instale Python 3.8+"
    exit 1
fi

# Criar ambiente virtual se não existir
if [ ! -d ".venv" ]; then
    echo "📦 Criando ambiente virtual Python..."
    python3 -m venv .venv
fi

# Ativar ambiente virtual
source .venv/bin/activate

# Instalar dependências necessárias
echo "📦 Instalando dependências..."
pip install -q --upgrade pip
pip install -q mcp pydantic python-dotenv neo4j numpy scikit-learn

# Verificar se o arquivo de configuração existe
if [ ! -f ".env" ]; then
    echo "⚠️  Arquivo .env não encontrado. Criando template..."
    cat > .env << EOF
# Configuração Turso
TURSO_DATABASE_URL=libsql://localhost:8080
TURSO_AUTH_TOKEN=

# Configuração Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=demodemo

# Configuração Embeddings
EMBEDDING_DIM=384
EMBEDDING_TABLE=embeddings
CACHE_ENABLED=true

# Configuração Claude
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4096
CLAUDE_TEMPERATURE=0.7
EOF
    echo "Por favor, edite o arquivo .env com suas credenciais"
fi

# Executar o servidor
echo "🎯 Iniciando servidor MCP..."
python3 graphiti_claude_mcp.py --transport stdio

echo "✅ Servidor iniciado!"