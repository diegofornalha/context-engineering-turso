# 🤖 CLAUDE.md - Regras de Desenvolvimento para Claude Code

Este arquivo sincroniza com `.cursorrules` e define diretrizes específicas para desenvolvimento com Claude Code.

## 🔄 Consciência e Contexto do Projeto
- **Sempre leia `PLANNING.md`** no início de uma nova conversa para entender a arquitetura, objetivos, estilo e restrições do projeto
- **Verifique `TASK.md`** antes de iniciar uma nova tarefa. Se a tarefa não estiver listada, adicione-a com uma breve descrição e a data de hoje
- **Use convenções de nomenclatura, estrutura de arquivos e padrões de arquitetura consistentes** conforme descrito em `PLANNING.md`
- **Use venv_linux** (o ambiente virtual) sempre que executar comandos Python, incluindo testes unitários

## 🧱 Estrutura e Modularidade do Código
- **Nunca crie um arquivo com mais de 500 linhas de código.** Se um arquivo se aproximar desse limite, refatore dividindo-o em módulos ou arquivos auxiliares
- **Organize o código em módulos claramente separados**, agrupados por funcionalidade ou responsabilidade
  Para agentes, isso se parece com:
    - `agent.py` - Definição principal do agente e lógica de execução 
    - `tools.py` - Funções de ferramentas usadas pelo agente 
    - `prompts.py` - Prompts do sistema
- **Use imports claros e consistentes** (prefira imports relativos dentro de pacotes)
- **Use python_dotenv e load_env()** para variáveis de ambiente

## 🧪 Testes e Confiabilidade
- **Sempre crie testes unitários Pytest para novas funcionalidades** (funções, classes, rotas, etc.)
- **Após atualizar qualquer lógica**, verifique se os testes unitários existentes precisam ser atualizados. Se sim, faça isso
- **Os testes devem ficar em uma pasta `/tests`** espelhando a estrutura principal do app
  - Inclua pelo menos:
    - 1 teste para uso esperado
    - 1 caso extremo
    - 1 caso de falha

## ✅ Conclusão de Tarefas
- **Marque tarefas concluídas em `TASK.md`** imediatamente após terminá-las
- Adicione novas sub-tarefas ou TODOs descobertos durante o desenvolvimento a `TASK.md` sob uma seção "Descoberto Durante o Trabalho"

## 📎 Estilo e Convenções
- **Use Python** como linguagem principal
- **Siga PEP8**, use type hints e formate com `black`
- **Use `pydantic` para validação de dados**
- Use `FastAPI` para APIs e `SQLAlchemy` ou `SQLModel` para ORM se aplicável
- Escreva **docstrings para cada função** usando o estilo Google:
  ```python
  def exemplo():
      """
      Resumo breve.

      Args:
          param1 (tipo): Descrição.

      Returns:
          tipo: Descrição.
      """
  ```

## 📚 Documentação e Explicabilidade
- **Atualize `README.md`** quando novas funcionalidades forem adicionadas, dependências mudarem ou etapas de configuração forem modificadas
- **Comente código não óbvio** e garanta que tudo seja compreensível para um desenvolvedor de nível médio
- Ao escrever lógica complexa, **adicione um comentário inline `# Motivo:`** explicando o porquê, não apenas o quê

## 📁 Organização de Arquivos

### ⚠️ REGRA CRÍTICA: Evite arquivos .md na raiz!

- **Documentação Geral**: Coloque TODOS os arquivos de documentação (`.md`) na pasta `docs/`
- **Documentação Específica de Agentes**: 
  - `turso-agent/docs-turso/` - Documentação específica do Turso Agent
  - `prp-agent/docs-prp/` - Documentação específica do PRP Agent
- **Scripts SQL**: Coloque todos os arquivos SQL na pasta `sql-db/`
- **Scripts Python**: Coloque todos os arquivos Python na pasta `py-prp/`
- **Evite arquivos na raiz**: Use as pastas específicas para manter organização

### 📂 Estrutura Obrigatória:
```
context-engineering-turso/
├── docs/                    # Documentação geral (.md) - organizada em clusters
│   ├── 01-getting-started/
│   ├── 02-mcp-integration/
│   ├── 03-turso-database/
│   ├── 04-prp-system/
│   ├── 05-sentry-monitoring/
│   ├── 06-system-status/
│   ├── 07-project-organization/
│   └── 08-reference/
├── turso-agent/
│   └── docs-turso/         # Documentação específica Turso Agent
├── prp-agent/
│   └── docs-prp/           # Documentação específica PRP Agent
├── sql-db/                 # Scripts SQL (.sql) e bancos (.db)
├── py-prp/                 # Scripts Python (.py)
├── agents/                 # Implementação do agente PRP
├── mcp-*/                  # Servidores MCP
├── scripts/                # Scripts temporários/manutenção
├── use-cases/              # Casos de uso
├── README.md               # Único .md permitido na raiz
├── CLAUDE.md               # Este arquivo (sync com .cursorrules)
└── .cursorrules            # Regras para Cursor
```

### 🚫 Arquivos NÃO permitidos na raiz:
- Nenhum arquivo de documentação além de README.md e CLAUDE.md
- Nenhum script Python ou SQL
- Nenhum arquivo temporário ou de log

## 🧠 Regras de Comportamento da IA

- **Nunca assuma contexto ausente. Faça perguntas se estiver incerto**
- **Nunca alucine bibliotecas ou funções** – use apenas pacotes Python conhecidos e verificados
- **Sempre confirme que caminhos de arquivo e nomes de módulos** existem antes de referenciá-los em código ou testes
- **Nunca delete ou sobrescreva código existente** a menos que seja explicitamente instruído ou se fizer parte de uma tarefa de `TASK.md`
- **Sempre responda em português brasileiro (pt-BR)**

## 🔍 Consultas MCP Turso para PRPs

- **SEMPRE consulte o MCP Turso** quando perguntas envolverem PRPs, conhecimento ou conversas
- **Use mcp_turso_search_knowledge** para buscar informações sobre PRPs no banco de dados
- **Use mcp_turso_execute_read_only_query** para consultas SQL específicas sobre PRPs
- **Use mcp_turso_get_conversations** para buscar conversas relacionadas a PRPs
- **Priorize dados do banco Turso** sobre informações genéricas ou assumidas
- **Sempre verifique o contexto-memory** antes de responder sobre PRPs
- **Use mcp_turso_list_tables** para entender a estrutura do banco quando necessário

## 🚀 MCP Turso - Uso Universal no Cursor

- **SEMPRE use o MCP Turso** quando precisar fazer qualquer coisa no Cursor Agent
- **Priorize consultas ao banco** antes de assumir ou usar informações genéricas
- **Use mcp_turso_search_knowledge** para buscar qualquer informação no sistema
- **Use mcp_turso_execute_read_only_query** para consultas SQL específicas
- **Use mcp_turso_get_conversations** para buscar histórico de conversas
- **Use mcp_turso_add_conversation** para registrar novas conversas importantes
- **Use mcp_turso_add_knowledge** para adicionar conhecimento ao sistema
- **Sempre verifique o contexto-memory** antes de responder qualquer pergunta
- **Consulte o banco Turso** para dados sobre: PRPs, agentes, arquiteturas, configurações, status do projeto
- **Use mcp_turso_list_databases** e **mcp_turso_list_tables** para entender a estrutura dos dados
- **Priorize dados reais do sistema** sobre informações genéricas ou assumidas

## 🔄 Sincronização com .cursorrules

Este arquivo deve estar sempre sincronizado com `.cursorrules`. Qualquer mudança em um deve ser refletida no outro para manter consistência entre Claude Code e Cursor.

---
*Última sincronização: 03/08/2025*