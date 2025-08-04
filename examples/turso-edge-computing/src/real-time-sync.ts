/**
 * Real-time Sync Engine for Turso Edge Computing
 * Provides real-time data synchronization across edge locations
 */

import { TursoClient } from '@turso/client';
import { EventEmitter } from 'events';

export interface SyncEvent {
  id: string;
  type: 'insert' | 'update' | 'delete' | 'sync';
  table: string;
  recordId: string;
  data?: any;
  sourceRegion: string;
  timestamp: number;
  version: number;
}

export interface SyncConfig {
  syncInterval: number; // Milliseconds between sync cycles
  batchSize: number; // Max events per sync batch
  conflictStrategy: 'last-write-wins' | 'version-based' | 'custom';
  enableWebSocket: boolean;
  compressionThreshold: number; // Bytes
}

export interface SyncStatus {
  regionId: string;
  isConnected: boolean;
  lastSync: number;
  pendingEvents: number;
  syncLag: number;
  errorCount: number;
}

export class RealTimeSyncEngine extends EventEmitter {
  private config: SyncConfig;
  private tursoClient: TursoClient;
  private regions: Map<string, SyncStatus> = new Map();
  private eventQueue: Map<string, SyncEvent[]> = new Map();
  private syncTimer?: NodeJS.Timeout;
  private websockets: Map<string, WebSocket> = new Map();
  private localRegionId: string;
  private isRunning: boolean = false;

  constructor(config: SyncConfig, tursoClient: TursoClient, localRegionId: string) {
    super();
    this.config = config;
    this.tursoClient = tursoClient;
    this.localRegionId = localRegionId;
  }

  /**
   * Initialize real-time sync infrastructure
   */
  async initialize(): Promise<void> {
    // Create sync event log table
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS sync_event_log (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          data TEXT,
          source_region TEXT NOT NULL,
          target_regions TEXT,
          timestamp INTEGER NOT NULL,
          version INTEGER DEFAULT 1,
          status TEXT DEFAULT 'pending',
          retry_count INTEGER DEFAULT 0,
          compressed BOOLEAN DEFAULT FALSE,
          checksum TEXT,
          INDEX idx_sync_timestamp (timestamp),
          INDEX idx_sync_status (status, timestamp),
          INDEX idx_sync_table (table_name, timestamp)
        )
      `
    });

    // Create sync checkpoint table
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS sync_checkpoints (
          region_id TEXT PRIMARY KEY,
          last_sync_id TEXT,
          last_sync_timestamp INTEGER,
          events_synced INTEGER DEFAULT 0,
          bytes_synced INTEGER DEFAULT 0,
          conflicts_resolved INTEGER DEFAULT 0,
          errors_count INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Create conflict resolution log
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_id TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          local_version INTEGER,
          remote_version INTEGER,
          local_data TEXT,
          remote_data TEXT,
          resolution_strategy TEXT,
          resolved_data TEXT,
          resolved_at INTEGER DEFAULT (unixepoch())
        )
      `
    });

    // Create sync metrics table
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS sync_metrics (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          region_pair TEXT NOT NULL,
          sync_duration_ms REAL,
          events_count INTEGER,
          bytes_transferred INTEGER,
          compression_ratio REAL,
          success BOOLEAN,
          timestamp INTEGER DEFAULT (unixepoch()),
          INDEX idx_sync_metrics (region_pair, timestamp)
        )
      `
    });
  }

  /**
   * Start real-time sync engine
   */
  async start(regions: string[]): Promise<void> {
    if (this.isRunning) {
      throw new Error('Sync engine is already running');
    }

    this.isRunning = true;

    // Initialize regions
    for (const regionId of regions) {
      this.regions.set(regionId, {
        regionId,
        isConnected: false,
        lastSync: 0,
        pendingEvents: 0,
        syncLag: 0,
        errorCount: 0
      });

      this.eventQueue.set(regionId, []);

      // Initialize checkpoint
      await this.tursoClient.execute_query({
        query: `
          INSERT OR IGNORE INTO sync_checkpoints (region_id, last_sync_timestamp)
          VALUES (?, ?)
        `,
        params: [regionId, Date.now()]
      });
    }

    // Start WebSocket connections if enabled
    if (this.config.enableWebSocket) {
      await this.initializeWebSockets(regions);
    }

    // Start sync timer
    this.syncTimer = setInterval(() => {
      this.performSync().catch(error => {
        console.error('Sync error:', error);
        this.emit('error', error);
      });
    }, this.config.syncInterval);

    // Initial sync
    await this.performSync();

    this.emit('started', { regions });
  }

  /**
   * Stop sync engine
   */
  async stop(): Promise<void> {
    this.isRunning = false;

    // Clear sync timer
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }

    // Close WebSocket connections
    for (const [regionId, ws] of this.websockets.entries()) {
      ws.close();
      this.websockets.delete(regionId);
    }

    this.emit('stopped');
  }

  /**
   * Publish event for real-time sync
   */
  async publish(event: Omit<SyncEvent, 'id' | 'timestamp'>): Promise<void> {
    const syncEvent: SyncEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      sourceRegion: this.localRegionId
    };

    // Store in event log
    const compressed = await this.shouldCompress(syncEvent);
    const serialized = await this.serializeEvent(syncEvent, compressed);

    await this.tursoClient.execute_query({
      query: `
        INSERT INTO sync_event_log 
        (id, event_type, table_name, record_id, data, source_region, 
         timestamp, version, compressed, checksum)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        syncEvent.id,
        syncEvent.type,
        syncEvent.table,
        syncEvent.recordId,
        serialized.data,
        syncEvent.sourceRegion,
        syncEvent.timestamp,
        syncEvent.version,
        compressed,
        serialized.checksum
      ]
    });

    // Queue for immediate sync if WebSocket available
    if (this.config.enableWebSocket) {
      await this.broadcastEvent(syncEvent);
    }

    // Add to queues for batch sync
    for (const [regionId, queue] of this.eventQueue.entries()) {
      if (regionId !== this.localRegionId) {
        queue.push(syncEvent);
      }
    }

    this.emit('published', syncEvent);
  }

  /**
   * Subscribe to real-time events
   */
  subscribe(
    table: string,
    callback: (event: SyncEvent) => void
  ): () => void {
    const listener = (event: SyncEvent) => {
      if (event.table === table) {
        callback(event);
      }
    };

    this.on('synced', listener);

    // Return unsubscribe function
    return () => {
      this.off('synced', listener);
    };
  }

  /**
   * Perform sync cycle
   */
  private async performSync(): Promise<void> {
    const syncStart = Date.now();
    const syncResults: Map<string, any> = new Map();

    // Sync with each region
    for (const [regionId, status] of this.regions.entries()) {
      if (regionId === this.localRegionId) continue;

      try {
        const result = await this.syncWithRegion(regionId);
        syncResults.set(regionId, result);

        // Update status
        status.isConnected = true;
        status.lastSync = Date.now();
        status.pendingEvents = 0;
        status.syncLag = Date.now() - result.lastEventTimestamp;
        
      } catch (error) {
        console.error(`Sync failed with ${regionId}:`, error);
        status.isConnected = false;
        status.errorCount++;
        
        syncResults.set(regionId, { error });
      }
    }

    // Log sync metrics
    await this.logSyncMetrics(syncResults, Date.now() - syncStart);

    this.emit('syncComplete', {
      duration: Date.now() - syncStart,
      results: syncResults
    });
  }

  /**
   * Sync with specific region
   */
  private async syncWithRegion(regionId: string): Promise<any> {
    const startTime = Date.now();
    
    // Get checkpoint
    const checkpoint = await this.getCheckpoint(regionId);
    
    // Fetch new events since checkpoint
    const events = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT * FROM sync_event_log 
        WHERE timestamp > ? 
          AND source_region != ?
          AND status = 'pending'
        ORDER BY timestamp ASC
        LIMIT ?
      `,
      params: [checkpoint.last_sync_timestamp || 0, regionId, this.config.batchSize]
    });

    let eventsProcessed = 0;
    let bytesTransferred = 0;
    let conflictsResolved = 0;
    let lastEventTimestamp = checkpoint.last_sync_timestamp || 0;

    // Process each event
    for (const row of events.rows) {
      try {
        const event = await this.deserializeEvent(row);
        
        // Apply event locally
        await this.applyEvent(event);
        
        eventsProcessed++;
        bytesTransferred += row.data.length;
        lastEventTimestamp = Math.max(lastEventTimestamp, event.timestamp);

        // Mark as synced
        await this.tursoClient.execute_query({
          query: `UPDATE sync_event_log SET status = 'synced' WHERE id = ?`,
          params: [event.id]
        });

        // Emit synced event
        this.emit('synced', event);

      } catch (error) {
        if (error.message?.includes('conflict')) {
          // Handle conflict
          const resolved = await this.resolveConflict(event, error);
          if (resolved) {
            conflictsResolved++;
          }
        } else {
          throw error;
        }
      }
    }

    // Update checkpoint
    if (eventsProcessed > 0) {
      await this.updateCheckpoint(regionId, {
        lastEventId: events.rows[events.rows.length - 1].id,
        lastEventTimestamp,
        eventsProcessed,
        bytesTransferred,
        conflictsResolved
      });
    }

    // Send our events to the region
    const outgoingEvents = this.eventQueue.get(regionId) || [];
    if (outgoingEvents.length > 0) {
      // In production, this would send to actual region
      // For now, just clear the queue
      this.eventQueue.set(regionId, []);
    }

    return {
      eventsReceived: eventsProcessed,
      eventsSent: outgoingEvents.length,
      bytesTransferred,
      conflictsResolved,
      lastEventTimestamp,
      duration: Date.now() - startTime
    };
  }

  /**
   * Apply sync event locally
   */
  private async applyEvent(event: SyncEvent): Promise<void> {
    switch (event.type) {
      case 'insert':
        await this.applyInsert(event);
        break;
      case 'update':
        await this.applyUpdate(event);
        break;
      case 'delete':
        await this.applyDelete(event);
        break;
      case 'sync':
        // Meta sync event, no action needed
        break;
      default:
        throw new Error(`Unknown event type: ${event.type}`);
    }
  }

  /**
   * Apply insert event
   */
  private async applyInsert(event: SyncEvent): Promise<void> {
    if (!event.data) {
      throw new Error('Insert event missing data');
    }

    const columns = Object.keys(event.data);
    const values = Object.values(event.data);
    const placeholders = columns.map(() => '?').join(', ');

    try {
      await this.tursoClient.execute_query({
        query: `INSERT INTO ${event.table} (${columns.join(', ')}) VALUES (${placeholders})`,
        params: values
      });
    } catch (error) {
      if (error.message?.includes('UNIQUE constraint')) {
        throw new Error(`conflict: Record already exists`);
      }
      throw error;
    }
  }

  /**
   * Apply update event
   */
  private async applyUpdate(event: SyncEvent): Promise<void> {
    if (!event.data) {
      throw new Error('Update event missing data');
    }

    // Check version for conflict detection
    const existing = await this.tursoClient.execute_read_only_query({
      query: `SELECT version FROM ${event.table} WHERE id = ?`,
      params: [event.recordId]
    });

    if (existing.rows.length > 0) {
      const localVersion = existing.rows[0].version || 0;
      if (localVersion >= event.version && this.config.conflictStrategy === 'version-based') {
        throw new Error(`conflict: Local version ${localVersion} >= remote version ${event.version}`);
      }
    }

    const updates = Object.keys(event.data)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`);
    
    const values = Object.keys(event.data)
      .filter(key => key !== 'id')
      .map(key => event.data[key]);

    await this.tursoClient.execute_query({
      query: `UPDATE ${event.table} SET ${updates.join(', ')}, version = ? WHERE id = ?`,
      params: [...values, event.version, event.recordId]
    });
  }

  /**
   * Apply delete event
   */
  private async applyDelete(event: SyncEvent): Promise<void> {
    await this.tursoClient.execute_query({
      query: `DELETE FROM ${event.table} WHERE id = ?`,
      params: [event.recordId]
    });
  }

  /**
   * Resolve sync conflict
   */
  private async resolveConflict(event: SyncEvent, error: any): Promise<boolean> {
    // Get local data
    const localData = await this.tursoClient.execute_read_only_query({
      query: `SELECT * FROM ${event.table} WHERE id = ?`,
      params: [event.recordId]
    });

    let resolvedData: any;

    switch (this.config.conflictStrategy) {
      case 'last-write-wins':
        resolvedData = event.data;
        break;

      case 'version-based':
        if (localData.rows.length > 0) {
          const localVersion = localData.rows[0].version || 0;
          resolvedData = event.version > localVersion ? event.data : localData.rows[0];
        } else {
          resolvedData = event.data;
        }
        break;

      case 'custom':
        // Emit conflict event for custom resolution
        this.emit('conflict', {
          event,
          localData: localData.rows[0],
          error
        });
        return false;
    }

    // Log conflict resolution
    await this.tursoClient.execute_query({
      query: `
        INSERT INTO sync_conflicts 
        (event_id, table_name, record_id, local_version, remote_version, 
         local_data, remote_data, resolution_strategy, resolved_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        event.id,
        event.table,
        event.recordId,
        localData.rows[0]?.version || 0,
        event.version,
        JSON.stringify(localData.rows[0] || {}),
        JSON.stringify(event.data),
        this.config.conflictStrategy,
        JSON.stringify(resolvedData)
      ]
    });

    // Apply resolved data
    if (event.type === 'update') {
      event.data = resolvedData;
      await this.applyUpdate(event);
    }

    return true;
  }

  /**
   * Initialize WebSocket connections
   */
  private async initializeWebSockets(regions: string[]): Promise<void> {
    // In production, connect to actual region WebSocket endpoints
    // This is a simulation
    for (const regionId of regions) {
      if (regionId !== this.localRegionId) {
        // Simulate WebSocket connection
        const ws = {
          send: (data: string) => {
            // Simulate send
            console.log(`WebSocket send to ${regionId}:`, data.length, 'bytes');
          },
          close: () => {
            console.log(`WebSocket closed for ${regionId}`);
          }
        } as any;

        this.websockets.set(regionId, ws);
      }
    }
  }

  /**
   * Broadcast event via WebSocket
   */
  private async broadcastEvent(event: SyncEvent): Promise<void> {
    const serialized = JSON.stringify(event);

    for (const [regionId, ws] of this.websockets.entries()) {
      try {
        ws.send(serialized);
      } catch (error) {
        console.error(`WebSocket broadcast failed for ${regionId}:`, error);
      }
    }
  }

  /**
   * Get sync checkpoint for region
   */
  private async getCheckpoint(regionId: string): Promise<any> {
    const result = await this.tursoClient.execute_read_only_query({
      query: `SELECT * FROM sync_checkpoints WHERE region_id = ?`,
      params: [regionId]
    });

    return result.rows[0] || { region_id: regionId, last_sync_timestamp: 0 };
  }

  /**
   * Update sync checkpoint
   */
  private async updateCheckpoint(regionId: string, data: any): Promise<void> {
    await this.tursoClient.execute_query({
      query: `
        UPDATE sync_checkpoints 
        SET last_sync_id = ?,
            last_sync_timestamp = ?,
            events_synced = events_synced + ?,
            bytes_synced = bytes_synced + ?,
            conflicts_resolved = conflicts_resolved + ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE region_id = ?
      `,
      params: [
        data.lastEventId,
        data.lastEventTimestamp,
        data.eventsProcessed,
        data.bytesTransferred,
        data.conflictsResolved,
        regionId
      ]
    });
  }

  /**
   * Log sync metrics
   */
  private async logSyncMetrics(results: Map<string, any>, duration: number): Promise<void> {
    for (const [regionId, result] of results.entries()) {
      if (!result.error) {
        await this.tursoClient.execute_query({
          query: `
            INSERT INTO sync_metrics 
            (region_pair, sync_duration_ms, events_count, bytes_transferred, 
             compression_ratio, success)
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          params: [
            `${this.localRegionId}-${regionId}`,
            result.duration,
            result.eventsReceived + result.eventsSent,
            result.bytesTransferred,
            0.7, // Simulated compression ratio
            true
          ]
        });
      }
    }
  }

  /**
   * Check if event should be compressed
   */
  private async shouldCompress(event: SyncEvent): Promise<boolean> {
    const size = JSON.stringify(event).length;
    return size > this.config.compressionThreshold;
  }

  /**
   * Serialize event for storage
   */
  private async serializeEvent(event: SyncEvent, compress: boolean): Promise<{
    data: string;
    checksum: string;
  }> {
    let data = JSON.stringify(event.data || {});
    
    if (compress) {
      // Simulate compression
      data = Buffer.from(data).toString('base64');
    }

    const checksum = require('crypto')
      .createHash('md5')
      .update(data)
      .digest('hex');

    return { data, checksum };
  }

  /**
   * Deserialize event from storage
   */
  private async deserializeEvent(row: any): Promise<SyncEvent> {
    let data = row.data;
    
    if (row.compressed) {
      // Decompress
      data = Buffer.from(data, 'base64').toString();
    }

    return {
      id: row.id,
      type: row.event_type,
      table: row.table_name,
      recordId: row.record_id,
      data: data ? JSON.parse(data) : null,
      sourceRegion: row.source_region,
      timestamp: row.timestamp,
      version: row.version
    };
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get sync status for all regions
   */
  async getSyncStatus(): Promise<Map<string, SyncStatus>> {
    return new Map(this.regions);
  }

  /**
   * Get sync lag for monitoring
   */
  async getSyncLag(): Promise<Map<string, number>> {
    const lag = new Map<string, number>();
    
    for (const [regionId, status] of this.regions.entries()) {
      lag.set(regionId, status.syncLag);
    }

    return lag;
  }

  /**
   * Get sync metrics for time window
   */
  async getMetrics(timeWindow?: number): Promise<any> {
    const since = Date.now() / 1000 - (timeWindow || 3600); // Default 1 hour

    const metrics = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          region_pair,
          COUNT(*) as sync_count,
          AVG(sync_duration_ms) as avg_duration,
          SUM(events_count) as total_events,
          SUM(bytes_transferred) as total_bytes,
          AVG(compression_ratio) as avg_compression,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count
        FROM sync_metrics
        WHERE timestamp > ?
        GROUP BY region_pair
        ORDER BY total_events DESC
      `,
      params: [since]
    });

    const conflicts = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          table_name,
          resolution_strategy,
          COUNT(*) as conflict_count
        FROM sync_conflicts
        WHERE resolved_at > ?
        GROUP BY table_name, resolution_strategy
      `,
      params: [since]
    });

    return {
      syncMetrics: metrics.rows,
      conflicts: conflicts.rows,
      uptime: Date.now() - since * 1000,
      regionsActive: this.regions.size
    };
  }
}