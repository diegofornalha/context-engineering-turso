#!/usr/bin/env python3
"""
PRP Integration Module for Claude Flow
Bridges PRP Specialist Agent with existing prp-agent system
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from pathlib import Path

# Add prp-agent to path
PRP_AGENT_PATH = Path("/Users/agents/Desktop/context-engineering-turso/prp-agent")
sys.path.insert(0, str(PRP_AGENT_PATH))

try:
    from pydantic import BaseModel, Field, ValidationError
    from pydantic_ai import Agent, RunContext
except ImportError:
    print("Warning: pydantic_ai not available. Install with: pip install pydantic-ai")
    BaseModel = object
    Agent = None

# Logging setup
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PRPModel(BaseModel):
    """Pydantic model for PRP validation"""
    id: str = Field(pattern=r"^PRP_[A-Z0-9_]+$")
    title: str = Field(min_length=5, max_length=200)
    created: datetime
    status: str = Field(pattern=r"^(Active|In Development|Archived)$")
    priority: str = Field(pattern=r"^(High|Medium|Low)$")
    tags: List[str] = Field(min_items=1)
    objective: str = Field(min_length=20)
    architecture: Dict[str, Any]
    workflow: List[Dict[str, Any]]
    use_cases: List[Dict[str, Any]]
    references: Dict[str, Any]
    implementation_notes: Dict[str, Any]
    version_history: List[Dict[str, Any]]


@dataclass
class PRPGeneratorDependencies:
    """Dependencies for PRP generation"""
    turso_url: Optional[str] = None
    turso_token: Optional[str] = None
    prp_storage_path: str = str(PRP_AGENT_PATH / "PRPs" / "generated")
    template_path: str = str(PRP_AGENT_PATH / "PRPs" / "templates")


class PRPIntegration:
    """Main integration class for PRP operations"""
    
    def __init__(self, deps: Optional[PRPGeneratorDependencies] = None):
        self.deps = deps or PRPGeneratorDependencies()
        self.storage_path = Path(self.deps.prp_storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        
    def generate_prp_id(self, topic: str) -> str:
        """Generate a valid PRP ID from topic"""
        # Clean and format topic for ID
        clean_topic = topic.upper().replace(" ", "_")
        clean_topic = "".join(c for c in clean_topic if c.isalnum() or c == "_")
        return f"PRP_{clean_topic}"
    
    def create_prp_metadata(self, topic: str, priority: str = "Medium") -> Dict[str, Any]:
        """Create standard PRP metadata"""
        return {
            "id": self.generate_prp_id(topic),
            "title": topic,
            "created": datetime.now(),
            "status": "In Development",
            "priority": priority,
            "tags": self.extract_tags(topic),
            "version": "1.0"
        }
    
    def extract_tags(self, topic: str) -> List[str]:
        """Extract relevant tags from topic"""
        # Simple tag extraction - can be enhanced
        words = topic.lower().split()
        # Filter common words
        common_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for"}
        tags = [w for w in words if w not in common_words and len(w) > 3]
        return tags[:5]  # Limit to 5 tags
    
    async def generate_prp(self, topic: str, context: Optional[str] = None) -> Dict[str, Any]:
        """Generate a complete PRP for the given topic"""
        try:
            metadata = self.create_prp_metadata(topic)
            
            # Create PRP structure
            prp = {
                **metadata,
                "objective": f"Define and document the {topic} pattern for consistent implementation across the system.",
                "architecture": {
                    "components": [],
                    "integration_points": [],
                    "dependencies": []
                },
                "workflow": [
                    {
                        "step": 1,
                        "name": "Initialization",
                        "description": "Set up the initial environment and dependencies",
                        "actions": []
                    }
                ],
                "use_cases": [
                    {
                        "name": "Primary Use Case",
                        "context": context or f"When implementing {topic}",
                        "action": "Follow the defined pattern",
                        "result": "Consistent and maintainable implementation"
                    }
                ],
                "references": {
                    "internal": [],
                    "external": []
                },
                "implementation_notes": {
                    "technical": f"Technical considerations for {topic}",
                    "performance": "Performance optimization strategies",
                    "security": "Security best practices"
                },
                "version_history": [
                    {
                        "version": "1.0",
                        "date": datetime.now().isoformat(),
                        "changes": "Initial creation"
                    }
                ]
            }
            
            # Validate with Pydantic
            validated_prp = PRPModel(**prp)
            
            # Save to file system
            filename = f"{metadata['id']}.json"
            filepath = self.storage_path / filename
            
            with open(filepath, 'w') as f:
                json.dump(prp, f, indent=2, default=str)
            
            logger.info(f"Generated PRP: {metadata['id']} saved to {filepath}")
            
            return {
                "success": True,
                "prp": prp,
                "filepath": str(filepath),
                "validation": "passed"
            }
            
        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            return {
                "success": False,
                "error": str(e),
                "validation": "failed"
            }
        except Exception as e:
            logger.error(f"Generation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def validate_prp(self, prp_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate a PRP against the standard model"""
        try:
            validated = PRPModel(**prp_data)
            return {
                "valid": True,
                "message": "PRP validation successful",
                "data": validated.dict()
            }
        except ValidationError as e:
            return {
                "valid": False,
                "errors": e.errors(),
                "message": "PRP validation failed"
            }
    
    async def load_prp(self, prp_id: str) -> Optional[Dict[str, Any]]:
        """Load a PRP from storage"""
        try:
            filepath = self.storage_path / f"{prp_id}.json"
            if filepath.exists():
                with open(filepath, 'r') as f:
                    return json.load(f)
            return None
        except Exception as e:
            logger.error(f"Error loading PRP {prp_id}: {e}")
            return None
    
    async def search_prps(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search for PRPs matching the query"""
        results = []
        try:
            for filepath in self.storage_path.glob("PRP_*.json"):
                with open(filepath, 'r') as f:
                    prp = json.load(f)
                    
                # Simple search - check if query appears in key fields
                searchable = f"{prp.get('title', '')} {prp.get('objective', '')} {' '.join(prp.get('tags', []))}"
                if query.lower() in searchable.lower():
                    results.append({
                        "id": prp.get('id'),
                        "title": prp.get('title'),
                        "tags": prp.get('tags'),
                        "status": prp.get('status'),
                        "filepath": str(filepath)
                    })
                    
                if len(results) >= limit:
                    break
                    
        except Exception as e:
            logger.error(f"Search error: {e}")
            
        return results
    
    async def update_prp(self, prp_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update an existing PRP"""
        try:
            # Load existing PRP
            existing = await self.load_prp(prp_id)
            if not existing:
                return {
                    "success": False,
                    "error": f"PRP {prp_id} not found"
                }
            
            # Merge updates
            existing.update(updates)
            
            # Update version history
            if "version_history" not in existing:
                existing["version_history"] = []
                
            existing["version_history"].append({
                "version": f"{len(existing['version_history']) + 1}.0",
                "date": datetime.now().isoformat(),
                "changes": f"Updated: {', '.join(updates.keys())}"
            })
            
            # Validate
            validation = await self.validate_prp(existing)
            if not validation["valid"]:
                return {
                    "success": False,
                    "error": "Validation failed after update",
                    "validation_errors": validation["errors"]
                }
            
            # Save
            filepath = self.storage_path / f"{prp_id}.json"
            with open(filepath, 'w') as f:
                json.dump(existing, f, indent=2, default=str)
            
            return {
                "success": True,
                "prp": existing,
                "message": f"PRP {prp_id} updated successfully"
            }
            
        except Exception as e:
            logger.error(f"Update error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def format_prp_markdown(self, prp: Dict[str, Any]) -> str:
        """Convert PRP dict to markdown format"""
        md = f"""# 🧠 PRP: {prp.get('title', 'Untitled')}

## 📋 Basic Information
- **ID**: {prp.get('id', 'Unknown')}
- **Title**: {prp.get('title', 'Untitled')}
- **Created**: {prp.get('created', 'Unknown')}
- **Status**: {prp.get('status', 'Unknown')}
- **Priority**: {prp.get('priority', 'Medium')}
- **Tags**: {', '.join(prp.get('tags', []))}

## 🎯 Objective
{prp.get('objective', 'No objective defined')}

## 🏗️ Architecture
{self._format_architecture(prp.get('architecture', {}))}

## 🔄 Workflow
{self._format_workflow(prp.get('workflow', []))}

## 📊 Use Cases
{self._format_use_cases(prp.get('use_cases', []))}

## 🔗 References
{self._format_references(prp.get('references', {}))}

## 📝 Implementation Notes
{self._format_implementation_notes(prp.get('implementation_notes', {}))}

## 🔄 Version History
{self._format_version_history(prp.get('version_history', []))}
"""
        return md
    
    def _format_architecture(self, arch: Dict[str, Any]) -> str:
        """Format architecture section"""
        sections = []
        if arch.get('components'):
            sections.append("### System Components")
            for comp in arch['components']:
                sections.append(f"- {comp}")
        if arch.get('integration_points'):
            sections.append("\n### Integration Points")
            for point in arch['integration_points']:
                sections.append(f"- {point}")
        return "\n".join(sections) if sections else "No architecture defined"
    
    def _format_workflow(self, workflow: List[Dict[str, Any]]) -> str:
        """Format workflow section"""
        if not workflow:
            return "No workflow defined"
        
        sections = []
        for step in workflow:
            sections.append(f"### Step {step.get('step', '?')}: {step.get('name', 'Unknown')}")
            sections.append(step.get('description', 'No description'))
            if step.get('actions'):
                sections.append("\n**Actions:**")
                for action in step['actions']:
                    sections.append(f"- {action}")
            sections.append("")
        return "\n".join(sections)
    
    def _format_use_cases(self, use_cases: List[Dict[str, Any]]) -> str:
        """Format use cases section"""
        if not use_cases:
            return "No use cases defined"
        
        sections = []
        for i, uc in enumerate(use_cases, 1):
            sections.append(f"### Use Case {i}: {uc.get('name', 'Unknown')}")
            sections.append(f"**Context**: {uc.get('context', 'No context')}")
            sections.append(f"**Action**: {uc.get('action', 'No action')}")
            sections.append(f"**Result**: {uc.get('result', 'No result')}\n")
        return "\n".join(sections)
    
    def _format_references(self, refs: Dict[str, Any]) -> str:
        """Format references section"""
        sections = []
        if refs.get('internal'):
            sections.append("### Internal References")
            for ref in refs['internal']:
                sections.append(f"- {ref}")
        if refs.get('external'):
            sections.append("\n### External References")
            for ref in refs['external']:
                sections.append(f"- {ref}")
        return "\n".join(sections) if sections else "No references defined"
    
    def _format_implementation_notes(self, notes: Dict[str, Any]) -> str:
        """Format implementation notes section"""
        sections = []
        for key, value in notes.items():
            sections.append(f"### {key.title()}")
            sections.append(str(value))
        return "\n".join(sections) if sections else "No implementation notes"
    
    def _format_version_history(self, history: List[Dict[str, Any]]) -> str:
        """Format version history section"""
        if not history:
            return "No version history"
        
        sections = []
        for entry in history:
            sections.append(f"- v{entry.get('version', '?')} ({entry.get('date', 'Unknown')}): {entry.get('changes', 'No changes noted')}")
        return "\n".join(sections)


# CLI Interface
async def main():
    """Command line interface for PRP operations"""
    import argparse
    
    parser = argparse.ArgumentParser(description="PRP Integration Tool")
    parser.add_argument("action", choices=["generate", "validate", "search", "load", "update"],
                       help="Action to perform")
    parser.add_argument("--topic", help="Topic for PRP generation")
    parser.add_argument("--id", help="PRP ID for load/update operations")
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--context", help="Additional context for generation")
    parser.add_argument("--updates", help="JSON string of updates")
    parser.add_argument("--format", choices=["json", "markdown"], default="json",
                       help="Output format")
    
    args = parser.parse_args()
    
    # Initialize integration
    integration = PRPIntegration()
    
    if args.action == "generate":
        if not args.topic:
            print("Error: --topic required for generation")
            return
            
        result = await integration.generate_prp(args.topic, args.context)
        
        if result["success"] and args.format == "markdown":
            prp_md = integration.format_prp_markdown(result["prp"])
            print(prp_md)
        else:
            print(json.dumps(result, indent=2, default=str))
    
    elif args.action == "validate":
        if not args.id:
            print("Error: --id required for validation")
            return
            
        prp = await integration.load_prp(args.id)
        if prp:
            result = await integration.validate_prp(prp)
            print(json.dumps(result, indent=2, default=str))
        else:
            print(f"Error: PRP {args.id} not found")
    
    elif args.action == "search":
        if not args.query:
            print("Error: --query required for search")
            return
            
        results = await integration.search_prps(args.query)
        print(json.dumps(results, indent=2, default=str))
    
    elif args.action == "load":
        if not args.id:
            print("Error: --id required for load")
            return
            
        prp = await integration.load_prp(args.id)
        if prp:
            if args.format == "markdown":
                print(integration.format_prp_markdown(prp))
            else:
                print(json.dumps(prp, indent=2, default=str))
        else:
            print(f"Error: PRP {args.id} not found")
    
    elif args.action == "update":
        if not args.id or not args.updates:
            print("Error: --id and --updates required for update")
            return
            
        try:
            updates = json.loads(args.updates)
            result = await integration.update_prp(args.id, updates)
            print(json.dumps(result, indent=2, default=str))
        except json.JSONDecodeError:
            print("Error: Invalid JSON in --updates")


if __name__ == "__main__":
    asyncio.run(main())