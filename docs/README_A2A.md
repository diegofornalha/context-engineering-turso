# Context Engineering Turso - A2A Integration

## 🚀 Visão Geral

Este projeto agora segue 100% o padrão A2A (Agent-to-Agent) Protocol 1.0, mantendo a metodologia PRP integrada dentro dos padrões A2A.

## 📋 Arquitetura A2A

```
context-engineering-turso/
├── a2a-config.json          # Configuração A2A padrão
├── a2a-server.js           # Servidor A2A principal
├── agents/                 # Agentes compatíveis com A2A
│   ├── context_engineering_agent.js   # Agente coordenador principal
│   ├── prp_a2a_adapter.js            # Adaptador A2A para PRP
│   └── turso_a2a_adapter.js          # Adaptador A2A para Turso
├── prp-agent/              # Agente PRP Python (preservado)
└── turso-agent/            # Agente Turso Python (preservado)
```

## 🔧 Como Funciona

### 1. Protocolo A2A
O projeto implementa todos os endpoints A2A padrão:
- `/discover` - Descoberta de capacidades
- `/communicate` - Comunicação entre agentes
- `/delegate` - Delegação de tarefas
- `/health` - Status de saúde

### 2. Integração PRP
A metodologia PRP funciona através do protocolo A2A:
- Requisições PRP são enviadas via `/communicate`
- Tarefas PRP são delegadas via `/delegate`
- Resultados são compartilhados seguindo o padrão A2A

### 3. Sub-Agentes
- **PRP Agent** (porta 9995): Especialista em metodologia PRP
- **Turso Agent** (porta 9994): Especialista em banco de dados Turso

## 🚀 Inicialização

```bash
# Instalar dependências
npm install

# Iniciar servidor A2A
npm start
# ou
./start.sh
```

## 📡 Endpoints A2A

### Discovery
```bash
curl http://localhost:9993/discover
```

### Health Check
```bash
curl http://localhost:9993/health
```

### Comunicação
```bash
curl -X POST http://localhost:9993/communicate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "prp_request",
    "content": {
      "action": "generate",
      "data": {
        "title": "API REST Implementation"
      }
    },
    "sender": "client"
  }'
```

### Delegação
```bash
curl -X POST http://localhost:9993/delegate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "prp_generation",
    "payload": {
      "requirements": "Create REST API"
    }
  }'
```

## 🔄 Fluxo de Trabalho

1. **Cliente** → Envia requisição A2A
2. **Context Engineering Agent** → Recebe e roteia
3. **Sub-agentes** → Processam via adaptadores A2A
4. **Resposta** → Retorna seguindo protocolo A2A

## 🎯 Benefícios da Integração

- ✅ **100% compatível com protocolo A2A**
- ✅ **Preserva metodologia PRP completa**
- ✅ **Comunicação padronizada entre agentes**
- ✅ **Descoberta automática de serviços**
- ✅ **Fácil integração com outros agentes A2A**

## 🔗 Integração com Registry A2A

O agente se auto-registra no registry central:
```javascript
{
  "registry_url": "http://localhost:8888/api/agents",
  "auto_register": true,
  "heartbeat_interval": 30000
}
```

## 📚 Documentação

- [Protocolo A2A](../README.md)
- [Metodologia PRP](./PRP_FRAMEWORK_COMPREHENSIVE_GUIDE.md)
- [Integração Turso](./docs/turso-mcp-setup-guide.md)