# 🚀 MCP Claude Flow

Servidor MCP (Model Context Protocol) que adiciona capacidades avançadas de coordenação ao Claude Code.

## 📋 Instalação Rápida

### Via Claude Code CLI:
```bash
claude mcp add claude-flow npx claude-flow@alpha mcp start
```

### Via Script Local:
```bash
# Tornar executável
chmod +x start-claude-flow.sh

# Iniciar servidor
./start-claude-flow.sh
```

## 🔧 Funcionalidades

- **Swarm Orchestration**: Coordenação de múltiplos agentes
- **Persistent Memory**: Contexto que persiste entre sessões
- **Neural Learning**: Padrões que melhoram com o uso
- **GitHub Integration**: Gerenciamento avançado de repositórios
- **Performance Tracking**: Métricas e otimizações

## 📊 Ferramentas Disponíveis

### Coordenação:
- `swarm_init` - Inicializar swarm
- `agent_spawn` - Criar agentes
- `task_orchestrate` - Orquestrar tarefas

### Monitoramento:
- `swarm_status` - Status do swarm
- `agent_metrics` - Métricas de performance
- `task_results` - Resultados das tarefas

### Memória:
- `memory_usage` - Gerenciar memória persistente
- `neural_patterns` - Padrões aprendidos

### GitHub:
- `github_swarm` - Swarm especializado GitHub
- `repo_analyze` - Análise de repositório
- `pr_enhance` - Melhorar pull requests

## 🎯 Uso Básico

```javascript
// Inicializar swarm
mcp__claude-flow__swarm_init {
  topology: "mesh",
  maxAgents: 5,
  strategy: "balanced"
}

// Criar agentes
mcp__claude-flow__agent_spawn {
  type: "researcher",
  name: "Code Analyzer"
}

// Orquestrar tarefa
mcp__claude-flow__task_orchestrate {
  task: "Analyze and refactor codebase",
  strategy: "parallel"
}
```

## 📚 Documentação

Para documentação completa, veja:
- `/docs/mcp-integration/configuration/MCP_CLAUDE_FLOW_SETUP.md`
- GitHub: https://github.com/ruvnet/claude-flow

## ✅ Status

- **Versão**: alpha
- **Status**: Ativo
- **Suporte**: Node.js >= 16.0.0