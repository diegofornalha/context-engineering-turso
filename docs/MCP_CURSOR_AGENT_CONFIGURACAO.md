# Configuração de MCP no Cursor Agent

## 📋 Resumo

Este documento descreve como configurar e gerenciar servidores MCP (Model Context Protocol) no Cursor Agent, especificamente para o servidor MCP Turso unificado com 6 tools essenciais.

## 🔧 Configuração Atual

### Arquivo de Configuração
O Cursor Agent usa o arquivo `.cursor/mcp.json` para configurar servidores MCP:

```json
{
  "mcpServers": {
    "turso": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-turso/dist/index-unified-simple.js"],
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

## 🛠️ Tools Disponíveis (Servidor Unificado)

O servidor MCP Turso unificado oferece **6 tools essenciais** focadas em operações de banco de dados:

1. **`list_databases`** - Lista todos os bancos de dados disponíveis
2. **`get_database_info`** - Obtém informações detalhadas do banco
3. **`list_tables`** - Lista todas as tabelas no banco de dados
4. **`describe_table`** - Mostra o schema de uma tabela específica
5. **`execute_read_only_query`** - Executa consultas de leitura (SELECT, PRAGMA, EXPLAIN)
6. **`execute_query`** - Executa qualquer consulta SQL (INSERT, UPDATE, DELETE, etc.)

## 🔍 Como Verificar Status

### 1. Interface do Cursor Agent
- Avatar do servidor com indicador verde
- Texto "6 tools enabled"
- Status: ✓ Connected

### 2. Teste de Funcionalidade
```python
# Teste básico - listar bancos
mcp_turso_turso_list_databases()

# Teste de query simples
mcp_turso_turso_execute_read_only_query("SELECT 1")

# Teste de listagem de tabelas
mcp_turso_turso_execute_read_only_query("SELECT name FROM sqlite_master WHERE type='table'")
```

### 3. Verificar Configuração Atual
```bash
cat .cursor/mcp.json
```

## 🚀 Processo de Configuração

### Passo a Passo

1. **Criar/editar o arquivo de configuração:**
   ```bash
   mkdir -p .cursor
   nano .cursor/mcp.json
   ```

2. **Adicionar configuração do servidor:**
   ```json
   {
     "mcpServers": {
       "turso": {
         "type": "stdio",
         "command": "node",
         "args": ["./mcp-turso/dist/index-unified-simple.js"],
         "env": {
           "TURSO_API_TOKEN": "seu_token_aqui",
           "TURSO_AUTH_TOKEN": "seu_auth_token_aqui",
           "TURSO_ORGANIZATION": "diegofornalha",
           "TURSO_DEFAULT_DATABASE": "context-memory"
         }
       }
     }
   }
   ```

3. **Reiniciar o Cursor Agent:**
   - Fechar e abrir novamente o Cursor
   - Ou recarregar a janela (Cmd+Shift+P → "Developer: Reload Window")

4. **Verificar a conexão:**
   - Interface deve mostrar "6 tools enabled"
   - Testar as tools disponíveis

## ⚠️ Troubleshooting

### 1. Servidor Não Conecta
**Sintoma:** "Failed to connect" ou "Connection refused"
**Soluções:**
- Verificar se o Node.js está instalado
- Verificar se as variáveis de ambiente estão corretas
- Verificar se o arquivo `index-unified-simple.js` existe

### 2. Tools Não Funcionam
**Sintoma:** Tools aparecem mas retornam erro
**Soluções:**
- Verificar logs do servidor MCP
- Verificar se o banco de dados está acessível
- Verificar se os tokens de autenticação são válidos

### 3. Configuração Não Atualiza
**Sintoma:** Interface ainda mostra configuração antiga
**Soluções:**
- Verificar se o arquivo foi salvo corretamente
- Reiniciar completamente o Cursor Agent
- Verificar se o arquivo `index-unified-simple.js` existe

## 📊 Monitoramento

### Logs do Servidor
- Verificar saída no terminal do Cursor
- Verificar arquivos de log do servidor MCP

### Testes de Funcionalidade
```python
# Teste completo das 6 tools
mcp_turso_turso_list_databases()  # 1. Listar bancos
mcp_turso_turso_execute_read_only_query("SELECT name FROM sqlite_master WHERE type='table'")  # 2. Listar tabelas
mcp_turso_turso_execute_read_only_query("SELECT COUNT(*) FROM docs_turso")  # 3. Contagem
mcp_turso_turso_execute_query("INSERT INTO docs_turso (file_name, title, content) VALUES ('teste.md', 'Teste', 'Conteúdo')")  # 4. Inserção
```

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
    "turso": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-turso/dist/index-unified-simple.js"],
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

## 🔄 Atualizações Futuras

Para atualizar o servidor MCP no futuro:

1. **Fazer backup da configuração atual:**
   ```bash
   cp .cursor/mcp.json .cursor/mcp.json.backup
   ```

2. **Atualizar o arquivo de configuração** com o novo servidor

3. **Reiniciar o Cursor Agent**

4. **Testar as novas funcionalidades**

---

**Data da Documentação:** 04/08/2025  
**Versão:** 1.0  
**Status:** ✅ Atualizado e testado  
**Ambiente:** Cursor Agent + MCP Turso Unificado (6 tools)  
**Servidor:** index-unified-simple.js 