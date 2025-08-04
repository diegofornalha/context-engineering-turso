# Plano de Simplificação do Banco de Dados Turso

## 🎯 Objetivo
Simplificar o banco de dados mantendo apenas o essencial para começar, com possibilidade de expansão futura.

## 📊 Estado Atual
Tabelas existentes:
- `conversations` - Histórico de conversas
- `distributed_transactions` - Transações distribuídas
- `docs_turso` - **Documentação e arquivos** ✅
- `edge_replicas` - Réplicas edge
- `knowledge_base` - Base de conhecimento
- `performance_tests` - Testes de performance
- `sqlite_sequence` - Controle interno SQLite

## 🚀 Proposta de Simplificação

### 1. Manter Apenas `docs_turso`
A tabela `docs_turso` já é robusta e suficiente para:
- Armazenar qualquer tipo de documentação
- Controlar versões
- Rastrear acessos
- Categorizar e tag conteúdo
- Suportar múltiplas linguagens

### 2. Adicionar Tabela `sessions` (Recomendado)
```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    context TEXT,
    metadata TEXT, -- JSON com informações adicionais
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);
```

**Por que adicionar `sessions`?**
- Manter contexto entre interações
- Armazenar estado temporário
- Facilitar continuidade de conversas
- Base para expansão futura

## 📝 Script de Limpeza

```sql
-- Backup antes de executar!
-- PRAGMA wal_checkpoint(TRUNCATE);

-- Remover tabelas desnecessárias
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS distributed_transactions;
DROP TABLE IF EXISTS edge_replicas;
DROP TABLE IF EXISTS knowledge_base;
DROP TABLE IF EXISTS performance_tests;

-- Manter apenas docs_turso
-- A tabela sqlite_sequence é mantida automaticamente pelo SQLite

-- Criar tabela sessions (opcional mas recomendado)
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    context TEXT,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_docs_turso_category ON docs_turso(category);
CREATE INDEX IF NOT EXISTS idx_docs_turso_file_name ON docs_turso(file_name);
```

## 🔮 Expansão Futura

Quando necessário, adicionar tabelas específicas:

### Fase 1 - Básico
- ✅ `docs_turso` - Documentação
- ✅ `sessions` - Contexto de sessões

### Fase 2 - Interatividade
- `interactions` - Rastrear uso dos documentos
- `feedback` - Coletar feedback dos usuários

### Fase 3 - Inteligência
- `embeddings` - Vetores para busca semântica
- `analytics` - Métricas de uso

### Fase 4 - Colaboração
- `users` - Gestão de usuários
- `permissions` - Controle de acesso
- `versions` - Versionamento avançado

## 🛠️ Implementação

1. **Fazer backup do banco atual**
2. **Executar script de limpeza**
3. **Atualizar integração MCP-Turso**
4. **Ajustar documentação**

## 📚 Benefícios da Simplificação

- **Menor complexidade** inicial
- **Foco no essencial** (documentação)
- **Facilita manutenção**
- **Reduz overhead**
- **Permite crescimento orgânico**

## ⚡ Recomendação Final

**Manter:**
- `docs_turso` ✅

**Adicionar:**
- `sessions` ✅ (para contexto e continuidade)

Esta estrutura minimalista permite começar rapidamente e expandir conforme a necessidade, mantendo a flexibilidade para crescimento futuro.