import { createClient, Client } from '@libsql/client';
import { EventEmitter } from 'events';

export interface MasterSlaveConfig {
  master: {
    url: string;
    authToken?: string;
  };
  slaves: Array<{
    url: string;
    authToken?: string;
    readonly?: boolean;
  }>;
  replicationDelay?: number;
  batchSize?: number;
}

export class MasterSlaveSync extends EventEmitter {
  private masterClient: Client;
  private slaveClients: Map<string, Client> = new Map();
  private replicationLog: Map<string, number> = new Map();
  private isReplicating = false;

  constructor(private config: MasterSlaveConfig) {
    super();
    this.initializeConnections();
  }

  private async initializeConnections() {
    // Connect to master
    this.masterClient = createClient({
      url: this.config.master.url,
      authToken: this.config.master.authToken
    });

    // Connect to slaves
    for (const [index, slave] of this.config.slaves.entries()) {
      const slaveClient = createClient({
        url: slave.url,
        authToken: slave.authToken
      });
      this.slaveClients.set(`slave-${index}`, slaveClient);
    }

    await this.setupReplicationLog();
  }

  private async setupReplicationLog() {
    // Create replication tracking table on master
    await this.masterClient.execute(`
      CREATE TABLE IF NOT EXISTS replication_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        operation TEXT NOT NULL,
        query TEXT NOT NULL,
        checksum TEXT,
        replicated_to TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create last applied position table on slaves
    for (const [slaveId, client] of this.slaveClients) {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS replication_position (
          slave_id TEXT PRIMARY KEY,
          last_applied_id INTEGER NOT NULL,
          last_applied_timestamp INTEGER NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  }

  async startReplication() {
    if (this.isReplicating) return;
    
    this.isReplicating = true;
    this.emit('replication:started');

    while (this.isReplicating) {
      try {
        await this.replicateBatch();
        await this.delay(this.config.replicationDelay || 1000);
      } catch (error) {
        this.emit('replication:error', error);
        await this.delay(5000); // Back off on error
      }
    }
  }

  async stopReplication() {
    this.isReplicating = false;
    this.emit('replication:stopped');
  }

  private async replicateBatch() {
    const batchSize = this.config.batchSize || 100;

    for (const [slaveId, slaveClient] of this.slaveClients) {
      try {
        // Get last applied position for this slave
        const lastPosition = await this.getLastAppliedPosition(slaveId, slaveClient);
        
        // Get pending changes from master
        const changes = await this.masterClient.execute(`
          SELECT * FROM replication_log
          WHERE id > ?
          ORDER BY id ASC
          LIMIT ?
        `, [lastPosition, batchSize]);

        if (changes.rows.length === 0) continue;

        // Apply changes to slave
        await this.applyChangesToSlave(slaveId, slaveClient, changes.rows);

        this.emit('replication:progress', {
          slaveId,
          applied: changes.rows.length,
          lastId: changes.rows[changes.rows.length - 1].id
        });
      } catch (error) {
        this.emit('slave:error', { slaveId, error });
      }
    }
  }

  private async getLastAppliedPosition(slaveId: string, client: Client): Promise<number> {
    const result = await client.execute(`
      SELECT last_applied_id FROM replication_position
      WHERE slave_id = ?
    `, [slaveId]);

    return result.rows[0]?.last_applied_id || 0;
  }

  private async applyChangesToSlave(
    slaveId: string,
    client: Client,
    changes: any[]
  ) {
    const batch = client.batch();

    for (const change of changes) {
      // Skip DDL statements and replication-specific queries
      if (this.shouldSkipQuery(change.query)) continue;

      batch.push(change.query);
    }

    await batch.execute();

    // Update last applied position
    const lastChange = changes[changes.length - 1];
    await client.execute(`
      INSERT OR REPLACE INTO replication_position (slave_id, last_applied_id, last_applied_timestamp)
      VALUES (?, ?, ?)
    `, [slaveId, lastChange.id, lastChange.timestamp]);

    // Update master's replication log
    await this.updateReplicationStatus(changes, slaveId);
  }

  private shouldSkipQuery(query: string): boolean {
    const skipPatterns = [
      /^CREATE TABLE.*replication_/i,
      /^INSERT INTO replication_/i,
      /^UPDATE replication_/i,
      /^DELETE FROM replication_/i
    ];

    return skipPatterns.some(pattern => pattern.test(query));
  }

  private async updateReplicationStatus(changes: any[], slaveId: string) {
    for (const change of changes) {
      const replicatedTo = JSON.parse(change.replicated_to || '[]');
      if (!replicatedTo.includes(slaveId)) {
        replicatedTo.push(slaveId);
        
        await this.masterClient.execute(`
          UPDATE replication_log
          SET replicated_to = ?
          WHERE id = ?
        `, [JSON.stringify(replicatedTo), change.id]);
      }
    }
  }

  // Intercept write operations on master
  async executeOnMaster(query: string, params?: any[]): Promise<any> {
    const result = await this.masterClient.execute(query, params);

    // Log the operation for replication
    if (this.isWriteOperation(query)) {
      await this.masterClient.execute(`
        INSERT INTO replication_log (timestamp, operation, query, checksum)
        VALUES (?, ?, ?, ?)
      `, [
        Date.now(),
        this.getOperationType(query),
        this.prepareQueryForReplication(query, params),
        this.calculateChecksum(query, params)
      ]);
    }

    return result;
  }

  private isWriteOperation(query: string): boolean {
    const writePatterns = /^\s*(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)/i;
    return writePatterns.test(query);
  }

  private getOperationType(query: string): string {
    const match = query.match(/^\s*(\w+)/i);
    return match ? match[1].toUpperCase() : 'UNKNOWN';
  }

  private prepareQueryForReplication(query: string, params?: any[]): string {
    if (!params || params.length === 0) return query;

    // Replace placeholders with actual values
    let preparedQuery = query;
    for (const param of params) {
      preparedQuery = preparedQuery.replace('?', this.formatParam(param));
    }
    return preparedQuery;
  }

  private formatParam(param: any): string {
    if (param === null) return 'NULL';
    if (typeof param === 'string') return `'${param.replace(/'/g, "''")}'`;
    if (typeof param === 'boolean') return param ? '1' : '0';
    if (param instanceof Date) return `'${param.toISOString()}'`;
    return String(param);
  }

  private calculateChecksum(query: string, params?: any[]): string {
    const crypto = require('crypto');
    const content = query + JSON.stringify(params || []);
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check for replication
  async getReplicationLag(): Promise<Map<string, number>> {
    const lag = new Map<string, number>();

    const masterPosition = await this.masterClient.execute(
      'SELECT MAX(id) as max_id, MAX(timestamp) as max_timestamp FROM replication_log'
    );

    const masterMaxId = masterPosition.rows[0]?.max_id || 0;
    const masterTimestamp = masterPosition.rows[0]?.max_timestamp || Date.now();

    for (const [slaveId, client] of this.slaveClients) {
      const position = await this.getLastAppliedPosition(slaveId, client);
      const timeLag = Date.now() - masterTimestamp;
      const positionLag = masterMaxId - position;

      lag.set(slaveId, Math.max(timeLag, positionLag));
    }

    return lag;
  }

  // Promote slave to master (for failover)
  async promoteSlave(slaveId: string): Promise<void> {
    const slaveClient = this.slaveClients.get(slaveId);
    if (!slaveClient) {
      throw new Error(`Slave ${slaveId} not found`);
    }

    // Stop replication
    await this.stopReplication();

    // Swap master and slave
    const oldMaster = this.masterClient;
    this.masterClient = slaveClient;
    this.slaveClients.delete(slaveId);
    this.slaveClients.set('old-master', oldMaster);

    // Update configuration
    this.emit('failover:completed', { newMaster: slaveId });
  }
}