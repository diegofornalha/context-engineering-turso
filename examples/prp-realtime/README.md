# PRP Real-Time WebSocket Example

A comprehensive example demonstrating how to use the PRP (Prompt-Resource-Presentation) framework to build production-ready real-time systems using WebSockets.

## 🚀 Overview

This example creates a collaborative document editing system with:
- WebSocket server with room-based architecture
- Real-time event broadcasting
- Operational transformation for conflict resolution
- Automatic reconnection strategies
- Horizontal scaling with Redis
- Production-ready patterns

## 📁 Structure

```
examples/prp-realtime/
├── INITIAL.md                    # Starting context and requirements
├── .claude/commands/
│   ├── generate-realtime-prp.md  # Command to generate detailed PRP
│   └── execute-realtime-prp.md   # Command to implement the system
├── PRPs/
│   └── templates/
│       └── prp_realtime_base.md  # Base template for real-time systems
└── implementation/
    ├── src/
    │   ├── websocket-server.ts   # Main WebSocket server
    │   ├── room-manager.ts       # Room management logic
    │   ├── sync-engine.ts        # Conflict resolution engine
    │   └── event-handlers/       # Modular event handlers
    └── client/
        └── websocket-client.ts   # Browser/Node.js client
```

## 🎯 The 3-Step Process

### Step 1: Define Context
Start with `INITIAL.md` to define your requirements:
- System goals and constraints
- Technical requirements
- Expected scale and performance

### Step 2: Generate PRP
Run the generation command:
```bash
/.claude/commands/generate-realtime-prp
```

This creates a detailed technical specification including:
- Architecture design
- Protocol definitions
- Implementation guidelines
- Security considerations
- Testing strategies

### Step 3: Execute Implementation
Build the system using the PRP:
```bash
/.claude/commands/execute-realtime-prp
```

This generates:
- Complete TypeScript implementation
- Client libraries
- Configuration files
- Test suites
- Deployment guides

## 💡 Key Features

### Server Features
- **Connection Management**: Handle thousands of concurrent WebSocket connections
- **Room System**: Dynamic room creation with presence tracking
- **Event Routing**: Modular event handler system
- **Synchronization**: Operational transformation for collaborative editing
- **Scaling**: Redis pub/sub for multi-server deployment
- **Security**: JWT authentication and rate limiting

### Client Features
- **Auto-Reconnection**: Exponential backoff with jitter
- **Message Queue**: Offline message buffering
- **Type Safety**: Full TypeScript support
- **Event System**: Promise-based and event-driven APIs
- **Compression**: Optional message compression

## 🛠️ Usage Example

### Server Setup
```typescript
import { RealtimeServer } from './src/websocket-server';

const server = new RealtimeServer({
  port: 8080,
  heartbeatInterval: 30000,
  compression: true,
  redis: {
    host: 'localhost',
    port: 6379
  }
});

// Server is now running and accepting connections
```

### Client Usage
```typescript
import { RealtimeClient } from './client/websocket-client';

// Connect to server
const client = new RealtimeClient({
  url: 'ws://localhost:8080',
  auth: { token: 'your-jwt-token' },
  reconnect: true
});

await client.connect();

// Join a collaborative room
await client.joinRoom('doc-123');

// Send document updates
await client.sendOperation('doc-123', {
  type: 'insert',
  position: 0,
  data: 'Hello World',
  version: 1
});

// Listen for updates
client.on('sync.update', (data) => {
  console.log('Document updated:', data);
});
```

## 📊 Architecture

The system uses a layered architecture:

1. **Connection Layer**: WebSocket connection management
2. **Authentication Layer**: JWT-based auth middleware
3. **Room Layer**: Room-based message routing
4. **Sync Layer**: Operational transformation engine
5. **Scaling Layer**: Redis pub/sub for horizontal scaling

## 🧪 Testing

The example includes comprehensive testing strategies:
- Unit tests for all components
- Integration tests for WebSocket flows
- Load tests for performance validation
- Chaos tests for failure scenarios

## 🚀 Deployment

The PRP includes deployment guidance for:
- Docker containerization
- Kubernetes orchestration
- Load balancer configuration
- Monitoring and observability
- Performance optimization

## 📚 Learning Resources

This example demonstrates:
- How to structure PRPs for real-time systems
- WebSocket best practices
- Scaling patterns for stateful connections
- Conflict resolution algorithms
- Production deployment strategies

## 🔄 Customization

The base template (`prp_realtime_base.md`) can be customized for:
- Chat applications
- Live collaboration tools
- Real-time gaming
- IoT data streaming
- Live notifications

## 📝 Next Steps

1. Review the `INITIAL.md` file to understand the context
2. Explore the command documentation
3. Study the implementation examples
4. Customize for your specific use case
5. Use the PRP framework for your own real-time projects

Remember: The PRP framework ensures you think through all aspects before coding, resulting in more robust and maintainable systems!