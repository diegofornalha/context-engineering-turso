# Turso + Claude Flow Integration Guide

## Overview

This guide demonstrates how to integrate Turso Database with Claude Flow for building distributed AI applications with persistent memory and edge computing capabilities.

## Key Integration Points

### 1. Persistent Agent Memory

Turso serves as the persistent memory backend for Claude Flow agents:

```typescript
// Store agent decisions
await turso.execute_query({
  query: `INSERT INTO agent_memory 
    (agent_id, decision_type, decision_data, context) 
    VALUES (?, ?, ?, ?)`,
  params: ['backend-dev-001', 'api-design', JSON.stringify(apiSpec), contextData]
});

// Retrieve agent history
const history = await turso.execute_read_only_query({
  query: `SELECT * FROM agent_memory 
    WHERE agent_id = ? 
    ORDER BY created_at DESC LIMIT 10`,
  params: ['backend-dev-001']
});
```

### 2. Cross-Session Context

Enable agents to maintain context across sessions:

```typescript
// Save session state
await turso.add_conversation({
  session_id: swarmId,
  role: 'assistant',
  content: 'Completed API endpoint implementation',
  metadata: {
    agent: 'backend-dev',
    files_created: ['api/users.ts', 'api/auth.ts'],
    tests_passed: 15
  }
});

// Restore session context
const previousSession = await turso.get_conversations({
  session_id: swarmId,
  limit: 50
});
```

### 3. Knowledge Sharing

Share knowledge between agents:

```typescript
// Agent discovers new pattern
await turso.add_knowledge({
  category: 'design-patterns',
  topic: 'edge-api-optimization',
  content: 'Use regional caching for frequently accessed endpoints',
  tags: ['performance', 'edge', 'api'],
  metadata: {
    discovered_by: 'backend-dev',
    performance_gain: '45%'
  }
});

// Other agents search for relevant knowledge
const patterns = await turso.search_knowledge({
  query: 'api optimization',
  category: 'design-patterns',
  limit: 5
});
```

### 4. Performance Monitoring

Track agent and system performance:

```sql
CREATE TABLE agent_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  duration_ms INTEGER,
  tokens_used INTEGER,
  files_modified INTEGER,
  edge_region TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Query agent performance
SELECT 
  agent_id,
  task_type,
  COUNT(*) as task_count,
  AVG(duration_ms) as avg_duration,
  AVG(tokens_used) as avg_tokens,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
FROM agent_metrics
WHERE created_at > datetime('now', '-24 hours')
GROUP BY agent_id, task_type;
```

## Implementation Examples

### Example 1: Distributed Swarm Coordination

```typescript
class TursoSwarmCoordinator {
  private turso: TursoClient;
  
  async coordinateSwarm(swarmId: string, agents: string[]) {
    // Create swarm coordination table
    await this.turso.execute_query({
      query: `CREATE TABLE IF NOT EXISTS swarm_coordination (
        swarm_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        status TEXT DEFAULT 'idle',
        current_task TEXT,
        last_heartbeat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (swarm_id, agent_id)
      )`
    });
    
    // Register agents
    for (const agentId of agents) {
      await this.turso.execute_query({
        query: `INSERT OR REPLACE INTO swarm_coordination 
          (swarm_id, agent_id, status) VALUES (?, ?, 'ready')`,
        params: [swarmId, agentId]
      });
    }
    
    // Task assignment with edge awareness
    await this.turso.execute_query({
      query: `UPDATE swarm_coordination 
        SET status = 'working', 
            current_task = ?,
            last_heartbeat = CURRENT_TIMESTAMP
        WHERE swarm_id = ? AND agent_id = ?`,
      params: [taskData, swarmId, selectedAgent]
    });
  }
  
  async getSwarmStatus(swarmId: string) {
    return await this.turso.execute_read_only_query({
      query: `SELECT 
        agent_id,
        status,
        current_task,
        CASE 
          WHEN last_heartbeat > datetime('now', '-30 seconds') THEN 'healthy'
          WHEN last_heartbeat > datetime('now', '-60 seconds') THEN 'warning'
          ELSE 'unhealthy'
        END as health_status
      FROM swarm_coordination
      WHERE swarm_id = ?`,
      params: [swarmId]
    });
  }
}
```

### Example 2: Edge-Aware Task Distribution

```typescript
class EdgeAwareTaskDistributor {
  async distributeTask(task: Task) {
    // Find optimal edge location for task
    const edgeMetrics = await this.turso.execute_read_only_query({
      query: `SELECT 
        edge_region,
        AVG(latency_ms) as avg_latency,
        COUNT(DISTINCT agent_id) as available_agents,
        SUM(CASE WHEN status = 'idle' THEN 1 ELSE 0 END) as idle_agents
      FROM edge_replicas
      JOIN swarm_coordination ON edge_region = region
      GROUP BY edge_region
      ORDER BY avg_latency ASC, idle_agents DESC`
    });
    
    const optimalRegion = edgeMetrics.rows[0].edge_region;
    
    // Assign task to agent in optimal region
    await this.turso.execute_query({
      query: `INSERT INTO task_assignments 
        (task_id, agent_id, edge_region, assigned_at)
        SELECT ?, agent_id, ?, CURRENT_TIMESTAMP
        FROM swarm_coordination
        WHERE status = 'idle' AND region = ?
        LIMIT 1`,
      params: [task.id, optimalRegion, optimalRegion]
    });
  }
}
```

### Example 3: Intelligent Caching Strategy

```typescript
class TursoIntelligentCache {
  async cacheWithIntelligence(key: string, value: any, context: CacheContext) {
    // Analyze access patterns
    const patterns = await this.turso.execute_read_only_query({
      query: `SELECT 
        edge_location,
        COUNT(*) as access_count,
        AVG(JULIANDAY(CURRENT_TIMESTAMP) - JULIANDAY(last_accessed)) as days_since_access
      FROM edge_cache
      WHERE cache_key LIKE ?
      GROUP BY edge_location`,
      params: [`${context.keyPattern}%`]
    });
    
    // Determine TTL based on patterns
    const ttl = this.calculateOptimalTTL(patterns.rows);
    
    // Store with intelligent metadata
    await this.turso.execute_query({
      query: `INSERT INTO edge_cache 
        (cache_key, cache_value, edge_location, ttl_seconds, metadata)
        VALUES (?, ?, ?, ?, ?)`,
      params: [
        key,
        JSON.stringify(value),
        context.region,
        ttl,
        JSON.stringify({
          predicted_access_pattern: 'high',
          auto_ttl: true,
          creation_context: context
        })
      ]
    });
  }
}
```

## Best Practices

### 1. Connection Pooling

```typescript
// Use connection pools for high-throughput operations
const pool = createTursoPool({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  maxConnections: 10,
  idleTimeout: 30000
});
```

### 2. Batch Operations

```typescript
// Batch inserts for better performance
const batchInsert = async (records: any[]) => {
  const placeholders = records.map(() => '(?, ?, ?)').join(', ');
  const values = records.flatMap(r => [r.id, r.data, r.timestamp]);
  
  await turso.execute_query({
    query: `INSERT INTO batch_data (id, data, timestamp) VALUES ${placeholders}`,
    params: values
  });
};
```

### 3. Edge-Aware Queries

```typescript
// Route queries to nearest edge
const nearestEdgeQuery = async (userLocation: string) => {
  const edge = await determineNearestEdge(userLocation);
  return await turso.execute_read_only_query({
    query: 'SELECT * FROM data WHERE region = ?',
    params: [edge.region]
  });
};
```

## Monitoring & Observability

### 1. Query Performance Tracking

```sql
CREATE TABLE query_performance (
  query_hash TEXT PRIMARY KEY,
  query_pattern TEXT,
  avg_duration_ms REAL,
  execution_count INTEGER,
  last_executed TIMESTAMP
);

-- Track slow queries
CREATE TRIGGER track_slow_queries
AFTER INSERT ON query_log
WHEN NEW.duration_ms > 100
BEGIN
  INSERT OR REPLACE INTO query_performance
  VALUES (
    hash(NEW.query),
    NEW.query,
    NEW.duration_ms,
    1,
    CURRENT_TIMESTAMP
  );
END;
```

### 2. Agent Health Monitoring

```typescript
// Monitor agent health across regions
const monitorAgentHealth = async () => {
  const health = await turso.execute_read_only_query({
    query: `WITH agent_health AS (
      SELECT 
        a.agent_id,
        a.edge_region,
        COUNT(m.id) as tasks_completed,
        AVG(m.duration_ms) as avg_task_duration,
        MAX(m.created_at) as last_activity
      FROM agents a
      LEFT JOIN agent_metrics m ON a.agent_id = m.agent_id
      WHERE m.created_at > datetime('now', '-1 hour')
      GROUP BY a.agent_id, a.edge_region
    )
    SELECT *,
      CASE 
        WHEN last_activity > datetime('now', '-5 minutes') THEN 'active'
        WHEN last_activity > datetime('now', '-15 minutes') THEN 'idle'
        ELSE 'inactive'
      END as status
    FROM agent_health`
  });
  
  return health.rows;
};
```

## Conclusion

The integration of Turso with Claude Flow creates a powerful platform for building distributed AI applications with:

- **Persistent Memory**: Cross-session context retention
- **Edge Computing**: Low-latency global distribution
- **Knowledge Sharing**: Centralized knowledge base for all agents
- **Performance Monitoring**: Real-time metrics and analytics
- **Scalability**: Horizontal scaling across regions

This combination enables building sophisticated AI systems that can operate efficiently at global scale while maintaining context and learning from interactions.