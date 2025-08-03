"""
Unit tests for the base agent framework.
Tests common functionality to ensure high code coverage.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from common.base_agent import BaseAgent, AgentConfig
from common.testing import AsyncTestCase, AgentTestMixin
import asyncio


class ConcreteAgent(BaseAgent):
    """Concrete implementation for testing"""
    
    async def process(self, input_data: str) -> str:
        """Simple processing - reverse the input"""
        if input_data == "error":
            raise ValueError("Test error")
        return input_data[::-1]
    
    def _validate_input(self, input_data) -> bool:
        """Validate input is a string"""
        return isinstance(input_data, str) and len(input_data) > 0


class TestBaseAgent(AsyncTestCase):
    """Test cases for BaseAgent"""
    
    def setUp(self):
        """Set up test fixtures"""
        super().setUp()
        self.config = AgentConfig(
            name="test-agent",
            version="1.0.0",
            description="Test agent for unit testing"
        )
        self.agent = ConcreteAgent(self.config)
    
    def test_agent_initialization(self):
        """Test agent initializes correctly"""
        self.assertEqual(self.agent.config.name, "test-agent")
        self.assertEqual(self.agent.config.version, "1.0.0")
        self.assertIsNotNone(self.agent.logger)
        self.assertEqual(self.agent.metrics["requests_processed"], 0)
        self.assertEqual(self.agent.metrics["errors"], 0)
        
    def test_successful_execution(self):
        """Test successful agent execution"""
        result = self.async_test(self.agent.execute("hello"))
        
        self.assertTrue(result["success"])
        self.assertEqual(result["result"], "olleh")
        self.assertEqual(result["agent"], "test-agent")
        self.assertIn("timestamp", result)
        
        # Check metrics updated
        self.assertEqual(self.agent.metrics["requests_processed"], 1)
        self.assertEqual(self.agent.metrics["errors"], 0)
        self.assertEqual(self.agent.metrics["success_rate"], 100.0)
        
    def test_error_handling(self):
        """Test agent error handling"""
        result = self.async_test(self.agent.execute("error"))
        
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Test error")
        self.assertEqual(result["agent"], "test-agent")
        
        # Check metrics updated
        self.assertEqual(self.agent.metrics["requests_processed"], 1)
        self.assertEqual(self.agent.metrics["errors"], 1)
        self.assertEqual(self.agent.metrics["success_rate"], 0.0)
        
    def test_invalid_input_validation(self):
        """Test input validation"""
        result = self.async_test(self.agent.execute(""))
        
        self.assertFalse(result["success"])
        self.assertIn("Invalid input", result["error"])
        
    def test_retry_logic(self):
        """Test retry logic with temporary failures"""
        
        class FlakeyAgent(BaseAgent):
            def __init__(self, config):
                super().__init__(config)
                self.attempt = 0
                
            async def process(self, input_data):
                self.attempt += 1
                if self.attempt < 3:
                    raise ConnectionError("Temporary failure")
                return "success"
                
        agent = FlakeyAgent(AgentConfig(name="flakey", max_retries=3))
        result = self.async_test(agent.execute("test"))
        
        self.assertTrue(result["success"])
        self.assertEqual(result["result"], "success")
        self.assertEqual(agent.attempt, 3)
        
    def test_retry_exhaustion(self):
        """Test retry exhaustion"""
        
        class AlwaysFailAgent(BaseAgent):
            async def process(self, input_data):
                raise ConnectionError("Permanent failure")
                
        agent = AlwaysFailAgent(AgentConfig(name="fail", max_retries=2))
        result = self.async_test(agent.execute("test"))
        
        self.assertFalse(result["success"])
        self.assertEqual(result["error"], "Permanent failure")
        
    def test_health_check(self):
        """Test health check endpoint"""
        health = self.agent.health_check()
        
        self.assertEqual(health["status"], "healthy")
        self.assertEqual(health["agent"], "test-agent")
        self.assertEqual(health["version"], "1.0.0")
        self.assertIn("metrics", health)
        
    def test_get_metrics(self):
        """Test metrics retrieval"""
        # Execute some requests
        self.async_test(self.agent.execute("test"))
        self.async_test(self.agent.execute("error"))
        self.async_test(self.agent.execute("hello"))
        
        metrics = self.agent.get_metrics()
        
        self.assertEqual(metrics["requests_processed"], 3)
        self.assertEqual(metrics["errors"], 1)
        self.assertAlmostEqual(metrics["success_rate"], 66.67, places=1)
        self.assertIn("uptime_seconds", metrics)
        self.assertGreater(metrics["uptime_seconds"], 0)


class TestAgentConfig(unittest.TestCase):
    """Test cases for AgentConfig"""
    
    def test_default_values(self):
        """Test default configuration values"""
        config = AgentConfig(name="test")
        
        self.assertEqual(config.name, "test")
        self.assertEqual(config.version, "1.0.0")
        self.assertEqual(config.description, "")
        self.assertEqual(config.max_retries, 3)
        self.assertEqual(config.timeout, 300)
        self.assertEqual(config.log_level, "INFO")
        
    def test_custom_values(self):
        """Test custom configuration values"""
        config = AgentConfig(
            name="custom",
            version="2.0.0",
            description="Custom agent",
            max_retries=5,
            timeout=600,
            log_level="DEBUG"
        )
        
        self.assertEqual(config.name, "custom")
        self.assertEqual(config.version, "2.0.0")
        self.assertEqual(config.description, "Custom agent")
        self.assertEqual(config.max_retries, 5)
        self.assertEqual(config.timeout, 600)
        self.assertEqual(config.log_level, "DEBUG")


if __name__ == "__main__":
    unittest.main()