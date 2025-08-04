/**
 * Edge-Aware Query Router for Turso Database
 * Routes queries to optimal edge locations based on latency and data locality
 */

import { TursoClient } from '@turso/client';

export interface QueryRoute {
  regionId: string;
  priority: number;
  estimatedLatency: number;
  dataLocality: number; // 0-1 score
  load: number; // Current load percentage
}

export interface RouterConfig {
  maxLatency: number; // Maximum acceptable latency in ms
  localityWeight: number; // Weight for data locality (0-1)
  loadBalancing: 'round-robin' | 'least-loaded' | 'latency-optimized';
  cacheEnabled: boolean;
  cacheTTL: number; // Cache TTL in seconds
}

export interface QueryPlan {
  query: string;
  primaryRegion: string;
  fallbackRegions: string[];
  cacheKey?: string;
  consistency: 'strong' | 'eventual' | 'stale';
  timeout: number;
}

export class EdgeQueryRouter {
  private routingTable: Map<string, QueryRoute[]> = new Map();
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private loadBalancer: LoadBalancer;
  private config: RouterConfig;
  private tursoClients: Map<string, TursoClient> = new Map();

  constructor(config: RouterConfig) {
    this.config = config;
    this.loadBalancer = new LoadBalancer(config.loadBalancing);
  }

  /**
   * Initialize router with edge topology
   */
  async initialize(tursoClient: TursoClient): Promise<void> {
    // Create routing tables
    await tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS edge_routing_table (
          table_name TEXT NOT NULL,
          region_id TEXT NOT NULL,
          data_distribution REAL DEFAULT 0.0,
          avg_query_time_ms REAL DEFAULT 0.0,
          query_count INTEGER DEFAULT 0,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (table_name, region_id)
        )
      `
    });

    // Create query performance tracking
    await tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS query_performance_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query_hash TEXT NOT NULL,
          region_id TEXT NOT NULL,
          execution_time_ms REAL NOT NULL,
          result_size INTEGER,
          cache_hit BOOLEAN DEFAULT FALSE,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_query_hash (query_hash),
          INDEX idx_timestamp (timestamp)
        )
      `
    });

    // Create data locality tracking
    await tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS data_locality_map (
          table_name TEXT NOT NULL,
          partition_key TEXT NOT NULL,
          region_id TEXT NOT NULL,
          record_count INTEGER DEFAULT 0,
          last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (table_name, partition_key, region_id)
        )
      `
    });

    // Load initial routing table
    await this.refreshRoutingTable(tursoClient);
  }

  /**
   * Route a query to the optimal edge location
   */
  async route(query: string, params?: any[], userLocation?: string): Promise<QueryPlan> {
    const queryHash = this.hashQuery(query, params);
    
    // Check cache first if enabled
    if (this.config.cacheEnabled) {
      const cached = this.checkCache(queryHash);
      if (cached) {
        return {
          query,
          primaryRegion: 'cache',
          fallbackRegions: [],
          cacheKey: queryHash,
          consistency: 'stale',
          timeout: 100
        };
      }
    }

    // Analyze query to determine requirements
    const queryAnalysis = this.analyzeQuery(query);
    
    // Get optimal regions based on analysis
    const routes = await this.getOptimalRoutes(
      queryAnalysis.tables,
      userLocation,
      queryAnalysis.consistency
    );

    // Create query plan
    const plan: QueryPlan = {
      query,
      primaryRegion: routes[0].regionId,
      fallbackRegions: routes.slice(1, 3).map(r => r.regionId),
      cacheKey: queryAnalysis.cacheable ? queryHash : undefined,
      consistency: queryAnalysis.consistency,
      timeout: this.calculateTimeout(routes[0].estimatedLatency)
    };

    return plan;
  }

  /**
   * Execute query with routing and fallback
   */
  async execute(plan: QueryPlan, params?: any[]): Promise<any> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Try primary region first
    try {
      const result = await this.executeInRegion(
        plan.primaryRegion,
        plan.query,
        params,
        plan.timeout
      );

      // Cache result if applicable
      if (plan.cacheKey && this.config.cacheEnabled) {
        this.cacheResult(plan.cacheKey, result);
      }

      // Log performance
      await this.logQueryPerformance(
        plan.query,
        plan.primaryRegion,
        Date.now() - startTime,
        result
      );

      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Primary region ${plan.primaryRegion} failed:`, error);
    }

    // Try fallback regions
    for (const regionId of plan.fallbackRegions) {
      try {
        const result = await this.executeInRegion(
          regionId,
          plan.query,
          params,
          plan.timeout
        );

        // Log performance
        await this.logQueryPerformance(
          plan.query,
          regionId,
          Date.now() - startTime,
          result
        );

        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Fallback region ${regionId} failed:`, error);
      }
    }

    // All regions failed
    throw new Error(`Query failed in all regions: ${lastError?.message}`);
  }

  /**
   * Analyze query to determine routing requirements
   */
  private analyzeQuery(query: string): {
    tables: string[];
    consistency: 'strong' | 'eventual' | 'stale';
    cacheable: boolean;
    operation: 'read' | 'write';
  } {
    const normalizedQuery = query.toLowerCase();
    
    // Extract table names
    const tableMatches = normalizedQuery.match(/(?:from|join|into|update|delete from)\s+(\w+)/g) || [];
    const tables = tableMatches.map(match => {
      const parts = match.split(/\s+/);
      return parts[parts.length - 1];
    });

    // Determine operation type
    const operation = normalizedQuery.match(/^\s*(select|with)/i) ? 'read' : 'write';

    // Determine consistency requirements
    let consistency: 'strong' | 'eventual' | 'stale' = 'eventual';
    if (normalizedQuery.includes('for update') || operation === 'write') {
      consistency = 'strong';
    } else if (normalizedQuery.includes('/* stale_ok */')) {
      consistency = 'stale';
    }

    // Determine if cacheable
    const cacheable = operation === 'read' && 
                     consistency !== 'strong' &&
                     !normalizedQuery.includes('random()') &&
                     !normalizedQuery.includes('datetime(');

    return { tables, consistency, cacheable, operation };
  }

  /**
   * Get optimal routes based on multiple factors
   */
  private async getOptimalRoutes(
    tables: string[],
    userLocation?: string,
    consistency?: string
  ): Promise<QueryRoute[]> {
    const routes: QueryRoute[] = [];

    // Get routes for each table
    for (const table of tables) {
      const tableRoutes = this.routingTable.get(table) || [];
      routes.push(...tableRoutes);
    }

    // Remove duplicates and sort by score
    const uniqueRoutes = new Map<string, QueryRoute>();
    for (const route of routes) {
      const existing = uniqueRoutes.get(route.regionId);
      if (!existing || route.priority > existing.priority) {
        uniqueRoutes.set(route.regionId, route);
      }
    }

    // Calculate scores considering all factors
    const scoredRoutes = Array.from(uniqueRoutes.values()).map(route => {
      let score = 0;

      // Latency score (inverse relationship)
      const latencyScore = Math.max(0, 1 - (route.estimatedLatency / this.config.maxLatency));
      score += latencyScore * 0.4;

      // Data locality score
      score += route.dataLocality * this.config.localityWeight;

      // Load score (inverse relationship)
      const loadScore = Math.max(0, 1 - (route.load / 100));
      score += loadScore * 0.2;

      // User proximity bonus
      if (userLocation && route.regionId.includes(userLocation)) {
        score += 0.2;
      }

      return { ...route, score };
    });

    // Sort by score descending
    scoredRoutes.sort((a, b) => b.score - a.score);

    // Apply load balancing strategy
    return this.loadBalancer.balance(scoredRoutes);
  }

  /**
   * Execute query in specific region
   */
  private async executeInRegion(
    regionId: string,
    query: string,
    params?: any[],
    timeout?: number
  ): Promise<any> {
    const client = await this.getClient(regionId);
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeout || 5000);
    });

    // Race between query and timeout
    const queryPromise = query.toLowerCase().startsWith('select') ?
      client.execute_read_only_query({ query, params }) :
      client.execute_query({ query, params });

    return Promise.race([queryPromise, timeoutPromise]);
  }

  /**
   * Refresh routing table from edge statistics
   */
  private async refreshRoutingTable(client: TursoClient): Promise<void> {
    const routingData = await client.execute_read_only_query({
      query: `
        SELECT 
          rt.table_name,
          rt.region_id,
          rt.data_distribution,
          rt.avg_query_time_ms,
          es.average_latency_ms,
          es.status,
          (es.pending_operations + es.failed_operations) as load
        FROM edge_routing_table rt
        JOIN edge_sync_status es ON rt.region_id = es.region_id
        WHERE es.status = 'active'
      `
    });

    // Clear and rebuild routing table
    this.routingTable.clear();

    for (const row of routingData.rows) {
      const route: QueryRoute = {
        regionId: row.region_id,
        priority: this.calculatePriority(row),
        estimatedLatency: row.average_latency_ms || row.avg_query_time_ms,
        dataLocality: row.data_distribution,
        load: row.load || 0
      };

      if (!this.routingTable.has(row.table_name)) {
        this.routingTable.set(row.table_name, []);
      }
      this.routingTable.get(row.table_name)!.push(route);
    }

    // Sort routes by priority for each table
    for (const routes of this.routingTable.values()) {
      routes.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Calculate route priority based on multiple factors
   */
  private calculatePriority(row: any): number {
    let priority = 0;

    // Factor 1: Data distribution (40%)
    priority += row.data_distribution * 40;

    // Factor 2: Query performance (30%)
    const performanceScore = Math.max(0, 1 - (row.avg_query_time_ms / 1000));
    priority += performanceScore * 30;

    // Factor 3: Network latency (30%)
    const latencyScore = Math.max(0, 1 - (row.average_latency_ms / this.config.maxLatency));
    priority += latencyScore * 30;

    return priority;
  }

  /**
   * Log query performance for learning
   */
  private async logQueryPerformance(
    query: string,
    regionId: string,
    executionTime: number,
    result: any
  ): Promise<void> {
    const queryHash = this.hashQuery(query);
    const resultSize = JSON.stringify(result).length;

    // Store in memory for immediate use
    const client = await this.getClient(regionId);
    await client.execute_query({
      query: `
        INSERT INTO query_performance_log 
        (query_hash, region_id, execution_time_ms, result_size, cache_hit)
        VALUES (?, ?, ?, ?, ?)
      `,
      params: [queryHash, regionId, executionTime, resultSize, false]
    });

    // Update routing table statistics
    const tables = this.analyzeQuery(query).tables;
    for (const table of tables) {
      await client.execute_query({
        query: `
          UPDATE edge_routing_table 
          SET avg_query_time_ms = 
            CASE 
              WHEN query_count = 0 THEN ?
              ELSE (avg_query_time_ms * query_count + ?) / (query_count + 1)
            END,
            query_count = query_count + 1,
            last_updated = CURRENT_TIMESTAMP
          WHERE table_name = ? AND region_id = ?
        `,
        params: [executionTime, executionTime, table, regionId]
      });
    }
  }

  /**
   * Cache management
   */
  private checkCache(queryHash: string): any | null {
    const cached = this.queryCache.get(queryHash);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.config.cacheTTL * 1000) {
      this.queryCache.delete(queryHash);
      return null;
    }

    return cached.result;
  }

  private cacheResult(queryHash: string, result: any): void {
    // Limit cache size
    if (this.queryCache.size > 10000) {
      // Remove oldest entries
      const entries = Array.from(this.queryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < 5000; i++) {
        this.queryCache.delete(entries[i][0]);
      }
    }

    this.queryCache.set(queryHash, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Hash query for caching and tracking
   */
  private hashQuery(query: string, params?: any[]): string {
    const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
    const paramsStr = params ? JSON.stringify(params) : '';
    return Buffer.from(normalized + paramsStr).toString('base64');
  }

  /**
   * Calculate query timeout based on latency
   */
  private calculateTimeout(estimatedLatency: number): number {
    // Base timeout + 3x estimated latency
    return Math.min(30000, 1000 + (estimatedLatency * 3));
  }

  /**
   * Get or create client for region
   */
  private async getClient(regionId: string): Promise<TursoClient> {
    if (!this.tursoClients.has(regionId)) {
      // In real implementation, create region-specific client
      this.tursoClients.set(regionId, new TursoClient({ region: regionId }));
    }
    return this.tursoClients.get(regionId)!;
  }

  /**
   * Update data locality information
   */
  async updateDataLocality(
    tableName: string,
    partitionKey: string,
    regionId: string,
    recordCount: number
  ): Promise<void> {
    const client = await this.getClient(regionId);
    
    await client.execute_query({
      query: `
        INSERT INTO data_locality_map 
        (table_name, partition_key, region_id, record_count, last_accessed)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(table_name, partition_key, region_id) 
        DO UPDATE SET 
          record_count = ?,
          last_accessed = CURRENT_TIMESTAMP
      `,
      params: [tableName, partitionKey, regionId, recordCount, recordCount]
    });

    // Update routing table with new distribution
    await this.updateDataDistribution(tableName, regionId);
  }

  /**
   * Update data distribution scores
   */
  private async updateDataDistribution(tableName: string, regionId: string): Promise<void> {
    const client = await this.getClient(regionId);
    
    // Calculate distribution score
    const result = await client.execute_read_only_query({
      query: `
        SELECT 
          SUM(record_count) as region_count,
          (SELECT SUM(record_count) FROM data_locality_map WHERE table_name = ?) as total_count
        FROM data_locality_map
        WHERE table_name = ? AND region_id = ?
      `,
      params: [tableName, tableName, regionId]
    });

    const regionCount = result.rows[0]?.region_count || 0;
    const totalCount = result.rows[0]?.total_count || 1;
    const distribution = regionCount / totalCount;

    await client.execute_query({
      query: `
        INSERT INTO edge_routing_table 
        (table_name, region_id, data_distribution)
        VALUES (?, ?, ?)
        ON CONFLICT(table_name, region_id) 
        DO UPDATE SET data_distribution = ?
      `,
      params: [tableName, regionId, distribution, distribution]
    });
  }
}

/**
 * Load balancer for route selection
 */
class LoadBalancer {
  private strategy: string;
  private roundRobinIndex: Map<string, number> = new Map();

  constructor(strategy: string) {
    this.strategy = strategy;
  }

  balance(routes: any[]): any[] {
    switch (this.strategy) {
      case 'round-robin':
        return this.roundRobin(routes);
      case 'least-loaded':
        return this.leastLoaded(routes);
      case 'latency-optimized':
      default:
        return routes; // Already sorted by score
    }
  }

  private roundRobin(routes: any[]): any[] {
    const key = routes.map(r => r.regionId).join(',');
    const index = this.roundRobinIndex.get(key) || 0;
    
    // Rotate array
    const rotated = [...routes.slice(index), ...routes.slice(0, index)];
    
    // Update index
    this.roundRobinIndex.set(key, (index + 1) % routes.length);
    
    return rotated;
  }

  private leastLoaded(routes: any[]): any[] {
    return routes.sort((a, b) => a.load - b.load);
  }
}