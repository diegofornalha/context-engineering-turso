/**
 * Turso Edge Computing Demo
 * Demonstrates practical usage of Turso MCP tools for edge computing
 */

// This demo shows how to use the actual MCP Turso tools
// In a real implementation, you would import and use the MCP client

interface TursoMCPClient {
  execute_read_only_query: (params: { query: string; params?: any[]; database?: string }) => Promise<any>;
  execute_query: (params: { query: string; params?: any[]; database?: string }) => Promise<any>;
  list_databases: () => Promise<any>;
  get_database_info: (params: { database: string }) => Promise<any>;
  list_tables: (params: { database?: string }) => Promise<any>;
  describe_table: (params: { table_name: string; database?: string }) => Promise<any>;
}

export class TursoEdgeDemo {
  constructor(private tursoClient: TursoMCPClient) {}

  /**
   * Initialize edge computing tables using MCP tools
   */
  async initializeEdgeTables(): Promise<void> {
    console.log('🚀 Initializing Turso Edge Computing Tables...\n');

    // Create edge nodes registry
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS edge_nodes (
          node_id TEXT PRIMARY KEY,
          region TEXT NOT NULL,
          endpoint TEXT NOT NULL,
          status TEXT DEFAULT 'active',
          latency_ms REAL,
          capacity INTEGER,
          last_heartbeat INTEGER DEFAULT (unixepoch()),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Create distributed data table
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS distributed_data (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          version INTEGER DEFAULT 1,
          node_id TEXT NOT NULL,
          created_at INTEGER DEFAULT (unixepoch()),
          updated_at INTEGER DEFAULT (unixepoch()),
          FOREIGN KEY (node_id) REFERENCES edge_nodes(node_id)
        )
      `
    });

    // Create replication log
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS replication_log (
          log_id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_node TEXT NOT NULL,
          target_node TEXT NOT NULL,
          data_id TEXT NOT NULL,
          operation TEXT CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
          status TEXT DEFAULT 'pending',
          timestamp INTEGER DEFAULT (unixepoch()),
          attempts INTEGER DEFAULT 0
        )
      `
    });

    console.log('✅ Edge tables created successfully!\n');
  }

  /**
   * Register edge nodes
   */
  async registerEdgeNodes(): Promise<void> {
    console.log('🌍 Registering Edge Nodes...\n');

    const nodes = [
      { id: 'edge-us-west', region: 'us-west-2', endpoint: 'wss://us-west-2.turso.io', latency: 25, capacity: 10000 },
      { id: 'edge-eu-central', region: 'eu-central-1', endpoint: 'wss://eu-central-1.turso.io', latency: 45, capacity: 8000 },
      { id: 'edge-asia-pac', region: 'ap-southeast-1', endpoint: 'wss://ap-southeast-1.turso.io', latency: 85, capacity: 6000 }
    ];

    for (const node of nodes) {
      await this.tursoClient.execute_query({
        query: `
          INSERT OR REPLACE INTO edge_nodes (node_id, region, endpoint, latency_ms, capacity)
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [node.id, node.region, node.endpoint, node.latency, node.capacity]
      });
      console.log(`✅ Registered node: ${node.id} (${node.region})`);
    }

    console.log('\n');
  }

  /**
   * Demonstrate distributed data operations
   */
  async demonstrateDistributedOperations(): Promise<void> {
    console.log('💾 Demonstrating Distributed Data Operations...\n');

    // Insert data from different nodes
    const operations = [
      { node: 'edge-us-west', data: { message: 'Hello from US West!', timestamp: Date.now() } },
      { node: 'edge-eu-central', data: { message: 'Greetings from Europe!', timestamp: Date.now() } },
      { node: 'edge-asia-pac', data: { message: 'Ni hao from Asia Pacific!', timestamp: Date.now() } }
    ];

    for (const op of operations) {
      const dataId = `data-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await this.tursoClient.execute_query({
        query: `
          INSERT INTO distributed_data (id, data, node_id)
          VALUES (?, ?, ?)
        `,
        params: [dataId, JSON.stringify(op.data), op.node]
      });

      console.log(`✅ Inserted data from ${op.node}: ${op.data.message}`);

      // Log replication to other nodes
      const otherNodes = operations.filter(o => o.node !== op.node).map(o => o.node);
      for (const targetNode of otherNodes) {
        await this.tursoClient.execute_query({
          query: `
            INSERT INTO replication_log (source_node, target_node, data_id, operation)
            VALUES (?, ?, ?, 'INSERT')
          `,
          params: [op.node, targetNode, dataId]
        });
      }
    }

    console.log('\n');
  }

  /**
   * Query with edge-aware routing
   */
  async demonstrateEdgeQueries(): Promise<void> {
    console.log('🔍 Demonstrating Edge-Aware Queries...\n');

    // Get node status
    const nodeStatus = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          node_id,
          region,
          status,
          latency_ms,
          capacity,
          datetime(last_heartbeat, 'unixepoch') as last_seen
        FROM edge_nodes
        ORDER BY latency_ms ASC
      `
    });

    console.log('📊 Edge Node Status:');
    console.log('─'.repeat(80));
    console.log('Node ID          | Region         | Status | Latency | Capacity | Last Seen');
    console.log('─'.repeat(80));
    
    for (const node of nodeStatus.rows) {
      console.log(
        `${node.node_id.padEnd(15)} | ${node.region.padEnd(14)} | ${node.status.padEnd(6)} | ${String(node.latency_ms + 'ms').padEnd(7)} | ${String(node.capacity).padEnd(8)} | ${node.last_seen}`
      );
    }

    console.log('\n');

    // Query distributed data with source tracking
    const distributedData = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          d.id,
          d.data,
          d.version,
          d.node_id,
          n.region,
          datetime(d.created_at, 'unixepoch') as created
        FROM distributed_data d
        JOIN edge_nodes n ON d.node_id = n.node_id
        ORDER BY d.created_at DESC
        LIMIT 10
      `
    });

    console.log('📦 Recent Distributed Data:');
    console.log('─'.repeat(80));
    
    for (const row of distributedData.rows) {
      const data = JSON.parse(row.data);
      console.log(`ID: ${row.id}`);
      console.log(`  Region: ${row.region} (${row.node_id})`);
      console.log(`  Data: ${data.message}`);
      console.log(`  Version: ${row.version}`);
      console.log(`  Created: ${row.created}`);
      console.log('');
    }
  }

  /**
   * Demonstrate replication monitoring
   */
  async monitorReplication(): Promise<void> {
    console.log('📡 Monitoring Replication Status...\n');

    // Check pending replications
    const pendingReplications = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          source_node,
          target_node,
          COUNT(*) as pending_count,
          MIN(timestamp) as oldest_timestamp
        FROM replication_log
        WHERE status = 'pending'
        GROUP BY source_node, target_node
      `
    });

    if (pendingReplications.rows.length > 0) {
      console.log('⏳ Pending Replications:');
      for (const rep of pendingReplications.rows) {
        console.log(`  ${rep.source_node} → ${rep.target_node}: ${rep.pending_count} operations`);
      }
    } else {
      console.log('✅ All replications completed!');
    }

    console.log('\n');

    // Replication statistics
    const replicationStats = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          operation,
          status,
          COUNT(*) as count,
          AVG(attempts) as avg_attempts
        FROM replication_log
        GROUP BY operation, status
        ORDER BY operation, status
      `
    });

    console.log('📊 Replication Statistics:');
    console.log('─'.repeat(50));
    console.log('Operation | Status    | Count | Avg Attempts');
    console.log('─'.repeat(50));
    
    for (const stat of replicationStats.rows) {
      console.log(
        `${stat.operation.padEnd(9)} | ${stat.status.padEnd(9)} | ${String(stat.count).padEnd(5)} | ${stat.avg_attempts.toFixed(1)}`
      );
    }
  }

  /**
   * Demonstrate conflict resolution
   */
  async demonstrateConflictResolution(): Promise<void> {
    console.log('\n⚔️  Demonstrating Conflict Resolution...\n');

    // Simulate concurrent updates
    const dataId = 'conflict-test-123';
    
    // Insert initial data
    await this.tursoClient.execute_query({
      query: `
        INSERT OR REPLACE INTO distributed_data (id, data, node_id, version)
        VALUES (?, ?, ?, ?)
      `,
      params: [dataId, JSON.stringify({ value: 'initial' }), 'edge-us-west', 1]
    });

    // Simulate concurrent updates from different nodes
    const updates = [
      { node: 'edge-us-west', value: 'US update', version: 2 },
      { node: 'edge-eu-central', value: 'EU update', version: 2 },
      { node: 'edge-asia-pac', value: 'Asia update', version: 2 }
    ];

    console.log('🔄 Simulating concurrent updates...\n');

    for (const update of updates) {
      // Check current version
      const current = await this.tursoClient.execute_read_only_query({
        query: `SELECT version FROM distributed_data WHERE id = ?`,
        params: [dataId]
      });

      const currentVersion = current.rows[0]?.version || 0;

      if (update.version > currentVersion) {
        // Apply update
        await this.tursoClient.execute_query({
          query: `
            UPDATE distributed_data 
            SET data = ?, version = ?, node_id = ?, updated_at = unixepoch()
            WHERE id = ?
          `,
          params: [JSON.stringify({ value: update.value }), update.version, update.node, dataId]
        });
        console.log(`✅ Applied update from ${update.node}: "${update.value}"`);
      } else {
        console.log(`❌ Conflict detected from ${update.node}: version ${update.version} <= ${currentVersion}`);
      }
    }
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(): Promise<void> {
    console.log('\n📊 Database Information:\n');

    // List all databases
    const databases = await this.tursoClient.list_databases();
    console.log('Available databases:', databases);

    // List tables
    const tables = await this.tursoClient.list_tables({});
    console.log('\nTables in current database:');
    for (const table of tables.tables || []) {
      console.log(`  - ${table}`);
      
      // Describe table structure
      try {
        const tableInfo = await this.tursoClient.describe_table({ table_name: table });
        console.log(`    Columns: ${tableInfo.columns?.map((c: any) => c.name).join(', ') || 'N/A'}`);
      } catch (e) {
        console.log(`    (Unable to describe table)`);
      }
    }
  }

  /**
   * Run complete demo
   */
  async runDemo(): Promise<void> {
    console.log('🚀 TURSO EDGE COMPUTING DEMO\n');
    console.log('=' .repeat(80));
    console.log('\n');

    try {
      // Initialize tables
      await this.initializeEdgeTables();

      // Register nodes
      await this.registerEdgeNodes();

      // Demonstrate operations
      await this.demonstrateDistributedOperations();

      // Query data
      await this.demonstrateEdgeQueries();

      // Monitor replication
      await this.monitorReplication();

      // Conflict resolution
      await this.demonstrateConflictResolution();

      // Database info
      await this.getDatabaseInfo();

      console.log('\n' + '='.repeat(80));
      console.log('✅ Demo completed successfully!');
      console.log('='.repeat(80));

    } catch (error) {
      console.error('❌ Demo error:', error);
    }
  }
}

// Example usage with MCP client
/*
const tursoMCPClient = // Initialize your MCP client here
const demo = new TursoEdgeDemo(tursoMCPClient);
await demo.runDemo();
*/