# PRP WebSocket API Documentation

This document provides comprehensive documentation for the PRP WebSocket API, including connection protocols, message formats, and real-time event handling.

## Table of Contents
- [Connection Protocol](#connection-protocol)
- [Authentication](#authentication)
- [Message Format](#message-format)
- [Event Types](#event-types)
- [Client Actions](#client-actions)
- [Error Handling](#error-handling)
- [Implementation Examples](#implementation-examples)
- [Best Practices](#best-practices)

## Connection Protocol

### WebSocket Endpoint

```
wss://api.prp.dev/v1/ws/prps
```

### Connection Flow

1. **Client initiates connection** with authentication token
2. **Server validates token** and establishes connection
3. **Client subscribes** to specific channels/projects
4. **Server sends events** as they occur
5. **Client maintains connection** with heartbeat/ping-pong

### Connection Example

```javascript
const ws = new WebSocket('wss://api.prp.dev/v1/ws/prps', {
  headers: {
    'Authorization': 'Bearer <your-jwt-token>'
  }
});
```

## Authentication

### JWT Token Authentication

The WebSocket connection requires a valid JWT token passed in the connection headers.

```javascript
// Using the ws library in Node.js
const WebSocket = require('ws');

const ws = new WebSocket('wss://api.prp.dev/v1/ws/prps', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### Token Refresh

If the token expires during an active connection:

1. Server sends a `token_expired` event
2. Client should close the connection
3. Client refreshes the token via REST API
4. Client reconnects with the new token

## Message Format

All WebSocket messages use JSON format with the following structure:

### Server to Client Messages

```typescript
interface ServerMessage {
  id: string;           // Unique message ID
  type: string;         // Event type
  timestamp: string;    // ISO 8601 timestamp
  data: any;           // Event-specific data
  metadata?: {         // Optional metadata
    version: string;
    source: string;
  };
}
```

### Client to Server Messages

```typescript
interface ClientMessage {
  id?: string;         // Optional client-generated ID
  action: string;      // Action to perform
  payload?: any;       // Action-specific data
}
```

## Event Types

### PRP Events

#### prp.created
Fired when a new PRP is created.

```json
{
  "id": "msg_123456",
  "type": "prp.created",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "id": "prp_789012",
    "projectId": "proj_123456",
    "name": "Implement Authentication",
    "description": "Add JWT authentication to the API",
    "status": "pending",
    "priority": "high",
    "createdBy": "usr_123456",
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

#### prp.updated
Fired when a PRP is updated.

```json
{
  "id": "msg_123457",
  "type": "prp.updated",
  "timestamp": "2024-01-15T11:30:00Z",
  "data": {
    "id": "prp_789012",
    "changes": {
      "status": {
        "old": "pending",
        "new": "active"
      },
      "assignedAgent": {
        "old": null,
        "new": "agent_001"
      }
    },
    "updatedBy": "usr_123456",
    "updatedAt": "2024-01-15T11:30:00Z"
  }
}
```

#### prp.status_changed
Fired specifically when PRP status changes.

```json
{
  "id": "msg_123458",
  "type": "prp.status_changed",
  "timestamp": "2024-01-15T14:00:00Z",
  "data": {
    "id": "prp_789012",
    "previousStatus": "active",
    "newStatus": "completed",
    "reason": "All requirements met",
    "changedBy": "agent_001",
    "metrics": {
      "estimatedHours": 8,
      "actualHours": 7.5,
      "completionRate": 100
    }
  }
}
```

#### prp.deleted
Fired when a PRP is deleted.

```json
{
  "id": "msg_123459",
  "type": "prp.deleted",
  "timestamp": "2024-01-15T16:00:00Z",
  "data": {
    "id": "prp_789012",
    "projectId": "proj_123456",
    "deletedBy": "usr_123456",
    "reason": "Duplicate entry"
  }
}
```

### Agent Events

#### agent.assigned
Fired when an agent is assigned to a PRP.

```json
{
  "id": "msg_123460",
  "type": "agent.assigned",
  "timestamp": "2024-01-15T11:00:00Z",
  "data": {
    "agentId": "agent_001",
    "prpId": "prp_789012",
    "priority": "high",
    "estimatedStartTime": "2024-01-15T12:00:00Z"
  }
}
```

#### agent.progress
Fired when an agent reports progress.

```json
{
  "id": "msg_123461",
  "type": "agent.progress",
  "timestamp": "2024-01-15T13:00:00Z",
  "data": {
    "agentId": "agent_001",
    "prpId": "prp_789012",
    "progress": 45,
    "currentTask": "Implementing JWT middleware",
    "completedTasks": [
      "Setup authentication routes",
      "Configure JWT library"
    ],
    "remainingTasks": [
      "Implement refresh token logic",
      "Add tests"
    ]
  }
}
```

### System Events

#### connection.established
Sent immediately after successful connection.

```json
{
  "id": "msg_123462",
  "type": "connection.established",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "connectionId": "conn_abc123",
    "serverVersion": "1.0.0",
    "features": ["subscribe", "unsubscribe", "heartbeat"]
  }
}
```

#### heartbeat
Regular heartbeat to maintain connection.

```json
{
  "id": "msg_123463",
  "type": "heartbeat",
  "timestamp": "2024-01-15T10:01:00Z",
  "data": {
    "serverTime": "2024-01-15T10:01:00Z"
  }
}
```

## Client Actions

### subscribe
Subscribe to events for specific projects or channels.

```json
{
  "id": "client_msg_001",
  "action": "subscribe",
  "payload": {
    "channels": [
      "project:proj_123456",
      "agent:agent_001",
      "prp:prp_789012"
    ]
  }
}
```

Server response:
```json
{
  "id": "msg_123464",
  "type": "subscription.confirmed",
  "timestamp": "2024-01-15T10:00:05Z",
  "data": {
    "subscribedChannels": [
      "project:proj_123456",
      "agent:agent_001",
      "prp:prp_789012"
    ]
  }
}
```

### unsubscribe
Unsubscribe from specific channels.

```json
{
  "id": "client_msg_002",
  "action": "unsubscribe",
  "payload": {
    "channels": ["agent:agent_001"]
  }
}
```

### ping
Client-initiated ping for connection health check.

```json
{
  "id": "client_msg_003",
  "action": "ping"
}
```

Server responds with:
```json
{
  "id": "msg_123465",
  "type": "pong",
  "timestamp": "2024-01-15T10:01:00Z"
}
```

## Error Handling

### Error Message Format

```json
{
  "id": "msg_123466",
  "type": "error",
  "timestamp": "2024-01-15T10:00:00Z",
  "data": {
    "code": "INVALID_CHANNEL",
    "message": "Channel 'invalid:channel' does not exist",
    "details": {
      "requestId": "client_msg_004",
      "action": "subscribe"
    }
  }
}
```

### Common Error Codes

| Code | Description | Action Required |
|------|-------------|----------------|
| `AUTH_FAILED` | Authentication failed | Reconnect with valid token |
| `TOKEN_EXPIRED` | JWT token expired | Refresh token and reconnect |
| `INVALID_ACTION` | Unknown action requested | Check action name |
| `INVALID_CHANNEL` | Channel doesn't exist | Verify channel name |
| `RATE_LIMITED` | Too many messages | Implement backoff |
| `SUBSCRIPTION_LIMIT` | Too many subscriptions | Unsubscribe from unused channels |

## Implementation Examples

### JavaScript/TypeScript Full Implementation

```typescript
interface WebSocketConfig {
  url: string;
  token: string;
  reconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

class PRPWebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private subscriptions = new Set<string>();
  private messageHandlers = new Map<string, Function[]>();
  private messageQueue: ClientMessage[] = [];
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timer | null = null;

  constructor(config: Partial<WebSocketConfig>) {
    this.config = {
      url: 'wss://api.prp.dev/v1/ws/prps',
      token: '',
      reconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      ...config
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, {
          headers: {
            'Authorization': `Bearer ${this.config.token}`
          }
        });

        this.ws.on('open', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.flushMessageQueue();
          this.startHeartbeat();
          resolve();
        });

        this.ws.on('message', (data: string) => {
          try {
            const message = JSON.parse(data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          console.log(`WebSocket closed: ${code} - ${reason}`);
          this.isConnected = false;
          this.stopHeartbeat();
          
          if (this.config.reconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: ServerMessage) {
    // Handle system messages
    switch (message.type) {
      case 'connection.established':
        this.resubscribe();
        break;
      case 'heartbeat':
        // Server heartbeat received
        break;
      case 'error':
        this.handleError(message.data);
        break;
      case 'token_expired':
        this.handleTokenExpired();
        break;
    }

    // Dispatch to registered handlers
    const handlers = this.messageHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message));

    // Dispatch to wildcard handlers
    const wildcardHandlers = this.messageHandlers.get('*') || [];
    wildcardHandlers.forEach(handler => handler(message));
  }

  on(eventType: string, handler: (message: ServerMessage) => void) {
    if (!this.messageHandlers.has(eventType)) {
      this.messageHandlers.set(eventType, []);
    }
    this.messageHandlers.get(eventType)!.push(handler);
  }

  off(eventType: string, handler: Function) {
    const handlers = this.messageHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  subscribe(channels: string | string[]) {
    const channelArray = Array.isArray(channels) ? channels : [channels];
    
    channelArray.forEach(channel => this.subscriptions.add(channel));
    
    this.send({
      action: 'subscribe',
      payload: { channels: channelArray }
    });
  }

  unsubscribe(channels: string | string[]) {
    const channelArray = Array.isArray(channels) ? channels : [channels];
    
    channelArray.forEach(channel => this.subscriptions.delete(channel));
    
    this.send({
      action: 'unsubscribe',
      payload: { channels: channelArray }
    });
  }

  private send(message: ClientMessage) {
    if (!message.id) {
      message.id = this.generateMessageId();
    }

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private resubscribe() {
    if (this.subscriptions.size > 0) {
      this.send({
        action: 'subscribe',
        payload: { channels: Array.from(this.subscriptions) }
      });
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.send({ action: 'ping' });
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  private handleError(error: any) {
    console.error('WebSocket error:', error);
    
    // Emit error to handlers
    const errorHandlers = this.messageHandlers.get('error') || [];
    errorHandlers.forEach(handler => handler(error));
  }

  private handleTokenExpired() {
    console.log('Token expired, closing connection');
    this.disconnect();
    
    // Emit token expired event
    const handlers = this.messageHandlers.get('token_expired') || [];
    handlers.forEach(handler => handler());
  }

  disconnect() {
    this.config.reconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private generateMessageId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Usage Example
async function main() {
  const client = new PRPWebSocketClient({
    token: 'your-jwt-token',
    reconnect: true,
    maxReconnectAttempts: 10
  });

  // Register event handlers
  client.on('prp.created', (message) => {
    console.log('New PRP created:', message.data);
  });

  client.on('prp.updated', (message) => {
    console.log('PRP updated:', message.data);
  });

  client.on('prp.status_changed', (message) => {
    const { id, previousStatus, newStatus } = message.data;
    console.log(`PRP ${id} status changed from ${previousStatus} to ${newStatus}`);
  });

  client.on('agent.progress', (message) => {
    const { agentId, prpId, progress } = message.data;
    console.log(`Agent ${agentId} progress on PRP ${prpId}: ${progress}%`);
  });

  client.on('error', (error) => {
    console.error('Received error:', error);
  });

  client.on('token_expired', async () => {
    // Refresh token and reconnect
    const newToken = await refreshToken();
    client.config.token = newToken;
    await client.connect();
  });

  // Connect and subscribe
  await client.connect();
  
  // Subscribe to specific project
  client.subscribe('project:proj_123456');
  
  // Subscribe to multiple channels
  client.subscribe([
    'project:proj_789012',
    'agent:agent_001',
    'prp:prp_123456'
  ]);

  // Later, unsubscribe from a channel
  client.unsubscribe('agent:agent_001');
}

main().catch(console.error);
```

### Python AsyncIO Implementation

```python
import asyncio
import json
import websockets
from typing import Dict, List, Callable, Optional, Any
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PRPWebSocketClient:
    def __init__(self, token: str, url: str = "wss://api.prp.dev/v1/ws/prps"):
        self.token = token
        self.url = url
        self.websocket: Optional[websockets.WebSocketClientProtocol] = None
        self.subscriptions: set = set()
        self.handlers: Dict[str, List[Callable]] = {}
        self.running = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_interval = 1.0
        
    async def connect(self):
        """Connect to WebSocket server"""
        headers = {
            "Authorization": f"Bearer {self.token}"
        }
        
        try:
            self.websocket = await websockets.connect(
                self.url,
                extra_headers=headers
            )
            self.running = True
            self.reconnect_attempts = 0
            logger.info("WebSocket connected")
            
            # Resubscribe to channels
            await self._resubscribe()
            
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            raise
            
    async def disconnect(self):
        """Disconnect from WebSocket server"""
        self.running = False
        if self.websocket:
            await self.websocket.close()
            self.websocket = None
        logger.info("WebSocket disconnected")
        
    async def subscribe(self, channels: List[str]):
        """Subscribe to channels"""
        self.subscriptions.update(channels)
        
        message = {
            "action": "subscribe",
            "payload": {
                "channels": channels
            }
        }
        
        await self._send(message)
        logger.info(f"Subscribed to channels: {channels}")
        
    async def unsubscribe(self, channels: List[str]):
        """Unsubscribe from channels"""
        for channel in channels:
            self.subscriptions.discard(channel)
            
        message = {
            "action": "unsubscribe",
            "payload": {
                "channels": channels
            }
        }
        
        await self._send(message)
        logger.info(f"Unsubscribed from channels: {channels}")
        
    def on(self, event_type: str, handler: Callable):
        """Register event handler"""
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        self.handlers[event_type].append(handler)
        
    def off(self, event_type: str, handler: Callable):
        """Remove event handler"""
        if event_type in self.handlers:
            try:
                self.handlers[event_type].remove(handler)
            except ValueError:
                pass
                
    async def _send(self, message: Dict[str, Any]):
        """Send message to server"""
        if self.websocket and not self.websocket.closed:
            await self.websocket.send(json.dumps(message))
            
    async def _resubscribe(self):
        """Resubscribe to all channels after reconnection"""
        if self.subscriptions:
            await self.subscribe(list(self.subscriptions))
            
    async def _handle_message(self, message: Dict[str, Any]):
        """Handle incoming message"""
        message_type = message.get("type")
        
        # Handle system messages
        if message_type == "error":
            logger.error(f"Server error: {message.get('data')}")
        elif message_type == "heartbeat":
            # Respond to heartbeat
            pass
        elif message_type == "token_expired":
            logger.warning("Token expired")
            await self.disconnect()
            
        # Dispatch to registered handlers
        handlers = self.handlers.get(message_type, [])
        for handler in handlers:
            try:
                await handler(message) if asyncio.iscoroutinefunction(handler) else handler(message)
            except Exception as e:
                logger.error(f"Handler error: {e}")
                
        # Dispatch to wildcard handlers
        wildcard_handlers = self.handlers.get("*", [])
        for handler in wildcard_handlers:
            try:
                await handler(message) if asyncio.iscoroutinefunction(handler) else handler(message)
            except Exception as e:
                logger.error(f"Wildcard handler error: {e}")
                
    async def _heartbeat_loop(self):
        """Send periodic heartbeat"""
        while self.running:
            await asyncio.sleep(30)
            if self.running:
                await self._send({"action": "ping"})
                
    async def _receive_loop(self):
        """Receive messages from server"""
        while self.running:
            try:
                message_text = await self.websocket.recv()
                message = json.loads(message_text)
                await self._handle_message(message)
                
            except websockets.exceptions.ConnectionClosed:
                logger.warning("Connection closed")
                break
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse message: {e}")
            except Exception as e:
                logger.error(f"Receive error: {e}")
                
        # Attempt reconnection
        if self.running and self.reconnect_attempts < self.max_reconnect_attempts:
            await self._reconnect()
            
    async def _reconnect(self):
        """Attempt to reconnect"""
        self.reconnect_attempts += 1
        delay = self.reconnect_interval * (2 ** (self.reconnect_attempts - 1))
        
        logger.info(f"Reconnecting in {delay}s (attempt {self.reconnect_attempts})")
        await asyncio.sleep(delay)
        
        try:
            await self.connect()
            # Resume receive loop
            await self._receive_loop()
        except Exception as e:
            logger.error(f"Reconnection failed: {e}")
            
    async def run(self):
        """Run the WebSocket client"""
        await self.connect()
        
        # Start heartbeat and receive loops
        heartbeat_task = asyncio.create_task(self._heartbeat_loop())
        receive_task = asyncio.create_task(self._receive_loop())
        
        try:
            await asyncio.gather(heartbeat_task, receive_task)
        except Exception as e:
            logger.error(f"Client error: {e}")
        finally:
            await self.disconnect()

# Usage Example
async def main():
    client = PRPWebSocketClient(token="your-jwt-token")
    
    # Register event handlers
    async def on_prp_created(message):
        data = message.get("data", {})
        print(f"New PRP created: {data.get('name')} (ID: {data.get('id')})")
        
    async def on_prp_updated(message):
        data = message.get("data", {})
        changes = data.get("changes", {})
        print(f"PRP {data.get('id')} updated: {changes}")
        
    async def on_agent_progress(message):
        data = message.get("data", {})
        print(f"Agent {data.get('agentId')} progress: {data.get('progress')}%")
        
    # Register handlers
    client.on("prp.created", on_prp_created)
    client.on("prp.updated", on_prp_updated)
    client.on("agent.progress", on_agent_progress)
    
    # Log all messages
    client.on("*", lambda msg: print(f"Received: {msg.get('type')}"))
    
    # Connect and subscribe
    await client.connect()
    
    # Subscribe to channels
    await client.subscribe([
        "project:proj_123456",
        "agent:agent_001"
    ])
    
    # Run the client
    try:
        await client.run()
    except KeyboardInterrupt:
        await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())
```

## Best Practices

### 1. Connection Management

- **Implement automatic reconnection** with exponential backoff
- **Handle token expiration** gracefully
- **Use heartbeat/ping-pong** to detect connection issues
- **Queue messages** when disconnected

### 2. Subscription Management

- **Subscribe to specific channels** rather than all events
- **Unsubscribe** from channels when no longer needed
- **Resubscribe** automatically after reconnection
- **Limit subscriptions** to avoid overwhelming the client

### 3. Error Handling

- **Log all errors** with context
- **Implement retry logic** for transient failures
- **Handle malformed messages** gracefully
- **Provide user feedback** for connection issues

### 4. Performance

- **Batch subscriptions** when subscribing to multiple channels
- **Implement message deduplication** if needed
- **Use message queuing** for high-volume scenarios
- **Monitor memory usage** for long-running connections

### 5. Security

- **Validate SSL certificates** in production
- **Refresh tokens** before they expire
- **Implement rate limiting** on the client side
- **Sanitize** incoming message data

### 6. Testing

```javascript
// Example test for WebSocket client
describe('PRPWebSocketClient', () => {
  let client: PRPWebSocketClient;
  let mockServer: WS;

  beforeEach(() => {
    mockServer = new WS('ws://localhost:8080');
    client = new PRPWebSocketClient({
      url: 'ws://localhost:8080',
      token: 'test-token'
    });
  });

  afterEach(() => {
    client.disconnect();
    mockServer.close();
  });

  it('should handle connection', async () => {
    await client.connect();
    expect(client.isConnected).toBe(true);
  });

  it('should handle messages', async () => {
    const handler = jest.fn();
    client.on('prp.created', handler);

    await client.connect();
    
    // Simulate server message
    mockServer.send(JSON.stringify({
      id: 'msg_123',
      type: 'prp.created',
      timestamp: new Date().toISOString(),
      data: { id: 'prp_123' }
    }));

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(handler).toHaveBeenCalled();
  });

  it('should reconnect on disconnect', async () => {
    await client.connect();
    
    // Force disconnect
    mockServer.close();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    expect(client.reconnectAttempts).toBeGreaterThan(0);
  });
});
```