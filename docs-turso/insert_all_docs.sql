-- Script para inserir todos os documentos do diretório docs-turso na tabela docs_turso

-- 1. ADDITIONAL_TOOLS_PLAN.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'ADDITIONAL_TOOLS_PLAN.md',
    'Ferramentas Adicionais MCP Turso - Baseado na Documentação Oficial',
    'Plano detalhado de ferramentas adicionais para MCP Turso incluindo autenticação, monitoramento, replicação e IA',
    'planning',
    '["turso", "mcp", "tools", "security", "monitoring", "ai", "replication"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/ADDITIONAL_TOOLS_PLAN.md'
);

-- 2. IMPROVEMENTS_PLAN.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'IMPROVEMENTS_PLAN.md',
    'Plano de Melhorias MCP Turso',
    'Plano estratégico de melhorias e otimizações para o MCP Turso',
    'planning',
    '["turso", "mcp", "improvements", "optimization"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/IMPROVEMENTS_PLAN.md'
);

-- 3. RESUMO_FINAL_TURSO_SENTRY.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'RESUMO_FINAL_TURSO_SENTRY.md',
    'Resumo Final Turso e Sentry',
    'Resumo completo da integração entre Turso e Sentry',
    'documentation',
    '["turso", "sentry", "integration", "summary"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/RESUMO_FINAL_TURSO_SENTRY.md'
);

-- 4. plan.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'plan.md',
    'Plano Geral do Projeto',
    'Plano geral e roadmap do projeto MCP Turso',
    'planning',
    '["project", "roadmap", "planning"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/plan.md'
);

-- Configuration files
-- 5. ENV_CONFIGURATION_SUMMARY.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'ENV_CONFIGURATION_SUMMARY.md',
    'Resumo de Configuração de Variáveis de Ambiente',
    'Documentação completa sobre as variáveis de ambiente necessárias',
    'configuration',
    '["environment", "config", "setup", "env"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/configuration/ENV_CONFIGURATION_SUMMARY.md'
);

-- 6. TURSO_CONFIGURATION_SUMMARY.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'TURSO_CONFIGURATION_SUMMARY.md',
    'Resumo de Configuração do Turso',
    'Guia completo de configuração do Turso Database',
    'configuration',
    '["turso", "config", "database", "setup"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/configuration/TURSO_CONFIGURATION_SUMMARY.md'
);

-- Documentation files
-- 7. GUIA_COMPLETO_TURSO_MCP.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'GUIA_COMPLETO_TURSO_MCP.md',
    'Guia Completo Turso MCP',
    'Guia completo e detalhado sobre o uso do Turso MCP',
    'documentation',
    '["turso", "mcp", "guide", "tutorial", "complete"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/documentation/GUIA_COMPLETO_TURSO_MCP.md'
);

-- 8. TURSO_MEMORY_README.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'TURSO_MEMORY_README.md',
    'Turso Memory System README',
    'Documentação do sistema de memória do Turso',
    'documentation',
    '["turso", "memory", "readme", "system"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/documentation/TURSO_MEMORY_README.md'
);

-- Learnings files
-- 9. AGENT_BRAIN_CLARITY.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'AGENT_BRAIN_CLARITY.md',
    'Agent Brain Clarity',
    'Clareza sobre o funcionamento do cérebro dos agentes',
    'learnings',
    '["agent", "ai", "brain", "clarity", "learnings"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/learnings/AGENT_BRAIN_CLARITY.md'
);

-- 10. AGENT_DUPLICATION_PREVENTION.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'AGENT_DUPLICATION_PREVENTION.md',
    'Agent Duplication Prevention',
    'Estratégias para prevenir duplicação de agentes',
    'learnings',
    '["agent", "duplication", "prevention", "best-practices"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/learnings/AGENT_DUPLICATION_PREVENTION.md'
);

-- 11. PRP_DELEGATION_STRATEGY.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'PRP_DELEGATION_STRATEGY.md',
    'PRP Delegation Strategy',
    'Estratégia de delegação para Persona Reference Pattern',
    'learnings',
    '["prp", "delegation", "strategy", "patterns"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/learnings/PRP_DELEGATION_STRATEGY.md'
);

-- 12. TOOLS_CLEANUP_COMPLETED.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'TOOLS_CLEANUP_COMPLETED.md',
    'Tools Cleanup Completed',
    'Registro da limpeza de ferramentas completada',
    'learnings',
    '["tools", "cleanup", "maintenance", "completed"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/learnings/TOOLS_CLEANUP_COMPLETED.md'
);

-- 13. TOOLS_SIMPLIFICATION.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'TOOLS_SIMPLIFICATION.md',
    'Tools Simplification',
    'Processo de simplificação das ferramentas',
    'learnings',
    '["tools", "simplification", "optimization", "refactoring"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/learnings/TOOLS_SIMPLIFICATION.md'
);

-- 14. TURSO_JWT_TOKEN_LEARNING.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'TURSO_JWT_TOKEN_LEARNING.md',
    'Turso JWT Token Learning',
    'Aprendizados sobre tokens JWT no Turso',
    'learnings',
    '["turso", "jwt", "token", "authentication", "learnings"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/learnings/TURSO_JWT_TOKEN_LEARNING.md'
);

-- Migration files
-- 15. DOCS_TURSO_MIGRATION_SUCCESS.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'DOCS_TURSO_MIGRATION_SUCCESS.md',
    'Docs Turso Migration Success',
    'Registro do sucesso da migração da documentação para Turso',
    'migration',
    '["docs", "turso", "migration", "success"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/migration/DOCS_TURSO_MIGRATION_SUCCESS.md'
);

-- 16. MCP_TURSO_MIGRATION_PLAN.md
INSERT INTO docs_turso (file_name, title, description, category, tags, file_path) 
VALUES (
    'MCP_TURSO_MIGRATION_PLAN.md',
    'MCP Turso Migration Plan',
    'Plano detalhado de migração para MCP Turso',
    'migration',
    '["mcp", "turso", "migration", "plan"]',
    '/Users/agents/Desktop/context-engineering-turso/docs-turso/migration/MCP_TURSO_MIGRATION_PLAN.md'
);

-- Criar uma view para buscar documentos por categoria
CREATE VIEW IF NOT EXISTS docs_by_category AS
SELECT 
    category,
    COUNT(*) as doc_count,
    GROUP_CONCAT(title, ', ') as documents
FROM docs_turso
GROUP BY category
ORDER BY doc_count DESC;

-- Criar uma view para buscar documentos por tags
CREATE VIEW IF NOT EXISTS docs_by_tags AS
SELECT 
    id,
    title,
    tags,
    category
FROM docs_turso
WHERE tags IS NOT NULL
ORDER BY created_at DESC;

-- Atualizar o conteúdo completo dos documentos será feito em uma segunda etapa
-- UPDATE docs_turso SET content = (conteúdo completo do arquivo) WHERE file_name = 'nome_do_arquivo.md';