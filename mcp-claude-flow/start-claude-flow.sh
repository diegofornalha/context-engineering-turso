#!/bin/bash

# Script para iniciar o MCP Claude Flow com as configurações corretas

echo "🚀 Iniciando MCP Claude Flow..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se o npx está disponível
if ! command -v npx &> /dev/null; then
    echo -e "${RED}❌ npx não encontrado. Por favor, instale o Node.js.${NC}"
    exit 1
fi

# Verificar versão do Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}❌ Node.js versão 16 ou superior é necessária.${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Configuração do ambiente:${NC}"
echo -e "   Node.js: $(node -v)"
echo -e "   NPM: $(npm -v)"
echo -e "   Diretório: $(pwd)"

# Criar diretório se não existir
mkdir -p mcp-claude-flow

# Mudar para o diretório
cd mcp-claude-flow

# Verificar se o Claude Flow está instalado globalmente
echo -e "\n${BLUE}🔍 Verificando instalação do Claude Flow...${NC}"
if ! npm list -g claude-flow@alpha &> /dev/null; then
    echo -e "${YELLOW}📦 Instalando Claude Flow globalmente...${NC}"
    npm install -g claude-flow@alpha
fi

# Configurar variáveis de ambiente opcionais
export CLAUDE_FLOW_LOG_LEVEL="${CLAUDE_FLOW_LOG_LEVEL:-info}"
export CLAUDE_FLOW_MEMORY_PATH="${CLAUDE_FLOW_MEMORY_PATH:-$HOME/.claude-flow}"
export CLAUDE_FLOW_CACHE_ENABLED="${CLAUDE_FLOW_CACHE_ENABLED:-true}"

echo -e "\n${BLUE}⚙️  Variáveis de ambiente:${NC}"
echo -e "   CLAUDE_FLOW_LOG_LEVEL: $CLAUDE_FLOW_LOG_LEVEL"
echo -e "   CLAUDE_FLOW_MEMORY_PATH: $CLAUDE_FLOW_MEMORY_PATH"
echo -e "   CLAUDE_FLOW_CACHE_ENABLED: $CLAUDE_FLOW_CACHE_ENABLED"

# Criar diretório de memória se não existir
mkdir -p "$CLAUDE_FLOW_MEMORY_PATH"

# Iniciar o servidor MCP
echo -e "\n${GREEN}✅ Iniciando servidor MCP Claude Flow...${NC}"
echo -e "${YELLOW}📌 Use Ctrl+C para parar o servidor${NC}\n"

# Executar o servidor
exec npx claude-flow@alpha mcp start