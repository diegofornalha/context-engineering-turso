# 🚀 Como Configurei o MCP Turso no Claude Code

## 📋 Visão Geral

Este guia documenta o processo completo de configuração do MCP Turso no Claude Code, incluindo todos os passos, problemas encontrados e soluções aplicadas.

## 🎯 Objetivo

Integrar o MCP Turso Cloud ao Claude Code para permitir acesso direto ao banco de dados Turso através de ferramentas MCP nativas.

## 📦 Pré-requisitos

1. **Claude Code** instalado e configurado
2. **Conta Turso** com API Token e organização configurada
3. **Node.js** versão 18+ instalado
4. **Projeto MCP Turso** compilado (`dist/index.js` existente)

## 🔧 Processo de Configuração

### 1️⃣ Primeira Tentativa - NPX Direto (Falhou)

```bash
# Tentativa inicial
claude mcp add mcp-turso-cloud npx @diegofornalha/mcp-turso-cloud

# Resultado: ✗ Failed to connect
# Motivo: Falta de variáveis de ambiente
```

### 2️⃣ Segunda Tentativa - Node Local (Falhou)

```bash
# Usando o servidor local compilado
claude mcp add mcp-turso-local "node dist/index.js"

# Resultado: ✗ Failed to connect
# Motivo: Claude Code não carrega .env automaticamente
```

### 3️⃣ Solução Final - Script Wrapper ✅

#### Criação do Script Wrapper

Criamos um script que carrega as variáveis de ambiente antes de iniciar o servidor:

```bash
#!/bin/bash
# start-mcp.sh

echo "Iniciando MCP Turso com configuração correta..."

# Definir variáveis de ambiente
export TURSO_API_TOKEN="seu_token_aqui"
export TURSO_AUTH_TOKEN="seu_auth_token_aqui"
export TURSO_ORGANIZATION="sua_organizacao"
export TURSO_DEFAULT_DATABASE="context-memory"

echo "Variáveis de ambiente configuradas:"
echo "TURSO_API_TOKEN: ${TURSO_API_TOKEN:0:20}..."
echo "TURSO_AUTH_TOKEN: ${TURSO_AUTH_TOKEN:0:20}..."
echo "TURSO_ORGANIZATION: $TURSO_ORGANIZATION"
echo "TURSO_DEFAULT_DATABASE: $TURSO_DEFAULT_DATABASE"

# Mudar para o diretório correto
cd "$(dirname "$0")"

# Iniciar o MCP diretamente
exec node dist/index.js
```

#### Configuração no Claude Code

```bash
# Tornar o script executável
chmod +x /Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp.sh

# Adicionar ao Claude Code
claude mcp add mcp-turso /Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp.sh

# Verificar conexão
claude mcp list
# Resultado: ✓ Connected
```

## 🔍 Diagnóstico de Problemas

### Problema 1: Variáveis de Ambiente

**Sintoma:** Server fails to connect
**Causa:** Claude Code não carrega arquivos `.env` automaticamente
**Solução:** Script wrapper que exporta as variáveis

### Problema 2: Formato do Comando

**Sintoma:** Script executa mas MCP não conecta
**Causa:** Usar `npm start` em vez de `node dist/index.js`
**Solução:** Executar diretamente com `exec node dist/index.js`

### Problema 3: Diretório de Trabalho

**Sintoma:** Arquivo não encontrado
**Causa:** Script executado de diretório diferente
**Solução:** `cd "$(dirname "$0")"` antes de executar

## 🚀 Resultado Final

```bash
(venv) agents@AI context-engineering-turso % claude mcp list
Checking MCP server health...

mcp-turso: /Users/agents/Desktop/context-engineering-turso/mcp-turso/start-mcp.sh  - ✓ Connected
```

## 📚 Ferramentas MCP Disponíveis

Após a configuração bem-sucedida, as seguintes ferramentas ficam disponíveis:

### Gerenciamento de Bancos
- `mcp__mcp-turso__list_databases`
- `mcp__mcp-turso__create_database`
- `mcp__mcp-turso__delete_database`
- `mcp__mcp-turso__get_database_info`

### Consultas e Operações
- `mcp__mcp-turso__execute_read_only_query`
- `mcp__mcp-turso__execute_query`
- `mcp__mcp-turso__list_tables`
- `mcp__mcp-turso__describe_table`

### Sistema de Memória
- `mcp__mcp-turso__add_conversation`
- `mcp__mcp-turso__get_conversations`
- `mcp__mcp-turso__add_knowledge`
- `mcp__mcp-turso__search_knowledge`
- `mcp__mcp-turso__setup_memory_tables`

### Busca Vetorial
- `mcp__mcp-turso__vector_search`

### Gerenciamento de Tokens
- `mcp__mcp-turso__generate_database_token`
- `mcp__mcp-turso__list_database_tokens`
- `mcp__mcp-turso__create_database_token`
- `mcp__mcp-turso__revoke_database_token`
- `mcp__mcp-turso__get_token_cache_status`
- `mcp__mcp-turso__clear_token_cache`

### Métricas e Backup
- `mcp__mcp-turso__get_database_usage`
- `mcp__mcp-turso__backup_database`
- `mcp__mcp-turso__restore_database`

## 💡 Dicas Importantes

1. **Sempre use caminho absoluto** para o script wrapper
2. **Verifique as permissões** do script (`chmod +x`)
3. **Teste o script manualmente** antes de adicionar ao Claude
4. **Use `exec`** para garantir que sinais sejam propagados corretamente
5. **Reinicie o Claude Code** após adicionar o servidor MCP

## 🔄 Próximos Passos

1. **Testar as ferramentas MCP** no Claude Code
2. **Configurar aliases** para comandos frequentes
3. **Criar templates** de consultas comuns
4. **Documentar casos de uso** específicos

## 📝 Notas de Manutenção

- **Atualizar tokens:** Editar o arquivo `start-mcp.sh`
- **Logs:** Verificar saída do comando `claude mcp list`
- **Debugging:** Executar o script diretamente para ver erros

---

*Documentação criada em: 03/08/2025*
*Status: ✅ Configuração funcionando perfeitamente*