# Gerar PRP de Template

## Arquivo de funcionalidade: $ARGUMENTS

Gerar um PRP abrangente para criar templates de context engineering para domínios tecnológicos específicos baseado nos requisitos detalhados no arquivo INITIAL.md. Isso segue o fluxo de trabalho padrão do framework PRP: INITIAL.md → generate-template-prp → execute-template-prp.

**CRÍTICO: Pesquisa web e documentação é sua melhor amiga. Use extensivamente durante todo este processo.**

## Processo de Pesquisa

1. **Ler e Entender Requisitos**
   - Ler completamente o arquivo INITIAL.md especificado
   - Entender a tecnologia alvo e requisitos específicos do template
   - Notar quaisquer funcionalidades, exemplos ou documentação específicos mencionados
   - Identificar o escopo e complexidade do template necessário

2. **Pesquisa Web Extensiva (CRÍTICO)**
   - **Pesquisar a tecnologia alvo extensivamente** - isso é essencial
   - Estudar documentação oficial, APIs e guias de início
   - Pesquisar melhores práticas e padrões arquiteturais comuns
   - Encontrar exemplos de implementação do mundo real e tutoriais
   - Identificar armadilhas comuns, armadilhas e casos extremos
   - Procurar convenções estabelecidas de estrutura de projeto

3. **Análise de Padrões Tecnológicos**
   - Examinar implementações bem-sucedidas encontradas através da pesquisa web
   - Identificar padrões de estrutura de projeto e organização de arquivos
   - Extrair padrões de código reutilizáveis e templates de configuração
   - Documentar fluxos de trabalho de desenvolvimento específicos do framework
   - Notar frameworks de teste e abordagens de validação

4. **Adaptação de Context Engineering**
   - Mapear padrões tecnológicos descobertos para princípios de context engineering
   - Planejar como adaptar o framework PRP para esta tecnologia específica
   - Projetar requisitos de validação específicos do domínio
   - Planejar estrutura do pacote de template e componentes

## Geração do PRP

Usando PRPs/templates/prp_template_base.md como base:

### Contexto Crítico para Incluir da Pesquisa Web

**Documentação Tecnológica (da pesquisa web)**:
- URLs de documentação oficial do framework com seções específicas
- Guias de início e tutoriais
- Referências de API e guias de melhores práticas
- Recursos da comunidade e repositórios de exemplo

**Padrões de Implementação (da pesquisa)**:
- Estruturas de projeto específicas do framework e convenções
- Abordagens de gerenciamento de configuração
- Padrões de fluxo de trabalho de desenvolvimento
- Abordagens de teste e validação

**Exemplos do Mundo Real**:
- Links para implementações bem-sucedidas encontradas online
- Trechos de código e exemplos de configuração
- Padrões de integração comuns
- Procedimentos de implantação e configuração

### Plano de Implementação

Baseado nas descobertas da pesquisa web:
- **Análise Tecnológica**: Documentar características e padrões do framework
- **Estrutura do Template**: Planejar componentes completos do pacote de template
- **Estratégia de Especialização**: Como adaptar context engineering para esta tecnologia
- **Design de Validação**: Loops de teste e validação apropriados para a tecnologia

### Portões de Validação (Devem ser Executáveis)

```bash
# Validação de Estrutura do Template
ls -la use-cases/{nome-da-tecnologia}/
find use-cases/{nome-da-tecnologia}/ -name "*.md" | wc -l  # Deve ter todos os arquivos necessários

# Validação de Conteúdo do Template  
grep -r "TODO\|PLACEHOLDER" use-cases/{nome-da-tecnologia}/  # Deve estar vazio
grep -r "WEBSEARCH_NEEDED" use-cases/{nome-da-tecnologia}/  # Deve estar vazio

# Teste de Funcionalidade do Template
cd use-cases/{nome-da-tecnologia}
/generate-{tecnologia}-prp INITIAL.md  # Testar geração de PRP específica do domínio
```

*** CRÍTICO: Faça pesquisa web extensiva antes de escrever o PRP ***
*** Use a ferramenta WebSearch extensivamente para entender a tecnologia profundamente ***

## Saída

Salvar como: `PRPs/template-{nome-da-tecnologia}.md`

## Checklist de Qualidade

- [ ] Pesquisa web extensiva completada na tecnologia alvo
- [ ] Documentação oficial revisada completamente
- [ ] Exemplos do mundo real e padrões identificados
- [ ] Estrutura completa do pacote de template planejada
- [ ] Validação específica do domínio projetada
- [ ] Todas as descobertas de pesquisa web documentadas no PRP
- [ ] Armadilhas e padrões específicos da tecnologia capturados

Pontue o PRP em uma escala de 1-10 (nível de confiança para criar templates abrangentes e imediatamente utilizáveis baseado em pesquisa tecnológica completa).

Lembre-se: O objetivo é criar pacotes de template completos e especializados que tornem context engineering trivial de aplicar a qualquer domínio tecnológico através de pesquisa e documentação abrangentes.