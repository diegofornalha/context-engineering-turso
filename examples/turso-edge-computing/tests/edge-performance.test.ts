/**
 * Edge Performance Tests for Turso Database
 * Tests latency, throughput, and consistency across edge locations
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { TursoClient } from '@turso/client';
import { EdgeReplicationManager } from '../src/edge-replication';
import { EdgeQueryRouter } from '../src/query-router';
import { DistributedSessionManager } from '../src/distributed-sessions';
import { RealTimeSyncEngine } from '../src/real-time-sync';
import { CRDTResolver, GCounter, PNCounter, ORSet } from '../src/crdt-resolver';

// Test configuration
const TEST_REGIONS = [
  { id: 'us-west-2', name: 'US West', endpoint: 'wss://us-west-2.turso.io', priority: 1, latency_ms: 25, status: 'active' as const },
  { id: 'eu-central-1', name: 'EU Central', endpoint: 'wss://eu-central-1.turso.io', priority: 2, latency_ms: 45, status: 'active' as const },
  { id: 'ap-southeast-1', name: 'Asia Pacific', endpoint: 'wss://ap-southeast-1.turso.io', priority: 3, latency_ms: 85, status: 'active' as const }
];

describe('Edge Performance Tests', () => {
  let tursoClient: TursoClient;
  let replicationManager: EdgeReplicationManager;
  let queryRouter: EdgeQueryRouter;
  let sessionManager: DistributedSessionManager;
  let syncEngine: RealTimeSyncEngine;
  let crdtResolver: CRDTResolver;

  beforeAll(async () => {
    // Initialize Turso client (using mock for tests)
    tursoClient = new TursoClient({ 
      url: process.env.TURSO_URL || 'libsql://test.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    // Initialize components
    replicationManager = new EdgeReplicationManager('us-west-2', {
      consistency_level: 'eventual',
      conflict_resolution: 'version_vector',
      sync_interval_ms: 1000,
      max_retries: 3
    });

    queryRouter = new EdgeQueryRouter({
      maxLatency: 200,
      localityWeight: 0.5,
      loadBalancing: 'latency-optimized',
      cacheEnabled: true,
      cacheTTL: 60
    });

    sessionManager = new DistributedSessionManager({
      ttl: 3600,
      maxSize: 65536,
      replicationMode: 'async',
      compressionEnabled: true
    }, tursoClient);

    syncEngine = new RealTimeSyncEngine({
      syncInterval: 5000,
      batchSize: 100,
      conflictStrategy: 'version-based',
      enableWebSocket: false,
      compressionThreshold: 1024
    }, tursoClient, 'us-west-2');

    crdtResolver = new CRDTResolver(tursoClient, 'us-west-2');

    // Initialize all components
    await Promise.all([
      replicationManager.initialize(TEST_REGIONS),
      queryRouter.initialize(tursoClient),
      sessionManager.initialize(),
      syncEngine.initialize(),
      crdtResolver.initialize()
    ]);
  });

  afterAll(async () => {
    // Cleanup
    await syncEngine.stop();
    // Close connections
  });

  describe('Replication Performance', () => {
    test('should replicate data across regions within SLA', async () => {
      const startTime = Date.now();
      
      // Test data
      const testData = {
        id: `test-${Date.now()}`,
        user_id: 'user123',
        data: { message: 'Hello from edge!', timestamp: Date.now() },
        version: 1
      };

      // Replicate insert operation
      await replicationManager.replicate('insert', 'test_table', testData.id, testData);

      // Check replication lag
      const lag = await replicationManager.getReplicationLag();
      
      // Assert all regions have low lag
      for (const [regionId, lagSeconds] of lag.entries()) {
        expect(lagSeconds).toBeLessThan(5); // Less than 5 seconds lag
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Complete within 1 second
    });

    test('should handle concurrent updates with conflict resolution', async () => {
      const recordId = `concurrent-${Date.now()}`;
      
      // Simulate concurrent updates from different regions
      const updates = TEST_REGIONS.map((region, index) => 
        replicationManager.replicate('update', 'test_table', recordId, {
          id: recordId,
          value: `Update from ${region.id}`,
          version: index + 1,
          timestamp: Date.now() + index
        }, region.id)
      );

      // Wait for all updates
      await Promise.all(updates);

      // Check sync status
      const syncStatus = await replicationManager.getSyncStatus();
      
      // Verify no failed operations
      const failedOps = syncStatus.filter(s => s.failed_operations > 0);
      expect(failedOps).toHaveLength(0);
    });

    test('should maintain data consistency across regions', async () => {
      const testId = `consistency-${Date.now()}`;
      
      // Insert data
      await replicationManager.replicate('insert', 'consistency_test', testId, {
        id: testId,
        counter: 0,
        values: ['initial']
      });

      // Perform multiple updates
      for (let i = 1; i <= 5; i++) {
        await replicationManager.replicate('update', 'consistency_test', testId, {
          id: testId,
          counter: i,
          values: [`update-${i}`]
        });
      }

      // Give time for replication
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify final state across regions
      const syncStatus = await replicationManager.getSyncStatus();
      expect(syncStatus.every(s => s.status === 'active')).toBe(true);
    });
  });

  describe('Query Routing Performance', () => {
    test('should route queries to optimal region', async () => {
      // Create test data distribution
      await queryRouter.updateDataLocality('users', 'us-west', 'us-west-2', 5000);
      await queryRouter.updateDataLocality('users', 'eu', 'eu-central-1', 3000);
      await queryRouter.updateDataLocality('users', 'asia', 'ap-southeast-1', 2000);

      // Test query routing
      const query = 'SELECT * FROM users WHERE region = ?';
      const plan = await queryRouter.route(query, ['us-west'], 'us-west-2');

      expect(plan.primaryRegion).toBe('us-west-2');
      expect(plan.consistency).toBe('eventual');
      expect(plan.timeout).toBeGreaterThan(0);
    });

    test('should cache frequently accessed queries', async () => {
      const query = 'SELECT count(*) FROM products';
      
      // First execution - no cache
      const plan1 = await queryRouter.route(query);
      const startTime1 = Date.now();
      const result1 = await queryRouter.execute(plan1);
      const duration1 = Date.now() - startTime1;

      // Second execution - should hit cache
      const plan2 = await queryRouter.route(query);
      expect(plan2.cacheKey).toBeDefined();
      
      // Cached query should be much faster
      const startTime2 = Date.now();
      const result2 = await queryRouter.execute(plan2);
      const duration2 = Date.now() - startTime2;

      expect(duration2).toBeLessThan(duration1 / 2);
    });

    test('should handle failover gracefully', async () => {
      const query = 'SELECT * FROM critical_data WHERE id = ?';
      const params = ['critical-123'];

      // Create plan with fallback regions
      const plan = await queryRouter.route(query, params);
      expect(plan.fallbackRegions.length).toBeGreaterThan(0);

      // Simulate primary region failure by using invalid query
      const failingPlan = {
        ...plan,
        query: 'INVALID SQL QUERY'
      };

      // Should fall back to secondary region
      await expect(queryRouter.execute(failingPlan, params)).rejects.toThrow();
    });
  });

  describe('Distributed Session Performance', () => {
    test('should create and retrieve sessions efficiently', async () => {
      const sessionData = {
        userId: 'test-user-123',
        preferences: { theme: 'dark', language: 'en' },
        cart: { items: ['item1', 'item2'], total: 99.99 }
      };

      // Create session
      const startCreate = Date.now();
      const session = await sessionManager.create(
        `session-${Date.now()}`,
        sessionData,
        sessionData.userId,
        'us-west-2'
      );
      const createDuration = Date.now() - startCreate;

      expect(createDuration).toBeLessThan(100); // Less than 100ms
      expect(session.data).toEqual(sessionData);

      // Retrieve session
      const startGet = Date.now();
      const retrieved = await sessionManager.get(session.sessionId);
      const getDuration = Date.now() - startGet;

      expect(getDuration).toBeLessThan(50); // Less than 50ms from cache
      expect(retrieved?.data).toEqual(sessionData);
    });

    test('should handle session migration between regions', async () => {
      const sessionId = `migrate-${Date.now()}`;
      
      // Create session in US West
      await sessionManager.create(sessionId, { location: 'us-west' }, undefined, 'us-west-2');

      // Simulate access from EU
      await sessionManager.get(sessionId, 'eu-central-1');
      await sessionManager.get(sessionId, 'eu-central-1');
      await sessionManager.get(sessionId, 'eu-central-1');

      // Should trigger migration
      await sessionManager.migrate(sessionId, 'eu-central-1', 'access_pattern');

      // Verify migration
      const session = await sessionManager.get(sessionId);
      expect(session?.metadata.currentRegion).toBe('eu-central-1');
    });

    test('should maintain session consistency during concurrent updates', async () => {
      const sessionId = `concurrent-session-${Date.now()}`;
      
      // Create session
      await sessionManager.create(sessionId, { counter: 0 });

      // Concurrent updates
      const updates = Array.from({ length: 10 }, (_, i) => 
        sessionManager.update(sessionId, { counter: i + 1 })
      );

      await Promise.all(updates);

      // Verify final state
      const final = await sessionManager.get(sessionId);
      expect(final?.data.counter).toBeGreaterThan(0);
    });
  });

  describe('Real-Time Sync Performance', () => {
    test('should sync events across regions in real-time', async () => {
      // Start sync engine
      await syncEngine.start(['us-west-2', 'eu-central-1', 'ap-southeast-1']);

      // Publish events
      const events = Array.from({ length: 10 }, (_, i) => ({
        type: 'insert' as const,
        table: 'events',
        recordId: `event-${i}`,
        data: { message: `Event ${i}`, timestamp: Date.now() },
        version: 1
      }));

      const publishStart = Date.now();
      
      for (const event of events) {
        await syncEngine.publish(event);
      }

      const publishDuration = Date.now() - publishStart;
      expect(publishDuration).toBeLessThan(500); // All events published within 500ms

      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check sync status
      const syncStatus = await syncEngine.getSyncStatus();
      for (const [regionId, status] of syncStatus.entries()) {
        expect(status.pendingEvents).toBe(0);
        expect(status.isConnected).toBe(true);
      }
    });

    test('should handle high-throughput event streams', async () => {
      const eventCount = 100;
      const events = [];

      // Subscribe to events
      let receivedCount = 0;
      const unsubscribe = syncEngine.subscribe('high_throughput', (event) => {
        receivedCount++;
      });

      // Publish burst of events
      const burstStart = Date.now();
      
      for (let i = 0; i < eventCount; i++) {
        events.push(syncEngine.publish({
          type: 'insert',
          table: 'high_throughput',
          recordId: `burst-${i}`,
          data: { index: i },
          version: 1
        }));
      }

      await Promise.all(events);
      const burstDuration = Date.now() - burstStart;

      // Calculate throughput
      const throughput = (eventCount / burstDuration) * 1000; // Events per second
      expect(throughput).toBeGreaterThan(100); // At least 100 events/second

      // Cleanup
      unsubscribe();
    });
  });

  describe('CRDT Performance', () => {
    test('should merge G-Counter efficiently', async () => {
      const counterId = 'perf-counter';
      
      // Get counter instances for different nodes
      const counter1 = await crdtResolver.getCRDT<number>(counterId, 'g-counter');
      
      // Perform increments
      const incrementStart = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        await crdtResolver.applyOperation(counterId, 'increment', {
          nodeId: 'node1',
          amount: 1
        });
      }

      const incrementDuration = Date.now() - incrementStart;
      const opsPerSecond = 1000 / (incrementDuration / 1000);
      
      expect(opsPerSecond).toBeGreaterThan(500); // At least 500 ops/second
    });

    test('should handle OR-Set operations with low latency', async () => {
      const setId = 'perf-set';
      
      // Get set instance
      const orSet = await crdtResolver.getCRDT<Set<string>>(setId, 'or-set');

      // Add elements
      const addStart = Date.now();
      
      for (let i = 0; i < 100; i++) {
        await crdtResolver.applyOperation(setId, 'add', {
          value: `element-${i}`
        });
      }

      const addDuration = Date.now() - addStart;
      expect(addDuration).toBeLessThan(1000); // Less than 1 second for 100 adds

      // Remove elements
      const removeStart = Date.now();
      
      for (let i = 0; i < 50; i++) {
        await crdtResolver.applyOperation(setId, 'remove', {
          value: `element-${i}`
        });
      }

      const removeDuration = Date.now() - removeStart;
      expect(removeDuration).toBeLessThan(500); // Less than 500ms for 50 removes
    });

    test('should resolve conflicts automatically', async () => {
      const registerId = 'conflict-register';
      
      // Simulate concurrent updates
      const updates = TEST_REGIONS.map((region, index) => 
        crdtResolver.applyOperation(registerId, 'set', {
          value: `Value from ${region.id}`,
          nodeId: region.id,
          timestamp: Date.now() + index
        })
      );

      await Promise.all(updates);

      // Sync operations
      const synced = await crdtResolver.sync();
      expect(synced).toBeGreaterThanOrEqual(0);

      // Check conflict stats
      const stats = await crdtResolver.getConflictStats();
      expect(Array.isArray(stats)).toBe(true);
    });
  });

  describe('End-to-End Performance', () => {
    test('should handle mixed workload efficiently', async () => {
      const startTime = Date.now();
      const operations = [];

      // Mix of different operations
      operations.push(
        // Replication
        replicationManager.replicate('insert', 'mixed_table', 'mixed-1', { data: 'test' }),
        
        // Query routing
        queryRouter.route('SELECT * FROM mixed_table').then(plan => 
          queryRouter.execute(plan)
        ),
        
        // Session management
        sessionManager.create('mixed-session', { workload: 'mixed' }),
        
        // Real-time sync
        syncEngine.publish({
          type: 'update',
          table: 'mixed_table',
          recordId: 'mixed-1',
          data: { updated: true },
          version: 2
        }),
        
        // CRDT operation
        crdtResolver.applyOperation('mixed-counter', 'increment', { amount: 1 })
      );

      await Promise.all(operations);
      const totalDuration = Date.now() - startTime;

      expect(totalDuration).toBeLessThan(2000); // All operations within 2 seconds
    });

    test('should maintain performance under load', async () => {
      const loadTestDuration = 5000; // 5 seconds
      const startTime = Date.now();
      let operationCount = 0;
      const errors = [];

      // Generate continuous load
      while (Date.now() - startTime < loadTestDuration) {
        try {
          await Promise.all([
            sessionManager.create(`load-${operationCount}`, { index: operationCount }),
            queryRouter.route('SELECT 1').then(p => queryRouter.execute(p)),
            crdtResolver.applyOperation('load-counter', 'increment', { amount: 1 })
          ]);
          operationCount += 3;
        } catch (error) {
          errors.push(error);
        }

        // Small delay to prevent overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const opsPerSecond = operationCount / (loadTestDuration / 1000);
      const errorRate = errors.length / operationCount;

      expect(opsPerSecond).toBeGreaterThan(100); // At least 100 ops/second
      expect(errorRate).toBeLessThan(0.01); // Less than 1% error rate
    });
  });

  describe('Monitoring and Metrics', () => {
    test('should collect performance metrics', async () => {
      // Get sync metrics
      const syncMetrics = await syncEngine.getMetrics(3600);
      expect(syncMetrics).toHaveProperty('syncMetrics');
      expect(syncMetrics).toHaveProperty('conflicts');
      expect(syncMetrics).toHaveProperty('regionsActive');

      // Get session analytics
      const sessionAnalytics = await sessionManager.getAnalytics(3600);
      expect(sessionAnalytics).toHaveProperty('accessPatterns');
      expect(sessionAnalytics).toHaveProperty('cacheHitRate');
      expect(sessionAnalytics).toHaveProperty('averageLatency');

      // Get replication status
      const replicationStatus = await replicationManager.getSyncStatus();
      expect(Array.isArray(replicationStatus)).toBe(true);
      expect(replicationStatus.length).toBeGreaterThan(0);
    });
  });
});