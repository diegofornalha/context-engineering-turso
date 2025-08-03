"""
Common database patterns and repository implementation.
Centralizes all database access to reduce duplication.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, TypeVar, Generic
from dataclasses import dataclass
import json
from datetime import datetime

T = TypeVar('T')


@dataclass
class DatabaseConfig:
    """Configuration for database connections"""
    database_name: str
    organization: str
    auth_token: Optional[str] = None
    api_url: str = "https://api.turso.tech/v1"
    

class Repository(ABC, Generic[T]):
    """
    Abstract repository pattern for data access.
    All database operations should go through repositories.
    """
    
    @abstractmethod
    async def find_by_id(self, id: str) -> Optional[T]:
        """Find entity by ID"""
        pass
    
    @abstractmethod
    async def find_all(self, limit: int = 100) -> List[T]:
        """Find all entities with optional limit"""
        pass
    
    @abstractmethod
    async def save(self, entity: T) -> T:
        """Save or update entity"""
        pass
    
    @abstractmethod
    async def delete(self, id: str) -> bool:
        """Delete entity by ID"""
        pass
    
    @abstractmethod
    async def exists(self, id: str) -> bool:
        """Check if entity exists"""
        pass


class MCPDatabaseAdapter:
    """
    Adapter for MCP database operations.
    Provides a clean interface for database access via MCP.
    """
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        
    async def execute_query(self, query: str, params: List[Any] = None) -> Dict[str, Any]:
        """
        Execute a database query via MCP.
        This is a placeholder - in production, this would call the actual MCP tool.
        """
        # In production, this would call:
        # return await mcp_turso_execute_query(
        #     database=self.config.database_name,
        #     query=query,
        #     params=params or []
        # )
        
        return {
            "success": True,
            "message": f"Query executed on {self.config.database_name}",
            "query": query,
            "params": params
        }
    
    async def execute_read_query(self, query: str, params: List[Any] = None) -> List[Dict[str, Any]]:
        """
        Execute a read-only query via MCP.
        Returns the result rows.
        """
        # In production, this would call:
        # result = await mcp_turso_execute_read_only_query(
        #     database=self.config.database_name,
        #     query=query,
        #     params=params or []
        # )
        # return result.get("rows", [])
        
        return []


class BaseRepository(Repository[T]):
    """
    Base implementation of repository pattern.
    Provides common CRUD operations for any entity type.
    """
    
    def __init__(self, adapter: MCPDatabaseAdapter, table_name: str):
        self.adapter = adapter
        self.table_name = table_name
        
    async def find_by_id(self, id: str) -> Optional[T]:
        """Find entity by ID"""
        query = f"SELECT * FROM {self.table_name} WHERE id = ?"
        rows = await self.adapter.execute_read_query(query, [id])
        
        if rows:
            return self._map_row_to_entity(rows[0])
        return None
    
    async def find_all(self, limit: int = 100) -> List[T]:
        """Find all entities with limit"""
        query = f"SELECT * FROM {self.table_name} LIMIT ?"
        rows = await self.adapter.execute_read_query(query, [limit])
        
        return [self._map_row_to_entity(row) for row in rows]
    
    async def save(self, entity: T) -> T:
        """Save or update entity"""
        entity_dict = self._entity_to_dict(entity)
        entity_id = entity_dict.get("id")
        
        if entity_id and await self.exists(entity_id):
            # Update existing
            await self._update(entity_id, entity_dict)
        else:
            # Insert new
            await self._insert(entity_dict)
            
        return entity
    
    async def delete(self, id: str) -> bool:
        """Delete entity by ID"""
        query = f"DELETE FROM {self.table_name} WHERE id = ?"
        result = await self.adapter.execute_query(query, [id])
        return result.get("success", False)
    
    async def exists(self, id: str) -> bool:
        """Check if entity exists"""
        query = f"SELECT COUNT(*) as count FROM {self.table_name} WHERE id = ?"
        rows = await self.adapter.execute_read_query(query, [id])
        
        if rows:
            return rows[0].get("count", 0) > 0
        return False
    
    async def _insert(self, entity_dict: Dict[str, Any]):
        """Insert new entity"""
        # Add timestamps
        entity_dict["created_at"] = datetime.now().isoformat()
        entity_dict["updated_at"] = datetime.now().isoformat()
        
        columns = list(entity_dict.keys())
        placeholders = ["?" for _ in columns]
        values = [entity_dict[col] for col in columns]
        
        query = f"""
            INSERT INTO {self.table_name} ({', '.join(columns)})
            VALUES ({', '.join(placeholders)})
        """
        
        await self.adapter.execute_query(query, values)
    
    async def _update(self, id: str, entity_dict: Dict[str, Any]):
        """Update existing entity"""
        # Update timestamp
        entity_dict["updated_at"] = datetime.now().isoformat()
        
        # Remove id from update fields
        entity_dict.pop("id", None)
        
        set_clauses = [f"{col} = ?" for col in entity_dict.keys()]
        values = list(entity_dict.values())
        values.append(id)  # Add id for WHERE clause
        
        query = f"""
            UPDATE {self.table_name}
            SET {', '.join(set_clauses)}
            WHERE id = ?
        """
        
        await self.adapter.execute_query(query, values)
    
    @abstractmethod
    def _map_row_to_entity(self, row: Dict[str, Any]) -> T:
        """Map database row to entity - must be implemented by subclasses"""
        pass
    
    @abstractmethod
    def _entity_to_dict(self, entity: T) -> Dict[str, Any]:
        """Convert entity to dictionary - must be implemented by subclasses"""
        pass


class QueryBuilder:
    """
    SQL query builder to reduce query duplication.
    Provides a fluent interface for building queries.
    """
    
    def __init__(self, table: str):
        self.table = table
        self.query_type = "SELECT"
        self.select_fields = ["*"]
        self.where_conditions = []
        self.order_by_fields = []
        self.limit_value = None
        self.join_clauses = []
        
    def select(self, *fields):
        """Set fields to select"""
        self.select_fields = list(fields) if fields else ["*"]
        return self
    
    def where(self, condition: str):
        """Add WHERE condition"""
        self.where_conditions.append(condition)
        return self
    
    def order_by(self, field: str, direction: str = "ASC"):
        """Add ORDER BY clause"""
        self.order_by_fields.append(f"{field} {direction}")
        return self
    
    def limit(self, count: int):
        """Add LIMIT clause"""
        self.limit_value = count
        return self
    
    def join(self, table: str, on: str, join_type: str = "INNER"):
        """Add JOIN clause"""
        self.join_clauses.append(f"{join_type} JOIN {table} ON {on}")
        return self
    
    def build(self) -> str:
        """Build the final SQL query"""
        parts = [
            f"SELECT {', '.join(self.select_fields)}",
            f"FROM {self.table}"
        ]
        
        # Add joins
        parts.extend(self.join_clauses)
        
        # Add WHERE
        if self.where_conditions:
            parts.append(f"WHERE {' AND '.join(self.where_conditions)}")
            
        # Add ORDER BY
        if self.order_by_fields:
            parts.append(f"ORDER BY {', '.join(self.order_by_fields)}")
            
        # Add LIMIT
        if self.limit_value:
            parts.append(f"LIMIT {self.limit_value}")
            
        return " ".join(parts)