# Configuração do MCP Turso no Claude Code

## Resumo
Este documento descreve o processo de configuração bem-sucedida do servidor MCP (Model Context Protocol) Turso no **Claude Code** (Anthropic's oficial CLI), incluindo os problemas encontrados e suas soluções para estabelecer uma conexão funcional.

## Problema Inicial
O servidor MCP Turso estava falhando ao conectar devido a:
1. Caminho relativo do script de inicialização
2. Falta de variáveis de ambiente no comando

## Solução Implementada

### 1. Preparação do Ambiente
- Verificamos que o projeto já estava compilado em `/dist`
- Confirmamos a existência do arquivo `.env` com as credenciais corretas
- O script `start-mcp.sh` já continha as variáveis de ambiente necessárias

### 2. Comando de Configuração Correto

```bash
cd /Users/agents/Desktop/claude-20x/agents-a2a/.conductor/kinshasa/context-engineering-turso/mcp-turso

claude mcp add turso -- /bin/bash /Users/agents/Desktop/claude-20x/agents-a2a/.conductor/kinshasa/context-engineering-turso/mcp-turso/start-mcp.sh
```

### Diferenças Chave da Configuração Bem-Sucedida:

1. **Caminho Absoluto**: Usamos o caminho completo `/bin/bash` e o caminho absoluto para o script
2. **Script de Inicialização**: O `start-mcp.sh` já contém:
   - Exportação das variáveis de ambiente (TURSO_API_TOKEN, TURSO_AUTH_TOKEN, etc.)
   - Comando para executar `node dist/index-hybrid.js`

## Variáveis de Ambiente Configuradas

O script `start-mcp.sh` configura automaticamente:
- `TURSO_API_TOKEN`: Token de API do Turso
- `TURSO_AUTH_TOKEN`: Token de autenticação do banco
- `TURSO_ORGANIZATION`: diegofornalha
- `TURSO_DEFAULT_DATABASE`: context-memory

## Verificação da Instalação

```bash
# Verificar status
claude mcp list

# Resultado esperado:
# turso: /bin/bash /Users/agents/Desktop/.../start-mcp.sh - ✓ Connected
```

## Ferramentas Disponíveis

Após a configuração, as seguintes ferramentas MCP ficam disponíveis:
- `mcp__turso__execute_read_only_query`: Executar consultas SELECT
- `mcp__turso__execute_query`: Executar qualquer consulta SQL
- `mcp__turso__list_databases`: Listar bancos de dados
- `mcp__turso__get_database_info`: Obter informações do banco

## Uso no Claude Code

Para usar o MCP Turso no Claude Code:
1. Digite `/mcp` no terminal do Claude Code
2. O menu interativo mostrará o servidor "turso" com status ✓ Connected
3. Selecione o servidor "turso" para ver as ferramentas disponíveis
4. Use as ferramentas MCP diretamente no chat do Claude Code (ex: as ferramentas aparecem como `mcp__turso__execute_query`)

### Importante
Esta configuração é específica para o **Claude Code** (CLI oficial da Anthropic), não para o Claude Desktop ou interface web. O MCP permite que o Claude Code acesse recursos externos de forma segura e controlada.

## Troubleshooting

Se o servidor falhar:
1. Remova a configuração existente: `claude mcp remove turso -s local`
2. Verifique se o arquivo `.env` existe e tem as credenciais corretas
3. Reconfigure usando o comando com caminho absoluto
4. Para ver logs de debug: `claude --debug`

## Arquivos Importantes

- `/mcp-turso/start-mcp.sh`: Script de inicialização com variáveis de ambiente
- `/mcp-turso/.env`: Arquivo com credenciais (não versionado)
- `/mcp-turso/dist/index-hybrid.js`: Servidor MCP compilado

## Contexto: Claude Code e MCP

O **Claude Code** é a CLI oficial da Anthropic que permite usar o Claude em ambiente de desenvolvimento. O MCP (Model Context Protocol) é um protocolo aberto que permite ao Claude Code conectar-se a ferramentas e fontes de dados externas de forma segura.

### ⚠️ Importante: Diferença entre Claude Code e Cursor Agent

**Claude Code (CLI)** e **Cursor Agent** são ferramentas diferentes:

- **Claude Code**: CLI oficial da Anthropic (`claude` no terminal)
  - Interface de linha de comando
  - Usa o arquivo de configuração `~/.claude/settings.json`
  - Suporta MCP nativamente
  - Comando de configuração: `claude mcp add`

- **Cursor Agent**: IDE Cursor com integração do Claude
  - Interface gráfica (IDE)
  - Usa configuração própria do Cursor
  - Integração via API da Anthropic
  - Também suporta MCP, mas com configuração diferente

**Esta documentação é específica para o Claude Code CLI**, não para o Cursor Agent.

Esta configuração específica permite que o Claude Code:
- Conecte-se diretamente aos bancos de dados Turso
- Execute consultas SQL através do chat
- Gerencie bancos de dados sem sair do ambiente de desenvolvimento
- Mantenha o contexto entre sessões usando o banco de dados

---

**Data da Configuração**: 04/08/2025  
**Ambiente**: Claude Code (CLI)  
**Status**: ✅ Funcionando corretamente - MCP Turso conectado ao Claude Code