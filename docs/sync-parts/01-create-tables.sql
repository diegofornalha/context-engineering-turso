-- Criar estrutura das tabelas

CREATE TABLE IF NOT EXISTS docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    cluster TEXT NOT NULL,
    category TEXT,
    file_hash TEXT NOT NULL,
    size INTEGER,
    last_modified DATETIME,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_docs_cluster ON docs(cluster);

CREATE INDEX IF NOT EXISTS idx_docs_category ON docs(category);

CREATE INDEX IF NOT EXISTS idx_docs_file_hash ON docs(file_hash);

CREATE TABLE IF NOT EXISTS docs_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id INTEGER REFERENCES docs(id),
    change_type TEXT NOT NULL,
    old_hash TEXT,
    new_hash TEXT,
    changed_by TEXT,
    change_summary TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE docs_organized (
    id INTEGER PRIMARY KEY,
    file_path TEXT UNIQUE,
    title TEXT,
    content TEXT,
    summary TEXT,
    cluster TEXT,
    category TEXT,
    file_hash TEXT,
    size INTEGER,
    last_modified DATETIME,
    metadata TEXT
)
```

### Scripts Criados:
- `organize-docs-clusters.py` - Organização automática
- `sync-docs-to-turso.py` - Sincronização com metadados
- `batch-sync-docs.py` - Processamento em lotes
- `final-sync-all.sh` - Script de execução final

## 🚀 Próximos Passos

### Sistema de Busca (Em desenvolvimento):
1. **Interface de busca** por clusters
2. **Navegação hierárquica** pelos tópicos
3. **Busca por conteúdo** com relevância
4. **Filtros dinâmicos** por categoria/cluster

### Melhorias Futuras:
- Sistema de atualização automática
- Detecção de mudanças em tempo real
- Versionamento de documentos
- Analytics de uso e acesso

## 📋 Comandos Úteis

### Verificar documentos:
```sql
-- Total de documentos
SELECT COUNT(*) FROM docs_organized;

CREATE TABLE sentry_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT NOT NULL,
    error_title TEXT NOT NULL,
    error_level TEXT NOT NULL,
    event_count INTEGER DEFAULT 1,
    status TEXT DEFAULT ''unresolved'',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sentry_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name TEXT UNIQUE NOT NULL,
    issue_count INTEGER DEFAULT 0,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE mcp_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mcp_name TEXT NOT NULL,
    issue_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT ''open'',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME NULL
);

CREATE TABLE prps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,                    -- Nome único do PRP
    title TEXT NOT NULL,                          -- Título descritivo
    description TEXT,                             -- Descrição geral
    objective TEXT NOT NULL,                      -- Objetivo principal
    justification TEXT,                           -- Por que é necessário
    
    -- Conteúdo estruturado em JSON
    context_data TEXT NOT NULL,                   -- JSON com contexto (arquivos, versões, exemplos)
    implementation_details TEXT NOT NULL,         -- JSON com detalhes de implementação
    validation_gates TEXT,                        -- JSON com portões de validação
    
    -- Metadados
    status TEXT DEFAULT ''draft'',                  -- draft, active, completed, archived
    priority TEXT DEFAULT ''medium'',               -- low, medium, high, critical
    complexity TEXT DEFAULT ''medium'',             -- low, medium, high
    
    -- Relacionamentos
    parent_prp_id INTEGER,                        -- PRP pai (para dependências)
    related_prps TEXT,                            -- JSON array de IDs relacionados
    
    -- Controle de versão
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    updated_by TEXT,
    
    -- Busca e organização
    tags TEXT,                                    -- JSON array de tags
    search_text TEXT                              -- Texto para busca full-text
);

CREATE TABLE prp_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prp_id INTEGER NOT NULL,                      -- PRP pai
    task_name TEXT NOT NULL,                      -- Nome da tarefa
    description TEXT,                             -- Descrição detalhada
    task_type TEXT DEFAULT ''feature'',             -- feature, bugfix, refactor, test, docs, setup
    
    -- Prioridade e estimativa
    priority TEXT DEFAULT ''medium'',
    estimated_hours REAL,
    complexity TEXT DEFAULT ''medium'',
    
    -- Status e progresso
    status TEXT DEFAULT ''pending'',                -- pending, in_progress, review, completed, blocked
    progress INTEGER DEFAULT 0,                   -- 0-100%
    
    -- Dependências
    dependencies TEXT,                            -- JSON array de IDs de tarefas dependentes
    blockers TEXT,                                -- JSON array de IDs de tarefas bloqueadoras
    
    -- Metadados
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_to TEXT,
    completed_at TIMESTAMP,
    
    -- Contexto específico da tarefa
    context_files TEXT,                           -- JSON array de arquivos relacionados
    acceptance_criteria TEXT                      -- Critérios de aceitação
);

CREATE TABLE prp_context (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prp_id INTEGER NOT NULL,
    context_type TEXT NOT NULL,                   -- file, directory, library, api, example, reference
    name TEXT NOT NULL,                           -- Nome do arquivo/biblioteca/etc
    path TEXT,                                    -- Caminho completo
    content TEXT,                                 -- Conteúdo ou descrição
    version TEXT,                                 -- Versão
    importance TEXT DEFAULT ''medium'',             -- low, medium, high, critical
    is_required BOOLEAN DEFAULT 1,                -- Se é obrigatório
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prp_llm_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prp_id INTEGER NOT NULL,
    analysis_type TEXT NOT NULL,                  -- task_extraction, complexity_assessment, dependency_analysis, validation_check
    input_content TEXT NOT NULL,                  -- Conteúdo enviado para o LLM
    output_content TEXT NOT NULL,                 -- Resposta do LLM
    parsed_data TEXT,                             -- JSON com dados estruturados extraídos
    model_used TEXT,                              -- Modelo LLM usado
    tokens_used INTEGER,                          -- Tokens consumidos
    processing_time_ms INTEGER,                   -- Tempo de processamento
    confidence_score REAL,                        -- Score de confiança (0-1)
    status TEXT DEFAULT ''completed'',              -- pending, processing, completed, failed
    error_message TEXT,                           -- Mensagem de erro (se falhou)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
);

CREATE TABLE prp_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT ''#007bff'',
    category TEXT DEFAULT ''general'',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE prp_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prp_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    action TEXT NOT NULL,                         -- created, updated, status_changed, archived
    old_data TEXT,                                -- JSON com dados anteriores
    new_data TEXT,                                -- JSON com dados novos
    changes_summary TEXT,                         -- Resumo das mudanças
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    comment TEXT                                  -- Comentário sobre a mudança
);

CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    user_id TEXT,
    message TEXT NOT NULL,
    response TEXT,
    context TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE knowledge_base (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    tags TEXT,
    priority INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

