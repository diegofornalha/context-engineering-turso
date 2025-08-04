# Configuração de MCP no Cursor Agent

## 📋 Resumo

Este documento descreve como configurar, atualizar e gerenciar servidores MCP (Model Context Protocol) no Cursor Agent, incluindo o processo de migração entre diferentes versões de servidores.

## 🔧 Configuração Básica

### Arquivo de Configuração
O Cursor Agent usa o arquivo `.cursor/mcp.json` para configurar servidores MCP:

```json
{
  "mcpServers": {
    "turso": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-turso/dist/index.js"],
      "env": {
        "TURSO_API_TOKEN": "seu_token_aqui",
        "TURSO_AUTH_TOKEN": "seu_auth_token_aqui",
        "TURSO_ORGANIZATION": "sua_organizacao",
        "TURSO_DEFAULT_DATABASE": "seu_banco"
      }
    }
  }
}
```

## 🔄 Processo de Atualização de Servidor

### Cenário: Migração de Servidor Antigo para Unificado

**Problema Identificado:**
- Servidor antigo: 10 tools (incluindo conversation/knowledge)
- Servidor unificado: 6 tools essenciais (foco em banco de dados)
- Cursor Agent ainda mostrava "10 tools enabled" mesmo após unificação

**Solução Implementada:**

1. **Identificar o servidor atual:**
   ```json
   "args": ["./mcp-turso/dist/index.js"]
   ```

2. **Atualizar para o servidor unificado:**
   ```json
   "args": ["./mcp-turso/dist/index-unified-simple.js"]
   ```

3. **Manter as variáveis de ambiente:**
   ```json
   "env": {
     "TURSO_API_TOKEN": "...",
     "TURSO_AUTH_TOKEN": "...",
     "TURSO_ORGANIZATION": "diegofornalha",
     "TURSO_DEFAULT_DATABASE": "context-memory"
   }
   ```

## 🛠️ Tools Disponíveis por Versão

### Servidor Antigo (10 tools)
1. `turso_list_databases`
2. `turso_execute_query`
3. `turso_execute_read_only_query`
4. `turso_list_tables`
5. `turso_describe_table`
6. `turso_add_conversation` ⚠️ (problemático)
7. `turso_get_conversations`
8. `turso_add_knowledge`
9. `turso_search_knowledge` ⚠️ (schema inconsistente)
10. `turso_setup_memory_tables`

### Servidor Unificado (6 tools)
1. `list_databases`
2. `get_database_info`
3. `list_tables`
4. `describe_table`
5. `execute_read_only_query`
6. `execute_query`

## 🔍 Diagnóstico de Problemas

### Como Verificar Qual Servidor Está Ativo

1. **Verificar o arquivo de configuração:**
   ```bash
   cat .cursor/mcp.json
   ```

2. **Testar tools específicas:**
   ```python
   # Se estas tools funcionam, está usando servidor antigo
   mcp_turso_turso_add_conversation()
   mcp_turso_turso_search_knowledge()
   
   # Se estas tools funcionam, está usando servidor unificado
   mcp_turso_turso_get_database_info()
   ```

3. **Verificar contagem de tools na interface:**
   - Antigo: "10 tools enabled"
   - Unificado: "6 tools enabled"

## 🚀 Processo de Atualização

### Passo a Passo

1. **Fazer backup da configuração atual:**
   ```bash
   cp .cursor/mcp.json .cursor/mcp.json.backup
   ```

2. **Editar o arquivo de configuração:**
   ```json
   {
     "mcpServers": {
       "turso": {
         "type": "stdio",
         "command": "node",
         "args": ["./mcp-turso/dist/index-unified-simple.js"],
         "env": {
           // manter as mesmas variáveis de ambiente
         }
       }
     }
   }
   ```

3. **Reiniciar o Cursor Agent:**
   - Fechar e abrir novamente o Cursor
   - Ou recarregar a janela (Cmd+Shift+P → "Developer: Reload Window")

4. **Verificar a atualização:**
   - Interface deve mostrar "6 tools enabled"
   - Testar as novas tools disponíveis

## ⚠️ Problemas Comuns

### 1. Servidor Não Atualiza
**Sintoma:** Interface ainda mostra tools antigas
**Solução:** 
- Verificar se o arquivo foi salvo corretamente
- Reiniciar completamente o Cursor Agent
- Verificar se o arquivo `index-unified-simple.js` existe

### 2. Erro de Conectividade
**Sintoma:** "Failed to connect" ou "Connection refused"
**Solução:**
- Verificar se o Node.js está instalado
- Verificar se as variáveis de ambiente estão corretas
- Verificar se o arquivo do servidor existe no caminho especificado

### 3. Tools Não Funcionam
**Sintoma:** Tools aparecem mas retornam erro
**Solução:**
- Verificar logs do servidor MCP
- Verificar se o banco de dados está acessível
- Verificar se os tokens de autenticação são válidos

## 📊 Monitoramento

### Como Verificar Status

1. **Interface do Cursor:**
   - Avatar do servidor com indicador verde
   - Texto "X tools enabled"

2. **Teste de Funcionalidade:**
   ```python
   # Teste básico
   mcp_turso_turso_list_databases()
   
   # Teste de query
   mcp_turso_turso_execute_read_only_query("SELECT 1")
   ```

3. **Logs do Servidor:**
   - Verificar saída no terminal do Cursor
   - Verificar arquivos de log do servidor MCP

## 🎯 Melhores Práticas

1. **Sempre fazer backup** antes de alterar configurações
2. **Testar em ambiente de desenvolvimento** antes de produção
3. **Documentar mudanças** para referência futura
4. **Manter versões dos servidores** organizadas
5. **Usar nomes descritivos** para diferentes versões

## 📝 Exemplo de Configuração Completa

```json
{
  "mcpServers": {
    "turso-unified": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-turso/dist/index-unified-simple.js"],
      "env": {
        "TURSO_API_TOKEN": "eyJhbGciOiJSUzI1NiIs...",
        "TURSO_AUTH_TOKEN": "eyJhbGciOiJFZERTQSIs...",
        "TURSO_ORGANIZATION": "diegofornalha",
        "TURSO_DEFAULT_DATABASE": "context-memory"
      }
    },
    "turso-legacy": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-turso/dist/index.js"],
      "env": {
        "TURSO_API_TOKEN": "eyJhbGciOiJSUzI1NiIs...",
        "TURSO_AUTH_TOKEN": "eyJhbGciOiJFZERTQSIs...",
        "TURSO_ORGANIZATION": "diegofornalha",
        "TURSO_DEFAULT_DATABASE": "context-memory"
      }
    }
  }
}
```

---

**Data da Documentação:** 04/08/2025  
**Versão:** 1.0  
**Status:** ✅ Atualizado e testado  
**Ambiente:** Cursor Agent + MCP Turso Unificado 