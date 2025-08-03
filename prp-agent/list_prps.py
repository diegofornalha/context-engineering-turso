#!/usr/bin/env python3
"""
Script para listar PRPs do banco de dados Turso
"""

import os
import requests
import json
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()
load_dotenv('.env.turso')
load_dotenv('turso-config.env')

def list_prps_from_turso():
    """Lista PRPs diretamente do banco Turso"""
    
    # Configurações do Turso
    org = os.getenv('TURSO_ORGANIZATION', 'diegofornalha')
    db = os.getenv('TURSO_DEFAULT_DATABASE', 'context-memory')
    token = os.getenv('TURSO_AUTH_TOKEN')
    
    if not token:
        print("❌ Token de autenticação não encontrado")
        return
    
    # URL da API Turso
    url = f"https://api.turso.tech/v1/organizations/{org}/databases/{db}/query"
    
    # Headers
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    # Query para buscar PRPs na knowledge_base
    query = """
    SELECT 
        id,
        topic,
        content,
        tags,
        source,
        created_at
    FROM knowledge_base 
    WHERE topic LIKE '%PRP%' 
       OR content LIKE '%PRP:%' 
       OR tags LIKE '%prp%'
    ORDER BY created_at DESC
    LIMIT 20
    """
    
    # Fazer requisição
    try:
        response = requests.post(
            url,
            headers=headers,
            json={'statements': [{'q': query}]}
        )
        
        if response.status_code == 200:
            data = response.json()
            results = data[0]['results']['rows'] if data else []
            
            print(f"🔍 Encontrados {len(results)} PRPs no banco de dados:")
            print("=" * 80)
            
            for i, row in enumerate(results, 1):
                print(f"\n📄 PRP #{i}")
                print(f"   📌 Tópico: {row[1]}")
                print(f"   📝 Conteúdo: {row[2][:100]}...")
                print(f"   🏷️  Tags: {row[3]}")
                print(f"   📂 Fonte: {row[4]}")
                print(f"   📅 Criado em: {row[5]}")
                
        else:
            print(f"❌ Erro ao consultar banco: {response.status_code}")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Erro: {e}")

if __name__ == "__main__":
    print("📊 Listando PRPs do banco Turso...")
    print("=" * 80)
    list_prps_from_turso()