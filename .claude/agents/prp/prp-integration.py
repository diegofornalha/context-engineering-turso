#!/usr/bin/env python3
"""
PRP Integration Script for Claude Flow
Connects the existing prp-agent with Claude Flow's agent system
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.append(str(PROJECT_ROOT))

# Import existing PRP agent
try:
    from prp_agent.agents.agent import Agent
    from prp_agent.agents.dependencies import build_deps
    from prp_agent.agents.settings import Settings
    PRP_AGENT_AVAILABLE = True
except ImportError:
    PRP_AGENT_AVAILABLE = False
    print("⚠️ PRP Agent not available. Running in standalone mode.")

class PRPClaudeFlowIntegration:
    """Integrates PRP Agent with Claude Flow's agent system"""
    
    def __init__(self):
        self.project_root = PROJECT_ROOT
        self.prp_agent_path = self.project_root / "prp-agent"
        self.claude_agents_path = self.project_root / ".claude" / "agents"
        self.agent = None
        self.deps = None
        
    async def initialize(self):
        """Initialize the PRP agent if available"""
        if PRP_AGENT_AVAILABLE:
            try:
                self.deps = await build_deps()
                self.agent = Agent(deps=self.deps)
                print("✅ PRP Agent initialized successfully")
                return True
            except Exception as e:
                print(f"❌ Failed to initialize PRP Agent: {e}")
                return False
        return False
        
    async def generate_prp(self, topic: str, **kwargs) -> Dict[str, Any]:
        """Generate a PRP for the given topic"""
        
        # Try to use the existing PRP agent first
        if self.agent:
            try:
                prompt = f"Gerar PRP completo sobre: {topic}"
                result = await self.agent.run(prompt)
                
                # Extract PRP content from result
                if hasattr(result, 'data'):
                    content = result.data
                else:
                    content = str(result)
                    
                return {
                    "success": True,
                    "content": content,
                    "generated_by": "prp-agent",
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                print(f"⚠️ PRP Agent error: {e}")
                # Fall back to template generation
        
        # Fallback: Generate using template
        return self._generate_prp_from_template(topic, **kwargs)
    
    def _generate_prp_from_template(self, topic: str, **kwargs) -> Dict[str, Any]:
        """Generate PRP using the standard template"""
        
        # Generate unique ID
        topic_id = topic.upper().replace(" ", "_").replace("-", "_")
        prp_id = f"PRP_{topic_id}"
        
        # Get current date
        current_date = datetime.now().strftime("%d/%m/%Y")
        
        # Build PRP content
        content = f"""# 🧠 PRP: {topic}

## 📋 Informações Básicas
- **ID**: {prp_id}
- **Título**: {topic}
- **Data de Criação**: {current_date}
- **Status**: Em Desenvolvimento
- **Prioridade**: {kwargs.get('priority', 'Média')}

## 🎯 Objetivo
{kwargs.get('objective', f'Definir padrões e práticas para {topic}')}

## 🏗️ Arquitetura
{kwargs.get('architecture', '[A ser definida após análise detalhada]')}

## 🔄 Fluxo de Trabalho
{kwargs.get('workflow', '[Processos e interações a serem documentados]')}

## 📊 Casos de Uso
{kwargs.get('use_cases', '[Exemplos práticos serão adicionados]')}

## 🔗 Referências
{kwargs.get('references', '[Links e recursos serão incluídos]')}

## 📝 Notas de Implementação
{kwargs.get('notes', '[Detalhes técnicos serão documentados]')}
"""
        
        return {
            "success": True,
            "content": content,
            "generated_by": "template",
            "id": prp_id,
            "timestamp": datetime.now().isoformat()
        }
    
    async def save_prp(self, prp_data: Dict[str, Any], output_path: Optional[Path] = None) -> bool:
        """Save PRP to file"""
        
        if not output_path:
            # Default to PRPs directory
            prps_dir = self.prp_agent_path / "PRPs"
            prps_dir.mkdir(exist_ok=True)
            
            prp_id = prp_data.get('id', f"PRP_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
            output_path = prps_dir / f"{prp_id}.md"
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(prp_data['content'])
            
            print(f"✅ PRP saved to: {output_path}")
            return True
        except Exception as e:
            print(f"❌ Failed to save PRP: {e}")
            return False
    
    async def list_prps(self) -> list:
        """List all existing PRPs"""
        prps = []
        
        # Check PRPs directory
        prps_dir = self.prp_agent_path / "PRPs"
        if prps_dir.exists():
            for prp_file in prps_dir.glob("*.md"):
                prps.append({
                    "file": str(prp_file),
                    "name": prp_file.stem,
                    "modified": datetime.fromtimestamp(prp_file.stat().st_mtime).isoformat()
                })
        
        return prps
    
    def get_integration_status(self) -> Dict[str, Any]:
        """Get status of the integration"""
        return {
            "prp_agent_available": PRP_AGENT_AVAILABLE,
            "prp_agent_path": str(self.prp_agent_path),
            "claude_agents_path": str(self.claude_agents_path),
            "prp_agent_initialized": self.agent is not None,
            "project_root": str(self.project_root)
        }

# CLI Interface
async def main():
    """Main CLI interface for PRP integration"""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRP Claude Flow Integration")
    parser.add_argument('command', choices=['generate', 'list', 'status'], 
                       help='Command to execute')
    parser.add_argument('--topic', help='Topic for PRP generation')
    parser.add_argument('--priority', choices=['Alta', 'Média', 'Baixa'], 
                       default='Média', help='PRP priority')
    parser.add_argument('--output', help='Output file path')
    
    args = parser.parse_args()
    
    # Initialize integration
    integration = PRPClaudeFlowIntegration()
    
    if args.command == 'status':
        status = integration.get_integration_status()
        print(json.dumps(status, indent=2))
        return
    
    # Initialize PRP agent for other commands
    await integration.initialize()
    
    if args.command == 'generate':
        if not args.topic:
            print("❌ Topic is required for generation")
            return
        
        print(f"🧠 Generating PRP for: {args.topic}")
        result = await integration.generate_prp(
            args.topic, 
            priority=args.priority
        )
        
        if result['success']:
            # Save the PRP
            output_path = Path(args.output) if args.output else None
            await integration.save_prp(result, output_path)
            
            # Print summary
            print(f"\n📊 PRP Generation Summary:")
            print(f"  - Generated by: {result['generated_by']}")
            print(f"  - Timestamp: {result['timestamp']}")
            if 'id' in result:
                print(f"  - ID: {result['id']}")
        else:
            print("❌ Failed to generate PRP")
    
    elif args.command == 'list':
        prps = await integration.list_prps()
        print(f"\n📚 Found {len(prps)} PRPs:")
        for prp in prps:
            print(f"  - {prp['name']} (modified: {prp['modified']})")

if __name__ == "__main__":
    asyncio.run(main())