# 🗄️ Estrutura Simplificada do Banco de Dados

## 📋 Visão Geral

Estrutura simplificada com **apenas duas tabelas principais** para organizar a documentação dos agentes de forma limpa e eficiente.

## 🎯 Estrutura Proposta

### **Tabela 1: `docs_prp`**
```sql
CREATE TABLE docs_prp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    cluster TEXT DEFAULT '01-getting-started',
    tags TEXT,
    priority INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabela 2: `docs_turso`**
```sql
CREATE TABLE docs_turso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    cluster TEXT DEFAULT '01-getting-started',
    tags TEXT,
    priority INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🏗️ Campos das Tabelas

### **Campos Principais:**
- **`id`**: Identificador único
- **`title`**: Título do documento
- **`content`**: Conteúdo completo do arquivo .md
- **`file_path`**: Caminho relativo do arquivo
- **`category`**: Categoria (general, architecture, mcp, etc.)
- **`cluster`**: Cluster da pasta (01-getting-started, 02-agent-architecture, etc.)
- **`tags`**: Tags separadas por vírgula
- **`priority`**: Prioridade (1-5)
- **`created_at`**: Data de criação
- **`updated_at`**: Data de atualização

## 📁 Mapeamento de Pastas

### **docs-prp/ → docs_prp:**
```
docs-prp/
├── 01-getting-started/          → cluster: '01-getting-started'
├── 02-agent-architecture/        → cluster: '02-agent-architecture'
├── 03-mcp-integration/          → cluster: '03-mcp-integration'
├── 04-prp-system/              → cluster: '04-prp-system'
├── 05-delegation-strategy/      → cluster: '05-delegation-strategy'
├── 06-cleanup-maintenance/      → cluster: '06-cleanup-maintenance'
├── 07-examples/                → cluster: '07-examples'
└── 08-reference/               → cluster: '08-reference'
```

### **docs-turso/ → docs_turso:**
```
docs-turso/
├── 01-getting-started/          → cluster: '01-getting-started'
├── 02-mcp-integration/          → cluster: '02-mcp-integration'
├── 03-turso-database/           → cluster: '03-turso-database'
├── 04-prp-system/              → cluster: '04-prp-system'
├── 05-sentry-monitoring/        → cluster: '05-sentry-monitoring'
├── 06-system-status/            → cluster: '06-system-status'
├── 07-project-organization/     → cluster: '07-project-organization'
└── 08-reference/               → cluster: '08-reference'
```

## 🔧 Scripts de Migração

### **1. Criar Nova Estrutura:**
```sql
-- Limpar tabelas antigas
DROP TABLE IF EXISTS prps;
DROP TABLE IF EXISTS turso_agent_knowledge;

-- Criar nova estrutura
CREATE TABLE docs_prp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    cluster TEXT DEFAULT '01-getting-started',
    tags TEXT,
    priority INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE docs_turso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    file_path TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    cluster TEXT DEFAULT '01-getting-started',
    tags TEXT,
    priority INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX idx_docs_prp_cluster ON docs_prp(cluster);
CREATE INDEX idx_docs_prp_category ON docs_prp(category);
CREATE INDEX idx_docs_prp_tags ON docs_prp(tags);
CREATE INDEX idx_docs_prp_updated ON docs_prp(updated_at);

CREATE INDEX idx_docs_turso_cluster ON docs_turso(cluster);
CREATE INDEX idx_docs_turso_category ON docs_turso(category);
CREATE INDEX idx_docs_turso_tags ON docs_turso(tags);
CREATE INDEX idx_docs_turso_updated ON docs_turso(updated_at);
```

### **2. Script Python para Migração:**
```python
import os
import sqlite3
from pathlib import Path

def migrate_docs_to_database():
    """Migra documentação das pastas para o banco de dados"""
    
    # Conectar ao banco
    conn = sqlite3.connect('context-memory.db')
    cursor = conn.cursor()
    
    # Migrar docs-prp
    docs_prp_path = Path('prp-agent/docs-prp')
    if docs_prp_path.exists():
        for md_file in docs_prp_path.rglob('*.md'):
            if md_file.name != 'README.md':
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extrair cluster da estrutura de pastas
                cluster = md_file.parent.name
                
                # Inserir no banco
                cursor.execute('''
                    INSERT INTO docs_prp (title, content, file_path, cluster, category)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    md_file.stem,
                    content,
                    str(md_file.relative_to(docs_prp_path)),
                    cluster,
                    'documentation'
                ))
    
    # Migrar docs-turso
    docs_turso_path = Path('turso-agent/docs-turso')
    if docs_turso_path.exists():
        for md_file in docs_turso_path.rglob('*.md'):
            if md_file.name != 'README.md':
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extrair cluster da estrutura de pastas
                cluster = md_file.parent.name
                
                # Inserir no banco
                cursor.execute('''
                    INSERT INTO docs_turso (title, content, file_path, cluster, category)
                    VALUES (?, ?, ?, ?, ?)
                ''', (
                    md_file.stem,
                    content,
                    str(md_file.relative_to(docs_turso_path)),
                    cluster,
                    'documentation'
                ))
    
    conn.commit()
    conn.close()
```

## 🚀 Benefícios da Estrutura Simplificada

### **✅ Simplicidade:**
- Apenas 2 tabelas principais
- Estrutura clara e fácil de entender
- Manutenção simplificada

### **✅ Organização:**
- Documentação separada por agente
- Clusters bem definidos
- Fácil busca e filtragem

### **✅ Performance:**
- Índices otimizados
- Queries rápidas
- Busca eficiente

### **✅ Escalabilidade:**
- Fácil adição de novos agentes
- Estrutura replicável
- Padrão consistente

## 📊 Exemplos de Queries

### **Buscar documentação por cluster:**
```sql
-- Docs PRP do cluster 02-agent-architecture
SELECT title, content FROM docs_prp 
WHERE cluster = '02-agent-architecture';

-- Docs Turso do cluster 03-mcp-integration
SELECT title, content FROM docs_turso 
WHERE cluster = '03-mcp-integration';
```

### **Buscar por tags:**
```sql
-- Docs com tag 'delegação'
SELECT title, content FROM docs_prp 
WHERE tags LIKE '%delegação%';

-- Docs com tag 'mcp'
SELECT title, content FROM docs_turso 
WHERE tags LIKE '%mcp%';
```

### **Buscar por categoria:**
```sql
-- Todos os docs de arquitetura
SELECT title, content FROM docs_prp 
WHERE category = 'architecture';

-- Todos os docs de configuração
SELECT title, content FROM docs_turso 
WHERE category = 'configuration';
```

## 🎯 Próximos Passos

### **1. Implementação:**
- [ ] Criar nova estrutura de tabelas
- [ ] Migrar documentação existente
- [ ] Testar queries de busca
- [ ] Validar performance

### **2. Integração MCP:**
- [ ] Atualizar ferramentas MCP
- [ ] Implementar busca via MCP
- [ ] Adicionar documentação via MCP
- [ ] Testar integração

### **3. Documentação:**
- [ ] Criar guias de uso
- [ ] Documentar queries comuns
- [ ] Exemplos práticos
- [ ] Troubleshooting

---

**Status**: 📋 PLANEJADO - Estrutura simplificada definida  
**Última atualização**: 03/08/2025  
**Versão**: 1.0.0  
**Próximo Milestone**: Implementar migração 