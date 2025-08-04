import { Client } from '@libsql/client';
import { EventEmitter } from 'events';

export interface SyncMetrics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  bytesTransferred: number;
  conflictsResolved: number;
  pendingChanges: number;
  lastSyncTime?: Date;
}

export interface NodeMetrics {
  nodeId: string;
  isHealthy: boolean;
  lastSeen: Date;
  syncLag: number;
  errorRate: number;
  throughput: number;
}

export interface ReplicationMetrics {
  replicationLag: Map<string, number>;
  pendingOperations: Map<string, number>;
  errorCounts: Map<string, number>;
  throughputByNode: Map<string, number>;
}

export class SyncMetricsCollector extends EventEmitter {
  private metrics: Map<string, number[]> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private startTime: number = Date.now();
  private syncHistory: Array<{
    timestamp: number;
    duration: number;
    success: boolean;
    changesApplied: number;
    errors?: string[];
  }> = [];

  constructor(private client: Client) {
    super();
    this.initializeMetricsTables();
  }

  private async initializeMetricsTables() {
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS sync_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        node_id TEXT,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS sync_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        duration INTEGER,
        success BOOLEAN,
        changes_applied INTEGER,
        errors TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS node_health (
        node_id TEXT PRIMARY KEY,
        is_healthy BOOLEAN DEFAULT TRUE,
        last_seen INTEGER NOT NULL,
        sync_lag INTEGER DEFAULT 0,
        error_rate REAL DEFAULT 0,
        throughput REAL DEFAULT 0,
        metadata TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for efficient queries
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp 
      ON sync_metrics(timestamp)
    `);

    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_events_timestamp 
      ON sync_events(timestamp)
    `);
  }

  // Record sync event
  async recordSyncEvent(
    eventType: 'sync_started' | 'sync_completed' | 'sync_failed' | 'conflict_resolved',
    data: {
      duration?: number;
      success?: boolean;
      changesApplied?: number;
      errors?: string[];
      metadata?: any;
    }
  ) {
    const timestamp = Date.now();

    await this.client.execute(`
      INSERT INTO sync_events (event_type, timestamp, duration, success, changes_applied, errors, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      eventType,
      timestamp,
      data.duration || null,
      data.success !== undefined ? data.success : null,
      data.changesApplied || null,
      data.errors ? JSON.stringify(data.errors) : null,
      data.metadata ? JSON.stringify(data.metadata) : null
    ]);

    // Update in-memory history
    if (eventType === 'sync_completed' || eventType === 'sync_failed') {
      this.syncHistory.push({
        timestamp,
        duration: data.duration || 0,
        success: data.success || false,
        changesApplied: data.changesApplied || 0,
        errors: data.errors
      });

      // Keep only last 1000 entries
      if (this.syncHistory.length > 1000) {
        this.syncHistory = this.syncHistory.slice(-1000);
      }
    }

    this.emit('event:recorded', { eventType, data });
  }

  // Record metric
  async recordMetric(
    metricName: string,
    value: number,
    nodeId?: string,
    tags?: Record<string, string>
  ) {
    const timestamp = Date.now();

    await this.client.execute(`
      INSERT INTO sync_metrics (timestamp, metric_name, metric_value, node_id, tags)
      VALUES (?, ?, ?, ?, ?)
    `, [
      timestamp,
      metricName,
      value,
      nodeId || null,
      tags ? JSON.stringify(tags) : null
    ]);

    // Update in-memory metrics
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    
    const values = this.metrics.get(metricName)!;
    values.push(value);

    // Keep only last 1000 values per metric
    if (values.length > 1000) {
      this.metrics.set(metricName, values.slice(-1000));
    }
  }

  // Update node health
  async updateNodeHealth(nodeId: string, health: Partial<NodeMetrics>) {
    await this.client.execute(`
      INSERT OR REPLACE INTO node_health (node_id, is_healthy, last_seen, sync_lag, error_rate, throughput, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      nodeId,
      health.isHealthy !== undefined ? health.isHealthy : true,
      health.lastSeen?.getTime() || Date.now(),
      health.syncLag || 0,
      health.errorRate || 0,
      health.throughput || 0,
      JSON.stringify({
        updateTime: Date.now(),
        ...health
      })
    ]);

    this.emit('node:health-updated', { nodeId, health });
  }

  // Get comprehensive sync metrics
  async getSyncMetrics(timeRange?: { start: number; end: number }): Promise<SyncMetrics> {
    const range = timeRange || { 
      start: Date.now() - 3600000, // Last hour
      end: Date.now() 
    };

    // Get sync events
    const events = await this.client.execute(`
      SELECT * FROM sync_events
      WHERE timestamp BETWEEN ? AND ?
      ORDER BY timestamp DESC
    `, [range.start, range.end]);

    // Calculate metrics
    let totalSyncs = 0;
    let successfulSyncs = 0;
    let failedSyncs = 0;
    let totalChanges = 0;
    const latencies: number[] = [];

    for (const event of events.rows) {
      if (event.event_type === 'sync_completed' || event.event_type === 'sync_failed') {
        totalSyncs++;
        
        if (event.success) {
          successfulSyncs++;
        } else {
          failedSyncs++;
        }

        if (event.duration) {
          latencies.push(event.duration as number);
        }

        if (event.changes_applied) {
          totalChanges += event.changes_applied as number;
        }
      }
    }

    // Get conflict resolution count
    const conflicts = await this.client.execute(`
      SELECT COUNT(*) as count FROM sync_events
      WHERE event_type = 'conflict_resolved'
      AND timestamp BETWEEN ? AND ?
    `, [range.start, range.end]);

    // Get pending changes
    const pending = await this.client.execute(`
      SELECT SUM(pending_changes) as total FROM sync_status
    `);

    // Get bytes transferred
    const bytesMetric = await this.client.execute(`
      SELECT SUM(metric_value) as total FROM sync_metrics
      WHERE metric_name = 'bytes_transferred'
      AND timestamp BETWEEN ? AND ?
    `, [range.start, range.end]);

    // Calculate latency percentiles
    latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    return {
      totalSyncs,
      successfulSyncs,
      failedSyncs,
      averageLatency: latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0,
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      bytesTransferred: bytesMetric.rows[0]?.total as number || 0,
      conflictsResolved: conflicts.rows[0]?.count as number || 0,
      pendingChanges: pending.rows[0]?.total as number || 0,
      lastSyncTime: events.rows.length > 0 
        ? new Date(events.rows[0].timestamp as number)
        : undefined
    };
  }

  // Get node-specific metrics
  async getNodeMetrics(): Promise<NodeMetrics[]> {
    const nodes = await this.client.execute(`
      SELECT * FROM node_health
      ORDER BY node_id
    `);

    return nodes.rows.map(row => ({
      nodeId: row.node_id as string,
      isHealthy: Boolean(row.is_healthy),
      lastSeen: new Date(row.last_seen as number),
      syncLag: row.sync_lag as number,
      errorRate: row.error_rate as number,
      throughput: row.throughput as number
    }));
  }

  // Get replication metrics
  async getReplicationMetrics(): Promise<ReplicationMetrics> {
    const replicationLag = new Map<string, number>();
    const pendingOperations = new Map<string, number>();
    const errorCounts = new Map<string, number>();
    const throughputByNode = new Map<string, number>();

    // Get replication lag by node
    const lagMetrics = await this.client.execute(`
      SELECT node_id, metric_value FROM sync_metrics
      WHERE metric_name = 'replication_lag'
      AND timestamp > ?
      ORDER BY timestamp DESC
    `, [Date.now() - 300000]); // Last 5 minutes

    const lagByNode = new Map<string, number[]>();
    for (const row of lagMetrics.rows) {
      const nodeId = row.node_id as string;
      if (!lagByNode.has(nodeId)) {
        lagByNode.set(nodeId, []);
      }
      lagByNode.get(nodeId)!.push(row.metric_value as number);
    }

    // Average lag per node
    for (const [nodeId, values] of lagByNode) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      replicationLag.set(nodeId, avg);
    }

    // Get pending operations
    const pendingOps = await this.client.execute(`
      SELECT node_id, SUM(metric_value) as total
      FROM sync_metrics
      WHERE metric_name = 'pending_operations'
      AND timestamp > ?
      GROUP BY node_id
    `, [Date.now() - 60000]); // Last minute

    for (const row of pendingOps.rows) {
      pendingOperations.set(row.node_id as string, row.total as number);
    }

    // Get error counts
    const errors = await this.client.execute(`
      SELECT node_id, COUNT(*) as count
      FROM sync_events
      WHERE success = FALSE
      AND timestamp > ?
      GROUP BY node_id
    `, [Date.now() - 3600000]); // Last hour

    for (const row of errors.rows) {
      errorCounts.set(row.node_id as string, row.count as number);
    }

    // Get throughput
    const throughput = await this.client.execute(`
      SELECT node_id, AVG(metric_value) as avg_throughput
      FROM sync_metrics
      WHERE metric_name = 'throughput'
      AND timestamp > ?
      GROUP BY node_id
    `, [Date.now() - 300000]); // Last 5 minutes

    for (const row of throughput.rows) {
      throughputByNode.set(row.node_id as string, row.avg_throughput as number);
    }

    return {
      replicationLag,
      pendingOperations,
      errorCounts,
      throughputByNode
    };
  }

  // Real-time monitoring
  startRealtimeMonitoring(interval: number = 5000) {
    const monitoringInterval = setInterval(async () => {
      try {
        const metrics = await this.getSyncMetrics();
        const nodeMetrics = await this.getNodeMetrics();
        const replicationMetrics = await this.getReplicationMetrics();

        this.emit('metrics:update', {
          sync: metrics,
          nodes: nodeMetrics,
          replication: replicationMetrics,
          timestamp: new Date()
        });
      } catch (error) {
        this.emit('monitoring:error', error);
      }
    }, interval);

    return () => clearInterval(monitoringInterval);
  }

  // Export metrics for external monitoring systems
  async exportPrometheusMetrics(): Promise<string> {
    const metrics = await this.getSyncMetrics();
    const nodeMetrics = await this.getNodeMetrics();

    let output = '';

    // Sync metrics
    output += `# HELP sync_total Total number of sync operations\n`;
    output += `# TYPE sync_total counter\n`;
    output += `sync_total ${metrics.totalSyncs}\n\n`;

    output += `# HELP sync_success_total Total successful sync operations\n`;
    output += `# TYPE sync_success_total counter\n`;
    output += `sync_success_total ${metrics.successfulSyncs}\n\n`;

    output += `# HELP sync_failed_total Total failed sync operations\n`;
    output += `# TYPE sync_failed_total counter\n`;
    output += `sync_failed_total ${metrics.failedSyncs}\n\n`;

    output += `# HELP sync_latency_seconds Sync operation latency in seconds\n`;
    output += `# TYPE sync_latency_seconds histogram\n`;
    output += `sync_latency_seconds{quantile="0.5"} ${metrics.averageLatency / 1000}\n`;
    output += `sync_latency_seconds{quantile="0.95"} ${metrics.p95Latency / 1000}\n`;
    output += `sync_latency_seconds{quantile="0.99"} ${metrics.p99Latency / 1000}\n\n`;

    output += `# HELP sync_pending_changes Number of pending changes\n`;
    output += `# TYPE sync_pending_changes gauge\n`;
    output += `sync_pending_changes ${metrics.pendingChanges}\n\n`;

    // Node health metrics
    output += `# HELP node_health Node health status (1=healthy, 0=unhealthy)\n`;
    output += `# TYPE node_health gauge\n`;
    for (const node of nodeMetrics) {
      output += `node_health{node_id="${node.nodeId}"} ${node.isHealthy ? 1 : 0}\n`;
    }

    output += `\n# HELP node_sync_lag_seconds Sync lag per node in seconds\n`;
    output += `# TYPE node_sync_lag_seconds gauge\n`;
    for (const node of nodeMetrics) {
      output += `node_sync_lag_seconds{node_id="${node.nodeId}"} ${node.syncLag / 1000}\n`;
    }

    output += `\n# HELP node_error_rate Error rate per node\n`;
    output += `# TYPE node_error_rate gauge\n`;
    for (const node of nodeMetrics) {
      output += `node_error_rate{node_id="${node.nodeId}"} ${node.errorRate}\n`;
    }

    return output;
  }

  // Generate performance report
  async generatePerformanceReport(timeRange?: { start: number; end: number }): Promise<string> {
    const metrics = await this.getSyncMetrics(timeRange);
    const nodeMetrics = await this.getNodeMetrics();
    const replicationMetrics = await this.getReplicationMetrics();

    let report = '# Distributed Sync Performance Report\n\n';
    report += `Generated at: ${new Date().toISOString()}\n\n`;

    report += '## Summary\n';
    report += `- Total Syncs: ${metrics.totalSyncs}\n`;
    report += `- Success Rate: ${metrics.totalSyncs > 0 ? (metrics.successfulSyncs / metrics.totalSyncs * 100).toFixed(2) : 0}%\n`;
    report += `- Average Latency: ${metrics.averageLatency.toFixed(2)}ms\n`;
    report += `- P95 Latency: ${metrics.p95Latency}ms\n`;
    report += `- P99 Latency: ${metrics.p99Latency}ms\n`;
    report += `- Conflicts Resolved: ${metrics.conflictsResolved}\n`;
    report += `- Pending Changes: ${metrics.pendingChanges}\n\n`;

    report += '## Node Health\n';
    for (const node of nodeMetrics) {
      report += `\n### ${node.nodeId}\n`;
      report += `- Status: ${node.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}\n`;
      report += `- Last Seen: ${node.lastSeen.toISOString()}\n`;
      report += `- Sync Lag: ${node.syncLag}ms\n`;
      report += `- Error Rate: ${(node.errorRate * 100).toFixed(2)}%\n`;
      report += `- Throughput: ${node.throughput.toFixed(2)} ops/sec\n`;
    }

    report += '\n## Replication Status\n';
    report += '\n### Replication Lag by Node\n';
    for (const [nodeId, lag] of replicationMetrics.replicationLag) {
      report += `- ${nodeId}: ${lag.toFixed(2)}ms\n`;
    }

    report += '\n### Pending Operations by Node\n';
    for (const [nodeId, count] of replicationMetrics.pendingOperations) {
      report += `- ${nodeId}: ${count} operations\n`;
    }

    report += '\n### Error Counts by Node (Last Hour)\n';
    for (const [nodeId, count] of replicationMetrics.errorCounts) {
      report += `- ${nodeId}: ${count} errors\n`;
    }

    return report;
  }
}