#!/usr/bin/env python3
"""
Script para busca semântica no banco de dados Turso da nuvem
"""

import os
import requests
import json
from datetime import datetime

def search_turso_cloud(query):
    """Faz busca semântica no banco Turso da nuvem"""
    
    print(f"🔍 BUSCA SEMÂNTICA NO BANCO TURSO CLOUD")
    print("=" * 60)
    print(f"🔎 Query: {query}")
    print()
    
    # Configurar token
    token = "eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18yYzA4R3ZNeEhYMlNCc3l0d2padm95cEdJeDUiLCJ0eXAiOiJKV1QifQ.eyJleHAiOjE3NTQ3MjU0ODUsImlhdCI6MTc1NDEyMDY4NSwiaXNzIjoiaHR0cHM6Ly9jbGVyay50dXJzby50ZWNoIiwianRpIjoiY2IwNDA3ZTdhNWFmMGJkZDU2NzAiLCJuYmYiOjE3NTQxMjA2ODAsInN1YiI6InVzZXJfMng5SlpMR2FHN2VuRjJMT0M1ZlQ1Q2NLeUlvIn0.va7_z4o_nsGYol3m90mxCnKURCE8ECnYfQq1KFJINJsLNBvRPRMsiuTb94sr_qr0C6NL6IGrZrCw_oj7lLKXK1MSWKyKIlgVjB1Q8Ms_TsCzEpzyzk2TLHU9jvPW35da4TfejcdBk_gC6WOAKptbsVuqq4VL06QmOlNCPNRh9FoPFcmE2ANGbkuuvzCdW-pBjM4w2dC0toYVXa7tUzHxD1vLoVvMuMrPu_TSghiGFM7K1nnJsNHr20TXwgtRYSWlmqNhznDvL_4S__xBhdpArp5oyNvjbsaibcwlWw0LhxDtgJaYzYRySWs0FTMxYaoz1Jbk3Avb2gbqYNfd1DCyKQ"
    
    # URL do banco Turso
    url = "https://context-memory-diegofornalha.aws-us-east-1.turso.io"
    
    # Headers
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        # Primeiro, verificar se conseguimos conectar
        print("🔌 Testando conexão com banco Turso...")
        
        # Buscar tabelas disponíveis
        response = requests.post(
            f"{url}/v1/query",
            headers=headers,
            json={"sql": "SELECT name FROM sqlite_master WHERE type='table'"}
        )
        
        if response.status_code == 200:
            tables = response.json()["results"]
            print(f"✅ Conectado! Tabelas encontradas: {len(tables)}")
            for table in tables:
                print(f"  📋 {table[0]}")
            
            print()
            print("🔍 Realizando busca semântica...")
            
            # Buscar em diferentes tabelas
            search_queries = [
                ("knowledge_base", f"SELECT * FROM knowledge_base WHERE topic LIKE '%{query}%' OR content LIKE '%{query}%' OR tags LIKE '%{query}%'"),
                ("conversations", f"SELECT * FROM conversations WHERE message LIKE '%{query}%' OR response LIKE '%{query}%' OR context LIKE '%{query}%'"),
                ("docs_turso", f"SELECT * FROM docs_turso WHERE title LIKE '%{query}%' OR content LIKE '%{query}%' OR tags LIKE '%{query}%'"),
                ("docs_prp", f"SELECT * FROM docs_prp WHERE title LIKE '%{query}%' OR content LIKE '%{query}%' OR tags LIKE '%{query}%'")
            ]
            
            total_results = 0
            
            for table_name, sql_query in search_queries:
                try:
                    response = requests.post(
                        f"{url}/v1/query",
                        headers=headers,
                        json={"sql": sql_query}
                    )
                    
                    if response.status_code == 200:
                        results = response.json()["results"]
                        if results:
                            print(f"\n📋 Resultados em {table_name}: {len(results)}")
                            for i, result in enumerate(results[:5], 1):  # Mostrar apenas os 5 primeiros
                                print(f"  {i}. {result[1] if len(result) > 1 else 'Sem título'}")
                                if len(result) > 2:
                                    content = result[2][:150] + "..." if len(result[2]) > 150 else result[2]
                                    print(f"     📝 {content}")
                                print()
                            total_results += len(results)
                        else:
                            print(f"❌ Nenhum resultado em {table_name}")
                    else:
                        print(f"❌ Erro ao buscar em {table_name}: {response.status_code}")
                        
                except Exception as e:
                    print(f"❌ Erro ao buscar em {table_name}: {e}")
            
            print("=" * 60)
            print(f"📊 RESUMO DA BUSCA")
            print(f"🔎 Query: {query}")
            print(f"📋 Total de resultados: {total_results}")
            print(f"⏰ Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            if total_results == 0:
                print("\n💡 SUGESTÕES:")
                print("  • Tente termos mais específicos")
                print("  • Use sinônimos ou termos relacionados")
                print("  • Verifique se o conhecimento foi adicionado ao banco")
            
        else:
            print(f"❌ Erro de conexão: {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = "MCP Turso status configuração"
    
    search_turso_cloud(query) 