# 🔧 Problemas de Código e Soluções Concretas

## 1. 🔄 Duplicação de Agentes - Exemplos Práticos

### ❌ PROBLEMA ATUAL: Dois Sistemas de Agentes

```javascript
// Sistema 1: Agentes Locais (em .claude/agents/)
Task(
  "You are a coder agent as defined in .claude/agents/core/coder.md...",
  "Implement authentication",
  "coder"
)

// Sistema 2: Mock Agents do Claude Flow
mcp__claude-flow__agent_spawn({ type: "coder", name: "Coder Agent" })
```

### ✅ SOLUÇÃO: Sistema Único

```javascript
// APENAS usar agentes locais com Task tool
async function spawnAgent(agentType, task) {
  // 1. Ler definição do agente local
  const agentDef = await Read(`.claude/agents/${agentType}.md`);
  
  // 2. Usar Task tool com definição completa
  await Task(agentDef.content, task, agentType);
  
  // 3. Claude Flow apenas para coordenação/memória
  await mcp__claude-flow__memory_usage({
    action: "store",
    key: `agent/${agentType}/task`,
    value: { task, timestamp: Date.now() }
  });
}
```

## 2. 🏗️ Complexidade Arquitetural - Fluxos Confusos

### ❌ PROBLEMA: Múltiplos Caminhos para Mesma Tarefa

```javascript
// Caminho 1: PRP → SPARC → Swarm → Claude Flow
npx prp generate --research
npx claude-flow sparc run spec-pseudocode
mcp__claude-flow__swarm_init
mcp__claude-flow__task_orchestrate

// Caminho 2: Direto com Claude Flow
mcp__claude-flow__swarm_init
mcp__claude-flow__agent_spawn (múltiplas vezes)

// Caminho 3: SPARC standalone
npx claude-flow sparc tdd "feature"

// Confuso! Qual usar?
```

### ✅ SOLUÇÃO: Fluxo Único e Claro

```javascript
// Decisão clara baseada no contexto
function chooseWorkflow(projectType) {
  switch(projectType) {
    case 'research-heavy':
      // PRP para pesquisa, depois desenvolvimento normal
      return {
        phase1: 'npx prp generate --research',
        phase2: 'Desenvolvimento com agentes locais'
      };
      
    case 'tdd-focused':
      // SPARC direto para TDD
      return {
        phase1: 'npx claude-flow sparc tdd',
        phase2: 'Refinamento iterativo'
      };
      
    case 'standard':
      // Desenvolvimento normal com agentes locais
      return {
        phase1: 'Task com agentes locais',
        phase2: 'Claude Flow apenas para memória'
      };
  }
}
```

## 3. 📝 Instruções Contraditórias - CLAUDE.md

### ❌ PROBLEMA: Múltiplos CLAUDE.md com Instruções Diferentes

```markdown
<!-- /Users/agents/.claude/CLAUDE.md -->
## MANDATORY: Use mcp__claude-flow__agent_spawn for all agents

<!-- /project/CLAUDE.md -->
## MANDATORY: Use local agents from .claude/agents/
```

### ✅ SOLUÇÃO: Documentação Unificada

```markdown
<!-- CLAUDE.md único e definitivo -->
# Sistema de Desenvolvimento Integrado

## 1. Sistema de Agentes
- ✅ USAR: Agentes locais em .claude/agents/
- ❌ NÃO USAR: mcp__claude-flow__agent_spawn
- Razão: Agentes locais têm definições completas

## 2. Metodologia
- Pesquisa intensiva? → Use PRP
- Desenvolvimento TDD? → Use SPARC
- Projeto padrão? → Use agentes locais direto

## 3. Coordenação
- Claude Flow: APENAS para memória e coordenação
- Não para criar agentes ou executar código
```

## 4. 🐛 Hooks Duplicados e Conflitantes

### ❌ PROBLEMA: Múltiplos Hooks Fazendo a Mesma Coisa

```json
// settings.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "command": "npx claude-flow@alpha hooks post-edit --format true"
      }
    ]
  }
}

// Agente também define hooks
"hooks:
  post: |
    npx claude-flow@alpha hooks post-edit --update-memory true"
```

### ✅ SOLUÇÃO: Hierarquia Clara de Hooks

```javascript
// Hook manager unificado
class HookManager {
  constructor() {
    this.hooks = {
      global: {}, // De settings.json
      agent: {},  // Do agente atual
      task: {}    // Da tarefa específica
    };
  }
  
  async execute(event, context) {
    // Ordem de precedência: task > agent > global
    const hooksToRun = [
      ...this.hooks.global[event] || [],
      ...this.hooks.agent[event] || [],
      ...this.hooks.task[event] || []
    ];
    
    // Deduplica e executa
    const unique = [...new Set(hooksToRun)];
    for (const hook of unique) {
      await this.runHook(hook, context);
    }
  }
}
```

## 5. 🔀 Padrões de Uso Inconsistentes

### ❌ PROBLEMA: Diferentes Formas de Fazer Batch

```javascript
// Forma 1: Instruções dizem usar BatchTool
[BatchTool]:
  - TodoWrite { todos: [...] }
  - Task("agent1")
  - Task("agent2")

// Forma 2: Mensagem única sem BatchTool
TodoWrite { todos: [...] }
Task("agent1")
Task("agent2")

// Forma 3: Sequential (errado mas acontece)
Message 1: TodoWrite
Message 2: Task
```

### ✅ SOLUÇÃO: Padrão Único e Claro

```javascript
// SEMPRE em uma mensagem, com ou sem BatchTool wrapper
async function executeParallelOperations(operations) {
  // Validar que todas operações estão batched
  if (operations.length < 2) {
    console.warn("⚠️ Considere agrupar mais operações");
  }
  
  // Executar tudo em paralelo
  await Promise.all(operations.map(op => {
    switch(op.type) {
      case 'todo': return TodoWrite(op.todos);
      case 'task': return Task(op.agent, op.work);
      case 'file': return op.action(op.path, op.content);
    }
  }));
  
  // Uma notificação para todas operações
  await notify("Batch de operações concluído");
}
```

## 6. 🗄️ Estado e Memória Fragmentados

### ❌ PROBLEMA: Múltiplos Sistemas de Memória

```javascript
// Sistema 1: Claude Flow memory
mcp__claude-flow__memory_usage({ key: "project/state" })

// Sistema 2: Arquivos locais
Write(".claude/state.json", state)

// Sistema 3: Hooks salvando em SQLite
npx claude-flow@alpha hooks post-edit --update-memory

// Onde está a verdade?
```

### ✅ SOLUÇÃO: Sistema de Memória Unificado

```javascript
class UnifiedMemory {
  constructor() {
    this.backends = {
      primary: 'claude-flow',    // Para coordenação
      cache: 'sqlite',          // Para performance
      backup: 'files'           // Para durabilidade
    };
  }
  
  async store(key, value) {
    // Sempre salvar no primary
    await mcp__claude-flow__memory_usage({
      action: 'store',
      key,
      value
    });
    
    // Cache local para acesso rápido
    await this.updateCache(key, value);
    
    // Backup periódico em arquivos
    if (this.shouldBackup(key)) {
      await this.backupToFile(key, value);
    }
  }
  
  async retrieve(key) {
    // Tentar cache primeiro
    const cached = await this.getFromCache(key);
    if (cached && !this.isStale(cached)) {
      return cached;
    }
    
    // Buscar do primary
    return await mcp__claude-flow__memory_usage({
      action: 'retrieve',
      key
    });
  }
}
```

## 🎯 Princípios para Código Limpo

### 1. **Single Source of Truth**
```javascript
// ✅ BOM: Uma fonte de verdade
const agents = await loadLocalAgents('.claude/agents/');

// ❌ RUIM: Múltiplas fontes
const localAgents = await loadLocalAgents();
const flowAgents = await mcp__claude-flow__agent_list();
const mergedAgents = somehow.merge(localAgents, flowAgents); // Confuso!
```

### 2. **Explicit Over Implicit**
```javascript
// ✅ BOM: Explícito sobre o que está usando
const agent = await loadAgent('.claude/agents/core/coder.md');
await Task(agent.definition, task, 'coder');

// ❌ RUIM: Mágica implícita
await spawnSmartAgent('coder'); // O que isso faz exatamente?
```

### 3. **Composition Over Configuration**
```javascript
// ✅ BOM: Compor funcionalidades
const workflow = compose(
  withMemory(claudeFlowMemory),
  withAgents(localAgents),
  withHooks(globalHooks)
);

// ❌ RUIM: Configuração complexa
const config = {
  agents: { local: true, flow: true, hybrid: 'auto' },
  memory: { backends: ['flow', 'sqlite', 'file'], sync: true },
  hooks: { /* 100 linhas de config */ }
};
```

## 📋 Checklist de Refatoração

- [ ] Remover todos os `mcp__claude-flow__agent_spawn`
- [ ] Consolidar CLAUDE.md em um único arquivo
- [ ] Criar mapeamento claro: tarefa → metodologia
- [ ] Unificar sistema de memória
- [ ] Simplificar hooks (remover duplicados)
- [ ] Documentar padrão de batch único
- [ ] Criar testes para workflows principais
- [ ] Remover código morto e não utilizado

---
*Documento criado para guiar a refatoração do sistema*