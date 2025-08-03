# Tutorial: Como Criar Tabelas no Turso Database

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

## 🗄️ Tabelas Criadas

Neste tutorial, criamos duas tabelas relacionadas:

### 1. Tabela `projects`
Armazena informações sobre projetos de desenvolvimento.

### 2. Tabela `tasks`
Armazena tarefas associadas aos projetos.

## 🚀 Passo a Passo

### Passo 1: Criar o Arquivo SQL

Primeiro, criamos um arquivo `create_table.sql` com a estrutura das tabelas:

```sql
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
```

### Passo 2: Executar o SQL no Turso

Navegue até o diretório do projeto e execute:

```bash
cd /Users/agents/Desktop/context-engineering-turso
turso db shell context-memory < create_table.sql
```

### Passo 3: Inserir Dados de Exemplo

No mesmo arquivo SQL, adicionamos dados iniciais:

```sql
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
```

### Passo 4: Verificar as Tabelas Criadas

Para confirmar que as tabelas foram criadas:

```bash
# Listar todas as tabelas
turso db shell context-memory ".tables"

# Ver estrutura de uma tabela
turso db shell context-memory ".schema projects"

# Consultar dados
turso db shell context-memory "SELECT * FROM projects"
```

## 🔧 Estrutura das Tabelas

### Tabela `projects`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária auto-incrementável |
| name | TEXT | Nome do projeto (obrigatório) |
| description | TEXT | Descrição detalhada |
| status | TEXT | Status do projeto (padrão: 'active') |
| technologies | TEXT | Array JSON com tecnologias usadas |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de última atualização |

### Tabela `tasks`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Chave primária auto-incrementável |
| project_id | INTEGER | FK para tabela projects |
| title | TEXT | Título da tarefa (obrigatório) |
| description | TEXT | Descrição detalhada |
| status | TEXT | Status: pending/in_progress/completed |
| priority | TEXT | Prioridade: low/medium/high |
| due_date | DATE | Data de vencimento (opcional) |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de última atualização |

## 📊 Queries Úteis

### Buscar projetos ativos com contagem de tarefas
```sql
SELECT 
    p.id,
    p.name,
    p.status,
    COUNT(t.id) as total_tasks,
    SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
WHERE p.status = 'active'
GROUP BY p.id;
```

### Buscar tarefas pendentes de alta prioridade
```sql
SELECT 
    t.title,
    t.description,
    p.name as project_name
FROM tasks t
JOIN projects p ON t.project_id = p.id
WHERE t.status = 'pending' 
AND t.priority = 'high'
ORDER BY t.created_at;
```

### Buscar projetos por tecnologia
```sql
SELECT * FROM projects 
WHERE technologies LIKE '%React%';
```

## 🚨 Problemas Comuns e Soluções

### Erro: "Connection closed" ou "Not connected"

**Solução**: Reinicie o servidor MCP Turso
```bash
./start-all-mcp.sh
# ou
cd mcp-turso && ./start-mcp.sh
```

### Erro: "no such file or directory"

**Solução**: Certifique-se de estar no diretório correto
```bash
cd /Users/agents/Desktop/context-engineering-turso
```

### Erro: "table already exists"

**Solução**: Use `CREATE TABLE IF NOT EXISTS` ou delete a tabela primeiro
```sql
DROP TABLE IF EXISTS table_name;
```

## 🔐 Segurança

1. **Sempre use prepared statements** para evitar SQL injection
2. **Valide dados** antes de inserir no banco
3. **Use transações** para operações múltiplas
4. **Configure backups regulares** no Turso

## 🎯 Usando com MCP no Claude Code

Após criar as tabelas, você pode usar as ferramentas MCP:

```javascript
// Listar tabelas
mcp__mcp_turso__list_tables({
  database: "context-memory"
})

// Executar query de leitura
mcp__mcp_turso__execute_read_only_query({
  database: "context-memory",
  query: "SELECT * FROM projects WHERE status = ?",
  params: { 1: "active" }
})

// Inserir dados
mcp__mcp_turso__execute_query({
  database: "context-memory",
  query: "INSERT INTO tasks (project_id, title) VALUES (?, ?)",
  params: { 1: 1, 2: "Nova tarefa" }
})
```

## 📚 Recursos Adicionais

- [Documentação Turso](https://docs.turso.tech)
- [SQL Reference](https://docs.turso.tech/sql-reference)
- [Turso CLI Guide](https://docs.turso.tech/cli)
- [MCP Turso Integration](https://github.com/diegofornalha/mcp-turso)

## 🎉 Conclusão

Com estas tabelas criadas, você tem uma base sólida para:
- Gerenciar projetos e tarefas
- Integrar com sistemas de IA via MCP
- Criar aplicações com dados persistentes na edge
- Escalar globalmente com Turso

Lembre-se de sempre fazer backup dos dados importantes e seguir as melhores práticas de segurança!