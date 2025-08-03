"""
Core module for Turso Specialist Delegator.
Main agent implementation that coordinates all functionality.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import json

from .config import DelegatorConfig, PRPContextLoader
from .analysis import TursoAnalyzer
from .expertise import TursoExpertise
from .chat import ChatInterface


class TursoSpecialistDelegator:
    """
    Agente Especialista em Turso Database - Delegador Inteligente para MCP
    
    PRINCÍPIO: NÃO implementa tools próprias, delega 100% para MCP
    FOCUS: Análise inteligente, troubleshooting, expertise especializada
    """
    
    def __init__(self, settings=None):
        # Load configuration
        self.config = DelegatorConfig()
        self.settings = settings or {}
        
        # Load PRP context
        self.prp_context = PRPContextLoader.load_prp_context(self.config.prp_id)
        
        # Initialize components
        self.analyzer = TursoAnalyzer(self.prp_context)
        self.expertise = TursoExpertise()
        self.chat_interface = ChatInterface(self)
        
        # Track agent state
        self.start_time = datetime.now()
        self.interaction_count = 0
        self.last_analysis = None
        
    async def process_request(self, request: str) -> Dict[str, Any]:
        """Process user request and provide expert guidance"""
        self.interaction_count += 1
        
        response = {
            "timestamp": datetime.now().isoformat(),
            "request": request,
            "agent": "turso-specialist-delegator",
            "version": "2.0.0",
            "interaction": self.interaction_count
        }
        
        try:
            # Analyze request type
            request_type = self._classify_request(request)
            
            if request_type == "error_analysis":
                result = await self.analyzer.analyze_error(request)
                response["analysis"] = result
                response["type"] = "error_diagnosis"
                
            elif request_type == "feature_question":
                feature = self._extract_feature(request)
                result = self.expertise.get_feature_guide(feature)
                response["guide"] = result
                response["type"] = "feature_guide"
                
            elif request_type == "best_practice":
                category = self._extract_category(request)
                result = self.expertise.get_best_practices(category)
                response["practices"] = result
                response["type"] = "best_practices"
                
            elif request_type == "troubleshooting":
                symptoms = self._extract_symptoms(request)
                result = self.expertise.diagnose_issue(symptoms)
                response["diagnosis"] = result
                response["type"] = "troubleshooting"
                
            else:
                # General chat/help
                result = await self.chat_interface.process_chat(request)
                response["chat_response"] = result
                response["type"] = "general_assistance"
                
            self.last_analysis = response
            response["success"] = True
            
        except Exception as e:
            response["success"] = False
            response["error"] = str(e)
            response["suggestion"] = "Try rephrasing your question or check the logs"
            
        return response
    
    def _classify_request(self, request: str) -> str:
        """Classify the type of user request"""
        request_lower = request.lower()
        
        # Error analysis patterns
        if any(word in request_lower for word in ["error", "erro", "failed", "falhou"]):
            return "error_analysis"
            
        # Feature questions
        if any(word in request_lower for word in ["feature", "como funciona", "what is", "explain"]):
            return "feature_question"
            
        # Best practices
        if any(word in request_lower for word in ["best practice", "melhor prática", "recommend", "should i"]):
            return "best_practice"
            
        # Troubleshooting
        if any(word in request_lower for word in ["slow", "not working", "issue", "problem", "debug"]):
            return "troubleshooting"
            
        return "general"
    
    def _extract_feature(self, request: str) -> str:
        """Extract feature name from request"""
        features = ["edge_computing", "libsql", "replication", "auth", "migration"]
        request_lower = request.lower()
        
        for feature in features:
            if feature.replace("_", " ") in request_lower:
                return feature
                
        return "general"
    
    def _extract_category(self, request: str) -> str:
        """Extract best practice category from request"""
        categories = ["schema_design", "query_optimization", "connection_management"]
        request_lower = request.lower()
        
        for category in categories:
            if any(word in request_lower for word in category.split("_")):
                return category
                
        return "general"
    
    def _extract_symptoms(self, request: str) -> List[str]:
        """Extract symptoms from troubleshooting request"""
        symptoms = []
        request_lower = request.lower()
        
        symptom_keywords = {
            "slow": "Performance degradation",
            "timeout": "Operation timeouts",
            "connection": "Connection issues",
            "error": "Error messages",
            "inconsistent": "Data inconsistency",
            "auth": "Authentication problems"
        }
        
        for keyword, symptom in symptom_keywords.items():
            if keyword in request_lower:
                symptoms.append(symptom)
                
        return symptoms or ["General issue"]
    
    def get_status(self) -> Dict[str, Any]:
        """Get current agent status"""
        uptime = (datetime.now() - self.start_time).total_seconds()
        
        return {
            "agent": "turso-specialist-delegator",
            "version": "2.0.0",
            "status": "active",
            "uptime_seconds": uptime,
            "interactions": self.interaction_count,
            "prp_loaded": bool(self.prp_context),
            "components": {
                "analyzer": "active",
                "expertise": "active",
                "chat": "active"
            },
            "last_analysis": self.last_analysis
        }
    
    def get_help(self) -> str:
        """Get help information"""
        return """
🤖 Turso Specialist Delegator - Expert Help System

I can help you with:

1. **Error Analysis** 🔍
   - Diagnose Turso errors
   - Provide solutions using MCP tools
   - Troubleshooting guidance

2. **Feature Guidance** 📚
   - Explain Turso features
   - Best practices
   - Usage examples

3. **Query Optimization** ⚡
   - Analyze slow queries
   - Optimization suggestions
   - Index recommendations

4. **Architecture Patterns** 🏗️
   - Multi-tenant design
   - Event sourcing
   - Caching strategies

Just describe your issue or question, and I'll provide expert guidance
using the appropriate MCP tools!

Remember: I delegate all operations to MCP tools for maximum reliability.
"""
    
    async def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive activity report"""
        return {
            "report_date": datetime.now().isoformat(),
            "agent_info": self.get_status(),
            "analysis_summary": self.analyzer.generate_analysis_report(),
            "knowledge_areas": list(self.expertise.knowledge_base.keys()),
            "mcp_delegation": {
                "principle": "100% delegation to MCP tools",
                "no_direct_implementation": True,
                "focus": "Intelligence and expertise layer"
            }
        }