"""
Analysis module for Turso Specialist Delegator.
Contains all analysis and troubleshooting functionality.
"""

from typing import Dict, List, Any, Optional
import json
from datetime import datetime


class TursoAnalyzer:
    """Handles all Turso analysis and troubleshooting logic"""
    
    def __init__(self, prp_context: Dict[str, Any]):
        self.prp_context = prp_context
        self.analysis_history = []
        
    async def analyze_error(self, error_message: str) -> Dict[str, Any]:
        """Analyze Turso errors and provide solutions"""
        analysis = {
            "error": error_message,
            "timestamp": datetime.now().isoformat(),
            "possible_causes": [],
            "solutions": [],
            "mcp_tools": []
        }
        
        # Database connection errors
        if "connection" in error_message.lower() or "connect" in error_message.lower():
            analysis["possible_causes"] = [
                "Token de autenticação inválido ou expirado",
                "URL do banco de dados incorreta",
                "Problemas de rede ou firewall",
                "Banco de dados não existe ou foi removido"
            ]
            analysis["solutions"] = [
                "Verificar token com: mcp_turso_validate_auth()",
                "Listar bancos disponíveis: mcp_turso_list_databases()",
                "Verificar conectividade: mcp_turso_test_connection()",
                "Regenerar token se necessário"
            ]
            analysis["mcp_tools"] = [
                "mcp_turso_validate_auth",
                "mcp_turso_list_databases",
                "mcp_turso_test_connection"
            ]
            
        # SQL syntax errors
        elif "sql" in error_message.lower() or "syntax" in error_message.lower():
            analysis["possible_causes"] = [
                "Sintaxe SQL incorreta para SQLite",
                "Uso de features não suportadas pelo Turso",
                "Problemas com caracteres especiais",
                "Tipos de dados incompatíveis"
            ]
            analysis["solutions"] = [
                "Validar sintaxe SQLite",
                "Usar mcp_turso_execute_read_only_query() para testes",
                "Verificar documentação Turso para limitações",
                "Escapar strings corretamente"
            ]
            analysis["mcp_tools"] = [
                "mcp_turso_execute_read_only_query",
                "mcp_turso_validate_query"
            ]
            
        # Permission errors
        elif "permission" in error_message.lower() or "denied" in error_message.lower():
            analysis["possible_causes"] = [
                "Token sem permissões adequadas",
                "Operação não permitida no plano atual",
                "Tentativa de modificar banco read-only",
                "Limite de quota excedido"
            ]
            analysis["solutions"] = [
                "Verificar permissões do token",
                "Checar limites do plano: mcp_turso_get_usage()",
                "Usar token com permissões adequadas",
                "Considerar upgrade do plano se necessário"
            ]
            analysis["mcp_tools"] = [
                "mcp_turso_get_usage",
                "mcp_turso_list_databases",
                "mcp_turso_validate_auth"
            ]
            
        self.analysis_history.append(analysis)
        return analysis
    
    async def optimize_query(self, query: str) -> Dict[str, Any]:
        """Provide query optimization suggestions"""
        suggestions = {
            "original_query": query,
            "optimizations": [],
            "best_practices": [],
            "mcp_tools": ["mcp_turso_execute_read_only_query"]
        }
        
        # Index suggestions
        if "where" in query.lower() and "index" not in query.lower():
            suggestions["optimizations"].append(
                "Considere adicionar índices nas colunas usadas em WHERE"
            )
            
        # Join optimization
        if "join" in query.lower():
            suggestions["optimizations"].append(
                "Verifique se as colunas de JOIN têm índices"
            )
            suggestions["best_practices"].append(
                "Use EXPLAIN QUERY PLAN para analisar performance"
            )
            
        # Limit suggestions
        if "select *" in query.lower() and "limit" not in query.lower():
            suggestions["optimizations"].append(
                "Adicione LIMIT para queries grandes"
            )
            suggestions["best_practices"].append(
                "Evite SELECT * em produção"
            )
            
        return suggestions
    
    def get_troubleshooting_guide(self, issue_type: str) -> Dict[str, Any]:
        """Get comprehensive troubleshooting guide for specific issues"""
        guides = {
            "connection": {
                "title": "Guia de Troubleshooting: Conexão",
                "steps": [
                    "1. Verificar token de autenticação",
                    "2. Validar URL do banco de dados",
                    "3. Testar conectividade de rede",
                    "4. Verificar se o banco existe",
                    "5. Checar limites de rate limiting"
                ],
                "mcp_sequence": [
                    "mcp_turso_validate_auth()",
                    "mcp_turso_list_databases()",
                    "mcp_turso_test_connection(database='seu-banco')"
                ]
            },
            "performance": {
                "title": "Guia de Troubleshooting: Performance",
                "steps": [
                    "1. Analisar queries com EXPLAIN",
                    "2. Verificar índices existentes",
                    "3. Otimizar queries complexas",
                    "4. Considerar cache de resultados",
                    "5. Monitorar uso de recursos"
                ],
                "mcp_sequence": [
                    "mcp_turso_execute_read_only_query(query='EXPLAIN QUERY PLAN ...')",
                    "mcp_turso_get_database_stats()",
                    "mcp_turso_get_usage()"
                ]
            },
            "migration": {
                "title": "Guia de Troubleshooting: Migração",
                "steps": [
                    "1. Fazer backup dos dados atuais",
                    "2. Validar schema de destino",
                    "3. Testar migração em ambiente de dev",
                    "4. Executar migração em lotes",
                    "5. Validar integridade dos dados"
                ],
                "mcp_sequence": [
                    "mcp_turso_create_backup()",
                    "mcp_turso_validate_schema()",
                    "mcp_turso_execute_batch()"
                ]
            }
        }
        
        return guides.get(issue_type, {
            "title": "Guia Genérico",
            "steps": ["Use mcp_turso_* tools para investigar"],
            "mcp_sequence": ["mcp_turso_list_databases()"]
        })
    
    def generate_analysis_report(self) -> Dict[str, Any]:
        """Generate comprehensive analysis report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "total_analyses": len(self.analysis_history),
            "recent_issues": self.analysis_history[-5:] if self.analysis_history else [],
            "common_patterns": self._identify_patterns(),
            "recommendations": self._generate_recommendations()
        }
    
    def _identify_patterns(self) -> List[str]:
        """Identify common patterns in analysis history"""
        if not self.analysis_history:
            return []
            
        patterns = []
        error_types = {}
        
        for analysis in self.analysis_history:
            error = analysis.get("error", "")
            for key in ["connection", "sql", "permission", "timeout"]:
                if key in error.lower():
                    error_types[key] = error_types.get(key, 0) + 1
                    
        for error_type, count in error_types.items():
            if count > 2:
                patterns.append(f"Frequente: erros de {error_type} ({count} ocorrências)")
                
        return patterns
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations based on analysis history"""
        recommendations = []
        
        if len(self.analysis_history) > 10:
            recommendations.append(
                "Considere implementar monitoramento proativo com mcp_turso_monitor()"
            )
            
        # Check for repeated errors
        if self._identify_patterns():
            recommendations.append(
                "Padrões de erro identificados - revise configurações base"
            )
            
        return recommendations