# Criar PRP

## Arquivo de funcionalidade: $ARGUMENTS

Gerar um PRP completo para implementação de funcionalidade geral com pesquisa abrangente. Garantir que contexto seja passado para o agente de IA para habilitar auto-validação e refinamento iterativo. Ler o arquivo de funcionalidade primeiro para entender o que precisa ser criado, como os exemplos fornecidos ajudam, e quaisquer outras considerações.

O agente de IA só recebe o contexto que você está anexando ao PRP e dados de treinamento. Assuma que o agente de IA tem acesso ao codebase e o mesmo conhecimento de corte que você, então é importante que suas descobertas de pesquisa sejam incluídas ou referenciadas no PRP. O Agente tem capacidades de Websearch, então passe URLs para documentação e exemplos.

## Processo de Pesquisa

1. **Análise do Codebase**
   - Pesquisar por funcionalidades/padrões similares no codebase
   - Identificar arquivos para referenciar no PRP
   - Notar convenções existentes para seguir
   - Verificar padrões de teste para abordagem de validação

2. **Pesquisa Externa**
   - Pesquisar por funcionalidades/padrões similares online
   - Documentação de bibliotecas (incluir URLs específicas)
   - Exemplos de implementação (GitHub/StackOverflow/blogs)
   - Melhores práticas e armadilhas comuns
   - Usar servidor MCP Archon para coletar documentação mais recente do Pydantic AI
   - Pesquisa na web para padrões específicos e melhores práticas relevantes ao tipo de agente
   - Pesquisar capacidades e limitações de provedores de modelo
   - Investigar padrões de integração de ferramentas e considerações de segurança
   - Documentar padrões async/sync e estratégias de teste   

3. **Esclarecimento do Usuário** (se necessário)
   - Padrões específicos para espelhar e onde encontrá-los?
   - Requisitos de integração e onde encontrá-los?

4. **Analisando Requisitos Iniciais**
   - Ler e entender os requisitos de funcionalidade do agente
   - Identificar o tipo de agente necessário (chat, habilitado para ferramentas, workflow, saída estruturada)
   - Determinar provedores de modelo necessários e integrações externas
   - Avaliar complexidade e escopo da implementação do agente

5. **Planejamento de Arquitetura do Agente**
   - Projetar estrutura do agente (agent.py, tools.py, models.py, dependencies.py)
   - Planejar padrões de injeção de dependência e integrações de serviço externo
   - Projetar modelos de saída estruturada usando validação Pydantic
   - Planejar estratégias de registro de ferramentas e validação de parâmetros
   - Projetar abordagem de teste com padrões TestModel/FunctionModel

6. **Criação do Plano de Implementação**
   - Criar etapas detalhadas de implementação do agente
   - Planejar configuração de provedor de modelo e estratégias de fallback
   - Projetar tratamento de erro de ferramentas e mecanismos de retry
   - Planejar implementação de segurança (chaves de API, validação de entrada, limitação de taxa)
   - Projetar loops de validação com teste de comportamento de agente

## Geração de PRP

Usando PRPs/templates/prp_pydantic_aibase.md como template:

### Contexto Crítico para Incluir e Passar para o Agente de IA como Parte do PRP
- **Documentação**: URLs com seções específicas
- **Exemplos de Código**: Trechos reais do codebase
- **Armadilhas**: Peculiaridades de bibliotecas, problemas de versão
- **Padrões**: Abordagens existentes para seguir

### Plano de Implementação
- Começar com pseudocódigo mostrando abordagem
- Referenciar arquivos reais para padrões
- Incluir estratégia de tratamento de erro
- listar tarefas a serem completadas para cumprir o PRP na ordem que devem ser completadas

### Portões de Validação (Devem ser Executáveis) ex para python
```bash
# Sintaxe/Estilo
ruff check --fix && mypy .

# Testes Unitários
uv run pytest tests/ -v

```

*** CRÍTICO DEPOIS QUE VOCÊ TERMINOU DE PESQUISAR E EXPLORAR O CODEBASE ANTES DE COMEÇAR A ESCREVER O PRP ***

*** ULTRATHINK SOBRE O PRP E PLANEJE SUA ABORDAGEM ENTÃO COMECE A ESCREVER O PRP ***

## Saída
Salvar como: `PRPs/{feature-name}.md`

## Checklist de Qualidade
- [ ] Todo contexto necessário incluído
- [ ] Portões de validação são executáveis pelo agente de IA
- [ ] Referencia padrões existentes
- [ ] Caminho de implementação claro
- [ ] Tratamento de erro documentado

Pontue o PRP em uma escala de 1-10 (nível de confiança para ter sucesso em implementação de uma passada usando claude codes)

Lembre-se: O objetivo é sucesso de implementação de uma passada através de contexto abrangente.
