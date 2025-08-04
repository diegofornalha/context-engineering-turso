/**
 * Distributed Session Management for Turso Edge Computing
 * Handles global session state across multiple edge locations
 */

import { TursoClient } from '@turso/client';
import { createHash } from 'crypto';

export interface SessionData {
  sessionId: string;
  userId?: string;
  data: Record<string, any>;
  metadata: {
    createdAt: number;
    lastAccessedAt: number;
    expiresAt: number;
    originRegion: string;
    currentRegion: string;
    accessCount: number;
  };
}

export interface SessionConfig {
  ttl: number; // Time to live in seconds
  maxSize: number; // Max size per session in bytes
  replicationMode: 'sync' | 'async' | 'lazy';
  compressionEnabled: boolean;
  encryptionKey?: string;
}

export interface SessionEvent {
  type: 'created' | 'updated' | 'accessed' | 'expired' | 'migrated';
  sessionId: string;
  regionId: string;
  timestamp: number;
  details?: any;
}

export class DistributedSessionManager {
  private config: SessionConfig;
  private tursoClient: TursoClient;
  private localCache: Map<string, SessionData> = new Map();
  private compressionRatio: number = 0.7; // Average compression ratio
  private replicationQueue: Map<string, Set<string>> = new Map();

  constructor(config: SessionConfig, tursoClient: TursoClient) {
    this.config = config;
    this.tursoClient = tursoClient;
  }

  /**
   * Initialize distributed session tables
   */
  async initialize(): Promise<void> {
    // Main session storage table
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS distributed_sessions (
          session_id TEXT PRIMARY KEY,
          user_id TEXT,
          data BLOB NOT NULL,
          data_size INTEGER NOT NULL,
          created_at INTEGER NOT NULL,
          last_accessed_at INTEGER NOT NULL,
          expires_at INTEGER NOT NULL,
          origin_region TEXT NOT NULL,
          current_region TEXT NOT NULL,
          access_count INTEGER DEFAULT 1,
          version INTEGER DEFAULT 1,
          checksum TEXT NOT NULL,
          compressed BOOLEAN DEFAULT FALSE,
          encrypted BOOLEAN DEFAULT FALSE,
          INDEX idx_user_id (user_id),
          INDEX idx_expires_at (expires_at),
          INDEX idx_current_region (current_region)
        )
      `
    });

    // Session access log for analytics
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS session_access_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          region_id TEXT NOT NULL,
          access_type TEXT CHECK(access_type IN ('read', 'write', 'create', 'expire')),
          latency_ms REAL,
          cache_hit BOOLEAN DEFAULT FALSE,
          timestamp INTEGER DEFAULT (unixepoch()),
          INDEX idx_session_access (session_id, timestamp)
        )
      `
    });

    // Session replication status
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS session_replication_status (
          session_id TEXT NOT NULL,
          source_region TEXT NOT NULL,
          target_region TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          last_attempt INTEGER,
          completed_at INTEGER,
          PRIMARY KEY (session_id, source_region, target_region)
        )
      `
    });

    // Session migration history
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS session_migration_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT NOT NULL,
          from_region TEXT NOT NULL,
          to_region TEXT NOT NULL,
          reason TEXT,
          data_size INTEGER,
          migration_time_ms REAL,
          timestamp INTEGER DEFAULT (unixepoch())
        )
      `
    });

    // Start background cleanup task
    this.startCleanupTask();
  }

  /**
   * Create a new distributed session
   */
  async create(
    sessionId: string,
    data: Record<string, any>,
    userId?: string,
    regionId?: string
  ): Promise<SessionData> {
    const startTime = Date.now();
    const currentRegion = regionId || 'default';
    
    // Prepare session data
    const session: SessionData = {
      sessionId,
      userId,
      data,
      metadata: {
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        expiresAt: Date.now() + (this.config.ttl * 1000),
        originRegion: currentRegion,
        currentRegion: currentRegion,
        accessCount: 1
      }
    };

    // Serialize and optionally compress/encrypt
    const serialized = await this.serializeSession(session);
    
    // Store in database
    await this.tursoClient.execute_query({
      query: `
        INSERT INTO distributed_sessions 
        (session_id, user_id, data, data_size, created_at, last_accessed_at, 
         expires_at, origin_region, current_region, checksum, compressed, encrypted)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        sessionId,
        userId || null,
        serialized.data,
        serialized.size,
        session.metadata.createdAt,
        session.metadata.lastAccessedAt,
        session.metadata.expiresAt,
        session.metadata.originRegion,
        session.metadata.currentRegion,
        serialized.checksum,
        serialized.compressed,
        serialized.encrypted
      ]
    });

    // Cache locally
    this.localCache.set(sessionId, session);

    // Log access
    await this.logAccess(sessionId, currentRegion, 'create', Date.now() - startTime);

    // Queue for replication if needed
    if (this.config.replicationMode !== 'lazy') {
      await this.queueReplication(sessionId, currentRegion);
    }

    return session;
  }

  /**
   * Get session data with edge optimization
   */
  async get(sessionId: string, regionId?: string): Promise<SessionData | null> {
    const startTime = Date.now();
    const currentRegion = regionId || 'default';
    
    // Check local cache first
    const cached = this.localCache.get(sessionId);
    if (cached && cached.metadata.expiresAt > Date.now()) {
      await this.logAccess(sessionId, currentRegion, 'read', Date.now() - startTime, true);
      return cached;
    }

    // Query from database
    const result = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT * FROM distributed_sessions 
        WHERE session_id = ? AND expires_at > ?
      `,
      params: [sessionId, Date.now()]
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    
    // Deserialize session
    const session = await this.deserializeSession(row);
    
    // Update access metadata
    session.metadata.lastAccessedAt = Date.now();
    session.metadata.accessCount++;

    // Update in database (async)
    this.updateAccessMetadata(sessionId, currentRegion);

    // Cache locally
    this.localCache.set(sessionId, session);

    // Log access
    await this.logAccess(sessionId, currentRegion, 'read', Date.now() - startTime);

    // Check if migration is beneficial
    if (currentRegion !== session.metadata.currentRegion) {
      await this.considerMigration(sessionId, session, currentRegion);
    }

    return session;
  }

  /**
   * Update session data
   */
  async update(
    sessionId: string,
    updates: Partial<Record<string, any>>,
    regionId?: string
  ): Promise<SessionData | null> {
    const startTime = Date.now();
    const currentRegion = regionId || 'default';
    
    // Get existing session
    const session = await this.get(sessionId, currentRegion);
    if (!session) {
      return null;
    }

    // Apply updates
    session.data = { ...session.data, ...updates };
    session.metadata.lastAccessedAt = Date.now();

    // Check size constraints
    const dataSize = JSON.stringify(session.data).length;
    if (dataSize > this.config.maxSize) {
      throw new Error(`Session data exceeds maximum size: ${dataSize} > ${this.config.maxSize}`);
    }

    // Serialize and store
    const serialized = await this.serializeSession(session);
    
    await this.tursoClient.execute_query({
      query: `
        UPDATE distributed_sessions 
        SET data = ?, data_size = ?, last_accessed_at = ?, 
            version = version + 1, checksum = ?
        WHERE session_id = ?
      `,
      params: [
        serialized.data,
        serialized.size,
        session.metadata.lastAccessedAt,
        serialized.checksum,
        sessionId
      ]
    });

    // Update cache
    this.localCache.set(sessionId, session);

    // Log access
    await this.logAccess(sessionId, currentRegion, 'write', Date.now() - startTime);

    // Queue for replication
    if (this.config.replicationMode === 'sync') {
      await this.replicateSession(sessionId, currentRegion);
    } else if (this.config.replicationMode === 'async') {
      await this.queueReplication(sessionId, currentRegion);
    }

    return session;
  }

  /**
   * Delete session across all regions
   */
  async delete(sessionId: string): Promise<void> {
    // Remove from all locations
    await this.tursoClient.execute_query({
      query: `DELETE FROM distributed_sessions WHERE session_id = ?`,
      params: [sessionId]
    });

    // Remove from cache
    this.localCache.delete(sessionId);

    // Clean up replication queue
    this.replicationQueue.delete(sessionId);
  }

  /**
   * Extend session TTL
   */
  async touch(sessionId: string, additionalTTL?: number): Promise<boolean> {
    const ttlExtension = additionalTTL || this.config.ttl;
    const newExpiry = Date.now() + (ttlExtension * 1000);

    const result = await this.tursoClient.execute_query({
      query: `
        UPDATE distributed_sessions 
        SET expires_at = ?, last_accessed_at = ?
        WHERE session_id = ? AND expires_at > ?
      `,
      params: [newExpiry, Date.now(), sessionId, Date.now()]
    });

    // Update cache if present
    const cached = this.localCache.get(sessionId);
    if (cached) {
      cached.metadata.expiresAt = newExpiry;
      cached.metadata.lastAccessedAt = Date.now();
    }

    return result.rowsAffected > 0;
  }

  /**
   * Get sessions by user ID
   */
  async getUserSessions(userId: string): Promise<SessionData[]> {
    const result = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT * FROM distributed_sessions 
        WHERE user_id = ? AND expires_at > ?
        ORDER BY last_accessed_at DESC
      `,
      params: [userId, Date.now()]
    });

    const sessions: SessionData[] = [];
    for (const row of result.rows) {
      const session = await this.deserializeSession(row);
      sessions.push(session);
    }

    return sessions;
  }

  /**
   * Migrate session to a different region
   */
  async migrate(sessionId: string, targetRegion: string, reason?: string): Promise<void> {
    const startTime = Date.now();
    
    // Get current session
    const result = await this.tursoClient.execute_read_only_query({
      query: `SELECT * FROM distributed_sessions WHERE session_id = ?`,
      params: [sessionId]
    });

    if (result.rows.length === 0) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const sourceRegion = result.rows[0].current_region;
    
    // Update current region
    await this.tursoClient.execute_query({
      query: `
        UPDATE distributed_sessions 
        SET current_region = ? 
        WHERE session_id = ?
      `,
      params: [targetRegion, sessionId]
    });

    // Log migration
    await this.tursoClient.execute_query({
      query: `
        INSERT INTO session_migration_log 
        (session_id, from_region, to_region, reason, data_size, migration_time_ms)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      params: [
        sessionId,
        sourceRegion,
        targetRegion,
        reason || 'user_proximity',
        result.rows[0].data_size,
        Date.now() - startTime
      ]
    });

    // Trigger replication to new region
    await this.replicateSession(sessionId, targetRegion);
  }

  /**
   * Get session analytics
   */
  async getAnalytics(timeWindow?: number): Promise<any> {
    const since = Date.now() - (timeWindow || 3600000); // Default 1 hour

    const analytics = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          region_id,
          access_type,
          COUNT(*) as access_count,
          AVG(latency_ms) as avg_latency,
          SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM session_access_log
        WHERE timestamp > ?
        GROUP BY region_id, access_type
        ORDER BY access_count DESC
      `,
      params: [since / 1000]
    });

    const migrations = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          from_region,
          to_region,
          COUNT(*) as migration_count,
          AVG(migration_time_ms) as avg_migration_time,
          SUM(data_size) as total_data_migrated
        FROM session_migration_log
        WHERE timestamp > ?
        GROUP BY from_region, to_region
      `,
      params: [since / 1000]
    });

    return {
      accessPatterns: analytics.rows,
      migrations: migrations.rows,
      cacheHitRate: this.calculateCacheHitRate(analytics.rows),
      averageLatency: this.calculateAverageLatency(analytics.rows)
    };
  }

  /**
   * Serialize session with optional compression and encryption
   */
  private async serializeSession(session: SessionData): Promise<{
    data: Buffer;
    size: number;
    checksum: string;
    compressed: boolean;
    encrypted: boolean;
  }> {
    let data = JSON.stringify(session);
    let compressed = false;
    let encrypted = false;

    // Compress if enabled and beneficial
    if (this.config.compressionEnabled && data.length > 1024) {
      // Simple compression simulation (in production, use zlib)
      data = Buffer.from(data).toString('base64');
      compressed = true;
    }

    // Encrypt if key provided
    if (this.config.encryptionKey) {
      // Simple encryption simulation (in production, use proper crypto)
      const cipher = createHash('sha256').update(this.config.encryptionKey);
      data = Buffer.from(data).toString('hex');
      encrypted = true;
    }

    const buffer = Buffer.from(data);
    const checksum = createHash('md5').update(buffer).digest('hex');

    return {
      data: buffer,
      size: buffer.length,
      checksum,
      compressed,
      encrypted
    };
  }

  /**
   * Deserialize session data
   */
  private async deserializeSession(row: any): Promise<SessionData> {
    let data = row.data.toString();

    // Decrypt if needed
    if (row.encrypted && this.config.encryptionKey) {
      // Reverse encryption
      data = Buffer.from(data, 'hex').toString();
    }

    // Decompress if needed
    if (row.compressed) {
      // Reverse compression
      data = Buffer.from(data, 'base64').toString();
    }

    const parsed = JSON.parse(data);
    
    return {
      sessionId: row.session_id,
      userId: row.user_id,
      data: parsed.data,
      metadata: {
        createdAt: row.created_at,
        lastAccessedAt: row.last_accessed_at,
        expiresAt: row.expires_at,
        originRegion: row.origin_region,
        currentRegion: row.current_region,
        accessCount: row.access_count
      }
    };
  }

  /**
   * Log session access for analytics
   */
  private async logAccess(
    sessionId: string,
    regionId: string,
    accessType: string,
    latency: number,
    cacheHit: boolean = false
  ): Promise<void> {
    await this.tursoClient.execute_query({
      query: `
        INSERT INTO session_access_log 
        (session_id, region_id, access_type, latency_ms, cache_hit)
        VALUES (?, ?, ?, ?, ?)
      `,
      params: [sessionId, regionId, accessType, latency, cacheHit]
    });
  }

  /**
   * Update session access metadata asynchronously
   */
  private async updateAccessMetadata(sessionId: string, regionId: string): Promise<void> {
    setTimeout(async () => {
      await this.tursoClient.execute_query({
        query: `
          UPDATE distributed_sessions 
          SET last_accessed_at = ?, access_count = access_count + 1
          WHERE session_id = ?
        `,
        params: [Date.now(), sessionId]
      });
    }, 0);
  }

  /**
   * Consider migrating session based on access patterns
   */
  private async considerMigration(
    sessionId: string,
    session: SessionData,
    accessRegion: string
  ): Promise<void> {
    // Get recent access patterns
    const accessPattern = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT region_id, COUNT(*) as access_count
        FROM session_access_log
        WHERE session_id = ? AND timestamp > ?
        GROUP BY region_id
        ORDER BY access_count DESC
        LIMIT 1
      `,
      params: [sessionId, (Date.now() / 1000) - 300] // Last 5 minutes
    });

    if (accessPattern.rows.length > 0) {
      const dominantRegion = accessPattern.rows[0].region_id;
      const accessCount = accessPattern.rows[0].access_count;

      // Migrate if accessed frequently from different region
      if (dominantRegion !== session.metadata.currentRegion && accessCount >= 3) {
        await this.migrate(sessionId, dominantRegion, 'access_pattern');
      }
    }
  }

  /**
   * Queue session for replication
   */
  private async queueReplication(sessionId: string, sourceRegion: string): Promise<void> {
    if (!this.replicationQueue.has(sessionId)) {
      this.replicationQueue.set(sessionId, new Set());
    }
    this.replicationQueue.get(sessionId)!.add(sourceRegion);

    // Process queue asynchronously
    setTimeout(() => this.processReplicationQueue(), 100);
  }

  /**
   * Process replication queue
   */
  private async processReplicationQueue(): Promise<void> {
    for (const [sessionId, regions] of this.replicationQueue.entries()) {
      for (const region of regions) {
        await this.replicateSession(sessionId, region);
      }
      this.replicationQueue.delete(sessionId);
    }
  }

  /**
   * Replicate session to other regions
   */
  private async replicateSession(sessionId: string, sourceRegion: string): Promise<void> {
    // In production, this would replicate to actual edge regions
    // For now, just update replication status
    await this.tursoClient.execute_query({
      query: `
        INSERT INTO session_replication_status 
        (session_id, source_region, target_region, status, completed_at)
        VALUES (?, ?, ?, 'completed', ?)
        ON CONFLICT(session_id, source_region, target_region) 
        DO UPDATE SET status = 'completed', completed_at = ?
      `,
      params: [sessionId, sourceRegion, 'global', Date.now(), Date.now()]
    });
  }

  /**
   * Clean up expired sessions
   */
  private startCleanupTask(): void {
    setInterval(async () => {
      const deleted = await this.tursoClient.execute_query({
        query: `DELETE FROM distributed_sessions WHERE expires_at < ?`,
        params: [Date.now()]
      });

      if (deleted.rowsAffected > 0) {
        console.log(`Cleaned up ${deleted.rowsAffected} expired sessions`);
      }

      // Clean local cache
      for (const [sessionId, session] of this.localCache.entries()) {
        if (session.metadata.expiresAt < Date.now()) {
          this.localCache.delete(sessionId);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Calculate cache hit rate from analytics
   */
  private calculateCacheHitRate(rows: any[]): number {
    const total = rows.reduce((sum, row) => sum + row.access_count, 0);
    const hits = rows.reduce((sum, row) => sum + row.cache_hits, 0);
    return total > 0 ? (hits / total) * 100 : 0;
  }

  /**
   * Calculate average latency from analytics
   */
  private calculateAverageLatency(rows: any[]): number {
    const totalLatency = rows.reduce((sum, row) => sum + (row.avg_latency * row.access_count), 0);
    const totalAccess = rows.reduce((sum, row) => sum + row.access_count, 0);
    return totalAccess > 0 ? totalLatency / totalAccess : 0;
  }
}