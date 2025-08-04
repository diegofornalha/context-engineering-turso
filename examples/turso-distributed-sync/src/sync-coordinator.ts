import { createClient, Client, ResultSet } from '@libsql/client';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { ConflictResolver } from './conflict-resolver';

export interface SyncConfig {
  primary: string;
  replicas: string[];
  authToken?: string;
  syncInterval?: number;
  conflictStrategy?: 'last-write-wins' | 'custom' | 'merge';
  enableRealtime?: boolean;
}

export interface SyncStatus {
  nodeId: string;
  lastSync: Date;
  pendingChanges: number;
  isHealthy: boolean;
  latency: number;
}

export interface ChangeSet {
  id: string;
  nodeId: string;
  timestamp: number;
  operation: 'insert' | 'update' | 'delete';
  table: string;
  data: Record<string, any>;
  version: number;
}

export class SyncCoordinator extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private conflictResolver: ConflictResolver;
  private syncInterval: NodeJS.Timer | null = null;
  private wsConnections: Map<string, WebSocket> = new Map();
  private changeLog: ChangeSet[] = [];
  private nodeId: string;

  constructor(private config: SyncConfig) {
    super();
    this.nodeId = this.generateNodeId();
    this.conflictResolver = new ConflictResolver(config.conflictStrategy || 'last-write-wins');
    this.initializeClients();
  }

  private generateNodeId(): string {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async initializeClients() {
    // Initialize primary connection
    const primaryClient = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });
    this.clients.set('primary', primaryClient);

    // Initialize replica connections
    for (const [index, replica] of this.config.replicas.entries()) {
      const replicaClient = createClient({
        url: replica,
        authToken: this.config.authToken
      });
      this.clients.set(`replica-${index}`, replicaClient);
    }

    await this.setupChangeTracking();
    
    if (this.config.enableRealtime) {
      await this.setupRealtimeSync();
    }
  }

  private async setupChangeTracking() {
    const primary = this.clients.get('primary')!;
    
    // Create sync metadata tables
    await primary.execute(`
      CREATE TABLE IF NOT EXISTS sync_log (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        operation TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        data TEXT NOT NULL,
        version INTEGER NOT NULL,
        applied BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await primary.execute(`
      CREATE TABLE IF NOT EXISTS sync_status (
        node_id TEXT PRIMARY KEY,
        last_sync DATETIME NOT NULL,
        pending_changes INTEGER DEFAULT 0,
        is_healthy BOOLEAN DEFAULT TRUE,
        latency INTEGER DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create triggers for change tracking
    const tables = await this.getTrackedTables();
    for (const table of tables) {
      await this.createTableTriggers(table);
    }
  }

  private async createTableTriggers(tableName: string) {
    const primary = this.clients.get('primary')!;
    
    // Insert trigger
    await primary.execute(`
      CREATE TRIGGER IF NOT EXISTS ${tableName}_insert_trigger
      AFTER INSERT ON ${tableName}
      BEGIN
        INSERT INTO sync_log (id, node_id, timestamp, operation, table_name, record_id, data, version)
        VALUES (
          lower(hex(randomblob(16))),
          '${this.nodeId}',
          unixepoch(),
          'insert',
          '${tableName}',
          NEW.id,
          json_object(${await this.getColumnsList(tableName, 'NEW')}),
          1
        );
      END;
    `);

    // Update trigger
    await primary.execute(`
      CREATE TRIGGER IF NOT EXISTS ${tableName}_update_trigger
      AFTER UPDATE ON ${tableName}
      BEGIN
        INSERT INTO sync_log (id, node_id, timestamp, operation, table_name, record_id, data, version)
        VALUES (
          lower(hex(randomblob(16))),
          '${this.nodeId}',
          unixepoch(),
          'update',
          '${tableName}',
          NEW.id,
          json_object(${await this.getColumnsList(tableName, 'NEW')}),
          (SELECT COALESCE(MAX(version), 0) + 1 FROM sync_log WHERE record_id = NEW.id)
        );
      END;
    `);

    // Delete trigger
    await primary.execute(`
      CREATE TRIGGER IF NOT EXISTS ${tableName}_delete_trigger
      AFTER DELETE ON ${tableName}
      BEGIN
        INSERT INTO sync_log (id, node_id, timestamp, operation, table_name, record_id, data, version)
        VALUES (
          lower(hex(randomblob(16))),
          '${this.nodeId}',
          unixepoch(),
          'delete',
          '${tableName}',
          OLD.id,
          json_object('id', OLD.id),
          (SELECT COALESCE(MAX(version), 0) + 1 FROM sync_log WHERE record_id = OLD.id)
        );
      END;
    `);
  }

  private async getColumnsList(tableName: string, prefix: string): Promise<string> {
    const primary = this.clients.get('primary')!;
    const result = await primary.execute(`PRAGMA table_info(${tableName})`);
    
    return result.rows.map((row: any) => 
      `'${row.name}', ${prefix}.${row.name}`
    ).join(', ');
  }

  private async getTrackedTables(): Promise<string[]> {
    const primary = this.clients.get('primary')!;
    const result = await primary.execute(`
      SELECT name FROM sqlite_master 
      WHERE type = 'table' 
      AND name NOT LIKE 'sync_%' 
      AND name NOT LIKE 'sqlite_%'
    `);
    
    return result.rows.map((row: any) => row.name);
  }

  async startSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Initial sync
    await this.performSync();

    // Set up periodic sync
    this.syncInterval = setInterval(
      () => this.performSync(),
      this.config.syncInterval || 5000
    );

    this.emit('sync:started');
  }

  async stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Close WebSocket connections
    for (const [_, ws] of this.wsConnections) {
      ws.close();
    }
    this.wsConnections.clear();

    this.emit('sync:stopped');
  }

  private async performSync() {
    try {
      const startTime = Date.now();
      
      // Get pending changes from primary
      const pendingChanges = await this.getPendingChanges();
      
      if (pendingChanges.length === 0) {
        return;
      }

      // Apply changes to each replica
      const syncPromises = [];
      for (const [replicaId, client] of this.clients) {
        if (replicaId !== 'primary') {
          syncPromises.push(this.syncToReplica(replicaId, client, pendingChanges));
        }
      }

      await Promise.all(syncPromises);

      // Mark changes as applied
      await this.markChangesAsApplied(pendingChanges);

      // Update sync status
      await this.updateSyncStatus(Date.now() - startTime);

      this.emit('sync:completed', {
        changesApplied: pendingChanges.length,
        duration: Date.now() - startTime
      });
    } catch (error) {
      this.emit('sync:error', error);
    }
  }

  private async getPendingChanges(): Promise<ChangeSet[]> {
    const primary = this.clients.get('primary')!;
    const result = await primary.execute(`
      SELECT * FROM sync_log 
      WHERE applied = FALSE 
      ORDER BY timestamp ASC 
      LIMIT 1000
    `);

    return result.rows.map((row: any) => ({
      id: row.id,
      nodeId: row.node_id,
      timestamp: row.timestamp,
      operation: row.operation,
      table: row.table_name,
      data: JSON.parse(row.data),
      version: row.version
    }));
  }

  private async syncToReplica(
    replicaId: string, 
    client: Client, 
    changes: ChangeSet[]
  ) {
    const batch = client.batch();
    
    for (const change of changes) {
      try {
        const statement = this.buildSyncStatement(change);
        batch.push(statement);
      } catch (error) {
        // Handle conflicts
        const resolved = await this.conflictResolver.resolve(change, error);
        if (resolved) {
          batch.push(resolved);
        }
      }
    }

    await batch.execute();
    
    this.emit('replica:synced', { replicaId, changes: changes.length });
  }

  private buildSyncStatement(change: ChangeSet): string {
    switch (change.operation) {
      case 'insert':
        const insertColumns = Object.keys(change.data).join(', ');
        const insertValues = Object.values(change.data)
          .map(v => typeof v === 'string' ? `'${v}'` : v)
          .join(', ');
        return `INSERT OR IGNORE INTO ${change.table} (${insertColumns}) VALUES (${insertValues})`;
      
      case 'update':
        const updateSet = Object.entries(change.data)
          .map(([k, v]) => `${k} = ${typeof v === 'string' ? `'${v}'` : v}`)
          .join(', ');
        return `UPDATE ${change.table} SET ${updateSet} WHERE id = '${change.data.id}'`;
      
      case 'delete':
        return `DELETE FROM ${change.table} WHERE id = '${change.data.id}'`;
      
      default:
        throw new Error(`Unknown operation: ${change.operation}`);
    }
  }

  private async markChangesAsApplied(changes: ChangeSet[]) {
    const primary = this.clients.get('primary')!;
    const changeIds = changes.map(c => `'${c.id}'`).join(', ');
    
    await primary.execute(`
      UPDATE sync_log 
      SET applied = TRUE 
      WHERE id IN (${changeIds})
    `);
  }

  private async updateSyncStatus(latency: number) {
    const primary = this.clients.get('primary')!;
    
    await primary.execute(`
      INSERT OR REPLACE INTO sync_status (node_id, last_sync, pending_changes, is_healthy, latency)
      VALUES (
        '${this.nodeId}',
        CURRENT_TIMESTAMP,
        (SELECT COUNT(*) FROM sync_log WHERE applied = FALSE),
        TRUE,
        ${latency}
      )
    `);
  }

  private async setupRealtimeSync() {
    // WebSocket server for real-time sync
    const wss = new WebSocket.Server({ port: 8080 });
    
    wss.on('connection', (ws) => {
      const connectionId = this.generateNodeId();
      this.wsConnections.set(connectionId, ws);
      
      ws.on('message', async (message) => {
        const change = JSON.parse(message.toString()) as ChangeSet;
        await this.handleRealtimeChange(change);
        
        // Broadcast to other connections
        for (const [id, connection] of this.wsConnections) {
          if (id !== connectionId && connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify(change));
          }
        }
      });
      
      ws.on('close', () => {
        this.wsConnections.delete(connectionId);
      });
    });
  }

  private async handleRealtimeChange(change: ChangeSet) {
    // Apply change immediately to all replicas
    const promises = [];
    for (const [replicaId, client] of this.clients) {
      if (replicaId !== 'primary') {
        promises.push(this.syncToReplica(replicaId, client, [change]));
      }
    }
    
    await Promise.all(promises);
    this.emit('realtime:change', change);
  }

  async getStatus(): Promise<SyncStatus[]> {
    const primary = this.clients.get('primary')!;
    const result = await primary.execute('SELECT * FROM sync_status');
    
    return result.rows.map((row: any) => ({
      nodeId: row.node_id,
      lastSync: new Date(row.last_sync),
      pendingChanges: row.pending_changes,
      isHealthy: Boolean(row.is_healthy),
      latency: row.latency
    }));
  }

  async resolveConflicts(strategy?: 'last-write-wins' | 'custom' | 'merge') {
    const conflicts = await this.detectConflicts();
    const resolved = [];
    
    for (const conflict of conflicts) {
      const resolution = await this.conflictResolver.resolve(
        conflict.changes[0],
        conflict.changes[1],
        strategy
      );
      resolved.push(resolution);
    }
    
    return resolved;
  }

  private async detectConflicts(): Promise<any[]> {
    const primary = this.clients.get('primary')!;
    
    const result = await primary.execute(`
      SELECT record_id, COUNT(*) as conflict_count
      FROM sync_log
      WHERE applied = FALSE
      GROUP BY record_id, version
      HAVING conflict_count > 1
    `);
    
    const conflicts = [];
    for (const row of result.rows) {
      const changes = await primary.execute(`
        SELECT * FROM sync_log
        WHERE record_id = ? AND applied = FALSE
        ORDER BY timestamp DESC
      `, [row.record_id]);
      
      conflicts.push({
        recordId: row.record_id,
        changes: changes.rows
      });
    }
    
    return conflicts;
  }
}