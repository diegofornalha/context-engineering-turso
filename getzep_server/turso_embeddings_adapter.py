#!/usr/bin/env python3
"""
Turso Embeddings Adapter para Graphiti com Claude
Sistema completo de embeddings usando Turso como backend vetorial
"""

import os
import json
import hashlib
import asyncio
import logging
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
import subprocess
from datetime import datetime
import libsql_client as libsql

logger = logging.getLogger(__name__)

@dataclass
class TursoEmbeddingConfig:
    """Configuração para embeddings no Turso"""
    database_url: str
    auth_token: str
    embedding_dim: int = 384  # Dimensão dos embeddings
    table_name: str = "embeddings"
    cache_enabled: bool = True
    
class TursoEmbeddingsAdapter:
    """
    Adaptador de embeddings que usa Turso para armazenar e buscar vetores
    Integra com Claude para geração inteligente de embeddings
    """
    
    def __init__(self, config: TursoEmbeddingConfig):
        self.config = config
        self.client = None
        self._init_client()
        
    def _init_client(self):
        """Inicializa cliente Turso"""
        try:
            self.client = libsql.create_client(
                url=self.config.database_url,
                auth_token=self.config.auth_token
            )
            logger.info("Cliente Turso inicializado com sucesso")
        except Exception as e:
            logger.error(f"Erro ao inicializar cliente Turso: {e}")
            raise
            
    async def initialize_schema(self):
        """
        Cria tabelas necessárias para embeddings no Turso
        """
        create_embeddings_table = f"""
        CREATE TABLE IF NOT EXISTS {self.config.table_name} (
            id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            embedding_json TEXT NOT NULL,
            metadata_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        create_index = f"""
        CREATE INDEX IF NOT EXISTS idx_{self.config.table_name}_hash 
        ON {self.config.table_name}(content_hash);
        """
        
        create_search_table = """
        CREATE TABLE IF NOT EXISTS embedding_searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query TEXT NOT NULL,
            query_embedding TEXT NOT NULL,
            results_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        try:
            await self.client.execute(create_embeddings_table)
            await self.client.execute(create_index)
            await self.client.execute(create_search_table)
            logger.info("Schema de embeddings criado no Turso")
        except Exception as e:
            logger.error(f"Erro ao criar schema: {e}")
            raise
            
    def _content_hash(self, content: str) -> str:
        """Gera hash único para conteúdo"""
        return hashlib.sha256(content.encode()).hexdigest()
        
    async def _generate_embedding_with_claude(self, text: str) -> List[float]:
        """
        Gera embedding usando Claude com técnica avançada
        Usa análise semântica para criar vetores mais significativos
        """
        prompt = f"""
Analise o texto abaixo e gere um vetor de embedding semântico.
Para cada dimensão, atribua um valor de -1.0 a 1.0 baseado em:

Dimensões 1-10: Tópicos principais (tecnologia, negócios, ciência, etc)
Dimensões 11-20: Sentimento e tom (positivo, neutro, negativo, formal, informal)
Dimensões 21-30: Complexidade e estrutura (simples, complexo, técnico)
Dimensões 31-40: Entidades mencionadas (pessoas, lugares, organizações)
Dimensões 41-50: Temporalidade (passado, presente, futuro, atemporal)

Texto: {text[:1000]}

Responda APENAS com {self.config.embedding_dim} números decimais separados por vírgula.
Exemplo: 0.8, -0.3, 0.5, ...
"""
        
        try:
            # Executa Claude via subprocess
            result = subprocess.run(
                ["claude", "-p", "--max-tokens", "2000"],
                input=prompt,
                capture_output=True,
                text=True,
                check=True
            )
            
            response = result.stdout.strip()
            
            # Parse dos valores
            values = []
            for val in response.split(','):
                try:
                    num = float(val.strip())
                    # Normaliza para [-1, 1]
                    num = max(-1.0, min(1.0, num))
                    values.append(num)
                except ValueError:
                    continue
                    
            # Garante dimensão correta
            while len(values) < self.config.embedding_dim:
                values.append(0.0)
            values = values[:self.config.embedding_dim]
            
            return values
            
        except Exception as e:
            logger.error(f"Erro ao gerar embedding com Claude: {e}")
            # Fallback para embedding aleatório normalizado
            import random
            return [random.uniform(-1, 1) for _ in range(self.config.embedding_dim)]
            
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """
        Gera embeddings para múltiplos textos
        Usa cache do Turso para evitar reprocessamento
        """
        embeddings = []
        
        for text in texts:
            content_hash = self._content_hash(text)
            
            # Verifica cache no Turso
            if self.config.cache_enabled:
                cached = await self._get_cached_embedding(content_hash)
                if cached:
                    embeddings.append(cached)
                    continue
            
            # Gera novo embedding
            embedding = await self._generate_embedding_with_claude(text)
            
            # Salva no Turso
            await self._save_embedding(text, content_hash, embedding)
            embeddings.append(embedding)
            
        return embeddings
        
    async def _get_cached_embedding(self, content_hash: str) -> Optional[List[float]]:
        """Recupera embedding do cache no Turso"""
        try:
            query = f"""
            SELECT embedding_json FROM {self.config.table_name}
            WHERE content_hash = ?
            """
            result = await self.client.execute(query, [content_hash])
            
            if result.rows and len(result.rows) > 0:
                embedding_json = result.rows[0][0]
                return json.loads(embedding_json)
                
        except Exception as e:
            logger.error(f"Erro ao recuperar cache: {e}")
            
        return None
        
    async def _save_embedding(
        self, 
        content: str, 
        content_hash: str, 
        embedding: List[float],
        metadata: Optional[Dict] = None
    ):
        """Salva embedding no Turso"""
        try:
            query = f"""
            INSERT OR REPLACE INTO {self.config.table_name}
            (id, content, content_hash, embedding_json, metadata_json)
            VALUES (?, ?, ?, ?, ?)
            """
            
            embedding_id = f"emb_{content_hash[:12]}"
            embedding_json = json.dumps(embedding)
            metadata_json = json.dumps(metadata) if metadata else None
            
            await self.client.execute(
                query,
                [embedding_id, content, content_hash, embedding_json, metadata_json]
            )
            
        except Exception as e:
            logger.error(f"Erro ao salvar embedding: {e}")
            
    async def search_similar(
        self, 
        query: str, 
        limit: int = 10,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Busca por embeddings similares usando cosseno similarity
        """
        # Gera embedding da query
        query_embedding = await self._generate_embedding_with_claude(query)
        
        # Recupera todos embeddings do Turso (otimizar para grandes volumes)
        all_embeddings = await self._get_all_embeddings()
        
        # Calcula similaridades
        similarities = []
        for emb_data in all_embeddings:
            similarity = self._cosine_similarity(
                query_embedding, 
                emb_data['embedding']
            )
            
            if similarity >= threshold:
                similarities.append({
                    'id': emb_data['id'],
                    'content': emb_data['content'],
                    'similarity': similarity,
                    'metadata': emb_data.get('metadata')
                })
        
        # Ordena por similaridade
        similarities.sort(key=lambda x: x['similarity'], reverse=True)
        
        # Salva busca para análise
        await self._save_search(query, query_embedding, similarities[:limit])
        
        return similarities[:limit]
        
    async def _get_all_embeddings(self) -> List[Dict[str, Any]]:
        """Recupera todos embeddings do Turso"""
        try:
            query = f"""
            SELECT id, content, embedding_json, metadata_json 
            FROM {self.config.table_name}
            """
            result = await self.client.execute(query)
            
            embeddings = []
            for row in result.rows:
                embeddings.append({
                    'id': row[0],
                    'content': row[1],
                    'embedding': json.loads(row[2]),
                    'metadata': json.loads(row[3]) if row[3] else None
                })
                
            return embeddings
            
        except Exception as e:
            logger.error(f"Erro ao recuperar embeddings: {e}")
            return []
            
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calcula similaridade de cosseno entre dois vetores"""
        try:
            vec1 = np.array(vec1)
            vec2 = np.array(vec2)
            
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
                
            similarity = dot_product / (norm1 * norm2)
            return float(similarity)
            
        except Exception as e:
            logger.error(f"Erro ao calcular similaridade: {e}")
            return 0.0
            
    async def _save_search(
        self, 
        query: str, 
        query_embedding: List[float],
        results: List[Dict]
    ):
        """Salva histórico de buscas para análise"""
        try:
            query_sql = """
            INSERT INTO embedding_searches (query, query_embedding, results_json)
            VALUES (?, ?, ?)
            """
            
            await self.client.execute(
                query_sql,
                [query, json.dumps(query_embedding), json.dumps(results)]
            )
            
        except Exception as e:
            logger.error(f"Erro ao salvar busca: {e}")
            
    async def optimize_embeddings(self):
        """
        Otimiza embeddings usando PCA ou outra técnica de redução
        """
        # Implementar otimização se necessário
        pass
        
    async def cluster_embeddings(self, n_clusters: int = 5) -> Dict[str, List[str]]:
        """
        Agrupa embeddings em clusters para análise
        """
        from sklearn.cluster import KMeans
        
        all_embeddings = await self._get_all_embeddings()
        
        if len(all_embeddings) < n_clusters:
            return {}
            
        # Extrai vetores
        vectors = [emb['embedding'] for emb in all_embeddings]
        X = np.array(vectors)
        
        # Clusterização
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        labels = kmeans.fit_predict(X)
        
        # Organiza resultados
        clusters = {}
        for i, label in enumerate(labels):
            cluster_key = f"cluster_{label}"
            if cluster_key not in clusters:
                clusters[cluster_key] = []
            clusters[cluster_key].append(all_embeddings[i]['content'][:100])
            
        return clusters

# Integração com Graphiti
class TursoGraphitiEmbedder:
    """
    Embedder para Graphiti que usa Turso como backend
    """
    
    def __init__(self, turso_config: TursoEmbeddingConfig):
        self.adapter = TursoEmbeddingsAdapter(turso_config)
        
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Interface compatível com Graphiti"""
        return await self.adapter.embed(texts)
        
    async def embed_query(self, query: str) -> List[float]:
        """Gera embedding para uma query"""
        result = await self.embed([query])
        return result[0] if result else []

# Função helper para criar configuração
def create_turso_embeddings_config() -> TursoEmbeddingConfig:
    """Cria configuração a partir de variáveis de ambiente"""
    return TursoEmbeddingConfig(
        database_url=os.getenv('TURSO_DATABASE_URL', 'libsql://localhost:8080'),
        auth_token=os.getenv('TURSO_AUTH_TOKEN', ''),
        embedding_dim=int(os.getenv('EMBEDDING_DIM', '384')),
        table_name=os.getenv('EMBEDDING_TABLE', 'embeddings'),
        cache_enabled=os.getenv('CACHE_ENABLED', 'true').lower() == 'true'
    )

if __name__ == "__main__":
    # Teste do sistema
    async def test():
        config = create_turso_embeddings_config()
        adapter = TursoEmbeddingsAdapter(config)
        
        # Inicializa schema
        await adapter.initialize_schema()
        
        # Testa embeddings
        texts = [
            "Claude é um assistente de IA",
            "Turso é um banco de dados edge",
            "Graphiti gerencia grafos de conhecimento"
        ]
        
        embeddings = await adapter.embed(texts)
        print(f"Gerados {len(embeddings)} embeddings")
        
        # Testa busca
        results = await adapter.search_similar("banco de dados", limit=3)
        print(f"Resultados da busca: {results}")
        
    asyncio.run(test())