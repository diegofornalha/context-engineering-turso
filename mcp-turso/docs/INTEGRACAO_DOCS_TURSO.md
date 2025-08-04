# 📚 Integração das Ferramentas docs_turso no MCP

## 🎯 Resumo das Mudanças

Criamos novas ferramentas MCP para trabalhar com a tabela `docs_turso`, substituindo as ferramentas de conversação por ferramentas focadas em documentação.

## 🔧 Novas Ferramentas Disponíveis

### 1. **turso_add_doc**
Adiciona um novo documento na tabela `docs_turso`.

**Parâmetros:**
- `title` (obrigatório): Título do documento
- `content` (obrigatório): Conteúdo do documento
- `file_path` (obrigatório): Caminho do arquivo
- `category` (opcional): Categoria do documento (padrão: 'general')
- `cluster` (opcional): Cluster do documento (padrão: '01-getting-started')
- `tags` (opcional): Tags em formato JSON
- `database` (opcional): Nome do banco de dados

**Exemplo de uso:**
```json
{
  "title": "Guia de Configuração",
  "content": "Este é o conteúdo do guia...",
  "file_path": "/docs_turso/guia-configuracao.md",
  "category": "configuration",
  "tags": "[\"turso\", \"config\", \"setup\"]"
}
```

### 2. **turso_get_docs**
Busca documentos da tabela `docs_turso` com filtros opcionais.

**Parâmetros:**
- `category` (opcional): Filtrar por categoria
- `cluster` (opcional): Filtrar por cluster
- `limit` (opcional): Número de documentos a retornar (padrão: 10)
- `database` (opcional): Nome do banco de dados

### 3. **turso_search_docs**
Busca conteúdo nos documentos (título ou conteúdo).

**Parâmetros:**
- `query` (obrigatório): Termo de busca
- `category` (opcional): Filtrar por categoria
- `limit` (opcional): Número de resultados (padrão: 10)
- `database` (opcional): Nome do banco de dados

### 4. **turso_update_doc**
Atualiza um documento existente.

**Parâmetros:**
- `id` (obrigatório): ID do documento
- `title` (opcional): Novo título
- `content` (opcional): Novo conteúdo
- `category` (opcional): Nova categoria
- `cluster` (opcional): Novo cluster
- `tags` (opcional): Novas tags
- `database` (opcional): Nome do banco de dados

### 5. **turso_delete_doc**
Remove um documento da tabela.

**Parâmetros:**
- `id` (obrigatório): ID do documento a remover
- `database` (opcional): Nome do banco de dados

### 6. **turso_get_doc_by_path**
Busca um documento específico pelo caminho do arquivo.

**Parâmetros:**
- `file_path` (obrigatório): Caminho do arquivo
- `database` (opcional): Nome do banco de dados

## 🔄 Mapeamento das Mudanças

| Ferramenta Antiga | Nova Ferramenta | Descrição |
|-------------------|-----------------|-----------|
| `turso_add_conversation` | `turso_add_doc` | Adiciona documentos ao invés de conversas |
| `turso_get_conversations` | `turso_get_docs` | Busca documentos com filtros |
| `turso_search_knowledge` | `turso_search_docs` | Busca conteúdo nos documentos |
| `turso_add_knowledge` | Removida | Não necessária, usamos `turso_add_doc` |
| - | `turso_update_doc` | Nova funcionalidade para atualizar docs |
| - | `turso_delete_doc` | Nova funcionalidade para remover docs |
| - | `turso_get_doc_by_path` | Nova funcionalidade para buscar por caminho |

## 🚀 Como Integrar

### 1. Importar o novo módulo no index principal

No arquivo `src/index-hybrid.ts`, adicione:

```typescript
import { register_docs_turso_tools } from './tools/docs-turso-tools.js';
```

### 2. Registrar as ferramentas no servidor

Adicione a chamada para registrar as novas ferramentas:

```typescript
// Registra as ferramentas existentes
register_database_tools(server);
register_organization_tools(server);

// Registra as novas ferramentas docs_turso
register_docs_turso_tools(server);
```

### 3. Remover ferramentas antigas (opcional)

Se quiser remover completamente as ferramentas de conversação do `handler.ts`, você pode comentar ou remover:
- `add_conversation`
- `get_conversations`
- `add_knowledge`
- `search_knowledge`

## 📝 Estrutura da Tabela docs_turso

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

## 🧪 Testando as Ferramentas

### Teste 1: Adicionar um documento
```bash
# Via MCP no Cursor
turso_add_doc({
  "title": "Teste de Documento",
  "content": "Este é um teste das novas ferramentas",
  "file_path": "/teste/doc1.md",
  "category": "test"
})
```

### Teste 2: Buscar documentos
```bash
# Buscar todos os documentos de teste
turso_get_docs({ "category": "test" })
```

### Teste 3: Pesquisar conteúdo
```bash
# Buscar documentos que contenham "ferramentas"
turso_search_docs({ "query": "ferramentas" })
```

### Teste 4: Atualizar documento
```bash
# Atualizar o título de um documento
turso_update_doc({ 
  "id": 1, 
  "title": "Novo Título do Documento"
})
```

### Teste 5: Buscar por caminho
```bash
# Buscar documento específico
turso_get_doc_by_path({ 
  "file_path": "/teste/doc1.md"
})
```

## ⚠️ Considerações Importantes

1. **Compatibilidade**: As novas ferramentas são compatíveis com a estrutura existente da tabela `docs_turso`
2. **Migração**: Não é necessária migração de dados, pois usamos a mesma tabela
3. **Performance**: As queries incluem índices apropriados para busca eficiente
4. **Segurança**: Todas as queries usam parâmetros preparados para evitar SQL injection

## 🔍 Próximos Passos

1. ✅ Compilar o projeto: `pnpm build`
2. ✅ Testar as ferramentas no Cursor
3. ✅ Verificar se os dados estão sendo inseridos corretamente
4. ✅ Documentar qualquer ajuste necessário

## 📌 Observações

- As ferramentas mantêm compatibilidade com o contexto de database atual
- O campo `updated_at` é atualizado automaticamente em updates
- As buscas são case-insensitive usando LIKE
- O campo `tags` espera um JSON array como string