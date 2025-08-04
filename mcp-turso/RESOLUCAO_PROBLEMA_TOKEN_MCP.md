# Resolução do Problema de Autenticação do MCP Turso no Claude Code

## 📋 Sumário do Problema

O MCP Turso estava retornando erro HTTP 401 (não autorizado) ao tentar executar consultas no banco de dados `context-memory`, mesmo estando conectado ao Claude Code.

## 🔍 Diagnóstico Inicial

### 1. Verificação do Status da Conexão

```bash
claude mcp list
# Resultado: turso: ✓ Connected
```

O servidor MCP estava conectado, mas as ferramentas retornavam erro 401:

```
mcp__turso__execute_read_only_query → Error 401
mcp__turso__get_database_info → Error 401
mcp__turso__list_databases → ✅ Funcionava (listava "context-memory")
```

### 2. Identificação do Problema

- **Sintoma**: Apenas `list_databases` funcionava, operações no banco falhavam
- **Diagnóstico**: Token de autenticação do banco expirado ou inválido
- **Causa Raiz**: Múltiplos arquivos de configuração com tokens desatualizados

## 🛠️ Processo de Resolução Detalhado

### Passo 1: Identificação dos Arquivos de Configuração

Descobrimos que existiam **três locais** onde o token estava configurado:

1. `/mcp-turso/.env` - Arquivo de variáveis de ambiente do subdiretório
2. `/.env` - Arquivo de variáveis de ambiente do diretório pai
3. `/mcp-turso/start-mcp.sh` - Script de inicialização com tokens hardcoded

### Passo 2: Análise do Script de Inicialização

```bash
cat /mcp-turso/start-mcp.sh
```

Descobrimos que o script tinha as variáveis **hardcoded**:

```bash
export TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9..."  # Token antigo
export TURSO_ORGANIZATION="diegofornalha"
export TURSO_DEFAULT_DATABASE="context-memory"
```

**Problema**: O script não estava lendo do arquivo `.env`, mas usando valores fixos no código.

### Passo 3: Obtenção do Novo Token

O usuário gerou um novo token com permissões de leitura/escrita (`"a":"rw"`):

```
eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTQyOTk1NDYsImlkIjoiOTUwY2ExMGUtN2EzMi00ODgwLTkyYjgtOTNkMTdmZTZjZTBkIiwicmlkIjoiZWU2YTJlNmYtMDViYy00NWIzLWEyOTgtN2Q0NzE3NTE0YjRiIn0.OxnLTNVp7dzXSsHrKkzyuE-MAAV0_D-LEaYiOnscNMCqOCOxAqYYVE_RQ2SoiNzLHbZDQOFtfwp78bHWvYDtDg
```

### Passo 4: Atualização do Script start-mcp.sh

```bash
# Editamos o arquivo start-mcp.sh
# DE:
export TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTQxNzIwODYi..."

# PARA:
export TURSO_AUTH_TOKEN="eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTQyOTk1NDYi..."
```

### Passo 5: Atualização dos Arquivos .env (Por Precaução)

Atualizamos ambos os arquivos `.env` para manter consistência:

1. `/mcp-turso/.env`
2. `/.env` (diretório pai)

### Passo 6: Reinicialização do Servidor MCP

```bash
# Remover configuração antiga
claude mcp remove turso -s local

# Adicionar novamente com o script atualizado
claude mcp add turso -- /bin/bash /Users/agents/Desktop/claude-20x/agents-a2a/.conductor/kinshasa/context-engineering-turso/mcp-turso/start-mcp.sh

# Aguardar inicialização
sleep 3
```

### Passo 7: Teste de Verificação

```sql
-- Teste 1: Listar tabelas
SELECT name FROM sqlite_master WHERE type='table'
-- Resultado: ✅ Retornou "docs_turso" e "sqlite_sequence"

-- Teste 2: Verificar estrutura
PRAGMA table_info(docs_turso)
-- Resultado: ✅ Retornou 16 colunas da tabela

-- Teste 3: Inserir dados
INSERT INTO docs_turso (file_name, title, content) VALUES (...)
-- Resultado: ✅ Inserção bem-sucedida, ID 22

-- Teste 4: Consultar dados
SELECT * FROM docs_turso ORDER BY id DESC LIMIT 5
-- Resultado: ✅ Retornou 5 registros incluindo o novo
```

## 📊 Análise Técnica do Problema

### Por que apenas list_databases funcionava?

1. **list_databases**: Usa apenas a API Token (TURSO_API_TOKEN) para listar bancos da organização
2. **execute_query**: Precisa do Auth Token (TURSO_AUTH_TOKEN) específico do banco

### Estrutura de Autenticação do Turso:

- **API Token**: Autenticação na plataforma Turso (operações administrativas)
- **Auth Token**: Autenticação no banco de dados específico (operações SQL)

## ✅ Solução Final

### 1. Configuração Correta do start-mcp.sh

```bash
#!/bin/bash
export TURSO_API_TOKEN="[API_TOKEN_VALIDO]"
export TURSO_AUTH_TOKEN="[AUTH_TOKEN_NOVO_COM_PERMISSOES_RW]"
export TURSO_ORGANIZATION="diegofornalha"
export TURSO_DEFAULT_DATABASE="context-memory"

cd "$(dirname "$0")"
exec node dist/index-hybrid.js
```

### 2. Comando de Configuração no Claude Code

```bash
claude mcp add turso -- /bin/bash /caminho/completo/para/start-mcp.sh
```

## 🎯 Lições Aprendidas

1. **Sempre verificar múltiplos arquivos de configuração**
   - Scripts podem ter valores hardcoded
   - Arquivos .env podem estar em múltiplos diretórios

2. **Entender a diferença entre tokens**
   - API Token: Acesso à plataforma
   - Auth Token: Acesso ao banco específico

3. **Importância dos caminhos absolutos**
   - Usar `/bin/bash` em vez de apenas `bash`
   - Usar caminho completo para o script

4. **Testar incrementalmente**
   - Primeiro verificar conexão básica
   - Depois testar operações que requerem autenticação

## 🔧 Comando de Debug Útil

Para debug futuro, use:

```bash
claude --debug
```

Isso mostrará logs detalhados incluindo erros de autenticação.

## 📝 Checklist de Resolução de Problemas MCP

- [ ] Verificar status de conexão com `claude mcp list`
- [ ] Testar ferramentas básicas (list) vs avançadas (query)
- [ ] Verificar todos os arquivos de configuração
- [ ] Confirmar tokens válidos e com permissões corretas
- [ ] Reiniciar servidor MCP após mudanças
- [ ] Testar com consultas simples primeiro

---

**Data da Resolução**: 04/08/2025  
**Tempo de Resolução**: ~15 minutos  
**Status Final**: ✅ MCP Turso funcionando perfeitamente no Claude Code