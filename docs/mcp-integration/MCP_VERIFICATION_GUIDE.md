# 🔍 Guia de Verificação dos Servidores MCP

## 📋 Checklist de Verificação

### 1. **Verificar Instalação no Claude Code**

```bash
# Listar todos os servidores MCP instalados
claude mcp list
```

Você deve ver:
- ✅ `claude-flow` - Servidor de coordenação e swarms
- ✅ `turso` - Servidor de banco de dados
- ✅ `sentry` - Servidor de monitoramento (se instalado)

### 2. **Verificar Ferramentas Disponíveis**

No Claude Code, as ferramentas MCP aparecem com o prefixo `mcp__[servidor]__[ferramenta]`.

#### **Claude Flow Tools:**
```
mcp__claude-flow__swarm_init
mcp__claude-flow__agent_spawn
mcp__claude-flow__task_orchestrate
mcp__claude-flow__memory_usage
mcp__claude-flow__swarm_status
```

#### **Turso Tools:**
```
mcp__turso__list_databases
mcp__turso__execute_query
mcp__turso__execute_read_only_query
mcp__turso__search_knowledge
```

#### **Sentry Tools (se instalado):**
```
mcp__sentry__list_projects
mcp__sentry__capture_message
mcp__sentry__get_issues
```

### 3. **Teste Rápido de Cada Servidor**

#### **Testar Claude Flow:**
```javascript
// Verificar status do servidor
mcp__claude-flow__features_detect

// Teste básico de swarm
mcp__claude-flow__swarm_init {
  topology: "mesh",
  maxAgents: 3,
  strategy: "balanced"
}

// Verificar se funcionou
mcp__claude-flow__swarm_status
```

#### **Testar Turso:**
```javascript
// Listar bancos de dados
mcp__turso__list_databases

// Buscar conhecimento
mcp__turso__search_knowledge {
  query: "test"
}
```

#### **Testar Sentry:**
```javascript
// Listar projetos
mcp__sentry__list_projects

// Enviar mensagem de teste
mcp__sentry__capture_message {
  message: "MCP Test Message",
  level: "info"
}
```

## 🚨 Troubleshooting Comum

### **Problema: Ferramentas não aparecem**

**Verificações:**
1. Servidor está instalado? `claude mcp list`
2. Servidor está rodando? (para servidores locais)
3. Claude Code foi reiniciado após instalação?

**Soluções:**
```bash
# Reinstalar servidor
claude mcp remove [nome-servidor]
claude mcp add [nome-servidor] [comando]

# Para Claude Flow
claude mcp remove claude-flow
claude mcp add claude-flow npx claude-flow@alpha mcp start

# Reiniciar Claude Code
# Feche e abra o Claude Code novamente
```

### **Problema: Erro de conexão**

**Verificar logs:**
```bash
# Ver logs do servidor
claude mcp logs [nome-servidor]

# Exemplo
claude mcp logs claude-flow
```

### **Problema: Servidor local não conecta**

**Para servidores locais (Turso, Sentry):**
```bash
# Usar o script de inicialização
./start-all-mcp.sh

# Ou iniciar individualmente
cd mcp-turso && ./start-mcp.sh
cd mcp-sentry && ./start-mcp.sh
cd mcp-claude-flow && ./start-claude-flow.sh
```

## 📊 Status de Configuração

### **Verificação Completa:**

| Servidor | Tipo | Status | Comando de Instalação |
|----------|------|--------|----------------------|
| Claude Flow | NPX | ✅ Ativo | `claude mcp add claude-flow npx claude-flow@alpha mcp start` |
| Turso | Local | ✅ Ativo | Requer configuração local + `./start-mcp.sh` |
| Sentry | Local | ✅ Ativo | Requer configuração local + `./start-mcp.sh` |

### **Arquitetura de Integração:**

```
┌─────────────────┐
│   Claude Code   │
└────────┬────────┘
         │
    ┌────┴────┐
    │   MCP   │
    │Protocol │
    └────┬────┘
         │
    ┌────┴────────────────┬─────────────────┬─────────────────┐
    │                     │                 │                 │
┌───▼────────┐    ┌──────▼──────┐   ┌─────▼──────┐   ┌─────▼──────┐
│Claude Flow │    │    Turso    │   │   Sentry   │   │   Others   │
│   (NPX)    │    │   (Local)   │   │  (Local)   │   │    ...     │
└────────────┘    └─────────────┘   └────────────┘   └────────────┘
```

## 🎯 Comandos Úteis

### **Gerenciamento de Servidores:**
```bash
# Listar servidores
claude mcp list

# Ver detalhes de um servidor
claude mcp info [nome-servidor]

# Ver logs
claude mcp logs [nome-servidor]

# Atualizar servidor
claude mcp update [nome-servidor]

# Remover servidor
claude mcp remove [nome-servidor]
```

### **Scripts de Automação:**
```bash
# Iniciar todos os servidores locais
./start-all-mcp.sh

# Verificar status
ps aux | grep -E "mcp|claude-flow|turso|sentry"
```

## ✅ Checklist Final

- [ ] Claude Flow instalado via `claude mcp add`
- [ ] Turso configurado e script executável
- [ ] Sentry configurado e script executável (opcional)
- [ ] Todos os servidores aparecem em `claude mcp list`
- [ ] Ferramentas MCP visíveis no Claude Code
- [ ] Testes básicos executados com sucesso
- [ ] Documentação atualizada com configurações específicas

---

**Status**: ✅ Guia de Verificação Completo  
**Data**: 03/08/2025  
**Versão**: 1.0.0