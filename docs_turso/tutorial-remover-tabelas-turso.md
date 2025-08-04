# Tutorial: Como Remover Tabelas no Turso Database

Este documento explica como remover tabelas no Turso, incluindo o tratamento de dependências e restrições de chave estrangeira.

## 📋 Cenário

Precisávamos remover as tabelas `projects` e `tasks` que tinham sido criadas anteriormente. Estas tabelas tinham uma relação de chave estrangeira entre elas.

## 🔗 Estrutura das Tabelas (Antes da Remoção)

```sql
-- Tabela projects
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    technologies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela tasks (com FK para projects)
CREATE TABLE tasks (
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
```

## ❌ Problema: Foreign Key Constraint

### Tentativa 1 (Falhou)
```bash
turso db shell context-memory "DROP TABLE IF EXISTS projects"
```

**Erro**: `SQLite error: FOREIGN KEY constraint failed`

**Motivo**: A tabela `projects` não pode ser removida porque a tabela `tasks` tem uma chave estrangeira que referencia `projects`.

## ✅ Solução: Remover Tabelas na Ordem Correta

### Passo 1: Remover Primeiro as Tabelas Dependentes

Quando há relacionamentos de chave estrangeira, você deve remover as tabelas na ordem inversa de suas dependências:

```bash
# Remover tasks primeiro (que depende de projects), depois projects
turso db shell context-memory "DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS projects;"
```

### Passo 2: Verificar se as Tabelas Foram Removidas

```bash
turso db shell context-memory ".tables"
```

**Resultado**: Mostra apenas as tabelas restantes (no nosso caso, apenas `docs_turso`)

## 🎯 Estratégias para Remover Tabelas

### 1. **Ordem de Remoção (Recomendado)**
Sempre remova tabelas na ordem inversa de suas dependências:
- Primeiro: tabelas filhas (que têm FK)
- Depois: tabelas pai (referenciadas por FK)

### 2. **Desabilitar Foreign Keys Temporariamente**
```sql
PRAGMA foreign_keys = OFF;
DROP TABLE projects;
DROP TABLE tasks;
PRAGMA foreign_keys = ON;
```

### 3. **Remover em Cascata (Se Configurado)**
Se a FK foi criada com `ON DELETE CASCADE`:
```sql
-- Isso removeria automaticamente registros relacionados
DELETE FROM projects WHERE id = 1;
```

### 4. **Script para Remover Múltiplas Tabelas**
```sql
-- Remover múltiplas tabelas relacionadas
BEGIN TRANSACTION;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS project_tags;
COMMIT;
```

## 🔍 Comandos Úteis para Diagnóstico

### Ver Estrutura de uma Tabela
```bash
turso db shell context-memory ".schema tasks"
```

### Ver Todas as Foreign Keys
```bash
turso db shell context-memory "PRAGMA foreign_key_list(tasks)"
```

### Verificar se Foreign Keys Estão Habilitadas
```bash
turso db shell context-memory "PRAGMA foreign_keys"
```

## ⚠️ Cuidados ao Remover Tabelas

1. **Sempre faça backup** antes de remover tabelas em produção
2. **Verifique dependências** antes de remover
3. **Use transações** para operações múltiplas
4. **Confirme a remoção** verificando com `.tables`

## 📝 Exemplo Completo

```bash
# 1. Listar tabelas existentes
turso db shell context-memory ".tables"

# 2. Verificar dependências
turso db shell context-memory ".schema tasks"

# 3. Remover tabelas na ordem correta
turso db shell context-memory "DROP TABLE IF EXISTS tasks; DROP TABLE IF EXISTS projects;"

# 4. Confirmar remoção
turso db shell context-memory ".tables"
```

## 🚨 Erros Comuns e Soluções

### Erro: "table is locked"
**Solução**: Feche outras conexões ao banco ou aguarde transações em andamento

### Erro: "no such table"
**Solução**: Verifique o nome correto da tabela com `.tables`

### Erro: "FOREIGN KEY constraint failed"
**Solução**: Remova primeiro as tabelas dependentes ou desabilite FKs temporariamente

## 🎉 Conclusão

Remover tabelas no Turso é simples, mas requer atenção às dependências. Sempre:
- Identifique relacionamentos antes de remover
- Remova na ordem correta (filhas primeiro)
- Verifique o resultado após a operação
- Mantenha backups para segurança

Este processo garante a integridade do banco de dados e evita erros de constraint.