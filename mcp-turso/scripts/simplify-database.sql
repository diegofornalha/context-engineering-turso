-- Script de Simplificação do Banco de Dados Turso
-- Execute com cuidado! Faça backup antes!
-- Data: 2025-01-14

-- 1. Checkpoint para garantir consistência
PRAGMA wal_checkpoint(TRUNCATE);

-- 2. Remover tabelas não essenciais
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS distributed_transactions;
DROP TABLE IF EXISTS edge_replicas;
DROP TABLE IF EXISTS knowledge_base;
DROP TABLE IF EXISTS performance_tests;

-- 3. Verificar que docs_turso existe e está intacta
SELECT COUNT(*) as total_docs FROM docs_turso;

-- 4. Criar tabela sessions para contexto
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE NOT NULL,
    context TEXT,
    metadata TEXT, -- JSON com informações adicionais
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- 5. Criar índices otimizados
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_docs_turso_category ON docs_turso(category);
CREATE INDEX IF NOT EXISTS idx_docs_turso_file_name ON docs_turso(file_name);
CREATE INDEX IF NOT EXISTS idx_docs_turso_tags ON docs_turso(tags);
CREATE INDEX IF NOT EXISTS idx_docs_turso_updated_at ON docs_turso(updated_at);

-- 6. Criar trigger para atualizar updated_at
CREATE TRIGGER IF NOT EXISTS update_docs_turso_timestamp 
AFTER UPDATE ON docs_turso
BEGIN
    UPDATE docs_turso SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_sessions_timestamp 
AFTER UPDATE ON sessions
BEGIN
    UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 7. Limpar dados órfãos e otimizar
VACUUM;
ANALYZE;

-- 8. Verificar resultado final
SELECT 
    'Simplificação concluída!' as status,
    (SELECT COUNT(*) FROM sqlite_master WHERE type='table') as total_tables,
    (SELECT COUNT(*) FROM docs_turso) as total_docs;