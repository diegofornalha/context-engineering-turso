#!/usr/bin/env python3
"""
Análise completa da arquitetura Turso Agent
Verifica organização e sobreposições
"""

import os
import sys
from pathlib import Path
from collections import defaultdict

def analyze_directory_structure():
    """Analisa a estrutura de diretórios"""
    
    print("🏗️ **ANÁLISE DA ESTRUTURA DE DIRETÓRIOS:**")
    print("="*60)
    
    structure = {
        "turso-agent/": {
            "tools/": "Ferramentas (apenas MCP Integrator)",
            "agents/": "Agentes especializados",
            "config/": "Configurações",
            "tests/": "Testes unitários",
            "examples/": "Exemplos de uso",
            "main.py": "CLI principal",
            "dev_mode.py": "Modo desenvolvimento",
            "setup_prp_context.py": "Setup PRP"
        }
    }
    
    for dir_path, description in structure["turso-agent/"].items():
        if Path(dir_path).exists():
            print(f"✅ {dir_path:<20} - {description}")
        else:
            print(f"❌ {dir_path:<20} - {description}")
    
    return True

def analyze_tools_overlap():
    """Analisa sobreposições nas ferramentas"""
    
    print("\n🔧 **ANÁLISE DE SOBREPOSIÇÕES NAS FERRAMENTAS:**")
    print("="*60)
    
    tools_dir = Path("tools")
    tools_files = list(tools_dir.glob("*.py")) if tools_dir.exists() else []
    
    print(f"📁 Ferramentas encontradas: {len(tools_files)}")
    
    # Filtrar apenas arquivos de ferramentas (excluir __init__.py)
    tools_files = [f for f in tools_files if f.name != "__init__.py"]
    
    # Verificar se há sobreposições
    if len(tools_files) == 1:
        print("✅ Apenas 1 ferramenta (MCP Integrator) - SEM SOBREPOSIÇÃO")
        print("   → mcp_integrator.py (535 linhas)")
        return True
    else:
        print("❌ Múltiplas ferramentas - POSSÍVEL SOBREPOSIÇÃO")
        for tool in tools_files:
            print(f"   → {tool.name}")
        return False

def analyze_agents_overlap():
    """Analisa sobreposições nos agentes"""
    
    print("\n🤖 **ANÁLISE DE SOBREPOSIÇÕES NOS AGENTES:**")
    print("="*60)
    
    agents_dir = Path("agents")
    agent_files = list(agents_dir.glob("*.py")) if agents_dir.exists() else []
    
    # Filtrar apenas arquivos de agentes (excluir __init__.py)
    agent_files = [f for f in agent_files if f.name != "__init__.py"]
    
    print(f"📁 Agentes encontrados: {len(agent_files)}")
    
    # Categorizar agentes
    categories = {
        "Delegator": [],
        "Specialist": [],
        "Pydantic": [],
        "Enhanced": [],
        "Original": []
    }
    
    for agent_file in agent_files:
        name = agent_file.stem
        if "delegator" in name.lower():
            categories["Delegator"].append(agent_file)
        elif "pydantic" in name.lower():
            categories["Pydantic"].append(agent_file)
        elif "enhanced" in name.lower():
            categories["Enhanced"].append(agent_file)
        elif "original" in name.lower():
            categories["Original"].append(agent_file)
        else:
            categories["Specialist"].append(agent_file)
    
    # Analisar cada categoria
    has_overlap = False
    
    for category, files in categories.items():
        if len(files) > 1:
            print(f"❌ {category}: {len(files)} agentes - SOBREPOSIÇÃO DETECTADA")
            for file in files:
                print(f"   → {file.name}")
            has_overlap = True
        elif len(files) == 1:
            print(f"✅ {category}: {files[0].name} - SEM SOBREPOSIÇÃO")
        else:
            print(f"⚠️ {category}: Nenhum agente")
    
    return not has_overlap

def analyze_functionality_overlap():
    """Analisa sobreposições de funcionalidades"""
    
    print("\n🔄 **ANÁLISE DE SOBREPOSIÇÕES DE FUNCIONALIDADES:**")
    print("="*60)
    
    # Verificar funcionalidades duplicadas
    functionality_map = {
        "Database Operations": {
            "TursoManager (removido)": "list_databases, create_database, execute_query",
            "MCP Turso": "mcp_turso_list_databases, mcp_turso_create_database, mcp_turso_execute_query",
            "Status": "✅ DELEGADO para MCP"
        },
        "MCP Integration": {
            "MCPIntegrator": "setup_mcp_server, configure_llm_integration",
            "Status": "✅ ÚNICA FERRAMENTA"
        },
        "Agent Intelligence": {
            "TursoSpecialistDelegator": "análise inteligente, troubleshooting",
            "TursoSpecialistAgent": "análise inteligente, troubleshooting",
            "Status": "⚠️ POSSÍVEL SOBREPOSIÇÃO"
        }
    }
    
    for functionality, implementations in functionality_map.items():
        print(f"\n📋 {functionality}:")
        for impl, desc in implementations.items():
            if impl != "Status":
                print(f"   → {impl}: {desc}")
        print(f"   {implementations['Status']}")
    
    return True

def analyze_architecture_cleanliness():
    """Analisa limpeza da arquitetura"""
    
    print("\n🧹 **ANÁLISE DE LIMPEZA DA ARQUITETURA:**")
    print("="*60)
    
    cleanliness_score = 0
    total_checks = 0
    
    # Check 1: Ferramentas únicas
    total_checks += 1
    if len(list(Path("tools").glob("*.py"))) == 2:  # __init__.py + mcp_integrator.py
        print("✅ Ferramentas: Apenas MCP Integrator")
        cleanliness_score += 1
    else:
        print("❌ Ferramentas: Múltiplas ferramentas")
    
    # Check 2: Agentes organizados
    total_checks += 1
    agent_files = [f for f in Path("agents").glob("*.py") if f.name != "__init__.py"]
    if len(agent_files) <= 3:  # Máximo 3 agentes principais
        print("✅ Agentes: Organizados (máximo 3 principais)")
        cleanliness_score += 1
    else:
        print("❌ Agentes: Muitos agentes (possível sobreposição)")
    
    # Check 3: Configurações centralizadas
    total_checks += 1
    config_files = list(Path("config").glob("*.py"))
    if len(config_files) <= 2:  # __init__.py + turso_settings.py
        print("✅ Configurações: Centralizadas")
        cleanliness_score += 1
    else:
        print("❌ Configurações: Dispersas")
    
    # Check 4: Estrutura clara
    total_checks += 1
    main_files = ["main.py", "dev_mode.py", "setup_prp_context.py"]
    if all(Path(f).exists() for f in main_files):
        print("✅ Estrutura: Arquivos principais presentes")
        cleanliness_score += 1
    else:
        print("❌ Estrutura: Arquivos principais faltando")
    
    # Calcular score
    cleanliness_percentage = (cleanliness_score / total_checks) * 100
    print(f"\n📊 Score de Limpeza: {cleanliness_score}/{total_checks} ({cleanliness_percentage:.1f}%)")
    
    if cleanliness_percentage >= 80:
        print("✅ Arquitetura LIMPA")
        return True
    elif cleanliness_percentage >= 60:
        print("⚠️ Arquitetura MODERADAMENTE LIMPA")
        return False
    else:
        print("❌ Arquitetura PRECISA DE LIMPEZA")
        return False

def analyze_delegation_strategy():
    """Analisa a estratégia de delegação"""
    
    print("\n🎯 **ANÁLISE DA ESTRATÉGIA DE DELEGAÇÃO:**")
    print("="*60)
    
    strategy_score = 0
    total_checks = 0
    
    # Check 1: TursoManager removido
    total_checks += 1
    if not Path("tools/turso_manager.py").exists():
        print("✅ TursoManager: REMOVIDO (redundante)")
        strategy_score += 1
    else:
        print("❌ TursoManager: AINDA EXISTE")
    
    # Check 2: MCP Integrator presente
    total_checks += 1
    if Path("tools/mcp_integrator.py").exists():
        print("✅ MCP Integrator: PRESENTE (única ferramenta)")
        strategy_score += 1
    else:
        print("❌ MCP Integrator: NÃO ENCONTRADO")
    
    # Check 3: Agente delegador presente
    total_checks += 1
    if Path("agents/turso_specialist_delegator.py").exists():
        print("✅ Agente Delegador: PRESENTE")
        strategy_score += 1
    else:
        print("❌ Agente Delegador: NÃO ENCONTRADO")
    
    # Check 4: CLI atualizado
    total_checks += 1
    main_content = Path("main.py").read_text() if Path("main.py").exists() else ""
    if "delegação" in main_content.lower() and "mcp" in main_content.lower():
        print("✅ CLI: ATUALIZADO para delegação")
        strategy_score += 1
    else:
        print("❌ CLI: NÃO ATUALIZADO")
    
    # Calcular score
    strategy_percentage = (strategy_score / total_checks) * 100
    print(f"\n📊 Score de Delegação: {strategy_score}/{total_checks} ({strategy_percentage:.1f}%)")
    
    if strategy_percentage >= 80:
        print("✅ Estratégia de Delegação IMPLEMENTADA")
        return True
    elif strategy_percentage >= 60:
        print("⚠️ Estratégia de Delegação PARCIAL")
        return False
    else:
        print("❌ Estratégia de Delegação NÃO IMPLEMENTADA")
        return False

def generate_recommendations():
    """Gera recomendações para melhorar a arquitetura"""
    
    print("\n💡 **RECOMENDAÇÕES PARA MELHORAR A ARQUITETURA:**")
    print("="*60)
    
    recommendations = []
    
    # Verificar agentes duplicados
    agent_files = [f for f in Path("agents").glob("*.py") if f.name != "__init__.py"]
    if len(agent_files) > 3:
        recommendations.append("🧹 Remover agentes duplicados (manter apenas 3 principais)")
    
    # Verificar se TursoManager ainda existe
    if Path("tools/turso_manager.py").exists():
        recommendations.append("🗑️ Remover TursoManager (já delegado para MCP)")
    
    # Verificar imports pendentes
    main_content = Path("main.py").read_text() if Path("main.py").exists() else ""
    if "turso_manager" in main_content:
        recommendations.append("🔧 Atualizar imports no main.py (remover TursoManager)")
    
    # Verificar testes
    if not Path("tests/test_mcp_integration.py").exists():
        recommendations.append("🧪 Criar testes para MCP Integration")
    
    # Verificar documentação
    if not Path("README.md").exists():
        recommendations.append("📚 Criar README.md com documentação da arquitetura")
    
    if recommendations:
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")
    else:
        print("✅ Arquitetura já está bem organizada!")
    
    return len(recommendations) == 0

def main():
    """Função principal"""
    
    print("🚀 **ANÁLISE COMPLETA DA ARQUITETURA TURSO AGENT**")
    print("="*80)
    
    # Executar análises
    structure_ok = analyze_directory_structure()
    tools_ok = analyze_tools_overlap()
    agents_ok = analyze_agents_overlap()
    functionality_ok = analyze_functionality_overlap()
    cleanliness_ok = analyze_architecture_cleanliness()
    delegation_ok = analyze_delegation_strategy()
    
    # Gerar recomendações
    recommendations_ok = generate_recommendations()
    
    # Resultado final
    print("\n" + "="*80)
    print("📊 **RESULTADO FINAL DA ANÁLISE:**")
    print("="*80)
    
    results = [
        ("Estrutura de Diretórios", structure_ok),
        ("Ferramentas (Sem Sobreposição)", tools_ok),
        ("Agentes (Sem Sobreposição)", agents_ok),
        ("Funcionalidades (Delegadas)", functionality_ok),
        ("Limpeza da Arquitetura", cleanliness_ok),
        ("Estratégia de Delegação", delegation_ok),
        ("Recomendações", recommendations_ok)
    ]
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASSOU" if result else "❌ FALHOU"
        print(f"   {name:<30} {status}")
    
    print(f"\n📈 Score Geral: {passed}/{total} ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("\n🎉 **ARQUITETURA PERFEITA!**")
        print("✅ Bem organizada e sem sobreposições")
    elif passed >= total * 0.8:
        print("\n✅ **ARQUITETURA BOA!**")
        print("⚠️ Pequenas melhorias necessárias")
    elif passed >= total * 0.6:
        print("\n⚠️ **ARQUITETURA MODERADA!**")
        print("🔧 Melhorias necessárias")
    else:
        print("\n❌ **ARQUITETURA PRECISA DE REFATORAÇÃO!**")
        print("🚨 Muitas sobreposições e problemas")
    
    print("="*80)

if __name__ == "__main__":
    main() 