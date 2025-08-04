import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { RoomManager } from './room-manager';
import { SyncEngine } from './sync-engine';
import { EventRouter } from './event-handlers/event-router';
import { authenticate, AuthUser } from './auth-middleware';
import { RedisAdapter } from './redis-adapter';
import { Connection, Message, ServerConfig } from './types';

export class RealtimeServer {
  private wss: WebSocketServer;
  private rooms: RoomManager;
  private sync: SyncEngine;
  private eventRouter: EventRouter;
  private connections: Map<string, Connection> = new Map();
  private redis?: RedisAdapter;

  constructor(private config: ServerConfig) {
    this.wss = new WebSocketServer({ 
      port: config.port,
      perMessageDeflate: config.compression || false
    });
    
    this.rooms = new RoomManager();
    this.sync = new SyncEngine();
    this.eventRouter = new EventRouter();
    
    if (config.redis) {
      this.redis = new RedisAdapter(config.redis);
      this.setupRedisHandlers();
    }
    
    this.setupEventHandlers();
    this.setupConnectionHandler();
    
    console.log(`WebSocket server started on port ${config.port}`);
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
      try {
        // Authenticate the connection
        const user = await authenticate(req);
        const connection = this.createConnection(ws, user);
        
        // Setup connection event handlers
        ws.on('message', (data) => this.handleMessage(connection, data));
        ws.on('close', () => this.handleDisconnect(connection));
        ws.on('error', (err) => this.handleError(connection, err));
        ws.on('pong', () => this.handlePong(connection));
        
        // Send welcome message
        this.sendWelcome(connection);
        
        // Start heartbeat
        this.startHeartbeat(connection);
        
      } catch (err) {
        console.error('Authentication failed:', err);
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  private createConnection(ws: WebSocket, user: AuthUser): Connection {
    const connection: Connection = {
      id: `${user.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      ws,
      user,
      rooms: new Set(),
      lastActivity: Date.now(),
      isAlive: true
    };
    
    this.connections.set(connection.id, connection);
    
    // Notify other servers if using Redis
    if (this.redis) {
      this.redis.publish('connection.joined', {
        connectionId: connection.id,
        userId: user.id,
        serverId: this.config.serverId
      });
    }
    
    return connection;
  }

  private handleMessage(connection: Connection, data: WebSocket.RawData): void {
    try {
      const message: Message = JSON.parse(data.toString());
      
      // Update activity timestamp
      connection.lastActivity = Date.now();
      
      // Validate message structure
      if (!message.type || !message.id) {
        this.sendError(connection, 'Invalid message format', message.id);
        return;
      }
      
      // Route to appropriate handler
      this.eventRouter.route(connection, message)
        .catch(err => {
          console.error('Handler error:', err);
          this.sendError(connection, err.message, message.id);
        });
        
    } catch (err) {
      console.error('Message parsing error:', err);
      this.sendError(connection, 'Invalid JSON');
    }
  }

  private handleDisconnect(connection: Connection): void {
    console.log(`Client disconnected: ${connection.id}`);
    
    // Leave all rooms
    for (const roomId of connection.rooms) {
      this.rooms.removeFromRoom(roomId, connection.id);
    }
    
    // Remove connection
    this.connections.delete(connection.id);
    
    // Clear heartbeat
    if (connection.heartbeatInterval) {
      clearInterval(connection.heartbeatInterval);
    }
    
    // Notify other servers
    if (this.redis) {
      this.redis.publish('connection.left', {
        connectionId: connection.id,
        userId: connection.userId,
        serverId: this.config.serverId
      });
    }
  }

  private handleError(connection: Connection, error: Error): void {
    console.error(`WebSocket error for ${connection.id}:`, error);
  }

  private handlePong(connection: Connection): void {
    connection.isAlive = true;
    connection.lastActivity = Date.now();
  }

  private startHeartbeat(connection: Connection): void {
    connection.heartbeatInterval = setInterval(() => {
      if (!connection.isAlive) {
        console.log(`Connection ${connection.id} failed heartbeat`);
        connection.ws.terminate();
        return;
      }
      
      connection.isAlive = false;
      connection.ws.ping();
    }, this.config.heartbeatInterval || 30000);
  }

  private sendWelcome(connection: Connection): void {
    this.send(connection, {
      id: `welcome-${Date.now()}`,
      type: 'connection.ready',
      timestamp: Date.now(),
      data: {
        connectionId: connection.id,
        userId: connection.userId,
        serverTime: Date.now(),
        protocol: '1.0'
      }
    });
  }

  private sendError(connection: Connection, message: string, ackId?: string): void {
    this.send(connection, {
      id: `error-${Date.now()}`,
      type: 'error',
      timestamp: Date.now(),
      error: {
        code: 'MESSAGE_ERROR',
        message,
        retry: false
      },
      ack: ackId
    });
  }

  public send(connection: Connection, message: Message): void {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  public broadcast(roomId: string, message: Message, excludeId?: string): void {
    const room = this.rooms.getRoom(roomId);
    if (!room) return;
    
    for (const connectionId of room.members) {
      if (connectionId === excludeId) continue;
      
      const connection = this.connections.get(connectionId);
      if (connection) {
        this.send(connection, message);
      }
    }
  }

  private setupEventHandlers(): void {
    // Register room events
    this.eventRouter.register('room.join', async (conn, data) => {
      await this.rooms.addToRoom(data.roomId, conn.id);
      conn.rooms.add(data.roomId);
      
      // Notify room members
      this.broadcast(data.roomId, {
        id: `member-joined-${Date.now()}`,
        type: 'room.member_joined',
        timestamp: Date.now(),
        data: {
          userId: conn.userId,
          connectionId: conn.id
        }
      }, conn.id);
    });
    
    this.eventRouter.register('room.leave', async (conn, data) => {
      await this.rooms.removeFromRoom(data.roomId, conn.id);
      conn.rooms.delete(data.roomId);
      
      // Notify room members
      this.broadcast(data.roomId, {
        id: `member-left-${Date.now()}`,
        type: 'room.member_left',
        timestamp: Date.now(),
        data: {
          userId: conn.userId,
          connectionId: conn.id
        }
      }, conn.id);
    });
    
    // Register sync events
    this.eventRouter.register('sync.operation', async (conn, data) => {
      const result = await this.sync.applyOperation(data.roomId, data.operation);
      
      // Broadcast to room
      this.broadcast(data.roomId, {
        id: `sync-${Date.now()}`,
        type: 'sync.update',
        timestamp: Date.now(),
        data: result
      }, conn.id);
    });
  }

  private setupRedisHandlers(): void {
    if (!this.redis) return;
    
    // Handle cross-server broadcasts
    this.redis.subscribe('broadcast', (data) => {
      if (data.serverId === this.config.serverId) return;
      
      // Find local connections in the room
      const room = this.rooms.getRoom(data.roomId);
      if (!room) return;
      
      for (const connectionId of room.members) {
        const connection = this.connections.get(connectionId);
        if (connection) {
          this.send(connection, data.message);
        }
      }
    });
  }

  public async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket server...');
    
    // Close all connections gracefully
    for (const connection of this.connections.values()) {
      this.send(connection, {
        id: `shutdown-${Date.now()}`,
        type: 'server.shutdown',
        timestamp: Date.now(),
        data: {
          reason: 'Server maintenance',
          reconnectAfter: 5000
        }
      });
      
      connection.ws.close(1001, 'Server shutdown');
    }
    
    // Close WebSocket server
    await new Promise<void>((resolve) => {
      this.wss.close(() => resolve());
    });
    
    // Cleanup Redis
    if (this.redis) {
      await this.redis.disconnect();
    }
    
    console.log('WebSocket server shut down complete');
  }

  // Metrics and monitoring
  public getMetrics() {
    return {
      connections: this.connections.size,
      rooms: this.rooms.getRoomCount(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: Date.now()
    };
  }
}