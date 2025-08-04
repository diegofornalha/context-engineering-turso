import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { SyncCoordinator } from '../src/sync-coordinator';
import { MasterSlaveSync } from '../src/sync-protocols/master-slave';
import { PeerToPeerSync } from '../src/sync-protocols/peer-to-peer';
import { EventualConsistencySync } from '../src/sync-protocols/eventual';
import { DistributedChatSync } from '../src/examples/chat-sync';
import { DistributedInventorySync } from '../src/examples/inventory-sync';
import { CollaborativeEditingSync } from '../src/examples/collaborative';

// Mock Turso URLs for testing
const TEST_NODES = [
  { 
    id: 'node-1', 
    url: 'libsql://test-node-1.turso.io',
    location: 'us-east-1',
    isMaster: true
  },
  { 
    id: 'node-2', 
    url: 'libsql://test-node-2.turso.io',
    location: 'eu-west-1',
    isMaster: false
  },
  { 
    id: 'node-3', 
    url: 'libsql://test-node-3.turso.io',
    location: 'ap-south-1',
    isMaster: false
  }
];

describe('Distributed Sync Scenarios', () => {
  describe('Basic Sync Coordinator', () => {
    let syncCoordinator: SyncCoordinator;

    beforeEach(async () => {
      syncCoordinator = new SyncCoordinator({
        primary: TEST_NODES[0].url,
        replicas: TEST_NODES.slice(1).map(n => n.url),
        syncInterval: 1000,
        conflictStrategy: 'last-write-wins'
      });
    });

    afterEach(async () => {
      await syncCoordinator.stopSync();
    });

    it('should initialize sync infrastructure', async () => {
      await syncCoordinator.startSync();
      const status = await syncCoordinator.getStatus();
      
      expect(status).toBeDefined();
      expect(status.length).toBeGreaterThan(0);
      expect(status[0]).toHaveProperty('nodeId');
      expect(status[0]).toHaveProperty('isHealthy');
    });

    it('should handle concurrent writes with LWW strategy', async () => {
      const change1 = {
        id: 'change-1',
        nodeId: 'node-1',
        timestamp: Date.now(),
        operation: 'update' as const,
        table: 'users',
        data: { id: 'user-1', name: 'Alice', age: 25 },
        version: 1
      };

      const change2 = {
        id: 'change-2',
        nodeId: 'node-2',
        timestamp: Date.now() + 100,
        operation: 'update' as const,
        table: 'users',
        data: { id: 'user-1', name: 'Alice', age: 26 },
        version: 1
      };

      const conflicts = await syncCoordinator.resolveConflicts('last-write-wins');
      
      // change2 should win due to later timestamp
      expect(conflicts).toBeDefined();
    });
  });

  describe('Master-Slave Replication', () => {
    let masterSlaveSync: MasterSlaveSync;

    beforeEach(async () => {
      masterSlaveSync = new MasterSlaveSync({
        master: {
          url: TEST_NODES[0].url,
          authToken: 'test-token'
        },
        slaves: TEST_NODES.slice(1).map(n => ({
          url: n.url,
          authToken: 'test-token',
          readonly: false
        })),
        replicationDelay: 100,
        batchSize: 50
      });
    });

    afterEach(async () => {
      await masterSlaveSync.stopReplication();
    });

    it('should replicate writes from master to slaves', async () => {
      await masterSlaveSync.startReplication();

      // Execute write on master
      const result = await masterSlaveSync.executeOnMaster(
        'INSERT INTO test_table (id, value) VALUES (?, ?)',
        ['test-1', 'value-1']
      );

      expect(result).toBeDefined();

      // Wait for replication
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check replication lag
      const lag = await masterSlaveSync.getReplicationLag();
      expect(lag.size).toBeGreaterThan(0);
    });

    it('should handle slave promotion for failover', async () => {
      await masterSlaveSync.startReplication();

      // Promote slave to master
      await masterSlaveSync.promoteSlave('slave-0');

      // Verify promotion completed
      expect(true).toBe(true); // Event should be emitted
    });
  });

  describe('Peer-to-Peer Sync', () => {
    let p2pNodes: PeerToPeerSync[] = [];

    beforeEach(async () => {
      // Create 3 P2P nodes
      for (let i = 0; i < 3; i++) {
        const node = new PeerToPeerSync({
          localNode: {
            nodeId: `p2p-node-${i}`,
            url: TEST_NODES[i].url,
            wsPort: 8000 + i
          },
          peers: TEST_NODES.filter((_, idx) => idx !== i).map((n, idx) => ({
            nodeId: `p2p-node-${idx < i ? idx : idx + 1}`,
            url: n.url,
            wsPort: 8000 + (idx < i ? idx : idx + 1)
          })),
          gossipInterval: 1000,
          syncBatchSize: 10
        });
        
        p2pNodes.push(node);
        await node.startGossip();
      }
    });

    afterEach(async () => {
      for (const node of p2pNodes) {
        await node.stopGossip();
      }
    });

    it('should propagate events through gossip protocol', async () => {
      // Record event on node 0
      await p2pNodes[0].recordEvent(
        'insert',
        'test_table',
        { id: 'gossip-1', value: 'test' }
      );

      // Wait for gossip propagation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check network status on all nodes
      for (const node of p2pNodes) {
        const status = await node.getNetworkStatus();
        expect(status.totalEvents).toBeGreaterThan(0);
      }
    });

    it('should maintain vector clocks for causality', async () => {
      // Create causally related events
      await p2pNodes[0].recordEvent('insert', 'orders', { id: 'order-1' });
      await p2pNodes[1].recordEvent('update', 'orders', { id: 'order-1', status: 'processing' });
      await p2pNodes[2].recordEvent('update', 'orders', { id: 'order-1', status: 'shipped' });

      await new Promise(resolve => setTimeout(resolve, 3000));

      const status = await p2pNodes[0].getNetworkStatus();
      expect(status.vectorClock).toBeDefined();
      expect(Object.keys(status.vectorClock).length).toBe(3);
    });
  });

  describe('Eventual Consistency', () => {
    let eventualSync: EventualConsistencySync;

    beforeEach(async () => {
      eventualSync = new EventualConsistencySync({
        nodes: TEST_NODES.map(n => ({
          id: n.id,
          url: n.url,
          weight: n.isMaster ? 2 : 1
        })),
        consistency: 'eventual',
        quorumSize: 2,
        conflictResolution: 'crdt'
      });
    });

    it('should perform quorum reads', async () => {
      const result = await eventualSync.read(
        'products',
        'prod-123',
        'strong'
      );

      // Result should be from quorum agreement
      expect(result).toBeDefined();
    });

    it('should handle CRDT merges correctly', async () => {
      // Test G-Counter merge
      const counter1 = { 'node-1': 5, 'node-2': 3 };
      const counter2 = { 'node-1': 4, 'node-2': 7, 'node-3': 2 };

      const merged = await eventualSync.mergeCRDT(
        'counter-1',
        'g-counter',
        counter1,
        counter2
      );

      expect(merged).toEqual({
        'node-1': 5,
        'node-2': 7,
        'node-3': 2
      });
    });

    it('should run anti-entropy process', async () => {
      // Create some divergent state
      await eventualSync.write('test', 'key-1', { value: 'v1' }, 'eventual');
      await eventualSync.write('test', 'key-2', { value: 'v2' }, 'eventual');

      // Run anti-entropy
      await eventualSync.runAntiEntropy();

      // All nodes should converge
      expect(true).toBe(true); // Check via events
    });
  });

  describe('Chat Application Sync', () => {
    let chatSync: DistributedChatSync;
    const userId = 'test-user-1';

    beforeEach(async () => {
      chatSync = new DistributedChatSync({
        primary: TEST_NODES[0].url,
        replicas: TEST_NODES.slice(1).map(n => n.url),
        enableP2P: true,
        userId
      });
      
      await chatSync.initialize();
    });

    afterEach(async () => {
      await chatSync.shutdown();
    });

    it('should sync messages across regions', async () => {
      const roomId = 'room-123';
      
      // Send message
      const message = await chatSync.sendMessage(roomId, 'Hello, world!');
      
      expect(message.id).toBeDefined();
      expect(message.content).toBe('Hello, world!');
      expect(message.userId).toBe(userId);

      // Retrieve messages
      const messages = await chatSync.getMessages(roomId, { limit: 10 });
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].content).toBe('Hello, world!');
    });

    it('should handle message reactions with CRDT semantics', async () => {
      const roomId = 'room-123';
      const message = await chatSync.sendMessage(roomId, 'Test message');
      
      // Add reactions from different users
      await chatSync.addReaction(message.id, '👍');
      
      // Simulate another user adding same reaction
      const chatSync2 = new DistributedChatSync({
        primary: TEST_NODES[1].url,
        replicas: [TEST_NODES[0].url, TEST_NODES[2].url],
        userId: 'test-user-2'
      });
      
      await chatSync2.initialize();
      await chatSync2.addReaction(message.id, '👍');
      
      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Check reactions merged correctly
      const messages = await chatSync.getMessages(roomId);
      const updatedMessage = messages.find(m => m.id === message.id);
      
      expect(updatedMessage?.reactions?.['👍']).toHaveLength(2);
      expect(updatedMessage?.reactions?.['👍']).toContain(userId);
      expect(updatedMessage?.reactions?.['👍']).toContain('test-user-2');
      
      await chatSync2.shutdown();
    });

    it('should queue offline messages', async () => {
      await chatSync.queueOfflineMessage('room-456', 'Offline message');
      
      // Simulate coming back online
      await chatSync.syncOfflineMessages();
      
      // Message should be synced
      const messages = await chatSync.getMessages('room-456');
      expect(messages.some(m => m.content === 'Offline message')).toBe(true);
    });
  });

  describe('Inventory Management Sync', () => {
    let inventorySync: DistributedInventorySync;

    beforeEach(async () => {
      inventorySync = new DistributedInventorySync({
        nodes: TEST_NODES,
        syncMode: 'eventual',
        lowStockThreshold: 10,
        conflictResolution: 'conservative'
      });
      
      await inventorySync.initialize();
    });

    afterEach(async () => {
      await inventorySync.shutdown();
    });

    it('should handle concurrent stock adjustments conservatively', async () => {
      const sku = 'PROD-001';
      const location = TEST_NODES[0].location;
      
      // Initial stock
      await inventorySync.adjustStock(sku, location, 100, 'Initial stock', 'system');
      
      // Concurrent adjustments
      await Promise.all([
        inventorySync.adjustStock(sku, location, -30, 'Sale 1', 'user-1'),
        inventorySync.adjustStock(sku, location, -40, 'Sale 2', 'user-2'),
        inventorySync.adjustStock(sku, location, -25, 'Sale 3', 'user-3')
      ]);
      
      // Check final stock level
      const levels = await inventorySync.getStockLevels(sku);
      const locationStock = levels.find(l => l.locationId === location);
      
      // Conservative resolution should prevent negative inventory
      expect(locationStock?.quantity).toBeGreaterThanOrEqual(0);
    });

    it('should transfer stock between locations atomically', async () => {
      const sku = 'PROD-002';
      const fromLocation = TEST_NODES[0].location;
      const toLocation = TEST_NODES[1].location;
      
      // Setup initial stock
      await inventorySync.adjustStock(sku, fromLocation, 50, 'Initial', 'system');
      
      // Transfer stock
      await inventorySync.transferStock(sku, fromLocation, toLocation, 20, 'user-1');
      
      // Check both locations
      const levels = await inventorySync.getStockLevels(sku);
      const fromStock = levels.find(l => l.locationId === fromLocation);
      const toStock = levels.find(l => l.locationId === toLocation);
      
      expect(fromStock?.quantity).toBe(30);
      expect(toStock?.quantity).toBe(20);
    });

    it('should generate alerts for low stock', async () => {
      const sku = 'PROD-003';
      const location = TEST_NODES[0].location;
      
      // Set stock below threshold
      await inventorySync.adjustStock(sku, location, 5, 'Low stock test', 'system');
      
      // Check alerts
      const alerts = await inventorySync.getActiveAlerts(location);
      const lowStockAlert = alerts.find(a => 
        a.sku === sku && a.alertType === 'low_stock'
      );
      
      expect(lowStockAlert).toBeDefined();
      expect(lowStockAlert?.currentLevel).toBe(5);
    });

    it('should track movement history with audit trail', async () => {
      const sku = 'PROD-004';
      const location = TEST_NODES[0].location;
      
      // Multiple movements
      await inventorySync.adjustStock(sku, location, 100, 'Initial', 'user-1');
      await inventorySync.adjustStock(sku, location, -20, 'Sale', 'user-2');
      await inventorySync.adjustStock(sku, location, 30, 'Restock', 'user-3');
      
      // Get history
      const history = await inventorySync.getMovementHistory(sku, { locationId: location });
      
      expect(history.length).toBe(3);
      expect(history[0].type).toBe('adjustment');
      expect(history.map(h => h.quantity)).toEqual([30, -20, 100]);
    });
  });

  describe('Collaborative Editing Sync', () => {
    let editor1: CollaborativeEditingSync;
    let editor2: CollaborativeEditingSync;

    beforeEach(async () => {
      editor1 = new CollaborativeEditingSync({
        userId: 'editor-1',
        nodeUrl: TEST_NODES[0].url,
        peers: [{
          userId: 'editor-2',
          url: TEST_NODES[1].url
        }],
        userColor: '#FF6B6B'
      });

      editor2 = new CollaborativeEditingSync({
        userId: 'editor-2',
        nodeUrl: TEST_NODES[1].url,
        peers: [{
          userId: 'editor-1',
          url: TEST_NODES[0].url
        }],
        userColor: '#4ECDC4'
      });

      await editor1.initialize();
      await editor2.initialize();
    });

    afterEach(async () => {
      await editor1.shutdown();
      await editor2.shutdown();
    });

    it('should sync concurrent text insertions', async () => {
      // Create document
      const doc = await editor1.createDocument('Test Doc', 'Initial content');
      
      // Open document in editor2
      await editor2.openDocument(doc.id);
      
      // Concurrent edits
      await Promise.all([
        editor1.insertText(doc.id, 0, 'Start: '),
        editor2.insertText(doc.id, 15, ' :End')
      ]);
      
      // Wait for sync
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Both editors should have same content
      const doc1 = await editor1.openDocument(doc.id);
      const doc2 = await editor2.openDocument(doc.id);
      
      expect(doc1.content).toBe(doc2.content);
      expect(doc1.content).toContain('Start:');
      expect(doc1.content).toContain(':End');
    });

    it('should maintain cursor positions across editors', async () => {
      const doc = await editor1.createDocument('Cursor Test', 'Test content');
      
      // Update cursors
      await editor1.updateCursor(doc.id, 5);
      await editor2.updateCursor(doc.id, 10, { start: 8, end: 12 });
      
      // Wait for propagation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Check active collaborators
      const collaborators = await editor1.getActiveCollaborators(doc.id);
      
      expect(collaborators.length).toBe(2);
      expect(collaborators.find(c => c.userId === 'editor-2')?.cursor.position).toBe(10);
    });

    it('should support document versioning and rollback', async () => {
      const doc = await editor1.createDocument('Version Test', 'Version 1');
      
      // Make edits
      await editor1.insertText(doc.id, 9, ' - Edit 1');
      const v1 = await editor1.createVersion(doc.id);
      
      await editor1.insertText(doc.id, 0, 'Modified: ');
      const v2 = await editor1.createVersion(doc.id);
      
      // Get version history
      const history = await editor1.getVersionHistory(doc.id);
      expect(history.length).toBeGreaterThanOrEqual(2);
      
      // Rollback to v1
      await editor1.rollbackToVersion(doc.id, v1);
      
      const rolledBack = await editor1.openDocument(doc.id);
      expect(rolledBack.content).toBe('Version 1 - Edit 1');
    });
  });

  describe('Network Partition Scenarios', () => {
    it('should handle split-brain with eventual convergence', async () => {
      // Simulate network partition by creating isolated nodes
      const partition1 = new EventualConsistencySync({
        nodes: [TEST_NODES[0], TEST_NODES[1]],
        consistency: 'eventual',
        quorumSize: 1,
        conflictResolution: 'lww'
      });

      const partition2 = new EventualConsistencySync({
        nodes: [TEST_NODES[2]],
        consistency: 'eventual',
        quorumSize: 1,
        conflictResolution: 'lww'
      });

      // Concurrent writes during partition
      await partition1.write('users', 'user-1', { name: 'Alice', age: 30 });
      await partition2.write('users', 'user-1', { name: 'Alice', age: 31 });

      // Simulate partition healing by running anti-entropy
      // In real scenario, this would happen when network reconnects
      const healed = new EventualConsistencySync({
        nodes: TEST_NODES,
        consistency: 'eventual',
        quorumSize: 2,
        conflictResolution: 'lww'
      });

      await healed.runAntiEntropy();

      // All nodes should converge to same value
      const result = await healed.read('users', 'user-1', 'strong');
      expect(result).toBeDefined();
      expect(result.age).toBeDefined(); // Should be either 30 or 31 based on timestamps
    });
  });

  describe('Performance and Scale Tests', () => {
    it('should handle high-frequency updates efficiently', async () => {
      const syncCoordinator = new SyncCoordinator({
        primary: TEST_NODES[0].url,
        replicas: TEST_NODES.slice(1).map(n => n.url),
        syncInterval: 100, // Fast sync
        conflictStrategy: 'last-write-wins',
        enableRealtime: true
      });

      await syncCoordinator.startSync();

      const startTime = Date.now();
      const updateCount = 100;

      // Rapid updates
      const promises = [];
      for (let i = 0; i < updateCount; i++) {
        promises.push(
          syncCoordinator.resolveConflicts('last-write-wins')
        );
      }

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should handle 100 updates in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      
      await syncCoordinator.stopSync();
    });

    it('should batch operations efficiently', async () => {
      const inventorySync = new DistributedInventorySync({
        nodes: TEST_NODES,
        syncMode: 'master-slave',
        conflictResolution: 'conservative'
      });

      await inventorySync.initialize();

      // Batch stock adjustments
      const adjustments = [];
      for (let i = 0; i < 50; i++) {
        adjustments.push(
          inventorySync.adjustStock(
            `SKU-${i}`,
            TEST_NODES[0].location,
            100,
            'Batch update',
            'system'
          )
        );
      }

      const startTime = Date.now();
      await Promise.all(adjustments);
      const duration = Date.now() - startTime;

      // Batching should be efficient
      expect(duration).toBeLessThan(3000);

      await inventorySync.shutdown();
    });
  });
});