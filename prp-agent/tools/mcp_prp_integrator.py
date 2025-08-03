"""
MCP PRP Integrator - Ferramenta Principal de Delegação
Implementa estratégia de delegação 100% para MCPs
Inspirado no padrão Turso Agent
"""

import asyncio
import subprocess
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
import tempfile

class MCPPRPIntegrator:
    """
    Ferramenta principal para o PRP Agent
    
    PRINCÍPIO: Delegação 100% para MCPs especializados
    RESPONSABILIDADES:
    - Claude Flow MCP: Orquestração, memória, neural patterns
    - Turso MCP: Armazenamento de PRPs, busca, análise
    - PRP Agent: Inteligência e coordenação
    """
    
    def __init__(self, settings=None):
        self.settings = settings or {}
        self.mcp_servers = {
            "claude-flow": {
                "package": "claude-flow@alpha",
                "command": "npx",
                "args": ["claude-flow@alpha", "mcp", "start"],
                "process": None
            },
            "turso": {
                "package": "@diegofornalha/mcp-turso-cloud", 
                "command": "npx",
                "args": ["@diegofornalha/mcp-turso-cloud"],
                "process": None
            }
        }
        
    async def check_mcp_ecosystem(self) -> Dict[str, str]:
        """Verifica status completo do ecossistema MCP"""
        
        status = {}
        
        # Verificar Node.js
        node_status = await self._check_nodejs()
        status["nodejs"] = "✅ Instalado" if node_status else "❌ Não encontrado"
        
        # Verificar cada MCP
        for mcp_name, mcp_info in self.mcp_servers.items():
            package_status = await self._check_mcp_package(mcp_info["package"])
            status[mcp_name] = "✅ Disponível" if package_status else "⚠️ Não instalado"
            
        # Verificar configurações
        config_status = await self._check_configurations()
        status["configurations"] = config_status
        
        return status
    
    async def _check_nodejs(self) -> bool:
        """Verifica se Node.js está instalado"""
        try:
            result = subprocess.run(
                ["node", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            return result.returncode == 0
        except Exception:
            return False
    
    async def _check_mcp_package(self, package: str) -> bool:
        """Verifica se pacote MCP está instalado"""
        try:
            result = subprocess.run(
                ["npm", "list", "-g", package],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception:
            return False
    
    async def _check_configurations(self) -> str:
        """Verifica configurações dos MCPs"""
        configs_ok = 0
        total_configs = 2
        
        # Verificar configuração Claude Flow
        if Path(".claude/settings.json").exists():
            configs_ok += 1
            
        # Verificar configuração Turso
        if os.getenv("TURSO_API_TOKEN"):
            configs_ok += 1
            
        if configs_ok == total_configs:
            return "✅ Todas configuradas"
        elif configs_ok > 0:
            return f"⚠️ {configs_ok}/{total_configs} configuradas"
        else:
            return "❌ Nenhuma configuração encontrada"
    
    async def setup_mcp_ecosystem(self) -> bool:
        """Setup completo do ecossistema MCP"""
        
        try:
            print("🔌 **SETUP ECOSSISTEMA MCP PARA PRP AGENT:**")
            print("="*60)
            
            # 1. Verificar Node.js
            print("1. 📦 Verificando Node.js...")
            if not await self._check_nodejs():
                print("❌ Node.js necessário. Instale primeiro.")
                return False
            print("✅ Node.js encontrado")
            
            # 2. Instalar MCPs
            for mcp_name, mcp_info in self.mcp_servers.items():
                print(f"\n2. 📦 Instalando {mcp_name}...")
                if not await self._install_mcp_package(mcp_info["package"]):
                    print(f"⚠️ Falha ao instalar {mcp_name}")
                else:
                    print(f"✅ {mcp_name} instalado")
            
            # 3. Configurar MCPs
            print("\n3. ⚙️ Configurando MCPs...")
            await self._configure_claude_flow()
            await self._configure_turso()
            
            print("\n✅ Setup do ecossistema MCP completo!")
            return True
            
        except Exception as e:
            print(f"❌ Erro no setup: {str(e)}")
            return False
    
    async def _install_mcp_package(self, package: str) -> bool:
        """Instala pacote MCP"""
        try:
            # Verificar se já está instalado
            if await self._check_mcp_package(package):
                return True
                
            print(f"📦 Instalando {package}...")
            
            result = subprocess.run(
                ["npm", "install", "-g", package],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            return result.returncode == 0
            
        except Exception as e:
            print(f"❌ Erro ao instalar {package}: {str(e)}")
            return False
    
    async def _configure_claude_flow(self):
        """Configura Claude Flow MCP"""
        try:
            print("🔧 Configurando Claude Flow...")
            
            # Criar diretório .claude se não existir
            claude_dir = Path(".claude")
            claude_dir.mkdir(exist_ok=True)
            
            # Configuração básica do Claude Flow
            config = {
                "mcp": {
                    "claude-flow": {
                        "enabled": True,
                        "features": {
                            "swarm": True,
                            "memory": True,
                            "neural": True,
                            "github": False
                        }
                    }
                }
            }
            
            # Salvar configuração
            config_path = claude_dir / "mcp-config.json"
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
                
            print("✅ Claude Flow configurado")
            
        except Exception as e:
            print(f"❌ Erro configurando Claude Flow: {str(e)}")
    
    async def _configure_turso(self):
        """Configura Turso MCP"""
        try:
            print("🔧 Configurando Turso...")
            
            # Verificar token
            token = os.getenv("TURSO_API_TOKEN")
            if not token:
                print("⚠️ TURSO_API_TOKEN não encontrado no ambiente")
                return
                
            # Criar configuração
            config = {
                "turso": {
                    "organizationToken": token,
                    "defaultDatabase": "prp-database"
                }
            }
            
            # Salvar configuração
            config_path = Path(".turso-mcp-config.json")
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
                
            print("✅ Turso configurado")
            
        except Exception as e:
            print(f"❌ Erro configurando Turso: {str(e)}")
    
    async def get_available_tools(self) -> Dict[str, List[str]]:
        """Retorna todas as ferramentas disponíveis via MCPs"""
        
        tools = {
            "claude_flow": [
                # Orquestração e Swarm
                "mcp__claude_flow__swarm_init",
                "mcp__claude_flow__agent_spawn", 
                "mcp__claude_flow__task_orchestrate",
                "mcp__claude_flow__swarm_status",
                
                # Memória e Persistência
                "mcp__claude_flow__memory_usage",
                "mcp__claude_flow__memory_search",
                "mcp__claude_flow__memory_persist",
                
                # Neural e Patterns
                "mcp__claude_flow__neural_train",
                "mcp__claude_flow__neural_patterns",
                "mcp__claude_flow__neural_predict",
                
                # Performance e Análise
                "mcp__claude_flow__performance_report",
                "mcp__claude_flow__bottleneck_analyze"
            ],
            "turso": [
                # Gerenciamento de PRPs
                "mcp__mcp_turso__add_knowledge",
                "mcp__mcp_turso__search_knowledge",
                "mcp__mcp_turso__list_tables",
                "mcp__mcp_turso__execute_query",
                "mcp__mcp_turso__execute_read_only_query",
                
                # Análise e Busca
                "mcp__mcp_turso__vector_search",
                "mcp__mcp_turso__describe_table",
                
                # Conversações e Memória
                "mcp__mcp_turso__add_conversation",
                "mcp__mcp_turso__get_conversations"
            ],
            "prp_agent": [
                # Ferramentas locais do agente
                "analyze_prp_structure",
                "validate_prp_format",
                "generate_prp_template",
                "suggest_improvements"
            ]
        }
        
        return tools
    
    async def delegate_to_mcp(self, mcp_name: str, tool: str, params: Dict[str, Any]) -> Any:
        """Delega execução para MCP específico"""
        
        try:
            if mcp_name not in self.mcp_servers:
                raise ValueError(f"MCP {mcp_name} não encontrado")
                
            # Aqui seria a integração real com o MCP
            # Por enquanto, retornamos uma estrutura de exemplo
            
            print(f"📡 Delegando para {mcp_name}: {tool}")
            print(f"   Parâmetros: {params}")
            
            # Simular resposta do MCP
            return {
                "success": True,
                "mcp": mcp_name,
                "tool": tool,
                "result": f"Executado via {mcp_name}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def orchestrate_prp_workflow(self, task: str) -> Dict[str, Any]:
        """Orquestra workflow completo de PRP usando MCPs"""
        
        workflow = {
            "task": task,
            "steps": [],
            "results": {}
        }
        
        try:
            # 1. Inicializar swarm via Claude Flow
            swarm_result = await self.delegate_to_mcp(
                "claude_flow",
                "mcp__claude_flow__swarm_init",
                {"topology": "hierarchical", "maxAgents": 5}
            )
            workflow["steps"].append("Swarm inicializado")
            
            # 2. Spawn agentes especializados
            agents = ["prp-analyzer", "prp-generator", "prp-validator"]
            for agent in agents:
                await self.delegate_to_mcp(
                    "claude_flow",
                    "mcp__claude_flow__agent_spawn",
                    {"type": agent}
                )
            workflow["steps"].append(f"{len(agents)} agentes criados")
            
            # 3. Buscar PRPs similares no Turso
            search_result = await self.delegate_to_mcp(
                "turso",
                "mcp__mcp_turso__search_knowledge",
                {"query": task, "limit": 5}
            )
            workflow["steps"].append("PRPs similares pesquisados")
            
            # 4. Orquestrar tarefa
            orchestrate_result = await self.delegate_to_mcp(
                "claude_flow",
                "mcp__claude_flow__task_orchestrate",
                {"task": task, "strategy": "parallel"}
            )
            workflow["steps"].append("Tarefa orquestrada")
            
            # 5. Armazenar resultado no Turso
            store_result = await self.delegate_to_mcp(
                "turso",
                "mcp__mcp_turso__add_knowledge",
                {
                    "topic": f"PRP: {task}",
                    "content": "PRP gerado via workflow orquestrado"
                }
            )
            workflow["steps"].append("PRP armazenado")
            
            workflow["results"] = {
                "swarm": swarm_result,
                "search": search_result,
                "orchestration": orchestrate_result,
                "storage": store_result
            }
            
            return workflow
            
        except Exception as e:
            workflow["error"] = str(e)
            return workflow
    
    async def test_mcp_integration(self) -> Dict[str, Any]:
        """Testa integração completa com MCPs"""
        
        print("🔍 **TESTE DE INTEGRAÇÃO MCP:**")
        print("="*50)
        
        results = {}
        
        # 1. Verificar ecossistema
        ecosystem_status = await self.check_mcp_ecosystem()
        results["ecosystem"] = ecosystem_status
        print("\n1. Status do Ecossistema:")
        for component, status in ecosystem_status.items():
            print(f"   {component}: {status}")
        
        # 2. Verificar ferramentas
        available_tools = await self.get_available_tools()
        results["tools"] = {
            mcp: len(tools) for mcp, tools in available_tools.items()
        }
        print("\n2. Ferramentas Disponíveis:")
        for mcp, count in results["tools"].items():
            print(f"   {mcp}: {count} ferramentas")
        
        # 3. Teste de delegação
        print("\n3. Teste de Delegação:")
        test_delegation = await self.delegate_to_mcp(
            "claude_flow",
            "mcp__claude_flow__swarm_status",
            {}
        )
        results["delegation_test"] = test_delegation
        print(f"   Resultado: {'✅ OK' if test_delegation.get('success') else '❌ Falhou'}")
        
        return results