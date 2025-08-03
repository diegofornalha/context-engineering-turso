-- Criar tabela para armazenar documentação
CREATE TABLE IF NOT EXISTS docs_turso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_name TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tags TEXT, -- JSON array de tags
    file_path TEXT,
    file_size INTEGER,
    version TEXT DEFAULT '1.0.0',
    author TEXT DEFAULT 'Claude Code',
    language TEXT DEFAULT 'pt-BR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_docs_category ON docs_turso(category);
CREATE INDEX IF NOT EXISTS idx_docs_title ON docs_turso(title);
CREATE INDEX IF NOT EXISTS idx_docs_created ON docs_turso(created_at);

-- Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_docs_timestamp 
AFTER UPDATE ON docs_turso
BEGIN
    UPDATE docs_turso SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Criar trigger para incrementar access_count e atualizar last_accessed
CREATE TRIGGER IF NOT EXISTS track_docs_access
AFTER UPDATE OF last_accessed ON docs_turso
BEGIN
    UPDATE docs_turso SET access_count = access_count + 1 WHERE id = NEW.id;
END;

-- Inserir o documento tutorial como primeiro registro
INSERT INTO docs_turso (
    file_name,
    title,
    description,
    content,
    category,
    tags,
    file_path,
    file_size
) VALUES (
    'tutorial-criar-tabelas-turso.md',
    'Tutorial: Como Criar Tabelas no Turso Database',
    'Guia completo para criar tabelas no Turso, incluindo estrutura, queries e integração com MCP',
    '# Tutorial: Como Criar Tabelas no Turso Database

Este documento explica o processo completo para criar tabelas no Turso, um banco de dados SQLite distribuído na edge.

## 📋 Pré-requisitos

1. **Turso CLI instalado**
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```

2. **Conta no Turso** com:
   - API Token configurado
   - Organização criada
   - Banco de dados existente

3. **MCP Turso** configurado no Claude Code (opcional)

[... conteúdo completo do tutorial ...]',
    'tutorial',
    '["turso", "database", "sql", "tutorial", "mcp"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/tutorial-criar-tabelas-turso.md',
    8192
);

-- Criar view para buscar documentos mais acessados
CREATE VIEW IF NOT EXISTS popular_docs AS
SELECT 
    id,
    title,
    category,
    access_count,
    last_accessed,
    created_at
FROM docs_turso
ORDER BY access_count DESC, last_accessed DESC
LIMIT 10;

-- Criar view para documentos recentes
CREATE VIEW IF NOT EXISTS recent_docs AS
SELECT 
    id,
    title,
    category,
    created_at,
    updated_at
FROM docs_turso
ORDER BY created_at DESC
LIMIT 20;