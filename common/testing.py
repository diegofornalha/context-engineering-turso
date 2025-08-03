"""
Common testing utilities and base test classes.
Provides shared testing functionality to improve test coverage.
"""

import unittest
from unittest.mock import Mock, AsyncMock, patch
from typing import Any, Dict, List, Optional, Type
import asyncio
import json
from datetime import datetime


class AsyncTestCase(unittest.TestCase):
    """Base class for async test cases"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
    def tearDown(self):
        """Clean up after tests"""
        self.loop.close()
        
    def async_test(self, coro):
        """Helper to run async tests"""
        return self.loop.run_until_complete(coro)


class MockMCPTool:
    """Mock MCP tool for testing"""
    
    def __init__(self, name: str, return_value: Any = None):
        self.name = name
        self.return_value = return_value or {"success": True}
        self.call_count = 0
        self.call_args = []
        
    async def __call__(self, **kwargs):
        """Mock tool execution"""
        self.call_count += 1
        self.call_args.append(kwargs)
        return self.return_value
    
    def assert_called_with(self, **kwargs):
        """Assert tool was called with specific arguments"""
        if not self.call_args:
            raise AssertionError(f"{self.name} was not called")
            
        last_call = self.call_args[-1]
        for key, value in kwargs.items():
            if key not in last_call or last_call[key] != value:
                raise AssertionError(
                    f"{self.name} expected {key}={value}, got {key}={last_call.get(key)}"
                )
    
    def assert_called_times(self, times: int):
        """Assert tool was called specific number of times"""
        if self.call_count != times:
            raise AssertionError(
                f"{self.name} expected {times} calls, got {self.call_count}"
            )


class TestDataBuilder:
    """Builder pattern for creating test data"""
    
    @staticmethod
    def create_agent_config(**kwargs) -> Dict[str, Any]:
        """Create test agent configuration"""
        defaults = {
            "name": "test-agent",
            "version": "1.0.0",
            "description": "Test agent",
            "max_retries": 3,
            "timeout": 300,
            "log_level": "INFO"
        }
        defaults.update(kwargs)
        return defaults
    
    @staticmethod
    def create_prp_data(**kwargs) -> Dict[str, Any]:
        """Create test PRP data"""
        defaults = {
            "id": "test-prp-1",
            "title": "Test PRP",
            "content": "Test content",
            "purpose": "Testing",
            "context": {"test": True},
            "implementation": {},
            "created_at": datetime.now().isoformat(),
            "agent": "test-agent"
        }
        defaults.update(kwargs)
        return defaults
    
    @staticmethod
    def create_database_row(**kwargs) -> Dict[str, Any]:
        """Create test database row"""
        defaults = {
            "id": "test-1",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        defaults.update(kwargs)
        return defaults


class AgentTestMixin:
    """Mixin for testing agents"""
    
    def create_mock_agent(self, agent_class: Type, **config_overrides):
        """Create a mock agent instance"""
        config = TestDataBuilder.create_agent_config(**config_overrides)
        return agent_class(config)
    
    async def test_agent_execution(self, agent, input_data, expected_result):
        """Test agent execution flow"""
        result = await agent.execute(input_data)
        
        assert result["success"] == True
        assert result["agent"] == agent.config.name
        assert "result" in result
        assert result["result"] == expected_result
        
    async def test_agent_error_handling(self, agent, invalid_input):
        """Test agent error handling"""
        result = await agent.execute(invalid_input)
        
        assert result["success"] == False
        assert "error" in result
        assert result["agent"] == agent.config.name
        
    def assert_metrics_updated(self, agent, requests=1, errors=0):
        """Assert agent metrics were updated correctly"""
        metrics = agent.get_metrics()
        
        assert metrics["requests_processed"] == requests
        assert metrics["errors"] == errors
        if requests > 0:
            expected_rate = ((requests - errors) / requests) * 100
            assert metrics["success_rate"] == expected_rate


class IntegrationTestBase(AsyncTestCase):
    """Base class for integration tests"""
    
    def setUp(self):
        """Set up integration test environment"""
        super().setUp()
        
        # Mock MCP tools
        self.mock_mcp_tools = {
            "mcp_turso_execute_query": MockMCPTool("mcp_turso_execute_query"),
            "mcp_turso_execute_read_only_query": MockMCPTool(
                "mcp_turso_execute_read_only_query",
                {"rows": [], "columns": []}
            ),
            "mcp_claude_flow_swarm_init": MockMCPTool(
                "mcp_claude_flow_swarm_init",
                {"swarmId": "test-swarm", "success": True}
            ),
            "mcp_claude_flow_agent_spawn": MockMCPTool(
                "mcp_claude_flow_agent_spawn",
                {"agentId": "test-agent", "success": True}
            )
        }
        
        # Patch MCP tools
        self.patches = []
        for tool_name, mock_tool in self.mock_mcp_tools.items():
            patcher = patch(f"mcp_tools.{tool_name}", mock_tool)
            self.patches.append(patcher)
            patcher.start()
            
    def tearDown(self):
        """Clean up patches"""
        for patcher in self.patches:
            patcher.stop()
        super().tearDown()
        
    def get_mock_tool(self, name: str) -> MockMCPTool:
        """Get a mock MCP tool by name"""
        return self.mock_mcp_tools.get(name)


def create_test_suite(test_class: Type[unittest.TestCase]) -> unittest.TestSuite:
    """Create a test suite from a test class"""
    loader = unittest.TestLoader()
    return loader.loadTestsFromTestCase(test_class)


def run_tests(test_module_name: str):
    """Run tests for a specific module"""
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromName(test_module_name)
    runner = unittest.TextTestRunner(verbosity=2)
    return runner.run(suite)