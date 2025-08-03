"""
MCP Turso Integrator - Única Ferramenta Necessária
Implementa estratégia de delegação 100% para MCP
"""

import asyncio
import subprocess
import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
import requests
import tempfile

class MCPTursoIntegrator:
    """
    Única ferramenta necessária para o agente Turso
    
    PRINCÍPIO: Com delegação 100% para MCP, apenas integração é necessária
    FOCUS: Setup, configuração e gerenciamento do MCP server
    """
    
    def __init__(self, settings):
        self.settings = settings
        self.mcp_package = "@diegofornalha/mcp-turso-cloud"
        self.server_process = None
        
    async def check_mcp_status(self) -> str:
        """Verifica status da integração MCP"""
        
        try:
            # Verificar se Node.js está instalado
            node_check = await self._check_nodejs()
            
            # Verificar se MCP package está instalado
            package_check = await self._check_mcp_package()
            
            # Verificar configuração
            config_check = await self._check_mcp_configuration()
            
            if node_check and package_check and config_check:
                return "✅ MCP totalmente configurado"
            elif node_check and package_check:
                return "⚠️ MCP instalado, configuração pendente"
            elif node_check:
                return "⚠️ Node.js disponível, MCP não instalado"
            else:
                return "❌ Node.js não encontrado"
                
        except Exception as e:
            return f"❌ Erro: {str(e)}"
    
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
    
    async def _check_mcp_package(self) -> bool:
        """Verifica se MCP package está instalado"""
        try:
            result = subprocess.run(
                ["npm", "list", "-g", self.mcp_package],
                capture_output=True,
                text=True,
                timeout=10
            )
            return result.returncode == 0
        except Exception:
            return False
    
    async def _check_mcp_configuration(self) -> bool:
        """Verifica configuração MCP"""
        try:
            # Verificar se tokens estão configurados
            return bool(self.settings.turso_api_token)
        except Exception:
            return False
    
    async def setup_mcp_server(self) -> bool:
        """Setup completo do MCP server"""
        
        try:
            print("🔌 **SETUP MCP TURSO SERVER (Única Ferramenta Necessária):**")
            print("="*60)
            
            # Passo 1: Verificar Node.js
            print("1. 📦 Verificando Node.js...")
            if not await self._check_nodejs():
                print("❌ Node.js não encontrado. Instalando...")
                if not await self._install_nodejs():
                    return False
            else:
                print("✅ Node.js encontrado")
            
            # Passo 2: Instalar MCP package
            print("2. 📦 Instalando MCP package...")
            if not await self._install_mcp_package():
                return False
            
            # Passo 3: Configurar MCP server
            print("3. ⚙️ Configurando MCP server...")
            if not await self._configure_mcp_server():
                return False
            
            # Passo 4: Testar conexão
            print("4. 🔍 Testando conexão...")
            if not await self._test_mcp_connection():
                return False
            
            print("✅ Setup MCP completo!")
            return True
            
        except Exception as e:
            print(f"❌ Erro no setup: {str(e)}")
            return False
    
    async def _install_nodejs(self) -> bool:
        """Instala Node.js se necessário"""
        try:
            # Verificar se já está instalado
            if await self._check_nodejs():
                return True
            
            print("📦 Instalando Node.js...")
            # Aqui você pode implementar a instalação específica do seu sistema
            # Por exemplo, via brew no macOS, apt no Ubuntu, etc.
            
            return False  # Placeholder - implementar conforme necessário
            
        except Exception:
            return False
    
    async def _install_mcp_package(self) -> bool:
        """Instala MCP package"""
        try:
            print(f"📦 Instalando {self.mcp_package}...")
            
            result = subprocess.run(
                ["npm", "install", "-g", self.mcp_package],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                print("✅ MCP package instalado com sucesso")
                return True
            else:
                print(f"❌ Erro na instalação: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao instalar MCP package: {str(e)}")
            return False
    
    async def _configure_mcp_server(self) -> bool:
        """Configura MCP server"""
        try:
            print("⚙️ Configurando MCP server...")
            
            # Criar arquivo de configuração
            config = {
                "organizationToken": self.settings.turso_api_token,
                "defaultDatabase": self.settings.default_database,
                "serverConfig": {
                    "host": self.settings.mcp_server_host,
                    "port": self.settings.mcp_server_port
                }
            }
            
            # Salvar configuração
            config_path = Path(".mcp-turso-config.json")
            with open(config_path, 'w') as f:
                json.dump(config, f, indent=2)
            
            print("✅ Configuração MCP salva")
            return True
            
        except Exception as e:
            print(f"❌ Erro na configuração: {str(e)}")
            return False
    
    async def _test_mcp_connection(self) -> bool:
        """Testa conexão MCP"""
        try:
            print("🔍 Testando conexão MCP...")
            
            # Testar se o servidor responde
            test_url = f"http://{self.settings.mcp_server_host}:{self.settings.mcp_server_port}/health"
            
            response = requests.get(test_url, timeout=5)
            
            if response.status_code == 200:
                print("✅ Conexão MCP funcionando")
                return True
            else:
                print(f"❌ Servidor não responde: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Erro no teste de conexão: {str(e)}")
            return False
    
    async def start_mcp_server(self) -> bool:
        """Inicia MCP server"""
        try:
            print("🚀 Iniciando MCP server...")
            
            # Comando para iniciar o servidor
            cmd = [
                "npx", self.mcp_package,
                "--host", self.settings.mcp_server_host,
                "--port", str(self.settings.mcp_server_port)
            ]
            
            # Iniciar processo em background
            self.server_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Aguardar um pouco para verificar se iniciou
            await asyncio.sleep(2)
            
            if self.server_process.poll() is None:
                print("✅ MCP server iniciado com sucesso")
                return True
            else:
                print("❌ Falha ao iniciar MCP server")
                return False
                
        except Exception as e:
            print(f"❌ Erro ao iniciar MCP server: {str(e)}")
            return False
    
    async def stop_mcp_server(self) -> bool:
        """Para MCP server"""
        try:
            if self.server_process:
                print("🛑 Parando MCP server...")
                self.server_process.terminate()
                await asyncio.sleep(2)
                
                if self.server_process.poll() is None:
                    self.server_process.kill()
                
                print("✅ MCP server parado")
                return True
            else:
                print("⚠️ Nenhum servidor MCP em execução")
                return True
                
        except Exception as e:
            print(f"❌ Erro ao parar MCP server: {str(e)}")
            return False
    
    async def configure_llm_integration(self) -> bool:
        """Configura integração com LLMs"""
        try:
            print("🤖 Configurando integração LLM...")
            
            # Configurar Cursor Agent
            cursor_config = await self._configure_cursor_integration()
            
            # Configurar Claude Desktop
            claude_config = await self._configure_claude_desktop()
            
            # Configurar LLM customizado
            custom_config = await self._configure_custom_llm()
            
            if cursor_config and claude_config and custom_config:
                print("✅ Integração LLM configurada")
                return True
            else:
                print("⚠️ Algumas configurações LLM falharam")
                return False
                
        except Exception as e:
            print(f"❌ Erro na configuração LLM: {str(e)}")
            return False
    
    async def _configure_cursor_integration(self) -> bool:
        """Configura integração com Cursor Agent"""
        try:
            print("📝 Configurando Cursor Agent...")
            
            # Criar arquivo de configuração do Cursor
            cursor_config = {
                "mcpServers": {
                    "turso": {
                        "command": "npx",
                        "args": [self.mcp_package],
                        "env": {
                            "TURSO_API_TOKEN": self.settings.turso_api_token
                        }
                    }
                }
            }
            
            # Salvar configuração do Cursor
            cursor_path = Path(".cursor/mcp.json")
            cursor_path.parent.mkdir(exist_ok=True)
            
            with open(cursor_path, 'w') as f:
                json.dump(cursor_config, f, indent=2)
            
            print("✅ Cursor Agent configurado")
            return True
            
        except Exception as e:
            print(f"❌ Erro na configuração Cursor: {str(e)}")
            return False
    
    async def _configure_claude_desktop(self) -> bool:
        """Configura integração com Claude Desktop"""
        try:
            print("🤖 Configurando Claude Desktop...")
            
            # Configuração para Claude Desktop
            claude_config = {
                "mcpServers": {
                    "turso": {
                        "command": "npx",
                        "args": [self.mcp_package],
                        "env": {
                            "TURSO_API_TOKEN": self.settings.turso_api_token
                        }
                    }
                }
            }
            
            # Salvar configuração do Claude
            claude_path = Path(".claude/mcp.json")
            claude_path.parent.mkdir(exist_ok=True)
            
            with open(claude_path, 'w') as f:
                json.dump(claude_config, f, indent=2)
            
            print("✅ Claude Desktop configurado")
            return True
            
        except Exception as e:
            print(f"❌ Erro na configuração Claude: {str(e)}")
            return False
    
    async def _configure_custom_llm(self) -> bool:
        """Configura LLM customizado"""
        try:
            print("🔧 Configurando LLM customizado...")
            
            # Configuração genérica para LLMs
            custom_config = {
                "mcpServers": {
                    "turso": {
                        "command": "npx",
                        "args": [self.mcp_package],
                        "env": {
                            "TURSO_API_TOKEN": self.settings.turso_api_token
                        }
                    }
                }
            }
            
            # Salvar configuração customizada
            custom_path = Path(".mcp/custom-llm.json")
            custom_path.parent.mkdir(exist_ok=True)
            
            with open(custom_path, 'w') as f:
                json.dump(custom_config, f, indent=2)
            
            print("✅ LLM customizado configurado")
            return True
            
        except Exception as e:
            print(f"❌ Erro na configuração LLM customizado: {str(e)}")
            return False
    
    async def check_security(self) -> str:
        """Verifica segurança da integração MCP"""
        
        try:
            security_checks = []
            
            # Verificar token security
            if self._check_token_security():
                security_checks.append("✅ Token security")
            else:
                security_checks.append("❌ Token security")
            
            # Verificar environment security
            if self._check_environment_security():
                security_checks.append("✅ Environment security")
            else:
                security_checks.append("❌ Environment security")
            
            # Verificar network security
            if self._check_network_security():
                security_checks.append("✅ Network security")
            else:
                security_checks.append("❌ Network security")
            
            # Verificar access control
            if self._check_access_control():
                security_checks.append("✅ Access control")
            else:
                security_checks.append("❌ Access control")
            
            return "\n".join(security_checks)
            
        except Exception as e:
            return f"❌ Erro na verificação de segurança: {str(e)}"
    
    def _check_token_security(self) -> bool:
        """Verifica segurança dos tokens"""
        try:
            # Verificar se token não está exposto
            if not self.settings.turso_api_token:
                return False
            
            # Verificar se token não está em arquivos de texto
            token_files = [
                ".env",
                "config.json",
                "settings.json"
            ]
            
            for file_path in token_files:
                if Path(file_path).exists():
                    with open(file_path, 'r') as f:
                        content = f.read()
                        if self.settings.turso_api_token in content:
                            return False
            
            return True
            
        except Exception:
            return False
    
    def _check_environment_security(self) -> bool:
        """Verifica segurança do ambiente"""
        try:
            # Verificar se estamos em ambiente seguro
            env = os.getenv("NODE_ENV", "development")
            return env in ["production", "staging"]
            
        except Exception:
            return False
    
    def _check_network_security(self) -> bool:
        """Verifica segurança da rede"""
        try:
            # Verificar se HTTPS está sendo usado
            return True  # Placeholder - implementar conforme necessário
            
        except Exception:
            return False
    
    def _check_access_control(self) -> bool:
        """Verifica controle de acesso"""
        try:
            # Verificar permissões de arquivo
            config_path = Path(".mcp-turso-config.json")
            if config_path.exists():
                stat = config_path.stat()
                return stat.st_mode & 0o777 == 0o600  # Apenas owner pode ler/escrever
            
            return True
            
        except Exception:
            return False
    
    async def get_mcp_tools_info(self) -> Dict[str, Any]:
        """Retorna informações sobre as tools MCP disponíveis"""
        
        return {
            "available_tools": [
                "mcp_turso_list_databases",
                "mcp_turso_create_database",
                "mcp_turso_execute_query",
                "mcp_turso_execute_read_only_query",
                "mcp_turso_get_database_info",
                "mcp_turso_list_tables",
                "mcp_turso_describe_table",
                "mcp_turso_vector_search"
            ],
            "delegation_strategy": "100% MCP",
            "agent_role": "Intelligence and Analysis",
            "mcp_role": "Operations and Protocol"
        }
    
    async def test_connection(self) -> Dict[str, Any]:
        """Testa conexão completa com MCP"""
        
        try:
            print("🔍 **TESTE COMPLETO DE CONEXÃO MCP:**")
            print("="*40)
            
            # Teste 1: Status MCP
            mcp_status = await self.check_mcp_status()
            print(f"1. Status MCP: {mcp_status}")
            
            # Teste 2: Segurança
            security_status = await self.check_security()
            print(f"2. Segurança: {security_status}")
            
            # Teste 3: Tools disponíveis
            tools_info = await self.get_mcp_tools_info()
            print(f"3. Tools disponíveis: {len(tools_info['available_tools'])}")
            
            # Teste 4: Conexão com servidor
            server_ok = await self._test_mcp_connection()
            print(f"4. Servidor: {'✅ OK' if server_ok else '❌ Falha'}")
            
            return {
                "success": mcp_status.startswith("✅") and server_ok,
                "mcp_status": mcp_status,
                "security_status": security_status,
                "tools_count": len(tools_info['available_tools']),
                "server_ok": server_ok
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            } 