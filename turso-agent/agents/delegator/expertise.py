"""
Expertise module for Turso Specialist Delegator.
Contains specialized knowledge and best practices for Turso.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime


class TursoExpertise:
    """Encapsulates Turso-specific expertise and best practices"""
    
    def __init__(self):
        self.knowledge_base = self._build_knowledge_base()
        
    def _build_knowledge_base(self) -> Dict[str, Any]:
        """Build comprehensive Turso knowledge base"""
        return {
            "features": {
                "edge_computing": {
                    "description": "Turso roda próximo aos usuários globalmente",
                    "benefits": ["Baixa latência", "Alta disponibilidade", "Distribuição global"],
                    "use_cases": ["Apps multi-região", "Real-time apps", "IoT"]
                },
                "libsql": {
                    "description": "Fork do SQLite otimizado para edge",
                    "features": ["Compatível com SQLite", "Replicação nativa", "HTTP API"],
                    "limitations": ["Sem stored procedures", "Transações limitadas"]
                },
                "replication": {
                    "description": "Replicação automática entre regiões",
                    "types": ["Read replicas", "Multi-master (beta)"],
                    "considerations": ["Eventual consistency", "Conflitos de escrita"]
                }
            },
            "best_practices": {
                "schema_design": [
                    "Use INTEGER PRIMARY KEY para auto-increment",
                    "Evite BLOB grandes (use object storage)",
                    "Índices em colunas de WHERE/JOIN",
                    "Normalize mas não exagere",
                    "Use PRAGMA para otimizações"
                ],
                "query_optimization": [
                    "Use prepared statements",
                    "Batch operations quando possível",
                    "EXPLAIN QUERY PLAN é seu amigo",
                    "Evite SELECT * em produção",
                    "Use índices covering quando apropriado"
                ],
                "connection_management": [
                    "Reutilize conexões (connection pooling)",
                    "Configure timeouts apropriados",
                    "Handle reconnection gracefully",
                    "Monitor connection health"
                ]
            },
            "common_patterns": {
                "multi_tenant": {
                    "approach": "Database per tenant ou schema isolation",
                    "considerations": ["Isolamento de dados", "Scaling", "Backup strategy"]
                },
                "event_sourcing": {
                    "approach": "Append-only tables com snapshots",
                    "benefits": ["Audit trail completo", "Time travel queries"]
                },
                "caching": {
                    "strategies": ["Edge caching", "Application-level cache", "Query result cache"],
                    "ttl_recommendations": {"Static data": 3600, "User data": 300, "Real-time": 0}
                }
            },
            "troubleshooting": {
                "slow_queries": {
                    "diagnosis": ["EXPLAIN QUERY PLAN", "Check indexes", "Analyze table stats"],
                    "solutions": ["Add indexes", "Rewrite query", "Denormalize if needed"]
                },
                "connection_issues": {
                    "common_causes": ["Token expired", "Network issues", "Rate limiting"],
                    "debugging": ["Check auth", "Verify endpoints", "Monitor logs"]
                },
                "data_inconsistency": {
                    "causes": ["Replication lag", "Concurrent writes", "Transaction issues"],
                    "prevention": ["Use transactions", "Implement idempotency", "Add constraints"]
                }
            }
        }
    
    def get_feature_guide(self, feature: str) -> Dict[str, Any]:
        """Get detailed guide for specific Turso feature"""
        feature_data = self.knowledge_base["features"].get(feature, {})
        
        if not feature_data:
            return {
                "error": f"Feature '{feature}' not found",
                "available_features": list(self.knowledge_base["features"].keys())
            }
            
        return {
            "feature": feature,
            "guide": feature_data,
            "related_mcp_tools": self._get_related_mcp_tools(feature),
            "examples": self._get_feature_examples(feature)
        }
    
    def get_best_practices(self, category: str) -> List[str]:
        """Get best practices for specific category"""
        return self.knowledge_base["best_practices"].get(category, [])
    
    def recommend_pattern(self, use_case: str) -> Dict[str, Any]:
        """Recommend architectural pattern for use case"""
        patterns = self.knowledge_base["common_patterns"]
        
        # Pattern matching based on use case
        if "multi" in use_case.lower() and "tenant" in use_case.lower():
            return patterns.get("multi_tenant", {})
        elif "event" in use_case.lower() or "audit" in use_case.lower():
            return patterns.get("event_sourcing", {})
        elif "cache" in use_case.lower() or "performance" in use_case.lower():
            return patterns.get("caching", {})
            
        return {
            "message": "No specific pattern found",
            "suggestion": "Describe your use case for better recommendations",
            "available_patterns": list(patterns.keys())
        }
    
    def diagnose_issue(self, symptoms: List[str]) -> Dict[str, Any]:
        """Diagnose issues based on symptoms"""
        diagnosis = {
            "symptoms": symptoms,
            "possible_issues": [],
            "recommended_actions": [],
            "mcp_tools": []
        }
        
        troubleshooting = self.knowledge_base["troubleshooting"]
        
        for symptom in symptoms:
            symptom_lower = symptom.lower()
            
            if any(word in symptom_lower for word in ["slow", "performance", "timeout"]):
                issue = troubleshooting["slow_queries"]
                diagnosis["possible_issues"].append("Query performance issue")
                diagnosis["recommended_actions"].extend(issue["diagnosis"])
                diagnosis["mcp_tools"].append("mcp_turso_execute_read_only_query")
                
            elif any(word in symptom_lower for word in ["connect", "auth", "token"]):
                issue = troubleshooting["connection_issues"]
                diagnosis["possible_issues"].append("Connection/Authentication issue")
                diagnosis["recommended_actions"].extend(issue["debugging"])
                diagnosis["mcp_tools"].extend([
                    "mcp_turso_validate_auth",
                    "mcp_turso_test_connection"
                ])
                
            elif any(word in symptom_lower for word in ["inconsistent", "conflict", "sync"]):
                issue = troubleshooting["data_inconsistency"]
                diagnosis["possible_issues"].append("Data consistency issue")
                diagnosis["recommended_actions"].extend(issue["prevention"])
                diagnosis["mcp_tools"].append("mcp_turso_check_replication_status")
                
        return diagnosis
    
    def _get_related_mcp_tools(self, feature: str) -> List[str]:
        """Get MCP tools related to specific feature"""
        tool_mapping = {
            "edge_computing": [
                "mcp_turso_list_locations",
                "mcp_turso_create_database",
                "mcp_turso_get_database_info"
            ],
            "libsql": [
                "mcp_turso_execute_query",
                "mcp_turso_execute_read_only_query",
                "mcp_turso_validate_query"
            ],
            "replication": [
                "mcp_turso_check_replication_status",
                "mcp_turso_list_replicas",
                "mcp_turso_create_replica"
            ]
        }
        
        return tool_mapping.get(feature, ["mcp_turso_list_databases"])
    
    def _get_feature_examples(self, feature: str) -> List[Dict[str, str]]:
        """Get usage examples for specific feature"""
        examples = {
            "edge_computing": [
                {
                    "description": "Create multi-region database",
                    "code": "mcp_turso_create_database(name='my-app', location='iad')"
                },
                {
                    "description": "List available locations",
                    "code": "mcp_turso_list_locations()"
                }
            ],
            "libsql": [
                {
                    "description": "Execute SQL query",
                    "code": "mcp_turso_execute_query(database='my-db', query='SELECT * FROM users LIMIT 10')"
                },
                {
                    "description": "Create table with proper types",
                    "code": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)"
                }
            ],
            "replication": [
                {
                    "description": "Check replication status",
                    "code": "mcp_turso_check_replication_status(database='my-db')"
                },
                {
                    "description": "Create read replica",
                    "code": "mcp_turso_create_replica(database='my-db', location='fra')"
                }
            ]
        }
        
        return examples.get(feature, [])