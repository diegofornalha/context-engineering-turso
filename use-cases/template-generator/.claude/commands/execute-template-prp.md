# Executar PRP de Geração de Template

Execute um PRP abrangente de geração de template para criar um pacote completo de template de context engineering para uma tecnologia/framework específico.

## Arquivo PRP: $ARGUMENTS

## Processo de Execução

1. **Carregar PRP de Geração de Template**
   - Ler completamente o arquivo PRP de geração de template especificado
   - Entender a tecnologia alvo e todos os requisitos
   - Revisar todas as descobertas de pesquisa web documentadas no PRP
   - Seguir todas as instruções para criação do pacote de template

2. **ULTRATHINK - Design do Pacote de Template**
   - Criar plano de implementação abrangente
   - Planejar a estrutura completa do pacote de template baseada na pesquisa do PRP
   - Projetar adaptações de context engineering específicas do domínio
   - Mapear padrões tecnológicos para princípios de context engineering
   - Planejar todos os arquivos necessários e suas relações

3. **Gerar Pacote de Template Completo**
   - Criar estrutura completa de diretório para o caso de uso da tecnologia
   - Gerar CLAUDE.md específico do domínio com regras globais
   - Criar comandos especializados de geração e execução de PRP de template
   - Desenvolver template base PRP específico do domínio com descobertas da pesquisa
   - Incluir exemplos abrangentes e documentação da pesquisa web

4. **Validar Pacote de Template**
   - Executar todos os comandos de validação especificados no PRP
   - Verificar se todos os arquivos necessários foram criados e formatados adequadamente
   - Testar completude e precisão da estrutura do template
   - Verificar integração com framework base de context engineering

5. **Garantia de Qualidade**
   - Garantir que o template segue todos os princípios de context engineering
   - Verificar se padrões específicos do domínio são representados com precisão
   - Verificar se loops de validação são apropriados e executáveis para a tecnologia
   - Confirmar que o template é imediatamente utilizável para a tecnologia alvo

6. **Implementação Completa**
   - Revisar pacote de template contra todos os requisitos do PRP
   - Garantir que todos os critérios de sucesso do PRP são atendidos
   - Validar que o template está pronto para produção

## Requisitos do Pacote de Template

Criar um template de caso de uso completo com esta estrutura exata:

### Estrutura de Diretório Necessária
```
use-cases/{nome-da-tecnologia}/
├── CLAUDE.md                                    # Regras globais do domínio
├── .claude/commands/
│   ├── generate-{tecnologia}-prp.md            # Geração de PRP do domínio
│   └── execute-{tecnologia}-prp.md             # Execução de PRP do domínio
├── PRPs/
│   ├── templates/
│   │   └── prp_{tecnologia}_base.md            # Template base PRP do domínio
│   ├── ai_docs/                                # Documentação do domínio (opcional)
│   └── INITIAL.md                              # Solicitação de funcionalidade de exemplo
├── examples/                                   # Exemplos de código do domínio
├── copy_template.py                            # Script de implantação do template
└── README.md                                   # Guia de uso abrangente
```

### Requisitos de Conteúdo Baseados na Pesquisa do PRP

**CLAUDE.md** deve incluir (regras globais para o domínio):
- Comandos de ferramentas específicas da tecnologia e gerenciamento de pacotes
- Padrões arquiteturais e convenções do domínio
- Procedimentos de fluxo de trabalho de desenvolvimento específicos do framework
- Segurança e melhores práticas específicas da tecnologia
- Armadilhas comuns e pontos de integração

**Comandos PRP do Domínio** devem incluir:
- Processos de pesquisa específicos da tecnologia e estratégias de pesquisa web
- Abordagens de coleta de documentação do domínio baseadas nas descobertas do PRP
- Loops de validação apropriados para o framework e padrões de teste
- Planos de implementação especializados para a tecnologia

**Template Base PRP** deve incluir:
- Contexto do domínio pré-preenchido da pesquisa web conduzida no PRP
- Critérios de sucesso específicos da tecnologia e portões de validação
- Padrões de implementação apropriados para o framework e exemplos
- Referências de documentação especializadas do domínio e armadilhas

**Script de Cópia (copy_template.py)** deve incluir:
- Aceitar diretório alvo como argumento de linha de comando
- Copiar estrutura completa de diretório do template para localização alvo
- Incluir TODOS os arquivos: CLAUDE.md, .claude/, PRPs/, examples/, README.md
- Lidar com criação de diretório e tratamento de erro graciosamente
- Fornecer feedback claro de sucesso com próximos passos

**README.md** deve incluir:
- Descrição clara do propósito e capacidades do template
- Instruções de uso do script de cópia (colocado proeminentemente no topo)
- Explicação completa do fluxo de trabalho do framework PRP (processo de 3 etapas)
- Visão geral da estrutura do template com explicações de arquivos
- Exemplos específicos da tecnologia e capacidades
- Armadilhas comuns e orientação de solução de problemas

## Requisitos de Validação

### Validação de Estrutura
```bash
# Verificar se estrutura completa existe
find use-cases/{nome-da-tecnologia} -type f -name "*.md" | sort
ls -la use-cases/{nome-da-tecnologia}/.claude/commands/
ls -la use-cases/{nome-da-tecnologia}/PRPs/templates/

# Verificar se arquivos necessários existem
test -f use-cases/{nome-da-tecnologia}/CLAUDE.md
test -f use-cases/{nome-da-tecnologia}/README.md
test -f use-cases/{nome-da-tecnologia}/PRPs/INITIAL.md
test -f use-cases/{nome-da-tecnologia}/copy_template.py

# Testar funcionalidade do script de cópia
python use-cases/{nome-da-tecnologia}/copy_template.py 2>&1 | grep -q "Usage:" || echo "Script de cópia precisa de mensagem de uso adequada"
```

### Validação de Conteúdo
```bash
# Verificar conteúdo incompleto
grep -r "TODO\|PLACEHOLDER\|WEBSEARCH_NEEDED" use-cases/{nome-da-tecnologia}/
grep -r "{tecnologia}" use-cases/{nome-da-tecnologia}/ | wc -l  # Deve ser 0

# Verificar se conteúdo específico do domínio existe
grep -r "framework\|library\|technology" use-cases/{nome-da-tecnologia}/CLAUDE.md
grep -r "WebSearch\|web search" use-cases/{nome-da-tecnologia}/.claude/commands/

# Verificar se README tem seções necessárias
grep -q "Quick Start.*Copy Template" use-cases/{nome-da-tecnologia}/README.md
grep -q "PRP Framework Workflow" use-cases/{nome-da-tecnologia}/README.md
grep -q "python copy_template.py" use-cases/{nome-da-tecnologia}/README.md
```

### Teste de Funcionalidade
```bash
# Testar funcionalidade do template
cd use-cases/{nome-da-tecnologia}

# Verificar se comandos são nomeados adequadamente
ls .claude/commands/ | grep "{tecnologia}"

# Testar se exemplo INITIAL.md existe e é abrangente
wc -l PRPs/INITIAL.md  # Deve ser substancial, não apenas algumas linhas
```

## Critérios de Sucesso

- [ ] Estrutura completa do pacote de template criada exatamente como especificado
- [ ] Todos os arquivos necessários presentes e formatados adequadamente
- [ ] Conteúdo específico do domínio representa tecnologia com precisão baseado na pesquisa do PRP
- [ ] Princípios de context engineering adaptados adequadamente para a tecnologia
- [ ] Loops de validação apropriados e executáveis para o framework
- [ ] Pacote de template imediatamente utilizável para construir projetos no domínio
- [ ] Integração com framework base de context engineering mantida
- [ ] Todas as descobertas de pesquisa web do PRP integradas adequadamente no template
- [ ] Exemplos e documentação abrangentes e específicos da tecnologia
- [ ] Script de cópia (copy_template.py) funcional e adequadamente documentado
- [ ] README inclui instruções do script de cópia proeminentemente no topo
- [ ] README explica fluxo de trabalho completo do framework PRP com exemplos concretos

Nota: Se qualquer validação falhar, analise o erro, corrija os componentes do pacote de template e re-valide até que todos os critérios passem. O template deve estar pronto para produção e imediatamente utilizável para desenvolvedores trabalhando com a tecnologia alvo.