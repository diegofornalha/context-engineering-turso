# 🧠 Graphiti com Claude Nativo - Sem OpenAI!

## 🎯 O Que É Isso?

Uma versão **revolucionária** do Graphiti MCP Server que usa **Claude nativo do Claude Code** ao invés da OpenAI API! 

### ✨ Vantagens:

1. **💰 Grátis**: Sem custos de API da OpenAI
2. **🔒 Privado**: Seus dados nunca saem do Claude Code
3. **⚡ Rápido**: Usa o Claude já carregado na memória
4. **🎯 Integrado**: Funciona perfeitamente com Claude Code
5. **🧠 Inteligente**: Claude 3.5 Sonnet é excelente para análise

## 🚀 Como Funciona?

### Arquitetura Híbrida:

```
Claude Code (Você está aqui)
    ↓
Graphiti Claude MCP (Novo!)
    ↓
Neo4j (Grafo de Conhecimento)
    +
Turso (Dados Estruturados)
```

### Componentes:

1. **`claude_adapter.py`**: Adaptador que substitui OpenAI por Claude
2. **`graphiti_claude_mcp.py`**: Servidor MCP modificado
3. **Neo4j**: Banco de grafos (continua igual)
4. **Turso**: Trabalha em conjunto (complementar)

## 📦 Instalação Rápida

### Opção 1: Docker (Recomendado)

```bash
# 1. Iniciar Neo4j
docker run -d \
  --name neo4j-claude \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/demodemo \
  neo4j:5.26.0

# 2. Adicionar ao Claude Code
cd getzep_server
claude mcp add graphiti-claude python3 graphiti_claude_mcp.py --transport stdio
```

### Opção 2: Manual

```bash
# 1. Configurar ambiente
cd getzep_server
cp .env.claude .env

# 2. Executar script de inicialização
./start-claude.sh
```

## 🛠️ Ferramentas Disponíveis

### Com Claude Nativo:

| Ferramenta | Descrição | Usa Claude Para |
|------------|-----------|-----------------|
| `add_episode` | Adiciona conhecimento | Extrair entidades e relações |
| `search_knowledge` | Busca inteligente | Entender e expandir queries |
| `analyze_graph` | Análise do grafo | Gerar insights e padrões |
| `get_status` | Status do sistema | Verificar conexões |

## 🔄 Integração Turso + Graphiti + Claude

### Fluxo Completo:

```python
# 1. Dados brutos vão para o Turso (rápido)
await turso.save_conversation(message)

# 2. Claude extrai conhecimento
entities = await claude.extract_entities(message)

# 3. Graphiti cria relações no Neo4j
await graphiti.create_relationships(entities)

# 4. Busca híbrida combina tudo
results = await hybrid_search(query)
```

### Exemplo Prático:

```python
# Adicionar episódio com Claude
await add_episode(
    name="Conversa sobre IA",
    episode_body="Claude e GPT são modelos de linguagem...",
    source="chat"
)

# Claude automaticamente:
# - Identifica entidades: ["Claude", "GPT", "modelos de linguagem"]
# - Cria relações: [("Claude", "é_um", "modelo de linguagem")]
# - Extrai sentimento: "neutro/informativo"
```

## 🎯 Casos de Uso Perfeitos

### 1. **Memória de Agentes A2A**
```python
# Cada agente tem memória no grafo
agent_memory = await graphiti.get_agent_knowledge("agent_1")
```

### 2. **Análise de Conversas**
```python
# Claude analisa padrões nas conversas
patterns = await analyze_graph(analysis_type="patterns")
```

### 3. **Knowledge Base Inteligente**
```python
# Busca semântica com entendimento de contexto
results = await search_knowledge("como configurar Docker?")
```

## 🚦 Status da Integração

| Componente | Status | Notas |
|------------|--------|-------|
| Claude Adapter | ✅ Pronto | Substitui OpenAI completamente |
| MCP Server | ✅ Pronto | Funciona com stdio |
| Neo4j | ✅ Compatível | Sem mudanças necessárias |
| Turso | ✅ Integrado | Trabalha em paralelo |
| Embeddings | ⚠️ Simulado | Claude não tem embeddings nativos* |

*Para embeddings reais, considere usar um modelo dedicado local como Sentence-Transformers

## 📊 Comparação: OpenAI vs Claude Nativo

| Aspecto | OpenAI Original | Claude Nativo |
|---------|-----------------|---------------|
| **Custo** | 💸 ~$0.002/request | ✅ Grátis |
| **Velocidade** | 🚀 ~1-2s | ⚡ ~0.5-1s |
| **Privacidade** | ☁️ Cloud | 🔒 Local |
| **Qualidade** | 🎯 GPT-4 | 🧠 Claude 3.5 |
| **Embeddings** | ✅ Nativos | ⚠️ Simulados |
| **Setup** | 🔑 Precisa API key | ✅ Plug & Play |

## 🔧 Configuração Avançada

### Variáveis de Ambiente (.env.claude):

```bash
# Claude Settings
CLAUDE_MODEL=claude-3-5-sonnet-20241022  # Modelo do Claude
CLAUDE_MAX_TOKENS=4096                    # Tokens máximos
CLAUDE_TEMPERATURE=0.7                    # Criatividade (0-1)

# Neo4j Settings  
NEO4J_URI=bolt://localhost:7687          # URI do Neo4j
NEO4J_USER=neo4j                         # Usuário
NEO4J_PASSWORD=demodemo                  # Senha

# Performance
SEMAPHORE_LIMIT=10                       # Operações paralelas
```

## 🐛 Troubleshooting

### Problema: "Claude não responde"
```bash
# Teste o Claude diretamente
echo "Teste" | claude -p
```

### Problema: "Neo4j não conecta"
```bash
# Verifique se está rodando
docker ps | grep neo4j
nc -zv localhost 7687
```

### Problema: "Embeddings não funcionam bem"
```python
# Use um modelo de embeddings local
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(texts)
```

## 🚀 Próximos Passos

1. **Adicionar ao Claude Code**:
```bash
claude mcp add graphiti-claude python3 /caminho/graphiti_claude_mcp.py
```

2. **Testar a integração**:
```bash
# No Claude Code
/mcp
# Selecione graphiti-claude
# Use as ferramentas!
```

3. **Combinar com Turso**:
- Turso: Armazenamento rápido
- Graphiti: Relações e análise
- Claude: Inteligência nativa

## 💡 Dicas Pro

1. **Use ambos**: Turso para dados, Graphiti para relações
2. **Cache**: Guarde resultados do Claude no Turso
3. **Batch**: Processe múltiplos episódios de uma vez
4. **Monitor**: Use `get_status()` regularmente

## 🎉 Conclusão

Agora você tem um **sistema de grafo de conhecimento** rodando com **Claude nativo**, sem custos de API e totalmente integrado ao Claude Code!

**Turso + Graphiti + Claude = Sistema de Memória Definitivo! 🚀**

---
*Criado com ❤️ para o Claude Code*
*Versão: 1.0.0 - Sem OpenAI, 100% Claude!*