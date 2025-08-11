#!/usr/bin/env python3
"""
Script de teste para o sistema integrado:
Turso (Embeddings) + Claude (Inteligência) + Graphiti (Grafo)
"""

import asyncio
import os
import sys
from datetime import datetime
from typing import List, Dict, Any
import json

# Configuração de ambiente
from dotenv import load_dotenv
load_dotenv('.env.turso-embeddings')

# Importações do sistema
from turso_embeddings_adapter import (
    TursoEmbeddingsAdapter,
    TursoEmbeddingConfig,
    create_turso_embeddings_config
)
from claude_adapter import ClaudeGraphitiAdapter

async def test_turso_embeddings():
    """Testa o sistema de embeddings com Turso"""
    print("\n🔷 TESTE 1: Sistema de Embeddings com Turso")
    print("=" * 50)
    
    # Configura e inicializa
    config = create_turso_embeddings_config()
    adapter = TursoEmbeddingsAdapter(config)
    
    # Inicializa schema
    print("📦 Criando tabelas no Turso...")
    await adapter.initialize_schema()
    
    # Textos de teste
    test_texts = [
        "Claude é um assistente de IA avançado criado pela Anthropic",
        "Turso é um banco de dados SQLite distribuído na edge",
        "Graphiti gerencia grafos de conhecimento temporais",
        "Neo4j é um banco de dados de grafos popular",
        "Python é uma linguagem de programação versátil"
    ]
    
    # Gera embeddings
    print("\n🧠 Gerando embeddings com Claude...")
    embeddings = await adapter.embed(test_texts)
    
    for i, text in enumerate(test_texts):
        print(f"  ✅ Texto {i+1}: {text[:50]}...")
        print(f"     Embedding: [{embeddings[i][:3]}...] (dim={len(embeddings[i])})")
    
    # Testa busca similar
    print("\n🔍 Testando busca por similaridade...")
    query = "banco de dados para grafos"
    results = await adapter.search_similar(query, limit=3)
    
    print(f"  Query: '{query}'")
    print(f"  Resultados encontrados: {len(results)}")
    for i, result in enumerate(results):
        print(f"    {i+1}. Similaridade: {result['similarity']:.3f}")
        print(f"       Conteúdo: {result['content'][:60]}...")
    
    # Testa clustering
    print("\n📊 Testando clustering de embeddings...")
    clusters = await adapter.cluster_embeddings(n_clusters=2)
    for cluster_name, items in clusters.items():
        print(f"  {cluster_name}: {len(items)} itens")
        for item in items[:2]:
            print(f"    - {item}")
    
    return True

async def test_graphiti_integration():
    """Testa integração com Graphiti usando Turso embeddings"""
    print("\n🔷 TESTE 2: Integração Graphiti + Turso + Claude")
    print("=" * 50)
    
    # Inicializa adaptador Graphiti com Claude e Turso
    adapter = ClaudeGraphitiAdapter(
        neo4j_uri=os.getenv('NEO4J_URI', 'bolt://localhost:7687'),
        neo4j_user=os.getenv('NEO4J_USER', 'neo4j'),
        neo4j_password=os.getenv('NEO4J_PASSWORD', 'demodemo')
    )
    
    # Testa conexão
    print("🔌 Testando conexões...")
    connection_ok = await adapter.test_connection()
    print(f"  Claude: {'✅ OK' if connection_ok else '❌ Falhou'}")
    print(f"  Turso Embeddings: {'✅ Ativo' if adapter.embedder.use_turso else '⚠️ Fallback'}")
    
    # Testa extração de entidades com Claude
    print("\n🎯 Testando extração de entidades...")
    text = """
    A Anthropic lançou o Claude 3.5 Sonnet, que compete diretamente com o GPT-4 
    da OpenAI. O modelo mostrou melhorias significativas em raciocínio e programação.
    """
    
    llm_client = adapter.get_llm_client()
    prompt = f"""
    Extraia entidades e relações do texto:
    {text}
    
    Responda em JSON com formato:
    {{
        "entities": ["lista de entidades"],
        "relations": [["entidade1", "relação", "entidade2"]]
    }}
    """
    
    response = await llm_client.generate_response(prompt)
    print(f"  Entidades extraídas: {response[:200]}...")
    
    # Testa embeddings com busca
    print("\n🔍 Testando busca semântica integrada...")
    embedder = adapter.get_embedder()
    
    # Adiciona alguns documentos
    docs = [
        "Tutorial de como usar Turso com Python",
        "Guia de integração do Claude com MCP",
        "Manual do Graphiti para grafos de conhecimento"
    ]
    
    print("  Adicionando documentos ao índice...")
    await embedder.embed(docs)
    
    # Busca
    query = "como integrar Claude"
    print(f"  Buscando: '{query}'")
    results = await embedder.search_similar(query, limit=2)
    
    for i, result in enumerate(results):
        print(f"    {i+1}. Score: {result.get('similarity', 0):.3f}")
        print(f"       Doc: {result.get('content', '')[:60]}...")
    
    return True

async def test_complete_workflow():
    """Testa workflow completo: dados → embeddings → grafo → busca"""
    print("\n🔷 TESTE 3: Workflow Completo")
    print("=" * 50)
    
    # Simula um episódio sendo processado
    episode = {
        "id": "ep_001",
        "timestamp": datetime.now().isoformat(),
        "content": """
        Durante a reunião, o CEO João Silva apresentou os resultados do Q3.
        A empresa XYZ Corp teve um crescimento de 25% comparado ao Q2.
        Maria Santos, CFO, destacou a importância dos novos contratos com a ABC Ltd.
        """,
        "metadata": {
            "source": "meeting_notes",
            "department": "executive"
        }
    }
    
    print("📝 Episódio de exemplo:")
    print(f"  ID: {episode['id']}")
    print(f"  Conteúdo: {episode['content'][:100]}...")
    
    # Configura adaptadores
    config = create_turso_embeddings_config()
    turso_adapter = TursoEmbeddingsAdapter(config)
    
    # 1. Gera embedding do episódio
    print("\n1️⃣ Gerando embedding do episódio...")
    embedding = await turso_adapter.embed([episode['content']])
    print(f"  ✅ Embedding gerado (dim={len(embedding[0])})")
    
    # 2. Salva no Turso com metadados
    print("\n2️⃣ Salvando no Turso...")
    await turso_adapter._save_embedding(
        content=episode['content'],
        content_hash=turso_adapter._content_hash(episode['content']),
        embedding=embedding[0],
        metadata=episode['metadata']
    )
    print("  ✅ Salvo com sucesso")
    
    # 3. Busca por informações relacionadas
    print("\n3️⃣ Buscando informações relacionadas...")
    queries = [
        "resultados financeiros",
        "contratos e parcerias",
        "executivos da empresa"
    ]
    
    for query in queries:
        results = await turso_adapter.search_similar(query, limit=1, threshold=0.5)
        if results:
            print(f"  Query: '{query}'")
            print(f"    → Encontrado (sim: {results[0]['similarity']:.3f})")
        else:
            print(f"  Query: '{query}' - Nenhum resultado relevante")
    
    # 4. Estatísticas
    print("\n4️⃣ Estatísticas do sistema:")
    all_embeddings = await turso_adapter._get_all_embeddings()
    print(f"  Total de embeddings: {len(all_embeddings)}")
    print(f"  Dimensão dos vetores: {config.embedding_dim}")
    print(f"  Cache habilitado: {'Sim' if config.cache_enabled else 'Não'}")
    
    return True

async def main():
    """Executa todos os testes"""
    print("🚀 SISTEMA DE EMBEDDINGS TURSO + CLAUDE + GRAPHITI")
    print("=" * 60)
    print("Configuração:")
    print(f"  • Turso DB: {os.getenv('TURSO_DATABASE_URL', 'Não configurado')}")
    print(f"  • Neo4j: {os.getenv('NEO4J_URI', 'bolt://localhost:7687')}")
    print(f"  • Claude Model: {os.getenv('CLAUDE_MODEL', 'claude-3-5-sonnet')}")
    print(f"  • Embedding Dim: {os.getenv('EMBEDDING_DIM', '384')}")
    
    try:
        # Teste 1: Embeddings com Turso
        await test_turso_embeddings()
        
        # Teste 2: Integração com Graphiti
        await test_graphiti_integration()
        
        # Teste 3: Workflow completo
        await test_complete_workflow()
        
        print("\n✅ TODOS OS TESTES CONCLUÍDOS COM SUCESSO!")
        print("=" * 60)
        print("\n💡 Próximos passos:")
        print("  1. Configure as credenciais em .env.turso-embeddings")
        print("  2. Execute: python3 graphiti_claude_mcp.py")
        print("  3. Adicione ao Claude Code: claude mcp add graphiti-turso")
        
    except Exception as e:
        print(f"\n❌ Erro durante os testes: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())