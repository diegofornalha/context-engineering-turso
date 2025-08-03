# 🔌 Demonstração: Subagent PRP + MCP Integration

## Como o Subagent PRP se Comunica com MCPs

O subagent PRP-specialist tem acesso total às ferramentas MCP configuradas no Claude Code. Aqui está como funciona:

### 🛠️ Ferramentas MCP Disponíveis para o Subagent

```yaml
tools:
  # MCP Turso - Banco de dados
  - mcp__mcp-turso__add_knowledge      # Adicionar conhecimento
  - mcp__mcp-turso__search_knowledge   # Buscar conhecimento
  - mcp__mcp-turso__execute_query      # Executar queries SQL
  
  # MCP Claude Flow - Memória e coordenação
  - mcp__claude-flow__memory_usage     # Memória persistente
  
  # Ferramentas nativas do Claude Code
  - Read                                # Ler arquivos
  - Write                               # Escrever arquivos
  - Edit                                # Editar arquivos
  - Bash                                # Executar comandos
```

## 📊 Exemplos de Uso

### 1. Armazenar PRP no Turso via MCP

Quando o subagent gera um PRP, ele pode automaticamente salvá-lo no banco Turso:

```javascript
// O subagent executa internamente:
await mcp__mcp_turso__add_knowledge({
  topic: "PRP_BRIEFING_SPECIALIST",
  content: prpContent,
  tags: "prp,briefing,specialist,agent",
  source: "prp-specialist-subagent",
  metadata: {
    version: "1.0.0",
    author: "Claude Flow System",
    created_at: new Date().toISOString()
  }
});
```

### 2. Buscar PRPs Existentes

Antes de criar um novo PRP, o subagent consulta PRPs similares:

```javascript
// Busca por PRPs relacionados
const existingPRPs = await mcp__mcp_turso__search_knowledge({
  query: "briefing agent specialist",
  limit: 5
});

// Se encontrar PRPs similares, pode reutilizar ou criar referências cruzadas
if (existingPRPs.length > 0) {
  console.log("PRPs relacionados encontrados:", existingPRPs);
}
```

### 3. Usar Memória Persistente do Claude Flow

O subagent pode armazenar contexto entre sessões:

```javascript
// Salvar progresso na memória
await mcp__claude_flow__memory_usage({
  action: "store",
  key: "prp/generation/briefing_specialist",
  value: {
    status: "completed",
    prp_id: "PRP_BRIEFING_SPECIALIST",
    timestamp: Date.now(),
    related_prps: ["PRP_REPORTING", "PRP_ANALYTICS"]
  },
  namespace: "prp_system"
});

// Recuperar contexto anterior
const previousContext = await mcp__claude_flow__memory_usage({
  action: "retrieve",
  key: "prp/generation/briefing_specialist",
  namespace: "prp_system"
});
```

### 4. Executar Queries Customizadas

Para análises mais complexas:

```javascript
// Contar PRPs por categoria
const stats = await mcp__mcp_turso__execute_query({
  database: "context-memory",
  query: `
    SELECT 
      json_extract(metadata, '$.category') as category,
      COUNT(*) as count
    FROM knowledge
    WHERE topic LIKE 'PRP_%'
    GROUP BY category
  `
});
```

## 🔄 Fluxo Completo de Integração

### Quando você usa o subagent PRP:

```bash
Task({
  description: "Generate Briefing PRP",
  prompt: "Create a PRP for a briefing agent",
  subagent_type: "prp-specialist"
})
```

### O que acontece internamente:

1. **Pre-hook**: Configura ambiente Python e carrega contexto
2. **Busca Existentes**: Usa `mcp__mcp_turso__search_knowledge`
3. **Gera PRP**: Cria conteúdo usando templates ou prp-agent
4. **Valida**: Verifica estrutura e formato
5. **Armazena**: 
   - Salva arquivo local com `Write`
   - Salva no Turso com `mcp__mcp_turso__add_knowledge`
   - Atualiza memória com `mcp__claude_flow__memory_usage`
6. **Post-hook**: Limpa ambiente e registra operação

## 🎯 Benefícios da Integração MCP

### 1. **Persistência Automática**
- PRPs salvos automaticamente no banco
- Histórico de versões mantido
- Busca rápida por conteúdo

### 2. **Contexto Compartilhado**
- Memória entre sessões
- Compartilhamento entre agentes
- Aprendizado contínuo

### 3. **Análise Avançada**
- Queries SQL customizadas
- Estatísticas de uso
- Relacionamentos entre PRPs

### 4. **Sem Código Extra**
- MCPs já configurados no Claude Code
- Subagent usa ferramentas diretamente
- Integração transparente

## 💡 Dicas de Uso

### Comando Completo com Contexto

```javascript
Task({
  description: "Generate and store PRP",
  prompt: `
    Generate a comprehensive PRP for a Data Analytics Dashboard Agent with:
    - Real-time data processing capabilities
    - Multiple visualization types
    - Export functionality
    
    Store in Turso with tags: analytics, dashboard, visualization
    Check for similar PRPs first and create cross-references
  `,
  subagent_type: "prp-specialist"
})
```

### Buscar PRPs Existentes

```javascript
Task({
  description: "Search PRPs",
  prompt: "Find all PRPs related to data visualization and dashboards",
  subagent_type: "prp-specialist"
})
```

### Atualizar PRP com Versionamento

```javascript
Task({
  description: "Update PRP",
  prompt: `
    Update PRP_BRIEFING_SPECIALIST:
    - Add section about MCP integration
    - Include examples of using MCP Turso
    - Update version to 1.1.0
    - Keep version history
  `,
  subagent_type: "prp-specialist"
})
```

## 🚀 Configuração Adicional (Opcional)

### Adicionar Mais MCPs ao Subagent

Edite `/Users/agents/Desktop/context-engineering-turso/.claude/agents/specialized/prp/prp-specialist.md`:

```yaml
tools:
  # Ferramentas existentes...
  
  # Adicionar MCP Briefing quando estiver pronto
  - mcp__mcp-briefing__generate_briefing
  - mcp__mcp-briefing__create_visualization
  
  # Adicionar outros MCPs conforme necessário
  - mcp__outro-mcp__ferramenta
```

## 📈 Monitoramento

O subagent registra todas as operações MCP:

```bash
# Logs aparecem no console do Claude Code
🧠 PRP Specialist Agent activated
📊 Loading PRP context from Turso...
✅ Stored PRP in Turso: PRP_BRIEFING_SPECIALIST
💾 Updated memory with operation metadata
```

---

**Resumo**: O subagent PRP já está totalmente integrado com os MCPs disponíveis no Claude Code. Ele pode armazenar, buscar e gerenciar PRPs usando as ferramentas MCP de forma transparente e automática!