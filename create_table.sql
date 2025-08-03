-- Criar tabela de projetos
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    technologies TEXT, -- JSON array de tecnologias
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de tarefas
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects (id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- Inserir alguns dados de exemplo
INSERT INTO projects (name, description, technologies) VALUES 
    ('Sistema de Autenticação JWT', 'Implementação de autenticação usando JSON Web Tokens', '["Node.js", "Express", "JWT", "bcrypt"]'),
    ('API REST de E-commerce', 'API completa para plataforma de vendas online', '["Python", "FastAPI", "PostgreSQL", "Redis"]'),
    ('Dashboard Analytics', 'Painel de análise de dados em tempo real', '["React", "TypeScript", "D3.js", "WebSocket"]');

INSERT INTO tasks (project_id, title, description, status, priority) VALUES 
    (1, 'Implementar middleware de autenticação', 'Criar middleware para validar tokens JWT', 'completed', 'high'),
    (1, 'Adicionar refresh tokens', 'Implementar sistema de renovação de tokens', 'in_progress', 'high'),
    (2, 'Criar endpoints de produtos', 'CRUD completo para gerenciar produtos', 'pending', 'medium'),
    (3, 'Configurar WebSocket', 'Implementar conexão em tempo real', 'pending', 'high');