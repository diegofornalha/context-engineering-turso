# Executar PRP de Agente Pydantic AI

Implementar um agente Pydantic AI usando o arquivo PRP.

## Arquivo PRP: $ARGUMENTS

## Processo de Execução

1. **Carregar PRP**
   - Ler o arquivo PRP Pydantic AI especificado
   - Entender todos os requisitos do agente e descobertas de pesquisa
   - Seguir todas as instruções no PRP e estender pesquisa se necessário
   - Revisar padrões main_agent_reference para orientação de implementação
   - Fazer mais pesquisas na web e revisão de documentação Pydantic AI conforme necessário

2. **ULTRATHINK**
   - Pensar muito antes de executar o plano de implementação do agente
   - Quebrar desenvolvimento do agente em etapas menores usando suas ferramentas todos  
   - Usar a ferramenta TodoWrite para criar e rastrear seu plano de implementação do agente
   - Seguir padrões main_agent_reference para configuração e estrutura
   - Planejar agent.py, tools.py, dependencies.py e abordagem de teste

3. **Executar o plano**
   - Implementar o agente Pydantic AI seguindo o PRP
   - Criar agente com configuração baseada em ambiente (settings.py, providers.py)
   - Usar saída de string por padrão (sem result_type a menos que saída estruturada necessária)
   - Implementar ferramentas com decoradores @agent.tool e tratamento de erro adequado
   - Adicionar teste abrangente com TestModel e FunctionModel

4. **Validar**
   - Testar import e instanciação do agente
   - Executar validação TestModel para teste rápido de desenvolvimento
   - Testar registro e funcionalidade de ferramentas
   - Executar suite de teste pytest se criada
   - Verificar se agente segue padrões main_agent_reference

5. **Completar**
   - Garantir que todos os itens do checklist do PRP estejam feitos
   - Testar agente com consultas de exemplo
   - Verificar padrões de segurança (variáveis de ambiente, tratamento de erro)
   - Reportar status de conclusão
   - Ler o PRP novamente para garantir implementação completa

6. **Referenciar o PRP**
   - Você pode sempre referenciar o PRP novamente se necessário

## Padrões Específicos do Pydantic AI para Seguir

- **Configuração**: Usar configuração baseada em ambiente como main_agent_reference  
- **Saída**: Padrão para saída de string, só usar result_type quando validação necessária
- **Ferramentas**: Usar @agent.tool com RunContext para injeção de dependência
- **Teste**: Incluir validação TestModel para desenvolvimento
- **Segurança**: Variáveis de ambiente para chaves de API, tratamento de erro adequado

Nota: Se validação falhar, usar padrões de erro no PRP para corrigir e tentar novamente. Seguir main_agent_reference para padrões comprovados de implementação Pydantic AI.