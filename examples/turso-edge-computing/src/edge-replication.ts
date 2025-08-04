/**
 * Edge Replication Manager for Turso Database
 * Handles multi-region data replication with conflict resolution
 */

import { TursoClient } from '@turso/client';

export interface EdgeRegion {
  id: string;
  name: string;
  endpoint: string;
  priority: number;
  latency_ms: number;
  status: 'active' | 'standby' | 'offline';
}

export interface ReplicationConfig {
  consistency_level: 'strong' | 'eventual' | 'async';
  conflict_resolution: 'last_write_wins' | 'version_vector' | 'custom';
  sync_interval_ms: number;
  max_retries: number;
}

export class EdgeReplicationManager {
  private regions: Map<string, EdgeRegion> = new Map();
  private primaryRegion: string;
  private config: ReplicationConfig;
  private tursoClients: Map<string, TursoClient> = new Map();

  constructor(primaryRegion: string, config: ReplicationConfig) {
    this.primaryRegion = primaryRegion;
    this.config = config;
  }

  /**
   * Initialize edge regions and create replication schema
   */
  async initialize(regions: EdgeRegion[]): Promise<void> {
    // Store regions
    for (const region of regions) {
      this.regions.set(region.id, region);
    }

    // Create replication tracking table in primary
    const primaryClient = await this.getClient(this.primaryRegion);
    
    await primaryClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS edge_replication_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation_id TEXT UNIQUE NOT NULL,
          source_region TEXT NOT NULL,
          target_regions TEXT NOT NULL,
          operation_type TEXT CHECK(operation_type IN ('insert', 'update', 'delete')),
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          data TEXT NOT NULL,
          version INTEGER DEFAULT 1,
          timestamp INTEGER DEFAULT (unixepoch()),
          status TEXT DEFAULT 'pending',
          retry_count INTEGER DEFAULT 0,
          conflict_resolution TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Create sync status table
    await primaryClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS edge_sync_status (
          region_id TEXT PRIMARY KEY,
          last_sync_timestamp INTEGER,
          pending_operations INTEGER DEFAULT 0,
          failed_operations INTEGER DEFAULT 0,
          average_latency_ms REAL,
          status TEXT DEFAULT 'active',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Initialize sync status for all regions
    for (const region of regions) {
      await primaryClient.execute_query({
        query: `
          INSERT OR REPLACE INTO edge_sync_status 
          (region_id, status, average_latency_ms) 
          VALUES (?, ?, ?)
        `,
        params: [region.id, region.status, region.latency_ms]
      });
    }
  }

  /**
   * Replicate data operation across edge regions
   */
  async replicate(
    operation: 'insert' | 'update' | 'delete',
    tableName: string,
    recordId: string,
    data: any,
    sourceRegion?: string
  ): Promise<void> {
    const source = sourceRegion || this.primaryRegion;
    const operationId = this.generateOperationId();
    
    // Get target regions based on configuration
    const targetRegions = await this.getTargetRegions(source);
    
    // Log the operation
    const primaryClient = await this.getClient(this.primaryRegion);
    await primaryClient.execute_query({
      query: `
        INSERT INTO edge_replication_log 
        (operation_id, source_region, target_regions, operation_type, 
         table_name, record_id, data, version)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        operationId,
        source,
        JSON.stringify(targetRegions),
        operation,
        tableName,
        recordId,
        JSON.stringify(data),
        data.version || 1
      ]
    });

    // Execute replication based on consistency level
    if (this.config.consistency_level === 'strong') {
      await this.strongConsistencyReplication(operationId, operation, tableName, recordId, data, targetRegions);
    } else if (this.config.consistency_level === 'eventual') {
      await this.eventualConsistencyReplication(operationId, operation, tableName, recordId, data, targetRegions);
    } else {
      // Async replication - fire and forget
      this.asyncReplication(operationId, operation, tableName, recordId, data, targetRegions);
    }
  }

  /**
   * Strong consistency - wait for all regions to acknowledge
   */
  private async strongConsistencyReplication(
    operationId: string,
    operation: string,
    tableName: string,
    recordId: string,
    data: any,
    targetRegions: string[]
  ): Promise<void> {
    const promises = targetRegions.map(region => 
      this.replicateToRegion(region, operation, tableName, recordId, data)
    );

    try {
      await Promise.all(promises);
      
      // Update status to completed
      const primaryClient = await this.getClient(this.primaryRegion);
      await primaryClient.execute_query({
        query: `UPDATE edge_replication_log SET status = 'completed' WHERE operation_id = ?`,
        params: [operationId]
      });
    } catch (error) {
      // Handle partial failures
      await this.handleReplicationFailure(operationId, error);
      throw error;
    }
  }

  /**
   * Eventual consistency - acknowledge immediately, sync later
   */
  private async eventualConsistencyReplication(
    operationId: string,
    operation: string,
    tableName: string,
    recordId: string,
    data: any,
    targetRegions: string[]
  ): Promise<void> {
    // Queue for async processing
    setTimeout(async () => {
      for (const region of targetRegions) {
        try {
          await this.replicateToRegion(region, operation, tableName, recordId, data);
        } catch (error) {
          await this.queueForRetry(operationId, region, error);
        }
      }
    }, 0);
  }

  /**
   * Async replication - best effort, no guarantees
   */
  private async asyncReplication(
    operationId: string,
    operation: string,
    tableName: string,
    recordId: string,
    data: any,
    targetRegions: string[]
  ): Promise<void> {
    // Fire and forget
    targetRegions.forEach(region => {
      this.replicateToRegion(region, operation, tableName, recordId, data)
        .catch(error => console.error(`Async replication failed for ${region}:`, error));
    });
  }

  /**
   * Replicate operation to a specific region
   */
  private async replicateToRegion(
    regionId: string,
    operation: string,
    tableName: string,
    recordId: string,
    data: any
  ): Promise<void> {
    const client = await this.getClient(regionId);
    const startTime = Date.now();

    try {
      let query: string;
      let params: any[];

      switch (operation) {
        case 'insert':
          const columns = Object.keys(data).join(', ');
          const placeholders = Object.keys(data).map(() => '?').join(', ');
          query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
          params = Object.values(data);
          break;

        case 'update':
          const setClause = Object.keys(data)
            .filter(key => key !== 'id')
            .map(key => `${key} = ?`)
            .join(', ');
          query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
          params = [...Object.values(data).filter((_, i) => Object.keys(data)[i] !== 'id'), recordId];
          break;

        case 'delete':
          query = `DELETE FROM ${tableName} WHERE id = ?`;
          params = [recordId];
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      await client.execute_query({ query, params });

      // Update latency metrics
      const latency = Date.now() - startTime;
      await this.updateRegionMetrics(regionId, latency);

    } catch (error) {
      // Handle conflicts
      if (error.message?.includes('UNIQUE constraint')) {
        await this.handleConflict(regionId, tableName, recordId, data, error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Handle replication conflicts based on resolution strategy
   */
  private async handleConflict(
    regionId: string,
    tableName: string,
    recordId: string,
    newData: any,
    error: any
  ): Promise<void> {
    const client = await this.getClient(regionId);

    switch (this.config.conflict_resolution) {
      case 'last_write_wins':
        // Force update with new data
        const updateQuery = `
          UPDATE ${tableName} 
          SET ${Object.keys(newData).map(k => `${k} = ?`).join(', ')}
          WHERE id = ?
        `;
        await client.execute_query({
          query: updateQuery,
          params: [...Object.values(newData), recordId]
        });
        break;

      case 'version_vector':
        // Compare versions and merge
        const existingData = await client.execute_read_only_query({
          query: `SELECT * FROM ${tableName} WHERE id = ?`,
          params: [recordId]
        });
        
        if (existingData.rows.length > 0 && existingData.rows[0].version >= newData.version) {
          // Skip update - existing data is newer
          return;
        }
        
        // Update with incremented version
        newData.version = (newData.version || 0) + 1;
        await this.replicateToRegion(regionId, 'update', tableName, recordId, newData);
        break;

      case 'custom':
        // Implement custom resolution logic
        throw new Error('Custom conflict resolution not implemented');
    }
  }

  /**
   * Get optimal target regions for replication
   */
  private async getTargetRegions(sourceRegion: string): Promise<string[]> {
    const regions = Array.from(this.regions.values())
      .filter(r => r.id !== sourceRegion && r.status === 'active')
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.id);

    return regions;
  }

  /**
   * Update region performance metrics
   */
  private async updateRegionMetrics(regionId: string, latencyMs: number): Promise<void> {
    const primaryClient = await this.getClient(this.primaryRegion);
    
    await primaryClient.execute_query({
      query: `
        UPDATE edge_sync_status 
        SET average_latency_ms = 
          CASE 
            WHEN average_latency_ms IS NULL THEN ?
            ELSE (average_latency_ms * 0.9 + ? * 0.1)
          END,
          last_sync_timestamp = unixepoch(),
          updated_at = CURRENT_TIMESTAMP
        WHERE region_id = ?
      `,
      params: [latencyMs, latencyMs, regionId]
    });
  }

  /**
   * Handle replication failures
   */
  private async handleReplicationFailure(operationId: string, error: any): Promise<void> {
    const primaryClient = await this.getClient(this.primaryRegion);
    
    await primaryClient.execute_query({
      query: `
        UPDATE edge_replication_log 
        SET status = 'failed', 
            retry_count = retry_count + 1,
            conflict_resolution = ?
        WHERE operation_id = ?
      `,
      params: [error.message, operationId]
    });
  }

  /**
   * Queue failed operation for retry
   */
  private async queueForRetry(operationId: string, regionId: string, error: any): Promise<void> {
    const primaryClient = await this.getClient(this.primaryRegion);
    
    await primaryClient.execute_query({
      query: `
        UPDATE edge_sync_status 
        SET failed_operations = failed_operations + 1 
        WHERE region_id = ?
      `,
      params: [regionId]
    });

    // Schedule retry based on configuration
    if (this.config.max_retries > 0) {
      setTimeout(() => {
        this.retryFailedOperations(regionId);
      }, this.config.sync_interval_ms);
    }
  }

  /**
   * Retry failed operations for a region
   */
  private async retryFailedOperations(regionId: string): Promise<void> {
    const primaryClient = await this.getClient(this.primaryRegion);
    
    const failedOps = await primaryClient.execute_read_only_query({
      query: `
        SELECT * FROM edge_replication_log 
        WHERE status = 'failed' 
          AND target_regions LIKE '%${regionId}%'
          AND retry_count < ?
        ORDER BY timestamp ASC
        LIMIT 100
      `,
      params: [this.config.max_retries]
    });

    for (const op of failedOps.rows) {
      try {
        const data = JSON.parse(op.data);
        await this.replicateToRegion(regionId, op.operation_type, op.table_name, op.record_id, data);
        
        // Mark as completed
        await primaryClient.execute_query({
          query: `UPDATE edge_replication_log SET status = 'completed' WHERE id = ?`,
          params: [op.id]
        });
      } catch (error) {
        console.error(`Retry failed for operation ${op.id}:`, error);
      }
    }
  }

  /**
   * Get Turso client for a specific region
   */
  private async getClient(regionId: string): Promise<TursoClient> {
    if (!this.tursoClients.has(regionId)) {
      const region = this.regions.get(regionId);
      if (!region) {
        throw new Error(`Unknown region: ${regionId}`);
      }
      
      // Create client for region endpoint
      // In real implementation, this would connect to region-specific Turso instance
      const client = new TursoClient({ endpoint: region.endpoint });
      this.tursoClients.set(regionId, client);
    }
    
    return this.tursoClients.get(regionId)!;
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get replication lag for monitoring
   */
  async getReplicationLag(): Promise<Map<string, number>> {
    const primaryClient = await this.getClient(this.primaryRegion);
    const lag = new Map<string, number>();

    const status = await primaryClient.execute_read_only_query({
      query: `
        SELECT region_id, 
               unixepoch() - last_sync_timestamp as lag_seconds,
               pending_operations
        FROM edge_sync_status
        WHERE status = 'active'
      `
    });

    for (const row of status.rows) {
      lag.set(row.region_id, row.lag_seconds || 0);
    }

    return lag;
  }

  /**
   * Get sync status for all regions
   */
  async getSyncStatus(): Promise<any[]> {
    const primaryClient = await this.getClient(this.primaryRegion);
    
    const result = await primaryClient.execute_read_only_query({
      query: `
        SELECT 
          region_id,
          status,
          last_sync_timestamp,
          pending_operations,
          failed_operations,
          average_latency_ms,
          datetime(updated_at) as last_updated
        FROM edge_sync_status
        ORDER BY average_latency_ms ASC
      `
    });

    return result.rows;
  }
}

// Export types for external use
export type { TursoClient };