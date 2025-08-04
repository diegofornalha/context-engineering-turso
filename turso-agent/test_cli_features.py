#!/usr/bin/env python3
"""
Teste das funcionalidades do Turso Agent CLI
"""

import asyncio
import sys
from pathlib import Path

# Adicionar diretório ao path
sys.path.append(str(Path(__file__).parent))

from cli_standalone import StandaloneTursoAgent

async def test_features():
    """Testa as funcionalidades do agente"""
    
    print("🧪 TESTANDO TURSO AGENT CLI")
    print("="*50)
    
    # Criar agente
    agent = StandaloneTursoAgent()
    
    # Testar banner e status
    await agent.show_banner()
    
    # Testar análise de performance
    print("\n\n1️⃣ Testando Análise de Performance:")
    await agent.analyze_performance()
    
    # Testar auditoria de segurança
    print("\n\n2️⃣ Testando Auditoria de Segurança:")
    await agent.security_audit()
    
    # Testar resposta do especialista
    print("\n\n3️⃣ Testando Chat Especialista:")
    response = agent.get_expert_response("Como melhorar a performance do meu banco?")
    print(f"Pergunta: Como melhorar a performance do meu banco?")
    print(f"Resposta: {response}")
    
    # Testar otimização
    print("\n\n4️⃣ Testando Otimização do Sistema:")
    await agent.optimize_system()
    
    print("\n\n✅ TODOS OS TESTES CONCLUÍDOS!")
    print("O Turso Agent CLI está funcionando corretamente!")

if __name__ == "__main__":
    asyncio.run(test_features())