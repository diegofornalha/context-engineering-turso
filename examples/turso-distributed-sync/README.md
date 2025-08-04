# Turso Distributed Sync Example

A comprehensive example demonstrating distributed data synchronization patterns with Turso's edge database platform. This example showcases real-world scenarios including chat applications, inventory management, and collaborative editing with various consistency models.

## 🚀 Features

### Core Sync Capabilities
- **Multi-Protocol Support**: Master-slave, peer-to-peer, and eventual consistency
- **Conflict Resolution**: Multiple strategies including LWW, CRDT, and custom business logic
- **Real-time Sync**: WebSocket-based instant propagation
- **Offline Support**: Queue and sync when reconnected
- **Monitoring**: Comprehensive metrics and health checks

### Sync Protocols

#### 1. Master-Slave Replication
- Centralized write authority
- Automatic failover with slave promotion
- Configurable replication lag
- Batch processing for efficiency

#### 2. Peer-to-Peer Sync
- Gossip protocol for distributed propagation
- Vector clocks for causal ordering
- No single point of failure
- Efficient epidemic dissemination

#### 3. Eventual Consistency
- Flexible consistency levels (strong, eventual, causal)
- CRDT support for conflict-free operations
- Anti-entropy for convergence
- Quorum-based operations

### Example Applications

#### 🔋 Chat Application
Real-time messaging with distributed sync:
- Message synchronization across regions
- Reactions with CRDT semantics
- Read receipts and typing indicators
- Offline message queuing
- Message history and search

#### 📦 Inventory Management
Multi-warehouse inventory sync:
- Conservative conflict resolution for stock levels
- Atomic stock transfers between locations
- Real-time alerts for low stock
- Complete audit trail
- Performance optimized for high-frequency updates

#### ✏️ Collaborative Editing
Google Docs-style real-time collaboration:
- CRDT-based text synchronization
- Cursor position sync
- Presence awareness
- Version history and rollback
- Conflict-free concurrent editing

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Chat Sync  │  Inventory Sync  │  Collaborative Editing    │
├─────────────────────────────────────────────────────────────┤
│                   Sync Coordinator                          │
├──────────────┬────────────────┬────────────────────────────┤
│ Master-Slave │  Peer-to-Peer  │  Eventual Consistency      │
├──────────────┴────────────────┴────────────────────────────┤
│              Conflict Resolution Engine                      │
├─────────────────────────────────────────────────────────────┤
│                 Monitoring & Metrics                         │
├─────────────────────────────────────────────────────────────┤
│                    Turso Edge Database                       │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Prerequisites

- Node.js 18+
- Turso account with multiple database instances
- TypeScript 5+

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd examples/turso-distributed-sync

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Turso credentials
```

## 🔧 Configuration

Create a `.env` file with your Turso configuration:

```env
# Primary database (master)
TURSO_PRIMARY_URL=libsql://your-primary-db.turso.io
TURSO_PRIMARY_TOKEN=your-auth-token

# Replica databases
TURSO_REPLICA_1_URL=libsql://your-replica-1.turso.io
TURSO_REPLICA_1_TOKEN=your-auth-token

TURSO_REPLICA_2_URL=libsql://your-replica-2.turso.io
TURSO_REPLICA_2_TOKEN=your-auth-token

# Sync configuration
SYNC_INTERVAL=5000
CONFLICT_STRATEGY=last-write-wins
ENABLE_REALTIME=true
```

## 📚 Usage Examples

### Basic Sync Setup

```typescript
import { SyncCoordinator } from './src/sync-coordinator';

// Initialize sync coordinator
const sync = new SyncCoordinator({
  primary: process.env.TURSO_PRIMARY_URL!,
  replicas: [
    process.env.TURSO_REPLICA_1_URL!,
    process.env.TURSO_REPLICA_2_URL!
  ],
  authToken: process.env.TURSO_PRIMARY_TOKEN,
  syncInterval: 5000,
  conflictStrategy: 'last-write-wins',
  enableRealtime: true
});

// Start synchronization
await sync.startSync();

// Monitor sync status
sync.on('sync:completed', (stats) => {
  console.log(`Synced ${stats.changesApplied} changes in ${stats.duration}ms`);
});
```

### Chat Application

```typescript
import { DistributedChatSync } from './src/examples/chat-sync';

// Initialize chat sync
const chat = new DistributedChatSync({
  primary: process.env.TURSO_PRIMARY_URL!,
  replicas: [process.env.TURSO_REPLICA_1_URL!],
  enableP2P: true,
  userId: 'user-123'
});

await chat.initialize();

// Send a message
const message = await chat.sendMessage('room-1', 'Hello, world!');

// Add reaction
await chat.addReaction(message.id, '👍');

// Get messages with real-time updates
const messages = await chat.getMessages('room-1', { limit: 50 });

// Handle offline messages
await chat.queueOfflineMessage('room-1', 'Sent while offline');
await chat.syncOfflineMessages();
```

### Inventory Management

```typescript
import { DistributedInventorySync } from './src/examples/inventory-sync';

// Initialize inventory sync
const inventory = new DistributedInventorySync({
  nodes: [
    { id: 'warehouse-us', url: process.env.TURSO_US_URL!, location: 'us-east-1', isMaster: true },
    { id: 'warehouse-eu', url: process.env.TURSO_EU_URL!, location: 'eu-west-1' },
    { id: 'warehouse-asia', url: process.env.TURSO_ASIA_URL!, location: 'ap-south-1' }
  ],
  syncMode: 'eventual',
  lowStockThreshold: 10,
  conflictResolution: 'conservative'
});

await inventory.initialize();

// Adjust stock
await inventory.adjustStock('SKU-001', 'us-east-1', 100, 'Initial stock', 'system');

// Transfer between locations
await inventory.transferStock('SKU-001', 'us-east-1', 'eu-west-1', 20, 'user-123');

// Reserve for order
const reserved = await inventory.reserveStock('SKU-001', 'us-east-1', 5, 'order-456');

// Check availability across all locations
const totalAvailable = await inventory.checkAvailability('SKU-001');

// Get alerts
const alerts = await inventory.getActiveAlerts();
```

### Collaborative Editing

```typescript
import { CollaborativeEditingSync } from './src/examples/collaborative';

// Initialize editor
const editor = new CollaborativeEditingSync({
  userId: 'editor-1',
  nodeUrl: process.env.TURSO_PRIMARY_URL!,
  peers: [
    { userId: 'editor-2', url: process.env.TURSO_REPLICA_1_URL! }
  ],
  userColor: '#FF6B6B'
});

await editor.initialize();

// Create document
const doc = await editor.createDocument('My Document', 'Initial content');

// Insert text
await editor.insertText(doc.id, 0, 'Hello ');

// Update cursor position
await editor.updateCursor(doc.id, 6);

// Get active collaborators
const collaborators = await editor.getActiveCollaborators(doc.id);

// Create version snapshot
const versionId = await editor.createVersion(doc.id);

// Rollback if needed
await editor.rollbackToVersion(doc.id, versionId);
```

## 📊 Monitoring

### Health Checks

```typescript
import { HealthChecker } from './src/monitoring/health-check';

const health = new HealthChecker({
  nodes: [/* your nodes */],
  checkInterval: 10000,
  thresholds: {
    maxLatency: 1000,
    maxErrorRate: 0.05,
    maxSyncLag: 60000
  }
});

await health.startHealthChecks();

// Get cluster health
const clusterHealth = await health.getClusterHealth();
console.log(`Cluster health: ${clusterHealth.overallHealth}`);
console.log(`Healthy nodes: ${clusterHealth.healthyNodes}/${clusterHealth.totalNodes}`);
```

### Metrics Collection

```typescript
import { SyncMetricsCollector } from './src/monitoring/sync-metrics';

const metrics = new SyncMetricsCollector(client);

// Record sync events
await metrics.recordSyncEvent('sync_completed', {
  duration: 150,
  success: true,
  changesApplied: 25
});

// Get comprehensive metrics
const syncMetrics = await metrics.getSyncMetrics();
console.log(`Success rate: ${(syncMetrics.successfulSyncs / syncMetrics.totalSyncs * 100).toFixed(2)}%`);
console.log(`Average latency: ${syncMetrics.averageLatency}ms`);
console.log(`P95 latency: ${syncMetrics.p95Latency}ms`);

// Export for Prometheus
const prometheusMetrics = await metrics.exportPrometheusMetrics();
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- sync-scenarios.test.ts

# Run with coverage
npm run test:coverage
```

## 🎯 Best Practices

### 1. Choose the Right Sync Protocol
- **Master-Slave**: When you need strong consistency and centralized control
- **Peer-to-Peer**: For decentralized systems with no single point of failure
- **Eventual Consistency**: When availability is more important than immediate consistency

### 2. Conflict Resolution Strategy
- **Last-Write-Wins**: Simple but may lose data
- **CRDT**: Automatic merging without conflicts
- **Custom**: Business-specific rules (e.g., conservative for inventory)

### 3. Performance Optimization
- Batch operations when possible
- Use appropriate sync intervals
- Monitor replication lag
- Implement circuit breakers for failing nodes

### 4. Error Handling
- Implement retry logic with exponential backoff
- Log sync conflicts for manual review
- Set up alerts for critical failures
- Regular health checks

## 🔍 Troubleshooting

### Common Issues

#### High Sync Lag
- Check network latency between regions
- Increase batch size for bulk operations
- Consider reducing sync frequency

#### Conflicts Not Resolving
- Verify conflict strategy is appropriate
- Check for clock drift between nodes
- Review custom resolution logic

#### WebSocket Connection Issues
- Ensure ports are not blocked
- Check for proxy/firewall restrictions
- Verify authentication tokens

## 📈 Performance Considerations

- **Sync Interval**: Balance between real-time updates and resource usage
- **Batch Size**: Larger batches are more efficient but increase latency
- **Conflict Resolution**: CRDT operations are more expensive but eliminate conflicts
- **Network Topology**: Consider geographic distribution when choosing protocols

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.