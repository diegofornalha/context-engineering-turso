# 🌉 MCP Bridge para Subagents

## O Problema

Subagents criados via Task tool não têm acesso direto às ferramentas MCP (`mcp__*`). Isso ocorre porque:
- Subagents rodam em contexto isolado
- Ferramentas MCP são registradas no contexto principal do Claude Code
- Task tool não propaga automaticamente as ferramentas MCP

## A Solução: MCP Bridge Pattern

### 1. **Subagent Solicita ao Contexto Principal**

O subagent não executa MCPs diretamente, mas solicita ao Claude Code principal:

```javascript
// No subagent:
// Em vez de: await mcp__mcp_turso__search_knowledge({...})
// Use: Retorne instruções para o contexto principal executar

return {
  mcp_operations: [
    {
      tool: "mcp__mcp_turso__search_knowledge",
      params: { query: "briefing", limit: 5 }
    },
    {
      tool: "mcp__mcp_turso__add_knowledge",
      params: { topic: "PRP_X", content: "..." }
    }
  ]
};
```

### 2. **Contexto Principal Executa**

Após o subagent retornar, o Claude Code principal executa as operações MCP:

```javascript
// Claude Code principal recebe o resultado do subagent
const result = await Task({...});

// Executa operações MCP solicitadas
if (result.mcp_operations) {
  for (const op of result.mcp_operations) {
    await executeOperation(op.tool, op.params);
  }
}
```

## 📋 Padrão Recomendado para Subagents

### Template para Subagents com MCP

```markdown
# Subagent com MCP Bridge

You are a specialized subagent that needs MCP access.

## Your Workflow:
1. Perform your specialized tasks
2. Return a structured response with:
   - results: Your work output
   - mcp_requests: Array of MCP operations needed

## Response Format:
```json
{
  "results": {
    "generated_prp": "content...",
    "validation": "passed"
  },
  "mcp_requests": [
    {
      "operation": "store_knowledge",
      "tool": "mcp__mcp_turso__add_knowledge",
      "params": {
        "topic": "PRP_NAME",
        "content": "...",
        "tags": "..."
      }
    }
  ]
}
```
```

## 🔧 Implementação Prática

### Subagent PRP com MCP Bridge

```javascript
Task({
  description: "Generate PRP with MCP storage",
  prompt: `
    Generate a PRP for [topic] and return:
    
    1. The complete PRP content
    2. MCP operations to:
       - Search for similar PRPs
       - Store the new PRP
       - Update memory
    
    Return in format:
    {
      "prp": { ... },
      "mcp_operations": [ ... ]
    }
  `,
  subagent_type: "subagent-expert"
})
```

### Processar Resultado no Contexto Principal

```javascript
// Após receber resultado do subagent
const subagentResult = JSON.parse(result);

// Executar operações MCP solicitadas
for (const op of subagentResult.mcp_operations) {
  switch(op.tool) {
    case "mcp__mcp_turso__add_knowledge":
      await mcp__mcp_turso__add_knowledge(op.params);
      break;
    case "mcp__claude_flow__memory_usage":
      await mcp__claude_flow__memory_usage(op.params);
      break;
    // ... outros casos
  }
}
```

## 🎯 Alternativa: Usar Claude Code Diretamente

Para operações que precisam de MCP intensivo, considere:

1. **Subagent para lógica**: Gera conteúdo e validação
2. **Claude Code para MCP**: Executa armazenamento e busca

```javascript
// Passo 1: Subagent gera PRP
const prp = await Task({
  description: "Generate PRP",
  prompt: "Create PRP for topic X",
  subagent_type: "prp-specialist"
});

// Passo 2: Claude Code armazena via MCP
await mcp__mcp_turso__add_knowledge({
  topic: prp.id,
  content: prp.content,
  tags: prp.tags
});

await mcp__claude_flow__memory_usage({
  action: "store",
  key: `prp/${prp.id}`,
  value: prp.metadata
});
```

## 💡 Melhores Práticas

1. **Separação de Responsabilidades**
   - Subagents: Lógica especializada e geração de conteúdo
   - Claude Code: Orquestração e operações MCP

2. **Documentação Clara**
   - Sempre documente quais MCPs o subagent precisa
   - Forneça exemplos de integração

3. **Fallback Gracioso**
   - Subagents devem funcionar sem MCP se possível
   - Retornar instruções claras sobre operações MCP necessárias

4. **Validação**
   - Validar parâmetros MCP antes de solicitar execução
   - Incluir error handling nas solicitações

## 🚀 Roadmap Futura

Possíveis melhorias para integração subagent-MCP:

1. **MCP Proxy**: Serviço intermediário para subagents
2. **Task Tool Enhancement**: Propagação automática de MCPs
3. **Declarative MCP**: Subagents declaram MCPs necessários
4. **Async MCP Queue**: Fila de operações MCP para execução

---

**Conclusão**: Embora subagents não tenham acesso direto a MCPs, o padrão MCP Bridge permite integração efetiva através do contexto principal do Claude Code.