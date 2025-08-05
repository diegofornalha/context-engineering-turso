# Turso A2A Agent

Um agente A2A (Agent-to-Agent) para operações de banco de dados Turso.

## Visão Geral

O Turso Agent fornece capacidades de banco de dados distribuído através do protocolo A2A, permitindo que outros agentes executem operações de banco de dados de forma colaborativa.

## Porta

O agente roda na porta **4243** por padrão.

## Capacidades

- **QUERY**: Executar consultas SQL no banco de dados Turso
- **SCHEMA**: Criar e gerenciar esquemas de banco de dados
- **SYNC**: Sincronizar dados entre bancos de dados distribuídos
- **MIGRATE**: Realizar migrações de banco de dados e atualizações de esquema
- **BACKUP**: Operações de backup e restauração de banco de dados

## Instalação

```bash
cd turso
npm install
```

## Execução

```bash
npm start
```

Ou diretamente:

```bash
node simple-server.js
```

## Endpoints

- `GET /` - Informações sobre o servidor
- `GET /discover` - Descobrir capacidades do agente
- `POST /communicate` - Enviar mensagem para o agente
- `POST /delegate` - Delegar tarefa para o agente
- `GET /health` - Verificar saúde do agente

## Exemplos de Uso

### Descobrir Capacidades

```bash
curl http://localhost:4243/discover
```

### Enviar Consulta

```bash
curl -X POST http://localhost:4243/communicate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "query",
    "query": "SELECT * FROM users"
  }'
```

### Delegar Tarefa de Migração

```bash
curl -X POST http://localhost:4243/delegate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "migrate",
    "id": "migration-123",
    "details": {
      "from_version": "1.0.0",
      "to_version": "2.0.0"
    }
  }'
```

## Configuração

A configuração do agente está em `a2a-config.json` e inclui:

- Registro automático no registry A2A
- Heartbeat a cada 30 segundos
- Suporte para delegação de tarefas
- Monitoramento e métricas habilitados