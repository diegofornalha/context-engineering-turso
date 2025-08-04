# MCP Turso Server - Versão Simplificada

Um servidor Model Context Protocol (MCP) que fornece ferramentas de banco de dados para Turso/LibSQL.

## 🆕 Estrutura Simplificada

Este servidor agora trabalha com uma estrutura de banco de dados minimalista e otimizada para máxima eficiência.

### Tabelas Atuais

#### 1. `docs_turso` - Documentação Principal
```sql
- id: INTEGER PRIMARY KEY
- file_name: TEXT (nome do arquivo)
- title: TEXT (título do documento)
- description: TEXT (descrição)
- content: TEXT (conteúdo principal)
- category: TEXT (categoria do documento)
- tags: TEXT (tags separadas por vírgula)
- file_path: TEXT (caminho original)
- file_size: INTEGER (tamanho em bytes)
- version: TEXT (versão do documento)
- author: TEXT (autor)
- language: TEXT (idioma, padrão: pt-BR)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- last_accessed: TIMESTAMP
- access_count: INTEGER
```

#### 2. `sessions` - Contexto de Sessões
```sql
- id: INTEGER PRIMARY KEY
- session_id: TEXT UNIQUE (ID da sessão)
- context: TEXT (contexto da sessão)
- metadata: TEXT (JSON com dados adicionais)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
- expires_at: TIMESTAMP (expiração)
```

## 🚀 Início Rápido

### 1. Instalar Dependências
```bash
cd mcp-turso
npm install
```

### 2. Configurar Banco de Dados
```bash
# Executar script de simplificação (se migrando de versão anterior)
turso db shell claude-swarm-v2 < scripts/simplify-database.sql
```

### 3. Executar Servidor
```bash
npm start
```

## 📊 Roadmap de Expansão

### Fase Atual ✅
- Documentação (`docs_turso`)
- Sessões (`sessions`)

### Expansão Futura 🔮
```
Fase 2 - Interatividade
├── interactions - Rastreamento de uso
└── feedback - Coleta de feedback

Fase 3 - Inteligência
├── embeddings - Busca semântica
└── analytics - Métricas avançadas

Fase 4 - Colaboração
├── users - Gestão de usuários
├── permissions - Controle de acesso
└── versions - Versionamento avançado
```

## 🛠️ Ferramentas Disponíveis

### Básicas
- `execute_read_only_query` - Consultas SELECT
- `execute_query` - Todas as operações SQL
- `list_tables` - Listar tabelas
- `describe_table` - Descrever estrutura

### Avançadas
- `memory_store` - Armazenar na memória
- `memory_retrieve` - Recuperar da memória
- `memory_search` - Buscar na memória
- `memory_list` - Listar memórias
- `memory_clear` - Limpar memória
- `performance_test` - Testar performance

## 💡 Exemplos de Uso

### Armazenar Documentação
```typescript
await execute_query({
  query: `INSERT INTO docs_turso 
    (file_name, title, content, category, tags) 
    VALUES (?, ?, ?, ?, ?)`,
  params: ['guia.md', 'Guia Completo', '...', 'tutorial', 'básico,iniciante']
});
```

### Criar Sessão
```typescript
await execute_query({
  query: `INSERT INTO sessions 
    (session_id, context, metadata) 
    VALUES (?, ?, ?)`,
  params: ['sess_123', 'conversa inicial', '{"user": "claude"}']
});
```

### Buscar Documentos
```typescript
await execute_read_only_query({
  query: `SELECT * FROM docs_turso 
    WHERE category = ? OR tags LIKE ?`,
  params: ['tutorial', '%iniciante%']
});
```

## 🔍 Monitoramento

### Performance
```bash
# Testar velocidade de leitura/escrita
npm run test:performance
```

### Estatísticas
```sql
-- Total de documentos
SELECT COUNT(*) FROM docs_turso;

-- Documentos mais acessados
SELECT title, access_count 
FROM docs_turso 
ORDER BY access_count DESC 
LIMIT 10;

-- Sessões ativas
SELECT COUNT(*) FROM sessions 
WHERE expires_at > CURRENT_TIMESTAMP;
```

## 📝 Migração de Dados

Se você tem dados em outras tabelas que deseja preservar:

```bash
# 1. Fazer backup
turso db dump claude-swarm-v2 > backup.sql

# 2. Exportar dados específicos
turso db shell claude-swarm-v2 "SELECT * FROM old_table" > dados.csv

# 3. Executar simplificação
turso db shell claude-swarm-v2 < scripts/simplify-database.sql

# 4. Importar dados necessários manualmente
```

## 🤝 Contribuindo

1. Mantenha a simplicidade
2. Documente novos recursos
3. Adicione testes
4. Siga o padrão de código existente

## 📄 Licença

MIT