# 🎯 Agente Estrategista de Campanhas

## 📋 Visão Geral

O Agente Estrategista de Campanhas é um componente especializado do sistema CrewAI responsável por definir objetivos, público-alvo, budget e estratégia geral de campanhas de marketing.

## 🤖 Informações do Agente

### Identificação
- **Nome**: Campaign Strategist Agent
- **Tipo**: Especialista em Estratégia
- **Framework**: CrewAI
- **Integração**: PRP + A2A

### Função Principal
Define objetivos, público-alvo, budget e estratégia geral de campanhas de marketing, utilizando análise de mercado e definição de personas.

## 🎯 Especialidades

### 1. Análise de Mercado
- Pesquisa de tendências
- Análise competitiva
- Identificação de oportunidades
- Avaliação de riscos

### 2. Definição de Personas
- Criação de perfis detalhados
- Análise demográfica
- Comportamento de compra
- Jornada do cliente

### 3. Estrutura de Campanhas
- Definição de objetivos SMART
- Planejamento de fases
- Alocação de recursos
- KPIs e métricas

## 💼 Capacidades

### Análise Estratégica
```python
capabilities = [
    "market_analysis",           # Análise de mercado
    "persona_definition",        # Definição de personas
    "budget_planning",          # Planejamento de orçamento
    "objective_setting",        # Definição de objetivos
    "competitor_analysis",      # Análise competitiva
    "trend_identification",     # Identificação de tendências
    "roi_projection"           # Projeção de ROI
]
```

### Ferramentas Disponíveis
- **Market Research Tool**: Pesquisa e análise de mercado
- **Persona Builder**: Criação e gestão de personas
- **Budget Calculator**: Cálculo e otimização de orçamento
- **Campaign Planner**: Planejamento estruturado de campanhas

## 🔄 Workflow de Trabalho

### 1. Recepção do Brief
```yaml
input:
  - client_requirements
  - business_objectives
  - available_budget
  - timeline
```

### 2. Análise de Mercado
```yaml
process:
  - market_research
  - competitor_analysis
  - opportunity_mapping
  - trend_analysis
```

### 3. Definição de Estratégia
```yaml
output:
  - campaign_objectives
  - target_personas
  - budget_allocation
  - success_metrics
  - timeline_phases
```

## 🔗 Integração com Outros Agentes

### Comunicação A2A
- **→ Creative Agent**: Envia diretrizes estratégicas
- **→ Media Buyer Agent**: Define parâmetros de compra
- **→ Analytics Agent**: Estabelece KPIs
- **← Market Research Agent**: Recebe insights de mercado

### Compartilhamento de Dados
```python
shared_data = {
    "campaign_strategy": {
        "objectives": ["brand_awareness", "lead_generation"],
        "target_audience": persona_profiles,
        "budget": budget_breakdown,
        "timeline": campaign_phases
    }
}
```

## 📊 Métricas de Performance

### KPIs Principais
- Taxa de conversão de leads
- ROI da campanha
- Alcance do público-alvo
- Engajamento por persona
- Eficiência do budget

### Monitoramento
- Análise em tempo real via Sentry
- Armazenamento de dados históricos no Turso
- Relatórios automatizados semanais

## 🛠️ Configuração

### Variáveis de Ambiente
```bash
# Configuração do Agente
STRATEGIST_MODEL="gpt-4"
STRATEGIST_TEMPERATURE=0.7
STRATEGIST_MAX_TOKENS=2000

# Integrações
MARKET_RESEARCH_API_KEY="your_key"
ANALYTICS_PLATFORM_TOKEN="your_token"
```

### Inicialização no CrewAI
```python
strategist_agent = Agent(
    name="Campaign Strategist",
    role="Strategic Planning Expert",
    goal="Define winning campaign strategies",
    backstory="Expert strategist with 15+ years in marketing",
    capabilities=capabilities,
    tools=[market_research, persona_builder, budget_calculator],
    llm=ChatOpenAI(model="gpt-4", temperature=0.7)
)
```

## 🎯 Aplicação Prática: PRP + CrewAI + A2A para Mídia Paga

### 1. PRP (Product Requirements Prompts) - Análise de Requisitos

**Requisitos do Sistema de Mídia Paga:**
```yaml
objetivo: Criar campanhas de alta performance no Meta/Instagram
contexto: E-commerce/serviços que precisam de criativos eficazes
funcionalidades_essenciais:
  - estratégia_campanha: Definição de objetivos e público
  - criacao_criativos: Design de imagens e vídeos
  - copy_persuasivo: Textos que convertem
  - otimizacao_performance: Ajustes contínuos
  - analise_resultados: Métricas e insights
```

### 2. CrewAI (Framework) - Orquestração dos Agentes

**Workflow Baseado na Análise PRP:**
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Estrategista  │ --> │   Criativo   │ --> │    Copy     │ --> │  Otimizador  │ --> │   Analista  │
└────────┬────────┘     └──────┬───────┘     └──────┬──────┘     └──────┬───────┘     └──────┬──────┘
         │                     │                     │                     │                     │
    [Briefing]           [Criativos]            [Textos]           [Otimização]          [Relatórios]
```

### 3. A2A (Agent-to-Agent) - Comunicação Estruturada

**Fluxo de Dados entre Agentes:**
```python
# Estrategista → Criativo & Copy
strategy_data = {
    "briefing": {
        "objetivo": "Gerar 1000 vendas em 30 dias",
        "publico": "Mulheres 25-45, interesse em moda",
        "budget": 10000,
        "plataformas": ["Instagram Feed", "Stories", "Reels"]
    }
}

# Criativo → Otimizador
creative_assets = {
    "imagens": ["lifestyle_1.jpg", "produto_2.jpg"],
    "videos": ["demo_15s.mp4", "testimonial_30s.mp4"],
    "formatos": ["1:1", "9:16", "4:5"]
}

# Copy → Otimizador
copy_variations = {
    "headlines": [
        "Transforme seu estilo em 7 dias",
        "O segredo das influencers revelado"
    ],
    "ctas": ["Compre Agora", "Saiba Mais", "Aproveite 50% OFF"]
}

# Otimizador → Analista
performance_data = {
    "testes_ab": {
        "criativo_a": {"ctr": 2.5, "cpc": 0.80, "conversoes": 45},
        "criativo_b": {"ctr": 3.2, "cpc": 0.65, "conversoes": 67}
    },
    "otimizacoes": ["ajuste_lance", "expansao_publico", "dayparting"]
}
```

## 📋 Exemplo de Uso Completo

### Input para Sistema de Mídia Paga
```json
{
    "client": "Fashion E-commerce",
    "objective": "Black Friday Campaign",
    "budget": 50000,
    "timeline": "4 weeks",
    "platforms": ["Meta", "Instagram"],
    "target": "Women 25-45 interested in fashion"
}
```

### Output Integrado (PRP + CrewAI + A2A)
```json
{
    "prp_analysis": {
        "requirements": [
            "High-converting creatives",
            "Persuasive copy variations",
            "Budget optimization",
            "Real-time performance tracking"
        ],
        "constraints": [
            "4-week timeline",
            "50k budget limit",
            "Platform restrictions"
        ]
    },
    "crewai_workflow": {
        "agents": [
            {
                "name": "Estrategista",
                "status": "completed",
                "output": {
                    "strategy": "Funnel approach with retargeting",
                    "budget_split": {
                        "prospecting": 30000,
                        "retargeting": 15000,
                        "testing": 5000
                    }
                }
            },
            {
                "name": "Criativo",
                "status": "completed",
                "output": {
                    "assets_created": 12,
                    "formats": ["Feed", "Stories", "Reels"],
                    "themes": ["Lifestyle", "Product", "Testimonial"]
                }
            },
            {
                "name": "Copy",
                "status": "completed",
                "output": {
                    "variations": 24,
                    "best_performers": [
                        "Última chance: 70% OFF",
                        "Black Friday antecipada"
                    ]
                }
            }
        ]
    },
    "a2a_communications": {
        "total_messages": 47,
        "data_shared": "2.3MB",
        "optimizations_triggered": 12,
        "real_time_adjustments": 8
    },
    "results": {
        "total_sales": 1247,
        "roas": 4.2,
        "cpa": 40.09,
        "best_creative": "lifestyle_video_15s",
        "best_audience": "lookalike_1%_purchasers"
    }
}
```

## 🚀 Benefícios

### Para o Sistema
- Tomada de decisão baseada em dados
- Otimização automática de recursos
- Alinhamento estratégico consistente

### Para o Cliente
- Campanhas mais efetivas
- Melhor ROI
- Resultados mensuráveis

## 📚 Documentação Relacionada
- [Arquitetura CrewAI](./crewai_architecture.py)
- [Sistema PRP](./docs/prp-system/)
- [Integração A2A](./docs/a2a-integration/)

---

*Agente parte do sistema de orquestração CrewAI para campanhas de marketing inteligentes*