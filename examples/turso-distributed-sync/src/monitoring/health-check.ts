import { createClient, Client } from '@libsql/client';
import { EventEmitter } from 'events';

export interface HealthCheckConfig {
  nodes: Array<{
    id: string;
    url: string;
    authToken?: string;
  }>;
  checkInterval?: number;
  timeout?: number;
  thresholds?: {
    maxLatency?: number;
    maxErrorRate?: number;
    maxSyncLag?: number;
  };
}

export interface HealthStatus {
  nodeId: string;
  isHealthy: boolean;
  checks: {
    connectivity: boolean;
    latency: number;
    syncLag: number;
    errorRate: number;
    diskSpace?: number;
    cpuUsage?: number;
    memoryUsage?: number;
  };
  lastCheck: Date;
  consecutiveFailures: number;
  issues: string[];
}

export interface ClusterHealth {
  overallHealth: 'healthy' | 'degraded' | 'critical';
  healthyNodes: number;
  totalNodes: number;
  averageLatency: number;
  maxSyncLag: number;
  issues: string[];
  recommendations: string[];
}

export class HealthChecker extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private healthStatus: Map<string, HealthStatus> = new Map();
  private checkInterval?: NodeJS.Timer;
  private consecutiveFailures: Map<string, number> = new Map();

  constructor(private config: HealthCheckConfig) {
    super();
    this.initializeClients();
  }

  private async initializeClients() {
    for (const node of this.config.nodes) {
      try {
        const client = createClient({
          url: node.url,
          authToken: node.authToken
        });
        
        this.clients.set(node.id, client);
        this.consecutiveFailures.set(node.id, 0);
        
        // Initialize health status
        this.healthStatus.set(node.id, {
          nodeId: node.id,
          isHealthy: true,
          checks: {
            connectivity: true,
            latency: 0,
            syncLag: 0,
            errorRate: 0
          },
          lastCheck: new Date(),
          consecutiveFailures: 0,
          issues: []
        });
      } catch (error) {
        this.emit('node:initialization-failed', { nodeId: node.id, error });
      }
    }

    await this.setupHealthTables();
  }

  private async setupHealthTables() {
    for (const [nodeId, client] of this.clients) {
      try {
        await client.execute(`
          CREATE TABLE IF NOT EXISTS health_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            is_healthy BOOLEAN NOT NULL,
            latency INTEGER NOT NULL,
            sync_lag INTEGER,
            error_rate REAL,
            disk_space INTEGER,
            cpu_usage REAL,
            memory_usage REAL,
            issues TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        await client.execute(`
          CREATE TABLE IF NOT EXISTS health_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            resolved BOOLEAN DEFAULT FALSE,
            resolved_at INTEGER,
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } catch (error) {
        this.emit('table:setup-failed', { nodeId, error });
      }
    }
  }

  async startHealthChecks() {
    // Perform initial check
    await this.performHealthChecks();

    // Set up periodic checks
    this.checkInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.checkInterval || 10000 // Default 10 seconds
    );

    this.emit('health-checks:started');
  }

  async stopHealthChecks() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.emit('health-checks:stopped');
  }

  private async performHealthChecks() {
    const checkPromises = Array.from(this.clients.entries()).map(
      ([nodeId, client]) => this.checkNode(nodeId, client)
    );

    await Promise.allSettled(checkPromises);

    // Evaluate overall cluster health
    const clusterHealth = await this.evaluateClusterHealth();
    this.emit('cluster:health-updated', clusterHealth);

    // Check for alerts
    await this.checkForAlerts();
  }

  private async checkNode(nodeId: string, client: Client): Promise<void> {
    const startTime = Date.now();
    const issues: string[] = [];
    let isHealthy = true;

    const checks = {
      connectivity: false,
      latency: 0,
      syncLag: 0,
      errorRate: 0,
      diskSpace: 0,
      cpuUsage: 0,
      memoryUsage: 0
    };

    try {
      // 1. Connectivity check
      const connectivityResult = await this.withTimeout(
        client.execute('SELECT 1'),
        this.config.timeout || 5000
      );
      checks.connectivity = true;
      checks.latency = Date.now() - startTime;

      // 2. Sync lag check
      const syncLag = await this.checkSyncLag(client);
      checks.syncLag = syncLag;
      
      if (syncLag > (this.config.thresholds?.maxSyncLag || 60000)) {
        issues.push(`High sync lag: ${syncLag}ms`);
        isHealthy = false;
      }

      // 3. Error rate check
      const errorRate = await this.checkErrorRate(client);
      checks.errorRate = errorRate;
      
      if (errorRate > (this.config.thresholds?.maxErrorRate || 0.05)) {
        issues.push(`High error rate: ${(errorRate * 100).toFixed(2)}%`);
        isHealthy = false;
      }

      // 4. Resource usage checks (if available)
      const resources = await this.checkResourceUsage(client);
      if (resources) {
        checks.diskSpace = resources.diskSpace;
        checks.cpuUsage = resources.cpuUsage;
        checks.memoryUsage = resources.memoryUsage;

        if (resources.diskSpace < 10) { // Less than 10% free
          issues.push(`Low disk space: ${resources.diskSpace}% free`);
          isHealthy = false;
        }

        if (resources.cpuUsage > 90) {
          issues.push(`High CPU usage: ${resources.cpuUsage}%`);
        }

        if (resources.memoryUsage > 90) {
          issues.push(`High memory usage: ${resources.memoryUsage}%`);
        }
      }

      // Reset consecutive failures on success
      this.consecutiveFailures.set(nodeId, 0);

    } catch (error) {
      checks.connectivity = false;
      isHealthy = false;
      issues.push(`Connection failed: ${error.message}`);
      
      // Increment consecutive failures
      const failures = (this.consecutiveFailures.get(nodeId) || 0) + 1;
      this.consecutiveFailures.set(nodeId, failures);
      
      if (failures >= 3) {
        issues.push(`Node unreachable (${failures} consecutive failures)`);
      }
    }

    // Check latency threshold
    if (checks.latency > (this.config.thresholds?.maxLatency || 1000)) {
      issues.push(`High latency: ${checks.latency}ms`);
      if (checks.latency > 5000) {
        isHealthy = false;
      }
    }

    // Update health status
    const status: HealthStatus = {
      nodeId,
      isHealthy,
      checks,
      lastCheck: new Date(),
      consecutiveFailures: this.consecutiveFailures.get(nodeId) || 0,
      issues
    };

    this.healthStatus.set(nodeId, status);

    // Record health check
    if (checks.connectivity) {
      await this.recordHealthCheck(client, status);
    }

    this.emit('node:health-checked', status);
  }

  private async checkSyncLag(client: Client): Promise<number> {
    try {
      const result = await client.execute(`
        SELECT MAX(timestamp) as last_sync 
        FROM sync_log 
        WHERE applied = TRUE
      `);

      if (result.rows.length > 0 && result.rows[0].last_sync) {
        return Date.now() - (result.rows[0].last_sync as number);
      }
    } catch (error) {
      // Table might not exist
    }

    return 0;
  }

  private async checkErrorRate(client: Client): Promise<number> {
    try {
      const result = await client.execute(`
        SELECT 
          COUNT(CASE WHEN success = FALSE THEN 1 END) as failures,
          COUNT(*) as total
        FROM sync_events
        WHERE timestamp > ?
      `, [Date.now() - 3600000]); // Last hour

      if (result.rows.length > 0) {
        const failures = result.rows[0].failures as number || 0;
        const total = result.rows[0].total as number || 0;
        
        return total > 0 ? failures / total : 0;
      }
    } catch (error) {
      // Table might not exist
    }

    return 0;
  }

  private async checkResourceUsage(client: Client): Promise<any> {
    try {
      // This would typically query system tables or external monitoring
      // For now, we'll simulate with a query
      const result = await client.execute(`
        SELECT 
          page_count * page_size as db_size,
          (page_count - freelist_count) * page_size as used_size
        FROM pragma_page_count(), pragma_page_size(), pragma_freelist_count()
      `);

      if (result.rows.length > 0) {
        const dbSize = result.rows[0].db_size as number;
        const usedSize = result.rows[0].used_size as number;
        const usagePercent = (usedSize / dbSize) * 100;

        return {
          diskSpace: 100 - usagePercent,
          cpuUsage: Math.random() * 100, // Simulated
          memoryUsage: Math.random() * 100 // Simulated
        };
      }
    } catch (error) {
      // Not critical
    }

    return null;
  }

  private async recordHealthCheck(client: Client, status: HealthStatus) {
    try {
      await client.execute(`
        INSERT INTO health_checks (
          timestamp, is_healthy, latency, sync_lag, error_rate,
          disk_space, cpu_usage, memory_usage, issues
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        Date.now(),
        status.isHealthy,
        status.checks.latency,
        status.checks.syncLag,
        status.checks.errorRate,
        status.checks.diskSpace || null,
        status.checks.cpuUsage || null,
        status.checks.memoryUsage || null,
        status.issues.length > 0 ? JSON.stringify(status.issues) : null
      ]);
    } catch (error) {
      this.emit('health-record:failed', { nodeId: status.nodeId, error });
    }
  }

  private async evaluateClusterHealth(): Promise<ClusterHealth> {
    const allStatuses = Array.from(this.healthStatus.values());
    const healthyNodes = allStatuses.filter(s => s.isHealthy).length;
    const totalNodes = allStatuses.length;

    const latencies = allStatuses.map(s => s.checks.latency);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    
    const syncLags = allStatuses.map(s => s.checks.syncLag);
    const maxSyncLag = Math.max(...syncLags);

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Determine overall health
    let overallHealth: 'healthy' | 'degraded' | 'critical';
    
    if (healthyNodes === totalNodes) {
      overallHealth = 'healthy';
    } else if (healthyNodes >= totalNodes / 2) {
      overallHealth = 'degraded';
      issues.push(`${totalNodes - healthyNodes} nodes are unhealthy`);
    } else {
      overallHealth = 'critical';
      issues.push(`Only ${healthyNodes}/${totalNodes} nodes are healthy`);
    }

    // Check for common issues
    if (avgLatency > 1000) {
      issues.push(`High average latency: ${avgLatency.toFixed(0)}ms`);
      recommendations.push('Consider optimizing network connectivity between nodes');
    }

    if (maxSyncLag > 60000) {
      issues.push(`High sync lag detected: ${(maxSyncLag / 1000).toFixed(0)}s`);
      recommendations.push('Check for network issues or high write load');
    }

    // Check for split-brain scenario
    const unreachableNodes = allStatuses.filter(s => s.consecutiveFailures >= 3);
    if (unreachableNodes.length > 0 && unreachableNodes.length < totalNodes) {
      issues.push('Potential split-brain scenario detected');
      recommendations.push('Verify network partitioning and consider manual intervention');
    }

    return {
      overallHealth,
      healthyNodes,
      totalNodes,
      averageLatency: avgLatency,
      maxSyncLag,
      issues,
      recommendations
    };
  }

  private async checkForAlerts() {
    const clusterHealth = await this.evaluateClusterHealth();

    // Check for critical alerts
    if (clusterHealth.overallHealth === 'critical') {
      await this.createAlert(
        'cluster_critical',
        'critical',
        'Cluster health is critical',
        {
          healthyNodes: clusterHealth.healthyNodes,
          totalNodes: clusterHealth.totalNodes,
          issues: clusterHealth.issues
        }
      );
    }

    // Check for node-specific alerts
    for (const [nodeId, status] of this.healthStatus) {
      if (status.consecutiveFailures >= 5) {
        await this.createAlert(
          'node_unreachable',
          'critical',
          `Node ${nodeId} is unreachable`,
          { nodeId, failures: status.consecutiveFailures }
        );
      }

      if (status.checks.errorRate > 0.1) {
        await this.createAlert(
          'high_error_rate',
          'warning',
          `Node ${nodeId} has high error rate`,
          { nodeId, errorRate: status.checks.errorRate }
        );
      }
    }
  }

  private async createAlert(
    alertType: string,
    severity: 'info' | 'warning' | 'critical',
    message: string,
    metadata?: any
  ) {
    // Store alert in primary node
    const primaryClient = this.clients.values().next().value;
    if (!primaryClient) return;

    try {
      await primaryClient.execute(`
        INSERT INTO health_alerts (alert_type, severity, message, timestamp, metadata)
        VALUES (?, ?, ?, ?, ?)
      `, [
        alertType,
        severity,
        message,
        Date.now(),
        metadata ? JSON.stringify(metadata) : null
      ]);

      this.emit('alert:created', { alertType, severity, message, metadata });
    } catch (error) {
      this.emit('alert:failed', { error });
    }
  }

  async getHealthStatus(): Promise<Map<string, HealthStatus>> {
    return this.healthStatus;
  }

  async getClusterHealth(): Promise<ClusterHealth> {
    return this.evaluateClusterHealth();
  }

  async getHealthHistory(nodeId: string, hours: number = 24): Promise<any[]> {
    const client = this.clients.get(nodeId);
    if (!client) return [];

    try {
      const result = await client.execute(`
        SELECT * FROM health_checks
        WHERE timestamp > ?
        ORDER BY timestamp DESC
      `, [Date.now() - (hours * 3600000)]);

      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async getActiveAlerts(): Promise<any[]> {
    const primaryClient = this.clients.values().next().value;
    if (!primaryClient) return [];

    try {
      const result = await primaryClient.execute(`
        SELECT * FROM health_alerts
        WHERE resolved = FALSE
        ORDER BY timestamp DESC
      `);

      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async resolveAlert(alertId: number) {
    const primaryClient = this.clients.values().next().value;
    if (!primaryClient) return;

    try {
      await primaryClient.execute(`
        UPDATE health_alerts
        SET resolved = TRUE, resolved_at = ?
        WHERE id = ?
      `, [Date.now(), alertId]);

      this.emit('alert:resolved', { alertId });
    } catch (error) {
      this.emit('alert:resolve-failed', { alertId, error });
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }
}