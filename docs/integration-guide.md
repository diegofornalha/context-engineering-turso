# 🔄 Guia de Integração - Sistema Unificado de Agentes

## 📋 Resumo

Este guia explica como integrar o novo Sistema Unificado de Agentes mantendo compatibilidade com projetos existentes que usam Claude Flow.

## 🎯 Objetivos da Integração

1. **Eliminar duplicação** entre agentes locais e Claude Flow
2. **Manter compatibilidade** com código existente
3. **Simplificar manutenção** com sistema único
4. **Melhorar performance** com cache e otimizações

## 🚀 Quick Start

### 1. Instalação

```bash
# Instalar dependências
npm install

# Executar testes para verificar instalação
npm test
```

### 2. Migração Automática

```bash
# Ver o que será mudado (dry run)
npx ts-node scripts/migrate-to-unified-agents.ts --dry-run .

# Executar migração com backup
npx ts-node scripts/migrate-to-unified-agents.ts --backup ./backup .
```

## 🔧 Integração Manual

### Antes (Claude Flow):

```javascript
// ❌ Método antigo - mock agents
mcp__claude-flow__agent_spawn { type: "coder", name: "Backend Dev" }
mcp__claude-flow__agent_spawn { type: "coordinator", name: "Lead" }
```

### Depois (Sistema Unificado):

```javascript
// ✅ Método novo - agentes locais reais
Task(
  "Coder agent as defined in .claude/agents/core/coder.md",
  "Implement authentication API",
  "coder"
)

Task(
  "Task orchestrator as defined in .claude/agents/swarm/task-orchestrator.md",
  "Coordinate development tasks",
  "task-orchestrator"
)
```

## 📊 Mapeamento de Tipos

| Claude Flow Type | Local Agent Type | Localização |
|-----------------|------------------|-------------|
| coordinator | task-orchestrator | .claude/agents/swarm/task-orchestrator.md |
| analyst | code-analyzer | .claude/agents/analysis/code-analyzer.md |
| optimizer | perf-analyzer | .claude/agents/performance/perf-analyzer.md |
| architect | system-architect | .claude/agents/architecture/system-architect.md |
| documenter | api-docs | .claude/agents/documentation/api-docs.md |
| monitor | swarm-monitor | .claude/agents/monitoring/swarm-monitor.md |

## 🛡️ Compatibilidade

### Wrapper de Compatibilidade

Para projetos que não podem ser migrados imediatamente:

```typescript
import { AgentManager } from './src/agent-manager';

// Criar wrapper que intercepta chamadas Claude Flow
const manager = new AgentManager(loader, validator);
const compatWrapper = manager.createCompatibilityWrapper();

// Chamadas antigas continuam funcionando
await compatWrapper.spawn({ type: "coder", name: "Dev" });
// Internamente usa: agentManager.spawnAgent("coder", "Dev")
```

### Configuração Gradual

```javascript
// Fase 1: Habilitar wrapper de compatibilidade
const USE_COMPATIBILITY_MODE = true;

// Fase 2: Migrar gradualmente cada uso
if (USE_COMPATIBILITY_MODE) {
  // Código antigo continua funcionando
} else {
  // Código novo otimizado
}

// Fase 3: Remover modo de compatibilidade
```

## 📈 Benefícios da Migração

### 1. **Performance**
- Cache de agentes carregados
- Operações concorrentes otimizadas
- Menos overhead de coordenação

### 2. **Manutenibilidade**
- Uma única fonte de verdade (.claude/agents/)
- Validação consistente
- Hooks padronizados

### 3. **Funcionalidades**
- Agentes com instruções detalhadas
- Hooks pre/post personalizáveis
- Memória persistente integrada

## 🔍 Validação

### Executar Testes

```bash
# Testes unitários
npm test

# Testes com cobertura
npm run test:coverage

# Testes de integração
npm test integration
```

### Checklist de Validação

- [ ] Todos os testes passando
- [ ] Cobertura > 80%
- [ ] Nenhum uso de mcp__claude-flow__agent_spawn
- [ ] Todos os agentes carregando de .claude/agents/
- [ ] Hooks executando corretamente

## 🚨 Troubleshooting

### Problema: Agente não encontrado

```
Error: Agent type not found: coordinator
```

**Solução**: Use o tipo mapeado correto:
```javascript
// ❌ Errado
"coordinator"

// ✅ Correto
"task-orchestrator"
```

### Problema: Hooks não executando

**Solução**: Verificar formato do hook no arquivo .md:
```yaml
hooks:
  pre: |
    echo "Starting task"
  post: |
    echo "Task complete"
```

### Problema: Performance degradada

**Solução**: Verificar cache está habilitado:
```typescript
// Cache é habilitado automaticamente
const agents = await agentManager.loadAllAgents(); // Primeira vez: lento
const agents2 = await agentManager.loadAllAgents(); // Segunda vez: cache
```

## 📚 Recursos Adicionais

- [Documentação dos Agentes](.claude/agents/README.md)
- [Exemplos de Uso](./examples/)
- [API Reference](./docs/api.md)

## 🤝 Suporte

Para questões sobre integração:

1. Verificar este guia
2. Executar script de migração com --dry-run
3. Consultar testes para exemplos
4. Abrir issue no repositório

---

*Última atualização: 2025-08-04*