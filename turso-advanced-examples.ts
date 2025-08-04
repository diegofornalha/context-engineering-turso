/**
 * Advanced Turso Database Examples
 * Demonstrating edge computing and distributed features
 */

import { TursoClient } from './mcp-turso';

class TursoAdvancedExamples {
  private client: TursoClient;
  
  constructor() {
    this.client = new TursoClient({
      organization: 'ruv',
      database: 'context-memory'
    });
  }

  /**
   * Example 1: Distributed Session Management
   * Track user sessions across multiple edge locations
   */
  async distributedSessionExample() {
    // Create session tracking table
    await this.client.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS user_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT UNIQUE NOT NULL,
          user_id TEXT NOT NULL,
          edge_location TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          session_data TEXT
        )
      `
    });

    // Track session from different edge locations
    const sessionId = 'session-' + Date.now();
    
    // User connects from US West
    await this.client.execute_query({
      query: `
        INSERT INTO user_sessions 
        (session_id, user_id, edge_location, ip_address, session_data)
        VALUES (?, ?, ?, ?, ?)
      `,
      params: [
        sessionId,
        'user-123',
        'us-west-2',
        '192.168.1.1',
        JSON.stringify({ cart: [], preferences: {} })
      ]
    });

    // User travels and connects from EU
    await this.client.execute_query({
      query: `
        UPDATE user_sessions 
        SET edge_location = ?, last_activity = CURRENT_TIMESTAMP
        WHERE session_id = ?
      `,
      params: ['eu-central-1', sessionId]
    });

    // Query session with edge awareness
    const session = await this.client.execute_read_only_query({
      query: `
        SELECT *,
          CASE 
            WHEN edge_location = 'us-west-2' THEN 25
            WHEN edge_location = 'eu-central-1' THEN 45
            ELSE 100
          END as expected_latency_ms
        FROM user_sessions
        WHERE session_id = ?
      `,
      params: [sessionId]
    });

    return session;
  }

  /**
   * Example 2: Real-time Analytics Pipeline
   * Process analytics data at the edge
   */
  async edgeAnalyticsExample() {
    // Create analytics events table
    await this.client.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS analytics_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          event_type TEXT NOT NULL,
          user_id TEXT,
          edge_location TEXT NOT NULL,
          event_data TEXT,
          processing_time_ms INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_event_type (event_type),
          INDEX idx_edge_location (edge_location)
        )
      `
    });

    // Simulate edge processing
    const events = [
      { type: 'page_view', location: 'us-west-2', processing: 5 },
      { type: 'click', location: 'eu-central-1', processing: 8 },
      { type: 'purchase', location: 'ap-southeast-1', processing: 15 },
      { type: 'page_view', location: 'sa-east-1', processing: 20 }
    ];

    // Batch insert events
    for (const event of events) {
      await this.client.execute_query({
        query: `
          INSERT INTO analytics_events 
          (event_type, user_id, edge_location, processing_time_ms, event_data)
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [
          event.type,
          'user-' + Math.floor(Math.random() * 1000),
          event.location,
          event.processing,
          JSON.stringify({ timestamp: Date.now() })
        ]
      });
    }

    // Real-time aggregation query
    const analytics = await this.client.execute_read_only_query({
      query: `
        WITH edge_stats AS (
          SELECT 
            edge_location,
            event_type,
            COUNT(*) as event_count,
            AVG(processing_time_ms) as avg_processing_ms,
            MIN(processing_time_ms) as min_processing_ms,
            MAX(processing_time_ms) as max_processing_ms
          FROM analytics_events
          WHERE created_at > datetime('now', '-1 hour')
          GROUP BY edge_location, event_type
        )
        SELECT 
          edge_location,
          SUM(event_count) as total_events,
          AVG(avg_processing_ms) as overall_avg_ms,
          json_group_array(
            json_object(
              'event_type', event_type,
              'count', event_count,
              'avg_ms', avg_processing_ms
            )
          ) as event_breakdown
        FROM edge_stats
        GROUP BY edge_location
        ORDER BY total_events DESC
      `
    });

    return analytics;
  }

  /**
   * Example 3: Distributed Cache with TTL
   * Implement edge caching with automatic expiration
   */
  async distributedCacheExample() {
    // Create cache table with TTL support
    await this.client.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS edge_cache (
          cache_key TEXT PRIMARY KEY,
          cache_value TEXT NOT NULL,
          edge_location TEXT NOT NULL,
          ttl_seconds INTEGER DEFAULT 3600,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          access_count INTEGER DEFAULT 0,
          last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Function to set cache with TTL
    const setCache = async (key: string, value: any, ttl: number, location: string) => {
      await this.client.execute_query({
        query: `
          INSERT OR REPLACE INTO edge_cache 
          (cache_key, cache_value, edge_location, ttl_seconds, expires_at)
          VALUES (?, ?, ?, ?, datetime('now', '+' || ? || ' seconds'))
        `,
        params: [key, JSON.stringify(value), location, ttl, ttl]
      });
    };

    // Function to get cache with automatic cleanup
    const getCache = async (key: string) => {
      // First, clean expired entries
      await this.client.execute_query({
        query: `
          DELETE FROM edge_cache 
          WHERE expires_at < CURRENT_TIMESTAMP
        `
      });

      // Get cache and update access stats
      const result = await this.client.execute_query({
        query: `
          UPDATE edge_cache 
          SET access_count = access_count + 1,
              last_accessed = CURRENT_TIMESTAMP
          WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP
          RETURNING cache_value, edge_location
        `,
        params: [key]
      });

      return result.rows[0] || null;
    };

    // Example usage
    await setCache('api-response-users', { users: ['alice', 'bob'] }, 300, 'us-west-2');
    await setCache('config-data', { theme: 'dark', lang: 'en' }, 3600, 'eu-central-1');

    // Cache hit ratio analysis
    const cacheStats = await this.client.execute_read_only_query({
      query: `
        SELECT 
          edge_location,
          COUNT(*) as total_keys,
          SUM(access_count) as total_hits,
          AVG(access_count) as avg_hits_per_key,
          COUNT(CASE WHEN expires_at > CURRENT_TIMESTAMP THEN 1 END) as active_keys,
          COUNT(CASE WHEN expires_at <= CURRENT_TIMESTAMP THEN 1 END) as expired_keys
        FROM edge_cache
        GROUP BY edge_location
      `
    });

    return { getCache, setCache, stats: cacheStats };
  }

  /**
   * Example 4: Conflict-Free Replicated Data Types (CRDT)
   * Implement a simple CRDT for distributed counters
   */
  async crdtCounterExample() {
    // Create CRDT counter table
    await this.client.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS crdt_counters (
          counter_id TEXT NOT NULL,
          node_id TEXT NOT NULL,
          value INTEGER DEFAULT 0,
          version INTEGER DEFAULT 1,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (counter_id, node_id)
        )
      `
    });

    // Increment counter on specific node
    const incrementCounter = async (counterId: string, nodeId: string, delta: number = 1) => {
      await this.client.execute_query({
        query: `
          INSERT INTO crdt_counters (counter_id, node_id, value, version)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(counter_id, node_id) DO UPDATE SET
            value = value + ?,
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        `,
        params: [counterId, nodeId, delta, delta]
      });
    };

    // Get merged counter value
    const getCounterValue = async (counterId: string) => {
      const result = await this.client.execute_read_only_query({
        query: `
          SELECT 
            counter_id,
            SUM(value) as total_value,
            COUNT(DISTINCT node_id) as node_count,
            MAX(version) as max_version,
            json_group_array(
              json_object(
                'node_id', node_id,
                'value', value,
                'version', version
              )
            ) as node_states
          FROM crdt_counters
          WHERE counter_id = ?
          GROUP BY counter_id
        `,
        params: [counterId]
      });

      return result.rows[0] || { total_value: 0 };
    };

    // Simulate distributed increments
    await incrementCounter('page-views', 'us-west-2', 100);
    await incrementCounter('page-views', 'eu-central-1', 150);
    await incrementCounter('page-views', 'ap-southeast-1', 75);

    const total = await getCounterValue('page-views');
    return total;
  }

  /**
   * Example 5: Event Sourcing with Turso
   * Implement event sourcing pattern for distributed systems
   */
  async eventSourcingExample() {
    // Create event store
    await this.client.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS event_store (
          event_id INTEGER PRIMARY KEY AUTOINCREMENT,
          aggregate_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          event_data TEXT NOT NULL,
          event_version INTEGER NOT NULL,
          edge_location TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_aggregate (aggregate_id, event_version)
        )
      `
    });

    // Create snapshot table for performance
    await this.client.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS event_snapshots (
          aggregate_id TEXT PRIMARY KEY,
          snapshot_data TEXT NOT NULL,
          snapshot_version INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `
    });

    // Append event
    const appendEvent = async (aggregateId: string, eventType: string, data: any, location: string) => {
      // Get current version
      const versionResult = await this.client.execute_read_only_query({
        query: `
          SELECT COALESCE(MAX(event_version), 0) as current_version
          FROM event_store
          WHERE aggregate_id = ?
        `,
        params: [aggregateId]
      });

      const newVersion = (versionResult.rows[0]?.current_version || 0) + 1;

      // Append event
      await this.client.execute_query({
        query: `
          INSERT INTO event_store 
          (aggregate_id, event_type, event_data, event_version, edge_location)
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [aggregateId, eventType, JSON.stringify(data), newVersion, location]
      });

      // Create snapshot every 10 events
      if (newVersion % 10 === 0) {
        await this.createSnapshot(aggregateId, newVersion);
      }

      return newVersion;
    };

    // Replay events to rebuild state
    const replayEvents = async (aggregateId: string, fromVersion: number = 0) => {
      const events = await this.client.execute_read_only_query({
        query: `
          SELECT * FROM event_store
          WHERE aggregate_id = ? AND event_version > ?
          ORDER BY event_version
        `,
        params: [aggregateId, fromVersion]
      });

      // Apply events to rebuild state
      let state = {};
      for (const event of events.rows) {
        const eventData = JSON.parse(event.event_data);
        
        switch (event.event_type) {
          case 'user_created':
            state = { ...state, ...eventData };
            break;
          case 'user_updated':
            state = { ...state, ...eventData };
            break;
          case 'user_deleted':
            state = { ...state, deleted: true };
            break;
        }
      }

      return state;
    };

    // Create snapshot for performance
    const createSnapshot = async (aggregateId: string, version: number) => {
      const state = await replayEvents(aggregateId);
      
      await this.client.execute_query({
        query: `
          INSERT OR REPLACE INTO event_snapshots 
          (aggregate_id, snapshot_data, snapshot_version)
          VALUES (?, ?, ?)
        `,
        params: [aggregateId, JSON.stringify(state), version]
      });
    };

    // Example usage
    const userId = 'user-' + Date.now();
    await appendEvent(userId, 'user_created', { name: 'Alice', email: 'alice@example.com' }, 'us-west-2');
    await appendEvent(userId, 'user_updated', { email: 'alice.doe@example.com' }, 'eu-central-1');

    const currentState = await replayEvents(userId);
    return { userId, currentState, appendEvent, replayEvents };
  }

  /**
   * Example 6: Geo-Distributed Search
   * Implement location-aware search with edge optimization
   */
  async geoSearchExample() {
    // Create geo-indexed table
    await this.client.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS geo_locations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          edge_region TEXT NOT NULL,
          metadata TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_geo (latitude, longitude),
          INDEX idx_category_region (category, edge_region)
        )
      `
    });

    // Insert sample locations
    const locations = [
      { name: 'Golden Gate Bridge', lat: 37.8199, lon: -122.4783, region: 'us-west-2', category: 'landmark' },
      { name: 'Eiffel Tower', lat: 48.8584, lon: 2.2945, region: 'eu-central-1', category: 'landmark' },
      { name: 'Marina Bay Sands', lat: 1.2834, lon: 103.8607, region: 'ap-southeast-1', category: 'landmark' },
      { name: 'Christ the Redeemer', lat: -22.9519, lon: -43.2105, region: 'sa-east-1', category: 'landmark' }
    ];

    for (const loc of locations) {
      await this.client.execute_query({
        query: `
          INSERT INTO geo_locations 
          (name, category, latitude, longitude, edge_region, metadata)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        params: [
          loc.name,
          loc.category,
          loc.lat,
          loc.lon,
          loc.region,
          JSON.stringify({ visitors: Math.floor(Math.random() * 10000) })
        ]
      });
    }

    // Geo-proximity search function
    const nearbySearch = async (lat: number, lon: number, radiusKm: number) => {
      // Haversine formula for distance calculation
      const results = await this.client.execute_read_only_query({
        query: `
          WITH distances AS (
            SELECT *,
              6371 * acos(
                cos(radians(?)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(?)) + 
                sin(radians(?)) * sin(radians(latitude))
              ) as distance_km
            FROM geo_locations
          )
          SELECT 
            name,
            category,
            edge_region,
            distance_km,
            CASE 
              WHEN edge_region = 'us-west-2' THEN 25
              WHEN edge_region = 'eu-central-1' THEN 45
              WHEN edge_region = 'ap-southeast-1' THEN 85
              ELSE 120
            END as expected_latency_ms
          FROM distances
          WHERE distance_km <= ?
          ORDER BY distance_km
        `,
        params: [lat, lon, lat, radiusKm]
      });

      return results;
    };

    // Edge-optimized query routing
    const edgeOptimizedSearch = async (userRegion: string, category: string) => {
      const results = await this.client.execute_read_only_query({
        query: `
          SELECT *,
            CASE 
              WHEN edge_region = ? THEN 0  -- Same region priority
              ELSE 1
            END as routing_priority
          FROM geo_locations
          WHERE category = ?
          ORDER BY routing_priority, name
        `,
        params: [userRegion, category]
      });

      return results;
    };

    return { nearbySearch, edgeOptimizedSearch };
  }
}

// Export for use in other modules
export default TursoAdvancedExamples;