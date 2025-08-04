# Registro de Aprendizado: Conexão com Turso via MCP

**Data:** 4 de agosto de 2025

## Descoberta

Foi confirmado durante a interação que as ferramentas `turso_*` estão operando contra o banco de dados `context-memory-diegofornalha` na plataforma Turso.

## Mecanismo de Conexão

O fluxo de comunicação para acesso ao banco de dados ocorre da seguinte maneira:

1.  O agente Gemini invoca uma ferramenta (ex: `turso_execute_query`).
2.  A chamada é direcionada ao servidor `mcp-turso`.
3.  O servidor `mcp-turso` utiliza as credenciais configuradas em seu ambiente para se conectar ao banco de dados Turso e executar a operação.

## Credenciais Utilizadas pelo Servidor MCP

-   **URL do Banco:** `libsql://context-memory-diegofornalha.aws-us-east-1.turso.io`
-   **Token de Autenticação:** O token é gerenciado como uma variável de ambiente no servidor `mcp-turso` e **não deve ser armazenado em arquivos de código ou documentação** por razões de segurança.

Este processo garante que as credenciais sensíveis não são expostas ou manipuladas diretamente pelo agente, centralizando a responsabilidade da conexão no servidor MCP.
