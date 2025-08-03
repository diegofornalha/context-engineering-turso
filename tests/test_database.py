"""
Unit tests for the database module.
Tests repository pattern and database utilities.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import unittest
from common.database import (
    DatabaseConfig, MCPDatabaseAdapter, BaseRepository,
    QueryBuilder, Repository
)
from common.testing import AsyncTestCase, TestDataBuilder
from typing import Dict, Any
from dataclasses import dataclass


@dataclass
class TestEntity:
    """Test entity for repository tests"""
    id: str
    name: str
    value: int
    

class TestEntityRepository(BaseRepository[TestEntity]):
    """Concrete repository for testing"""
    
    def _map_row_to_entity(self, row: Dict[str, Any]) -> TestEntity:
        """Map row to TestEntity"""
        return TestEntity(
            id=row["id"],
            name=row["name"],
            value=row["value"]
        )
    
    def _entity_to_dict(self, entity: TestEntity) -> Dict[str, Any]:
        """Convert TestEntity to dict"""
        return {
            "id": entity.id,
            "name": entity.name,
            "value": entity.value
        }


class TestDatabaseConfig(unittest.TestCase):
    """Test cases for DatabaseConfig"""
    
    def test_default_values(self):
        """Test default configuration"""
        config = DatabaseConfig(
            database_name="test-db",
            organization="test-org"
        )
        
        self.assertEqual(config.database_name, "test-db")
        self.assertEqual(config.organization, "test-org")
        self.assertIsNone(config.auth_token)
        self.assertEqual(config.api_url, "https://api.turso.tech/v1")
        
    def test_custom_values(self):
        """Test custom configuration"""
        config = DatabaseConfig(
            database_name="custom-db",
            organization="custom-org",
            auth_token="test-token",
            api_url="https://custom.api.com"
        )
        
        self.assertEqual(config.database_name, "custom-db")
        self.assertEqual(config.organization, "custom-org")
        self.assertEqual(config.auth_token, "test-token")
        self.assertEqual(config.api_url, "https://custom.api.com")


class TestMCPDatabaseAdapter(AsyncTestCase):
    """Test cases for MCPDatabaseAdapter"""
    
    def setUp(self):
        """Set up test fixtures"""
        super().setUp()
        self.config = DatabaseConfig(
            database_name="test-db",
            organization="test-org"
        )
        self.adapter = MCPDatabaseAdapter(self.config)
        
    def test_execute_query(self):
        """Test query execution"""
        result = self.async_test(
            self.adapter.execute_query("INSERT INTO test VALUES (?)", [1])
        )
        
        self.assertTrue(result["success"])
        self.assertIn("test-db", result["message"])
        self.assertEqual(result["query"], "INSERT INTO test VALUES (?)")
        self.assertEqual(result["params"], [1])
        
    def test_execute_read_query(self):
        """Test read query execution"""
        result = self.async_test(
            self.adapter.execute_read_query("SELECT * FROM test")
        )
        
        self.assertIsInstance(result, list)
        self.assertEqual(len(result), 0)  # Mock returns empty list


class TestBaseRepository(AsyncTestCase):
    """Test cases for BaseRepository"""
    
    def setUp(self):
        """Set up test fixtures"""
        super().setUp()
        config = DatabaseConfig("test-db", "test-org")
        self.adapter = MCPDatabaseAdapter(config)
        self.repository = TestEntityRepository(self.adapter, "test_entities")
        
        # Mock the adapter to return test data
        self.test_entity = TestEntity(id="1", name="Test", value=42)
        self.test_row = {
            "id": "1",
            "name": "Test",
            "value": 42,
            "created_at": "2025-01-01T00:00:00",
            "updated_at": "2025-01-01T00:00:00"
        }
        
    def test_find_by_id_found(self):
        """Test finding entity by ID when it exists"""
        # Mock adapter to return test data
        async def mock_read_query(query, params):
            if "WHERE id = ?" in query and params == ["1"]:
                return [self.test_row]
            return []
            
        self.adapter.execute_read_query = mock_read_query
        
        entity = self.async_test(self.repository.find_by_id("1"))
        
        self.assertIsNotNone(entity)
        self.assertEqual(entity.id, "1")
        self.assertEqual(entity.name, "Test")
        self.assertEqual(entity.value, 42)
        
    def test_find_by_id_not_found(self):
        """Test finding entity by ID when it doesn't exist"""
        entity = self.async_test(self.repository.find_by_id("999"))
        self.assertIsNone(entity)
        
    def test_find_all(self):
        """Test finding all entities"""
        # Mock adapter to return multiple rows
        async def mock_read_query(query, params):
            if "LIMIT ?" in query:
                return [
                    self.test_row,
                    {"id": "2", "name": "Test2", "value": 84}
                ]
            return []
            
        self.adapter.execute_read_query = mock_read_query
        
        entities = self.async_test(self.repository.find_all(limit=10))
        
        self.assertEqual(len(entities), 2)
        self.assertEqual(entities[0].id, "1")
        self.assertEqual(entities[1].id, "2")
        
    def test_save_new_entity(self):
        """Test saving a new entity"""
        # Mock exists to return False
        async def mock_read_query(query, params):
            if "COUNT(*)" in query:
                return [{"count": 0}]
            return []
            
        self.adapter.execute_read_query = mock_read_query
        
        # Track INSERT calls
        insert_called = False
        
        async def mock_execute_query(query, params):
            nonlocal insert_called
            if "INSERT INTO" in query:
                insert_called = True
            return {"success": True}
            
        self.adapter.execute_query = mock_execute_query
        
        saved = self.async_test(self.repository.save(self.test_entity))
        
        self.assertEqual(saved, self.test_entity)
        self.assertTrue(insert_called)
        
    def test_delete(self):
        """Test deleting an entity"""
        # Track DELETE calls
        delete_called = False
        
        async def mock_execute_query(query, params):
            nonlocal delete_called
            if "DELETE FROM" in query:
                delete_called = True
            return {"success": True}
            
        self.adapter.execute_query = mock_execute_query
        
        result = self.async_test(self.repository.delete("1"))
        
        self.assertTrue(result)
        self.assertTrue(delete_called)
        
    def test_exists(self):
        """Test checking if entity exists"""
        # Mock to return count > 0
        async def mock_read_query(query, params):
            if "COUNT(*)" in query and params == ["1"]:
                return [{"count": 1}]
            return [{"count": 0}]
            
        self.adapter.execute_read_query = mock_read_query
        
        exists = self.async_test(self.repository.exists("1"))
        self.assertTrue(exists)
        
        not_exists = self.async_test(self.repository.exists("999"))
        self.assertFalse(not_exists)


class TestQueryBuilder(unittest.TestCase):
    """Test cases for QueryBuilder"""
    
    def test_simple_select(self):
        """Test simple SELECT query"""
        query = QueryBuilder("users").build()
        self.assertEqual(query, "SELECT * FROM users")
        
    def test_select_with_fields(self):
        """Test SELECT with specific fields"""
        query = QueryBuilder("users").select("id", "name", "email").build()
        self.assertEqual(query, "SELECT id, name, email FROM users")
        
    def test_where_clause(self):
        """Test WHERE clause"""
        query = (QueryBuilder("users")
                .where("age > 18")
                .where("status = 'active'")
                .build())
        
        self.assertEqual(
            query,
            "SELECT * FROM users WHERE age > 18 AND status = 'active'"
        )
        
    def test_order_by(self):
        """Test ORDER BY clause"""
        query = (QueryBuilder("users")
                .order_by("created_at", "DESC")
                .order_by("name")
                .build())
        
        self.assertEqual(
            query,
            "SELECT * FROM users ORDER BY created_at DESC, name ASC"
        )
        
    def test_limit(self):
        """Test LIMIT clause"""
        query = QueryBuilder("users").limit(10).build()
        self.assertEqual(query, "SELECT * FROM users LIMIT 10")
        
    def test_join(self):
        """Test JOIN clause"""
        query = (QueryBuilder("users")
                .join("posts", "users.id = posts.user_id")
                .join("comments", "posts.id = comments.post_id", "LEFT")
                .build())
        
        expected = (
            "SELECT * FROM users "
            "INNER JOIN posts ON users.id = posts.user_id "
            "LEFT JOIN comments ON posts.id = comments.post_id"
        )
        self.assertEqual(query, expected)
        
    def test_complex_query(self):
        """Test complex query with all clauses"""
        query = (QueryBuilder("users")
                .select("users.id", "users.name", "COUNT(posts.id) as post_count")
                .join("posts", "users.id = posts.user_id", "LEFT")
                .where("users.status = 'active'")
                .where("users.created_at > '2025-01-01'")
                .order_by("post_count", "DESC")
                .limit(20)
                .build())
        
        expected = (
            "SELECT users.id, users.name, COUNT(posts.id) as post_count "
            "FROM users "
            "LEFT JOIN posts ON users.id = posts.user_id "
            "WHERE users.status = 'active' AND users.created_at > '2025-01-01' "
            "ORDER BY post_count DESC "
            "LIMIT 20"
        )
        self.assertEqual(query, expected)


if __name__ == "__main__":
    unittest.main()