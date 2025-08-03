# Criar PRP

## Arquivo de funcionalidade: $ARGUMENTS

Gerar um PRP completo para implementação geral de funcionalidade com pesquisa abrangente. Garantir que contexto seja passado para o agente de IA para permitir auto-validação e refinamento iterativo. Ler o arquivo de funcionalidade primeiro para entender o que precisa ser criado, como os exemplos fornecidos ajudam, e quaisquer outras considerações.

O agente de IA só recebe o contexto que você está anexando ao PRP e dados de treinamento. Assuma que o agente de IA tem acesso ao codebase e o mesmo conhecimento de corte que você, então é importante que suas descobertas de pesquisa sejam incluídas ou referenciadas no PRP. O Agente tem capacidades de Websearch, então passe URLs para documentação e exemplos.

## Processo de Pesquisa

1. **Análise do Codebase**
   - Pesquisar funcionalidades/padrões similares no codebase
   - Identificar arquivos para referenciar no PRP
   - Notar convenções existentes para seguir
   - Verificar padrões de teste para abordagem de validação

2. **Pesquisa Externa**
   - Pesquisar funcionalidades/padrões similares online
   - Documentação de bibliotecas (incluir URLs específicas)
   - Exemplos de implementação (GitHub/StackOverflow/blogs)
   - Melhores práticas e armadilhas comuns

3. **Esclarecimento do Usuário** (se necessário)
   - Padrões específicos para espelhar e onde encontrá-los?
   - Requisitos de integração e onde encontrá-los?

## Geração do PRP

Usando PRPs/templates/prp_base.md como template:

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
Salvar como: `PRPs/{nome-da-funcionalidade}.md`

## Checklist de Qualidade
- [ ] Todo contexto necessário incluído
- [ ] Portões de validação são executáveis pela IA
- [ ] Referencia padrões existentes
- [ ] Caminho de implementação claro
- [ ] Tratamento de erro documentado

Pontue o PRP em uma escala de 1-10 (nível de confiança para ter sucesso em implementação de uma passada usando claude codes)

Lembre-se: O objetivo é sucesso de implementação de uma passada através de contexto abrangente.