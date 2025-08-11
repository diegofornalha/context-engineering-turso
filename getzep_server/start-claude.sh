#!/bin/bash

# Script para iniciar Graphiti com Claude Nativo
echo "🚀 Iniciando Graphiti MCP com Claude Nativo..."

# Carrega variáveis de ambiente
export $(cat .env.claude | grep -v '^#' | xargs)

# Verifica se Neo4j está rodando
echo "🔍 Verificando Neo4j..."
if ! nc -z localhost 7687 2>/dev/null; then
    echo "⚠️  Neo4j não está rodando. Iniciando com Docker..."
    docker run -d \
        --name neo4j-graphiti \
        -p 7474:7474 \
        -p 7687:7687 \
        -e NEO4J_AUTH=neo4j/demodemo \
        -e NEO4J_server_memory_heap_initial__size=512m \
        -e NEO4J_server_memory_heap_max__size=1G \
        neo4j:5.26.0
    
    echo "⏳ Aguardando Neo4j inicializar..."
    sleep 10
fi

# Instala dependências se necessário
if [ ! -d ".venv" ]; then
    echo "📦 Criando ambiente virtual..."
    python3 -m venv .venv
fi

# Ativa ambiente virtual
source .venv/bin/activate

# Instala dependências básicas
echo "📦 Instalando dependências..."
pip install -q mcp pydantic python-dotenv neo4j

# Executa o servidor
echo "🎯 Iniciando servidor Graphiti-Claude MCP..."
python3 graphiti_claude_mcp.py --transport stdio

echo "✅ Servidor iniciado com sucesso!"