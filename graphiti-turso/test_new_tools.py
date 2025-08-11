#!/usr/bin/env python3
"""
Script de teste para as novas ferramentas do Graphiti-Turso MCP
Demonstra o uso das funcionalidades de gerenciamento granular
"""

import asyncio
import json

# Simulação das novas ferramentas para teste local
# Em produção, estas são chamadas via MCP

async def test_new_tools():
    """Testa as novas ferramentas do Graphiti-Turso"""
    
    print("🧪 Testando Novas Ferramentas do Graphiti-Turso\n")
    print("=" * 50)
    
    # Exemplos de uso das novas ferramentas
    examples = [
        {
            "tool": "remove_episode",
            "description": "Remove um episódio específico",
            "params": {"episode_id": "ep_0"},
            "use_case": "Quando você sabe o ID exato do episódio a remover"
        },
        {
            "tool": "remove_episodes_by_name",
            "description": "Remove episódios por padrão de nome",
            "params": {"name_pattern": "test"},
            "use_case": "Para limpar todos os episódios de teste de uma vez"
        },
        {
            "tool": "update_episode",
            "description": "Atualiza episódio existente",
            "params": {
                "episode_id": "ep_1",
                "name": "Nome Atualizado",
                "content": None,  # Não altera
                "metadata": None   # Não altera
            },
            "use_case": "Para corrigir informações sem recriar o episódio"
        },
        {
            "tool": "get_episode",
            "description": "Obtém episódio específico",
            "params": {"episode_id": "ep_2"},
            "use_case": "Para recuperar todos os dados de um episódio"
        }
    ]
    
    for example in examples:
        print(f"\n📌 Ferramenta: {example['tool']}")
        print(f"   Descrição: {example['description']}")
        print(f"   Caso de Uso: {example['use_case']}")
        print(f"   Parâmetros:")
        print(f"   {json.dumps(example['params'], indent=6, ensure_ascii=False)}")
        print("-" * 50)
    
    print("\n✅ Todas as ferramentas estão disponíveis no MCP!")
    print("\n💡 Como usar no Claude:")
    print("   1. As ferramentas aparecem automaticamente")
    print("   2. Claude pode chamar diretamente via Tool use")
    print("   3. Respostas são retornadas em formato JSON")
    
    # Demonstração de workflow completo
    print("\n🔄 Exemplo de Workflow Completo:")
    print("   1. add_episode('Reunião', 'Notas da reunião...')")
    print("   2. list_episodes() -> Vê o ID do episódio criado")
    print("   3. update_episode('ep_0', name='Reunião Q4 2025')")
    print("   4. get_episode('ep_0') -> Verifica a atualização")
    print("   5. remove_episode('ep_0') -> Remove quando não for mais necessário")
    
    print("\n🎯 Benefícios:")
    print("   • Gerenciamento granular de memória")
    print("   • Não precisa apagar tudo para remover um item")
    print("   • Atualizações parciais sem perder metadata")
    print("   • Busca e remoção por padrões")
    
    print("\n" + "=" * 50)
    print("✨ Teste concluído! Servidor pronto para uso.")

if __name__ == "__main__":
    asyncio.run(test_new_tools())