# 🧠 Guia de Uso: Subagente PRP no Claude Code

## 🎯 Visão Geral

O **PRP Specialist** é um subagente especializado do Claude Flow que integra perfeitamente o sistema `prp-agent` existente com as capacidades do Claude Code, oferecendo geração, validação e gerenciamento avançado de PRPs.

## 📍 Localização

```
.claude/agents/specialized/prp/prp-specialist.md
```

## 🚀 Como Usar

### 1. Gerar um Novo PRP

```javascript
// No Claude Code, use o Task tool:
await Task({
  description: "Generate PRP about JWT Authentication",
  prompt: "Generate a comprehensive PRP about JWT authentication system with Node.js examples, including best practices and security considerations",
  subagent_type: "prp-specialist"
})
```

### 2. Buscar PRPs Existentes

```javascript
await Task({
  description: "Search authentication PRPs",
  prompt: "Search for all PRPs related to authentication, JWT, OAuth, and security",
  subagent_type: "prp-specialist"
})
```

### 3. Atualizar PRP Existente

```javascript
await Task({
  description: "Update PRP",
  prompt: "Update PRP_AUTH_JWT with new OAuth2 integration examples and refresh the security recommendations",
  subagent_type: "prp-specialist"
})
```

## 🔧 Capacidades do Subagente

### Integração Completa
- ✅ **prp-agent Python**: Usa o sistema existente quando disponível
- ✅ **MCP Turso**: Armazena PRPs no banco de dados na nuvem
- ✅ **Claude Flow Memory**: Mantém contexto entre sessões
- ✅ **Validação PydanticAI**: Garante formato correto

### Funcionalidades
1. **Geração de PRPs** com formato padrão
2. **Validação** de estrutura e conteúdo
3. **Armazenamento** em Turso e arquivos
4. **Busca inteligente** em múltiplas fontes
5. **Versionamento** e histórico
6. **Cross-referencing** entre PRPs

## 📊 Exemplos Práticos

### Exemplo 1: Criar PRP sobre Microserviços

```javascript
// Comando completo
await Task({
  description: "Create Microservices PRP",
  prompt: `Generate a comprehensive PRP about Microservices Architecture with:
    - Communication patterns (REST, gRPC, Message Queues)
    - Service discovery and load balancing
    - Circuit breakers and resilience patterns
    - Monitoring and observability
    - Node.js implementation examples
    Priority: Alta
    Include practical Docker and Kubernetes examples`,
  subagent_type: "prp-specialist"
})
```

### Exemplo 2: Análise de PRPs Relacionados

```javascript
await Task({
  description: "Analyze related PRPs",
  prompt: "Find all PRPs related to distributed systems and create a summary of patterns and best practices across them",
  subagent_type: "prp-specialist"
})
```

### Exemplo 3: Batch Generation

```javascript
await Task({
  description: "Generate multiple PRPs",
  prompt: `Generate a series of related PRPs for a complete authentication system:
    1. PRP_AUTH_JWT - JWT implementation
    2. PRP_AUTH_OAUTH2 - OAuth2 integration
    3. PRP_AUTH_2FA - Two-factor authentication
    4. PRP_AUTH_RBAC - Role-based access control
    Each should reference the others appropriately`,
  subagent_type: "prp-specialist"
})
```

## 🔄 Workflow Integrado

### Fluxo de Trabalho Típico

1. **Pesquisa** → O agente busca PRPs similares
2. **Geração** → Usa prp-agent ou templates
3. **Validação** → Verifica estrutura com Pydantic
4. **Armazenamento** → Salva em Turso e arquivos
5. **Indexação** → Atualiza índices e referências

### Hooks Automáticos

O subagente executa hooks antes e depois de cada operação:

**Pre-hook**:
- Ativa ambiente Python
- Carrega contexto de PRPs
- Verifica disponibilidade do prp-agent

**Post-hook**:
- Armazena metadados da operação
- Atualiza índices
- Limpa ambiente

## 🛠️ Troubleshooting

### prp-agent não disponível
- O subagente automaticamente usa modo template
- Todas as funcionalidades continuam disponíveis

### Erro de conexão Turso
- PRPs são salvos localmente
- Sincronização automática quando conexão retornar

### Ambiente Python não configurado
- O agente tentará ativar o venv automaticamente
- Fallback para operações que não requerem Python

## 📈 Métricas e Monitoramento

O subagente rastreia:
- Tempo de geração de PRPs
- Taxa de sucesso de validação
- Uso de armazenamento
- PRPs mais acessados
- Erros e recuperações

## 🎯 Melhores Práticas

1. **Sempre especifique o contexto** completo ao gerar PRPs
2. **Use tags descritivas** para facilitar buscas
3. **Mantenha PRPs atualizados** com revisões periódicas
4. **Aproveite o cross-referencing** entre PRPs relacionados
5. **Use prioridades** (Alta/Média/Baixa) apropriadamente

## 🚀 Comandos Rápidos

```bash
# Verificar status do sistema PRP
./claude/agents/specialized/prp/quick-start.sh

# Listar PRPs existentes
ls -la prp-agent/PRPs/*.md

# Contar PRPs no sistema
find prp-agent/PRPs -name "*.md" | wc -l
```

## 💡 Dicas Avançadas

1. **Geração em Lote**: Gere múltiplos PRPs relacionados em uma única operação
2. **Templates Customizados**: Forneça estruturas específicas no prompt
3. **Integração CI/CD**: Use o subagente em pipelines automatizados
4. **Backup Automático**: PRPs são salvos em Turso e localmente

## 📝 Formato PRP Padrão

O subagente sempre gera PRPs seguindo este formato:

```markdown
# 🧠 PRP: [Nome do Contexto]

## 📋 Informações Básicas
- **ID**: PRP_[IDENTIFICADOR_UNICO]
- **Título**: [Título Descritivo]
- **Data de Criação**: [DD/MM/YYYY]
- **Status**: Ativo/Em Desenvolvimento/Arquivado
- **Prioridade**: Alta/Média/Baixa
- **Versão**: [X.Y.Z]

## 🎯 Objetivo
[Objetivo claro e mensurável]

## 🏗️ Arquitetura
[Estrutura técnica detalhada]

## 🔄 Fluxo de Trabalho
[Processos passo a passo]

## 📊 Casos de Uso
[Exemplos práticos]

## 💻 Exemplos de Implementação
[Código funcional]

## 🔗 Referências
[Links e recursos]

## 📝 Notas de Implementação
[Considerações técnicas]

## 🔄 Histórico de Alterações
[Versionamento]
```

---

*O PRP Specialist Subagent está pronto para revolucionar seu sistema de documentação e gestão de conhecimento!*