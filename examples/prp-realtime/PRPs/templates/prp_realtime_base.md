# PRP Template: Real-Time WebSocket Systems

## 1. Context Definition

### System Overview
**Purpose**: [Define the real-time system's primary goal]
**Scale**: [Expected concurrent connections and message volume]
**Use Cases**: [Specific features like chat, collaboration, gaming, etc.]

### Technical Requirements
- **Latency**: Maximum acceptable message delay
- **Reliability**: Message delivery guarantees (at-most-once, at-least-once, exactly-once)
- **Ordering**: Message ordering requirements
- **Persistence**: State and message persistence needs
- **Security**: Authentication and authorization requirements

### Constraints
- **Infrastructure**: Available servers, load balancers, databases
- **Technology**: Required languages, frameworks, protocols
- **Compliance**: Data privacy, geographic restrictions
- **Budget**: Cost constraints for infrastructure and services

## 2. Architecture Design

### Core Components

```typescript
// 1. Connection Layer
interface ConnectionManager {
  accept(socket: WebSocket): Connection;
  authenticate(connection: Connection): Promise<User>;
  track(connection: Connection): void;
  remove(connectionId: string): void;
}

// 2. Message Layer
interface MessageBroker {
  publish(channel: string, message: Message): void;
  subscribe(channel: string, handler: MessageHandler): void;
  unsubscribe(channel: string, handler: MessageHandler): void;
}

// 3. State Layer
interface StateManager {
  getState(key: string): Promise<State>;
  setState(key: string, state: State): Promise<void>;
  subscribeToChanges(key: string, handler: ChangeHandler): void;
}

// 4. Synchronization Layer
interface SyncEngine {
  merge(local: State, remote: State): State;
  diff(oldState: State, newState: State): Operation[];
  apply(state: State, operations: Operation[]): State;
}
```

### Communication Protocol

```typescript
// Base message structure
interface Message {
  id: string;           // Unique message identifier
  type: string;         // Message type for routing
  timestamp: number;    // Unix timestamp
  version?: number;     // Protocol version
  data: any;           // Payload
}

// Client -> Server messages
interface ClientMessage extends Message {
  auth?: string;       // Authentication token
  ack?: string;        // Acknowledgment ID
}

// Server -> Client messages
interface ServerMessage extends Message {
  error?: ErrorInfo;   // Error details if applicable
  ack?: string;        // Client message acknowledgment
}

// Error structure
interface ErrorInfo {
  code: string;        // Error code for client handling
  message: string;     // Human-readable message
  retry?: boolean;     // Whether client should retry
}
```

### Scaling Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Load Balancer                      │
│              (Sticky Sessions/Hash)                  │
└─────────────────┬─────────────────┬─────────────────┘
                  │                 │
          ┌───────▼──────┐  ┌──────▼───────┐
          │  WS Server 1 │  │  WS Server 2 │  ...
          └───────┬──────┘  └──────┬───────┘
                  │                 │
          ┌───────▼─────────────────▼───────┐
          │          Redis Pub/Sub          │
          │     (Message Broadcasting)      │
          └─────────────┬───────────────────┘
                        │
          ┌─────────────▼───────────────────┐
          │          Redis/DB               │
          │      (State Storage)            │
          └─────────────────────────────────┘
```

## 3. Implementation Guidelines

### Connection Lifecycle

```typescript
class WebSocketConnection {
  private ws: WebSocket;
  private userId: string;
  private rooms: Set<string> = new Set();
  private lastActivity: number;
  
  constructor(ws: WebSocket, userId: string) {
    this.ws = ws;
    this.userId = userId;
    this.lastActivity = Date.now();
    
    this.setupHandlers();
    this.startHeartbeat();
  }
  
  private setupHandlers(): void {
    this.ws.on('message', this.handleMessage.bind(this));
    this.ws.on('close', this.handleClose.bind(this));
    this.ws.on('error', this.handleError.bind(this));
    this.ws.on('pong', this.handlePong.bind(this));
  }
  
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (Date.now() - this.lastActivity > 30000) {
        this.ws.terminate();
      } else {
        this.ws.ping();
      }
    }, 15000);
  }
}
```

### Room Management

```typescript
class Room {
  private id: string;
  private members: Map<string, Connection> = new Map();
  private state: RoomState;
  private maxMembers: number;
  
  async addMember(connection: Connection): Promise<void> {
    if (this.members.size >= this.maxMembers) {
      throw new Error('Room is full');
    }
    
    this.members.set(connection.id, connection);
    await this.broadcastMemberJoined(connection);
    await this.sendStateToMember(connection);
  }
  
  async removeMember(connectionId: string): Promise<void> {
    const connection = this.members.get(connectionId);
    if (!connection) return;
    
    this.members.delete(connectionId);
    await this.broadcastMemberLeft(connection);
    
    if (this.members.size === 0) {
      await this.destroy();
    }
  }
  
  async broadcast(message: Message, excludeId?: string): Promise<void> {
    const promises = Array.from(this.members.values())
      .filter(conn => conn.id !== excludeId)
      .map(conn => conn.send(message));
    
    await Promise.allSettled(promises);
  }
}
```

### Event Handling

```typescript
abstract class EventHandler<T = any> {
  abstract readonly type: string;
  
  abstract validate(data: T): boolean;
  abstract execute(connection: Connection, data: T): Promise<void>;
  
  async handle(connection: Connection, message: Message): Promise<void> {
    try {
      if (!this.validate(message.data)) {
        throw new ValidationError('Invalid message data');
      }
      
      await this.execute(connection, message.data);
      
      // Send acknowledgment
      await connection.send({
        type: 'ack',
        ack: message.id,
        timestamp: Date.now()
      });
    } catch (error) {
      await this.handleError(connection, message, error);
    }
  }
}

// Example handler
class JoinRoomHandler extends EventHandler<JoinRoomData> {
  readonly type = 'room.join';
  
  validate(data: JoinRoomData): boolean {
    return !!(data.roomId && typeof data.roomId === 'string');
  }
  
  async execute(connection: Connection, data: JoinRoomData): Promise<void> {
    const room = await roomManager.getOrCreate(data.roomId);
    await room.addMember(connection);
    connection.joinRoom(data.roomId);
  }
}
```

### Synchronization Patterns

```typescript
// Operational Transformation for collaborative editing
class OperationalTransform {
  transform(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (op1.position < op2.position) {
        return [op1, { ...op2, position: op2.position + op1.length }];
      } else if (op1.position > op2.position) {
        return [{ ...op1, position: op1.position + op2.length }, op2];
      } else {
        // Same position - use timestamp or user ID for consistency
        if (op1.timestamp < op2.timestamp) {
          return [op1, { ...op2, position: op2.position + op1.length }];
        } else {
          return [{ ...op1, position: op1.position + op2.length }, op2];
        }
      }
    }
    // Handle other operation types...
  }
}

// CRDT for distributed state
class LastWriteWinsMap<T> {
  private data: Map<string, { value: T; timestamp: number }> = new Map();
  
  set(key: string, value: T, timestamp: number): void {
    const existing = this.data.get(key);
    if (!existing || timestamp > existing.timestamp) {
      this.data.set(key, { value, timestamp });
    }
  }
  
  merge(other: LastWriteWinsMap<T>): void {
    for (const [key, { value, timestamp }] of other.data) {
      this.set(key, value, timestamp);
    }
  }
}
```

## 4. Security Considerations

### Authentication Flow
```typescript
interface AuthenticationFlow {
  // 1. Initial connection with auth token
  connectWithToken(token: string): Promise<Connection>;
  
  // 2. Validate token and extract user info
  validateToken(token: string): Promise<UserInfo>;
  
  // 3. Create authenticated session
  createSession(connection: Connection, user: UserInfo): Session;
  
  // 4. Refresh token before expiry
  refreshToken(session: Session): Promise<string>;
}
```

### Rate Limiting
```typescript
class RateLimiter {
  private limits: Map<string, number[]> = new Map();
  
  async checkLimit(userId: string, action: string): Promise<boolean> {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const window = 60000; // 1 minute
    const maxRequests = 100;
    
    const timestamps = this.limits.get(key) || [];
    const recent = timestamps.filter(t => now - t < window);
    
    if (recent.length >= maxRequests) {
      return false;
    }
    
    recent.push(now);
    this.limits.set(key, recent);
    return true;
  }
}
```

## 5. Testing Strategy

### Unit Tests
- Connection lifecycle management
- Message parsing and validation
- Room operations
- Event handler logic
- Synchronization algorithms

### Integration Tests
- Full client-server flows
- Multi-client scenarios
- Reconnection behavior
- Scaling with multiple servers

### Load Tests
```typescript
// Example load test scenario
async function loadTest() {
  const clients: TestClient[] = [];
  
  // Create N concurrent connections
  for (let i = 0; i < 1000; i++) {
    const client = new TestClient(`ws://localhost:8080`);
    await client.connect();
    clients.push(client);
  }
  
  // Simulate activity
  for (const client of clients) {
    setInterval(() => {
      client.send({
        type: 'message',
        data: { text: 'Hello', timestamp: Date.now() }
      });
    }, Math.random() * 5000);
  }
  
  // Monitor metrics
  setInterval(() => {
    console.log('Active connections:', server.getConnectionCount());
    console.log('Messages/sec:', server.getMessageRate());
    console.log('Memory usage:', process.memoryUsage());
  }, 1000);
}
```

## 6. Deployment Checklist

### Pre-deployment
- [ ] Security audit completed
- [ ] Load testing passed
- [ ] Monitoring configured
- [ ] Backup strategy defined
- [ ] Rollback plan ready

### Configuration
- [ ] Environment variables set
- [ ] SSL certificates installed
- [ ] Redis cluster configured
- [ ] Log aggregation setup
- [ ] Alert thresholds defined

### Post-deployment
- [ ] Health checks passing
- [ ] Metrics baseline established
- [ ] Client SDKs tested
- [ ] Documentation updated
- [ ] Team training completed

## 7. Monitoring & Observability

### Key Metrics
- Connection count (current/peak)
- Message throughput (msgs/sec)
- Message latency (p50/p95/p99)
- Error rate by type
- Room statistics
- Memory/CPU usage

### Logging Strategy
```typescript
logger.info('connection.established', {
  userId,
  connectionId,
  userAgent,
  ip,
  timestamp
});

logger.error('message.failed', {
  error: err.message,
  stack: err.stack,
  messageType,
  userId,
  timestamp
});
```

## 8. Optimization Tips

### Performance
- Use binary protocols for high-frequency data
- Implement message batching
- Enable compression for large payloads
- Use connection pooling
- Cache frequently accessed data

### Scalability
- Design for horizontal scaling from day 1
- Use stateless servers where possible
- Implement proper load balancing
- Plan for geographic distribution
- Consider edge servers for global reach

### Reliability
- Implement circuit breakers
- Add retry logic with backoff
- Use message queues for decoupling
- Plan for graceful degradation
- Test failure scenarios regularly

Remember: This template provides a foundation. Customize based on your specific requirements!