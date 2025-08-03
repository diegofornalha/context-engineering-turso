"""
Chat interface module for Turso Specialist Delegator.
Handles conversational interactions and provides guided assistance.
"""

from typing import Dict, List, Any, Optional
import json
from datetime import datetime


class ChatInterface:
    """Handles conversational interactions with users"""
    
    def __init__(self, delegator):
        self.delegator = delegator
        self.conversation_history = []
        self.context_window = 5  # Keep last 5 interactions for context
        
    async def process_chat(self, message: str) -> Dict[str, Any]:
        """Process chat message and provide appropriate response"""
        # Add to history
        self.conversation_history.append({
            "timestamp": datetime.now().isoformat(),
            "user": message
        })
        
        # Determine response strategy
        response_data = await self._generate_response(message)
        
        # Add response to history
        self.conversation_history.append({
            "timestamp": datetime.now().isoformat(),
            "assistant": response_data
        })
        
        # Maintain context window
        if len(self.conversation_history) > self.context_window * 2:
            self.conversation_history = self.conversation_history[-(self.context_window * 2):]
            
        return response_data
    
    async def _generate_response(self, message: str) -> Dict[str, Any]:
        """Generate appropriate response based on message content"""
        message_lower = message.lower()
        
        # Greeting handling
        if any(greeting in message_lower for greeting in ["hello", "hi", "olá", "oi"]):
            return self._greeting_response()
            
        # Help requests
        if any(help_word in message_lower for help_word in ["help", "ajuda", "how to", "como"]):
            return self._help_response(message)
            
        # Status requests
        if any(status_word in message_lower for status_word in ["status", "info", "about"]):
            return self._status_response()
            
        # MCP tool questions
        if "mcp" in message_lower or "tool" in message_lower:
            return self._mcp_guidance(message)
            
        # Database operations
        if any(db_word in message_lower for db_word in ["create", "query", "insert", "select", "update"]):
            return self._database_operation_guidance(message)
            
        # Performance questions
        if any(perf_word in message_lower for perf_word in ["slow", "performance", "optimize", "fast"]):
            return self._performance_guidance(message)
            
        # Default expert response
        return self._expert_analysis(message)
    
    def _greeting_response(self) -> Dict[str, Any]:
        """Generate greeting response"""
        return {
            "type": "greeting",
            "message": "👋 Hello! I'm your Turso Database Expert Assistant.",
            "suggestions": [
                "I can help you troubleshoot Turso issues",
                "Ask me about best practices",
                "Get guidance on query optimization",
                "Learn about Turso features"
            ],
            "quick_actions": [
                "Type 'help' for detailed assistance",
                "Describe any error you're facing",
                "Ask about specific features"
            ]
        }
    
    def _help_response(self, message: str) -> Dict[str, Any]:
        """Generate contextual help response"""
        help_topics = {
            "connection": {
                "title": "Connection Help",
                "mcp_tools": [
                    "mcp_turso_validate_auth() - Check authentication",
                    "mcp_turso_test_connection() - Test database connection",
                    "mcp_turso_list_databases() - List available databases"
                ],
                "tips": [
                    "Ensure your auth token is valid",
                    "Check network connectivity",
                    "Verify database exists"
                ]
            },
            "query": {
                "title": "Query Help",
                "mcp_tools": [
                    "mcp_turso_execute_query() - Execute SQL queries",
                    "mcp_turso_execute_read_only_query() - Safe read queries",
                    "mcp_turso_validate_query() - Validate SQL syntax"
                ],
                "tips": [
                    "Use prepared statements for security",
                    "Add indexes for WHERE clauses",
                    "Use EXPLAIN for optimization"
                ]
            },
            "performance": {
                "title": "Performance Help",
                "mcp_tools": [
                    "mcp_turso_get_database_stats() - Database statistics",
                    "mcp_turso_analyze_query() - Query analysis",
                    "mcp_turso_get_usage() - Resource usage"
                ],
                "tips": [
                    "Monitor slow queries",
                    "Optimize indexes",
                    "Use connection pooling"
                ]
            }
        }
        
        # Determine which help topic
        topic = "general"
        for key in help_topics:
            if key in message.lower():
                topic = key
                break
                
        if topic != "general":
            return help_topics[topic]
        else:
            return {
                "type": "help",
                "message": "Here's how I can help you:",
                "categories": list(help_topics.keys()),
                "usage": "Ask about: connection issues, query help, or performance optimization",
                "example_questions": [
                    "How do I connect to my database?",
                    "Why is my query slow?",
                    "How to create indexes?",
                    "Best practices for Turso?"
                ]
            }
    
    def _status_response(self) -> Dict[str, Any]:
        """Generate status response"""
        status = self.delegator.get_status()
        return {
            "type": "status",
            "agent_status": status,
            "capabilities": [
                "Error diagnosis and troubleshooting",
                "Query optimization recommendations",
                "Best practices guidance",
                "Feature explanations",
                "MCP tool recommendations"
            ],
            "delegation_principle": "100% operations delegated to MCP tools"
        }
    
    def _mcp_guidance(self, message: str) -> Dict[str, Any]:
        """Provide MCP tool guidance"""
        return {
            "type": "mcp_guidance",
            "principle": "All database operations are delegated to MCP tools",
            "common_tools": {
                "Database Management": [
                    "mcp_turso_list_databases()",
                    "mcp_turso_create_database(name='mydb')",
                    "mcp_turso_delete_database(name='mydb')"
                ],
                "Query Execution": [
                    "mcp_turso_execute_query(database='mydb', query='SELECT...')",
                    "mcp_turso_execute_read_only_query(database='mydb', query='SELECT...')"
                ],
                "Authentication": [
                    "mcp_turso_validate_auth()",
                    "mcp_turso_rotate_auth_token()"
                ],
                "Monitoring": [
                    "mcp_turso_get_usage()",
                    "mcp_turso_get_database_stats(database='mydb')"
                ]
            },
            "recommendation": "Always use MCP tools for reliability and security"
        }
    
    def _database_operation_guidance(self, message: str) -> Dict[str, Any]:
        """Provide database operation guidance"""
        operation_guides = {
            "create": {
                "mcp_tool": "mcp_turso_create_database",
                "example": "mcp_turso_create_database(name='myapp', location='iad')",
                "tips": ["Choose location close to users", "Use descriptive names"]
            },
            "query": {
                "mcp_tool": "mcp_turso_execute_query",
                "example": "mcp_turso_execute_query(database='mydb', query='SELECT * FROM users LIMIT 10')",
                "tips": ["Always use LIMIT for large tables", "Use parameterized queries"]
            },
            "insert": {
                "mcp_tool": "mcp_turso_execute_query",
                "example": "mcp_turso_execute_query(database='mydb', query='INSERT INTO users (name) VALUES (?)', params=['John'])",
                "tips": ["Use transactions for bulk inserts", "Validate data before inserting"]
            }
        }
        
        # Find matching operation
        for op, guide in operation_guides.items():
            if op in message.lower():
                return {
                    "type": "operation_guide",
                    "operation": op,
                    "guidance": guide,
                    "best_practices": self.delegator.expertise.get_best_practices("query_optimization")
                }
                
        return {
            "type": "operation_guide",
            "message": "Please specify the operation type",
            "available_operations": list(operation_guides.keys())
        }
    
    def _performance_guidance(self, message: str) -> Dict[str, Any]:
        """Provide performance optimization guidance"""
        return {
            "type": "performance_guide",
            "analysis_steps": [
                "1. Identify slow queries with EXPLAIN",
                "2. Check for missing indexes",
                "3. Analyze query patterns",
                "4. Monitor resource usage"
            ],
            "mcp_tools": [
                "mcp_turso_execute_read_only_query(query='EXPLAIN QUERY PLAN...')",
                "mcp_turso_analyze_query(query='...')",
                "mcp_turso_get_database_stats()",
                "mcp_turso_suggest_indexes(table='...')"
            ],
            "optimization_tips": self.delegator.expertise.get_best_practices("query_optimization")
        }
    
    def _expert_analysis(self, message: str) -> Dict[str, Any]:
        """Provide expert analysis for general queries"""
        return {
            "type": "expert_analysis",
            "analysis": f"Based on your query about '{message[:50]}...'",
            "recommendations": [
                "Use MCP tools for all database operations",
                "Follow Turso best practices",
                "Monitor performance regularly",
                "Implement proper error handling"
            ],
            "next_steps": [
                "Would you like specific MCP tool recommendations?",
                "Need help with error troubleshooting?",
                "Want to see best practices for your use case?"
            ],
            "mcp_suggestion": "Start with mcp_turso_list_databases() to explore available resources"
        }
    
    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get summary of recent conversation"""
        return {
            "total_interactions": len(self.conversation_history) // 2,
            "recent_topics": self._extract_topics(),
            "conversation_window": self.conversation_history[-self.context_window:]
        }
    
    def _extract_topics(self) -> List[str]:
        """Extract main topics from conversation history"""
        topics = []
        topic_keywords = {
            "connection": ["connect", "auth", "token"],
            "performance": ["slow", "optimize", "fast"],
            "errors": ["error", "fail", "issue"],
            "queries": ["select", "insert", "query"],
            "features": ["feature", "capability", "function"]
        }
        
        for entry in self.conversation_history:
            if "user" in entry:
                message_lower = entry["user"].lower()
                for topic, keywords in topic_keywords.items():
                    if any(keyword in message_lower for keyword in keywords):
                        if topic not in topics:
                            topics.append(topic)
                            
        return topics