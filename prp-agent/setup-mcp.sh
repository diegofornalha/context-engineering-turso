#!/bin/bash
# setup-mcp.sh - Setup rápido do MCP Turso para novas branches

echo "🚀 Configurando MCP Turso..."
echo "================================"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está no diretório correto
if [ ! -d "mcp-turso" ]; then
    echo -e "${RED}❌ Erro: Diretório mcp-turso não encontrado!${NC}"
    echo "Certifique-se de estar na raiz do projeto."
    exit 1
fi

# Mostrar branch atual
BRANCH=$(git branch --show-current 2>/dev/null || echo "não-git")
echo -e "${YELLOW}📌 Branch atual: $BRANCH${NC}"

# Verificar se Claude Code está instalado
if ! command -v claude &> /dev/null; then
    echo -e "${RED}❌ Claude Code CLI não encontrado!${NC}"
    echo "Instale com: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Instalar dependências
echo -e "\n${YELLOW}📦 Instalando dependências...${NC}"
cd mcp-turso
if npm install; then
    echo -e "${GREEN}✅ Dependências instaladas${NC}"
else
    echo -e "${RED}❌ Erro ao instalar dependências${NC}"
    exit 1
fi
cd ..

# Verificar se arquivos compilados existem
echo -e "\n${YELLOW}🔍 Verificando arquivos compilados...${NC}"
if [ -f "mcp-turso/dist/index-unified-simple.js" ]; then
    echo -e "${GREEN}✅ Arquivos JS encontrados${NC}"
else
    echo -e "${YELLOW}⚠️ Compilando TypeScript...${NC}"
    cd mcp-turso && npm run build
    cd ..
fi

# Tornar script executável
echo -e "\n${YELLOW}🔧 Configurando permissões...${NC}"
chmod +x mcp-turso/start-mcp-unified.sh
echo -e "${GREEN}✅ Script configurado como executável${NC}"

# Remover configuração anterior (se existir)
echo -e "\n${YELLOW}🧹 Limpando configurações antigas...${NC}"
claude mcp remove mcp-turso 2>/dev/null || true

# Adicionar ao Claude Code
echo -e "\n${YELLOW}🔌 Adicionando ao Claude Code...${NC}"
FULL_PATH="$(pwd)/mcp-turso/start-mcp-unified.sh"
if claude mcp add mcp-turso "$FULL_PATH"; then
    echo -e "${GREEN}✅ MCP Turso adicionado com sucesso${NC}"
else
    echo -e "${RED}❌ Erro ao adicionar MCP${NC}"
    exit 1
fi

# Verificar configuração
echo -e "\n${YELLOW}✅ Verificando configuração...${NC}"
sleep 2 # Aguardar um pouco para o servidor iniciar

if claude mcp list | grep -q "mcp-turso.*Connected"; then
    echo -e "${GREEN}🎉 MCP Turso configurado e conectado!${NC}"
    
    echo -e "\n${GREEN}📋 Ferramentas MCP disponíveis:${NC}"
    echo "  • mcp__turso-unified__list_databases"
    echo "  • mcp__turso-unified__get_database_info"
    echo "  • mcp__turso-unified__list_tables"
    echo "  • mcp__turso-unified__describe_table"
    echo "  • mcp__turso-unified__execute_read_only_query"
    echo "  • mcp__turso-unified__execute_query"
    
    echo -e "\n${GREEN}🚀 Teste rápido:${NC}"
    echo "No Claude Code, execute:"
    echo -e "${YELLOW}mcp__turso-unified__list_databases()${NC}"
else
    echo -e "${YELLOW}⚠️ MCP adicionado mas ainda conectando...${NC}"
    echo "Execute 'claude mcp list' em alguns segundos para verificar"
fi

echo -e "\n${GREEN}✨ Setup completo!${NC}"
echo "================================"