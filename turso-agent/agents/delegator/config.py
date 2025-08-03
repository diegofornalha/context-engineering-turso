"""
Configuration module for Turso Specialist Delegator.
Contains all configuration and settings related functionality.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import json
import sqlite3
from pathlib import Path


@dataclass
class DelegatorConfig:
    """Configuration for Turso Specialist Delegator"""
    organization: str = "diegofornalha"
    default_database: str = "context-memory"
    prp_id: int = 6
    max_retries: int = 3
    timeout: int = 300
    

class PRPContextLoader:
    """Loads and manages PRP context for the delegator"""
    
    @staticmethod
    def load_prp_context(prp_id: int) -> Dict[str, Any]:
        """Load PRP context from database"""
        try:
            db_path = Path(__file__).parent.parent.parent.parent / "context-memory.db"
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT description, objective, context_data, implementation_details, validation_gates
                FROM prps WHERE id = ?
            ''', (prp_id,))
            
            prp_data = cursor.fetchone()
            conn.close()
            
            if prp_data:
                return {
                    'title': 'Agente Especialista em Turso Database - Delegador Inteligente para MCP',
                    'description': prp_data[0],
                    'objective': prp_data[1],
                    'context_data': json.loads(prp_data[2]) if prp_data[2] else {},
                    'implementation_details': json.loads(prp_data[3]) if prp_data[3] else {},
                    'validation_gates': json.loads(prp_data[4]) if prp_data[4] else [],
                    'status': 'active',
                }
                
        except Exception as e:
            print(f"⚠️ Aviso: Não foi possível carregar PRP: {e}")
            
        return PRPContextLoader._get_default_context()
    
    @staticmethod
    def _get_default_context() -> Dict[str, Any]:
        """Get default PRP context when database is not available"""
        return {
            'title': 'Agente Especialista em Turso Database - Delegador Inteligente para MCP',
            'description': 'Agente que delega 100% das operações para MCP',
            'objective': 'Fornecer expertise em Turso sem implementar ferramentas próprias',
            'context_data': {
                'author': 'Diego Fornalha',
                'version': '2.0.0',
                'framework': 'Delegação MCP'
            },
            'implementation_details': {
                'architecture': 'Delegação completa para MCP',
                'pattern': 'Expert Advisor',
                'focus': 'Análise e troubleshooting'
            },
            'validation_gates': [
                'Nunca implementar ferramentas próprias',
                'Sempre delegar para MCP',
                'Focar em análise inteligente'
            ],
            'status': 'active'
        }