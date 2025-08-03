# 🚀 Guia Completo: Configuração MCP Turso no Claude Code

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Pré-requisitos](#pré-requisitos)
3. [Instalação Rápida](#instalação-rápida)
4. [Configuração Detalhada](#configuração-detalhada)
5. [Verificação e Testes](#verificação-e-testes)
6. [Uso das Ferramentas](#uso-das-ferramentas)
7. [Troubleshooting](#troubleshooting)
8. [Referência de Ferramentas](#referência-de-ferramentas)

## 🎯 Visão Geral

O MCP (Model Context Protocol) Turso permite que o Claude Code acesse diretamente bancos de dados Turso através de ferramentas nativas, eliminando a necessidade de scripts externos ou comandos bash.

### Benefícios

- ✅ Acesso direto ao banco de dados no Claude Code
- ✅ 27 ferramentas especializadas disponíveis
- ✅ Sistema de memória persistente integrado
- ✅ Busca vetorial nativa
- ✅ Gerenciamento completo de bancos e tokens

## 📦 Pré-requisitos

### 1. Software Necessário

```bash
# Verificar Node.js (v18+)
node --version

# Verificar Claude Code
claude --version

# Verificar NPM
npm --version
```

### 2. Conta Turso

Você precisa ter:
- **API Token** da Turso
- **Nome da Organização**
- **Banco de dados** criado (ou permissão para criar)

### 3. Projeto MCP Compilado

```bash
# No diretório mcp-turso/
npm install
npm run build

# Verificar se dist/index.js existe
ls -la dist/index.js
```

## ⚡ Instalação Rápida

### 1. Criar Script de Inicialização

```bash
# Criar arquivo start-mcp.sh
cat > mcp-turso/start-mcp.sh << 'EOF'
#!/bin/bash

# Configurar variáveis de ambiente
export TURSO_API_TOKEN="seu_token_aqui"
export TURSO_AUTH_TOKEN="seu_auth_token_aqui"
export TURSO_ORGANIZATION="sua_organizacao"
export TURSO_DEFAULT_DATABASE="context-memory"

# Mudar para diretório correto
cd "$(dirname "$0")"

# Iniciar servidor MCP
exec node dist/index.js
EOF

# Tornar executável
chmod +x mcp-turso/start-mcp.sh
```

### 2. Adicionar ao Claude Code

```bash
# Adicionar servidor MCP
claude mcp add mcp-turso /caminho/completo/para/mcp-turso/start-mcp.sh

# Verificar conexão
claude mcp list
```

### 3. Reiniciar Claude Code

Após adicionar o servidor, reinicie o Claude Code para carregar as ferramentas.

## 🔧 Configuração Detalhada

### Obter Credenciais Turso

#### 1. API Token

```bash
# Login no Turso CLI
turso auth login

# Obter token
turso auth token
```

#### 2. Nome da Organização

```bash
# Listar organizações
turso org list

# Ou verificar no dashboard
# https://turso.tech/app
```

#### 3. Criar Banco de Dados

```bash
# Criar banco se não existir
turso db create context-memory

# Obter URL e token do banco
turso db show context-memory
```

### Configurar Variáveis no Script

Edite `start-mcp.sh` com suas credenciais:

```bash
export TURSO_API_TOKEN="eyJhbGciOiJSUzI1NiIs..."
export TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIs..."
export TURSO_ORGANIZATION="sua-org"
export TURSO_DEFAULT_DATABASE="context-memory"
```

## ✅ Verificação e Testes

### 1. Testar Script Manualmente

```bash
# Executar script diretamente
./mcp-turso/start-mcp.sh

# Deve mostrar:
# Turso MCP server running on stdio
```

### 2. Verificar no Claude Code

```bash
claude mcp list

# Resultado esperado:
# mcp-turso: /path/to/start-mcp.sh - ✓ Connected
```

### 3. Testar Ferramentas

No Claude Code, digite `/mcp` para ver as ferramentas disponíveis.

## 🛠️ Uso das Ferramentas

### Exemplos Práticos

#### Listar Bancos de Dados

```typescript
// No Claude Code
await mcp__mcp-turso__list_databases()
```

#### Executar Consulta

```typescript
// Consulta read-only
await mcp__mcp-turso__execute_read_only_query({
  database: "context-memory",
  query: "SELECT * FROM conversations LIMIT 10"
})
```

#### Adicionar Conhecimento

```typescript
// Adicionar ao sistema de memória
await mcp__mcp-turso__add_knowledge({
  topic: "MCP Configuration",
  content: "Steps to configure MCP Turso in Claude Code",
  tags: "setup,mcp,turso"
})
```

#### Buscar Conhecimento

```typescript
// Buscar informações
await mcp__mcp-turso__search_knowledge({
  query: "MCP configuration",
  limit: 5
})
```

## 🔍 Troubleshooting

### Problema: "Failed to connect"

**Causas comuns:**
1. Variáveis de ambiente não configuradas
2. Script não executável
3. Caminho incorreto

**Soluções:**

```bash
# Verificar permissões
ls -la start-mcp.sh

# Testar script
./start-mcp.sh

# Verificar variáveis
echo $TURSO_API_TOKEN
```

### Problema: "Command not found"

**Solução:**

```bash
# Usar caminho absoluto
claude mcp add mcp-turso $(pwd)/mcp-turso/start-mcp.sh
```

### Problema: "No tools available"

**Solução:**
1. Reiniciar Claude Code
2. Verificar se o servidor está conectado
3. Digitar `/mcp` para recarregar

### Debug Avançado

```bash
# Ver logs do Claude
claude logs

# Executar com debug
DEBUG=* ./start-mcp.sh
```

## 📚 Referência de Ferramentas

### Gerenciamento de Bancos de Dados

| Ferramenta | Descrição | Segurança |
|------------|-----------|-----------|
| `list_databases` | Lista todos os bancos | ✅ Seguro |
| `create_database` | Cria novo banco | ✅ Seguro |
| `delete_database` | Remove banco | ⚠️ Destrutivo |
| `get_database_info` | Informações detalhadas | ✅ Seguro |

### Operações SQL

| Ferramenta | Descrição | Segurança |
|------------|-----------|-----------|
| `execute_read_only_query` | SELECT, PRAGMA, EXPLAIN | ✅ Seguro |
| `execute_query` | INSERT, UPDATE, DELETE | ⚠️ Destrutivo |
| `list_tables` | Lista tabelas | ✅ Seguro |
| `describe_table` | Schema da tabela | ✅ Seguro |

### Sistema de Memória

| Ferramenta | Descrição | Uso |
|------------|-----------|-----|
| `add_conversation` | Salva conversas | Histórico |
| `get_conversations` | Recupera conversas | Contexto |
| `add_knowledge` | Adiciona conhecimento | Base de conhecimento |
| `search_knowledge` | Busca conhecimento | Consultas |
| `setup_memory_tables` | Cria tabelas | Inicialização |

### Recursos Avançados

| Ferramenta | Descrição | Uso |
|------------|-----------|-----|
| `vector_search` | Busca por similaridade | IA/ML |
| `backup_database` | Cria backup | Segurança |
| `restore_database` | Restaura backup | Recuperação |
| `get_database_usage` | Métricas de uso | Monitoramento |

## 🎯 Melhores Práticas

1. **Segurança**
   - Nunca commitar credenciais
   - Use variáveis de ambiente
   - Rotacione tokens regularmente

2. **Performance**
   - Use `read_only_query` quando possível
   - Implemente cache para consultas frequentes
   - Limite resultados com `LIMIT`

3. **Organização**
   - Mantenha script `start-mcp.sh` versionado
   - Documente mudanças de configuração
   - Use tags no sistema de conhecimento

## 🚀 Próximos Passos

1. **Explorar ferramentas** - Digite `/mcp` no Claude Code
2. **Criar templates** - Salve consultas comuns
3. **Automatizar tarefas** - Use o sistema de memória
4. **Integrar workflows** - Combine com outras ferramentas

## 📝 Notas Finais

- **Versão:** MCP Turso Cloud v1.2.0
- **Compatibilidade:** Claude Code v0.4+
- **Suporte:** [GitHub Issues](https://github.com/diegofornalha/mcp-turso-cloud)

---

*Guia atualizado em: 03/08/2025*
*Status: ✅ Testado e funcionando*