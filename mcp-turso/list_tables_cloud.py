#!/usr/bin/env python3
"""
Script para listar todas as tabelas no banco de dados Turso da nuvem
"""

import os
import requests
import json

def list_tables_cloud():
    """Lista todas as tabelas no banco Turso da nuvem"""
    
    print("🔍 LISTANDO TABELAS NO BANCO TURSO CLOUD")
    print("=" * 60)
    
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
        print("🔌 Conectando ao banco Turso...")
        
        # Buscar todas as tabelas
        response = requests.post(
            f"{url}/v1/query",
            headers=headers,
            json={"sql": "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY type, name"}
        )
        
        if response.status_code == 200:
            tables = response.json()["results"]
            print(f"✅ Conectado! Encontradas {len(tables)} tabelas/views:")
            print()
            
            # Separar tabelas e views
            tables_list = []
            views_list = []
            
            for table in tables:
                if table[1] == 'table':
                    tables_list.append(table[0])
                elif table[1] == 'view':
                    views_list.append(table[0])
            
            print("📋 TABELAS:")
            print("-" * 30)
            if tables_list:
                for i, table in enumerate(tables_list, 1):
                    print(f"  {i}. {table}")
            else:
                print("  ❌ Nenhuma tabela encontrada")
            
            print()
            print("👁️ VIEWS:")
            print("-" * 30)
            if views_list:
                for i, view in enumerate(views_list, 1):
                    print(f"  {i}. {view}")
            else:
                print("  ❌ Nenhuma view encontrada")
            
            print()
            print("=" * 60)
            print(f"📊 RESUMO:")
            print(f"  📋 Tabelas: {len(tables_list)}")
            print(f"  👁️ Views: {len(views_list)}")
            print(f"  📈 Total: {len(tables)}")
            
            # Tentar obter informações sobre cada tabela
            if tables_list:
                print()
                print("📝 DETALHES DAS TABELAS:")
                print("-" * 40)
                
                for table_name in tables_list:
                    try:
                        # Contar registros
                        count_response = requests.post(
                            f"{url}/v1/query",
                            headers=headers,
                            json={"sql": f"SELECT COUNT(*) FROM {table_name}"}
                        )
                        
                        if count_response.status_code == 200:
                            count = count_response.json()["results"][0][0]
                            print(f"  📋 {table_name}: {count} registros")
                        else:
                            print(f"  📋 {table_name}: Erro ao contar registros")
                            
                    except Exception as e:
                        print(f"  📋 {table_name}: Erro - {e}")
            
        else:
            print(f"❌ Erro de conexão: {response.status_code}")
            print(f"Resposta: {response.text}")
            
    except Exception as e:
        print(f"❌ Erro geral: {e}")

if __name__ == "__main__":
    list_tables_cloud() 