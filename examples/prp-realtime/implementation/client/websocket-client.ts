import { EventEmitter } from 'events';

export interface ClientConfig {
  url: string;
  auth?: {
    token?: string;
    username?: string;
    password?: string;
  };
  reconnect?: boolean;
  reconnectDelay?: number;
  reconnectMaxDelay?: number;
  reconnectAttempts?: number;
  heartbeatInterval?: number;
  timeout?: number;
  compression?: boolean;
}

export interface ClientMessage {
  id: string;
  type: string;
  data: any;
  timestamp?: number;
}

export enum ClientState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  CLOSING = 'closing',
  CLOSED = 'closed'
}

export class RealtimeClient extends EventEmitter {
  private ws?: WebSocket;
  private config: Required<ClientConfig>;
  private state: ClientState = ClientState.DISCONNECTED;
  private reconnectTimer?: number;
  private heartbeatTimer?: number;
  private reconnectAttempt: number = 0;
  private messageQueue: ClientMessage[] = [];
  private pendingAcks: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: number;
  }> = new Map();
  private rooms: Set<string> = new Set();

  constructor(config: ClientConfig | string) {
    super();
    
    if (typeof config === 'string') {
      config = { url: config };
    }
    
    this.config = {
      url: config.url,
      auth: config.auth || {},
      reconnect: config.reconnect !== false,
      reconnectDelay: config.reconnectDelay || 1000,
      reconnectMaxDelay: config.reconnectMaxDelay || 30000,
      reconnectAttempts: config.reconnectAttempts || Infinity,
      heartbeatInterval: config.heartbeatInterval || 30000,
      timeout: config.timeout || 10000,
      compression: config.compression || false
    };
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.state === ClientState.CONNECTED || this.state === ClientState.CONNECTING) {
      return;
    }

    this.setState(ClientState.CONNECTING);
    
    try {
      await this.createConnection();
      this.setState(ClientState.CONNECTED);
      this.reconnectAttempt = 0;
      this.flushMessageQueue();
      this.startHeartbeat();
      this.emit('connected');
    } catch (error) {
      this.setState(ClientState.DISCONNECTED);
      this.emit('error', error);
      
      if (this.config.reconnect && this.reconnectAttempt < this.config.reconnectAttempts) {
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  private async createConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(this.config.url);
      
      // Add auth token to URL if provided
      if (this.config.auth.token) {
        url.searchParams.set('token', this.config.auth.token);
      }
      
      this.ws = new WebSocket(url.toString());
      
      const connectTimeout = setTimeout(() => {
        this.ws?.close();
        reject(new Error('Connection timeout'));
      }, this.config.timeout);
      
      this.ws.onopen = () => {
        clearTimeout(connectTimeout);
        this.setupEventHandlers();
        resolve();
      };
      
      this.ws.onerror = (event) => {
        clearTimeout(connectTimeout);
        reject(new Error('WebSocket error'));
      };
    });
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        this.emit('error', new Error('Invalid message format'));
      }
    };
    
    this.ws.onclose = (event) => {
      this.handleDisconnect(event.code, event.reason);
    };
    
    this.ws.onerror = (event) => {
      this.emit('error', new Error('WebSocket error'));
    };
  }

  private handleMessage(message: any): void {
    // Handle acknowledgments
    if (message.ack) {
      const pending = this.pendingAcks.get(message.ack);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingAcks.delete(message.ack);
        pending.resolve(message);
      }
    }
    
    // Handle different message types
    switch (message.type) {
      case 'connection.ready':
        this.handleConnectionReady(message.data);
        break;
        
      case 'error':
        this.handleError(message);
        break;
        
      case 'room.member_joined':
      case 'room.member_left':
        this.emit(message.type, message.data);
        break;
        
      case 'sync.update':
        this.emit('sync.update', message.data);
        break;
        
      case 'server.shutdown':
        this.handleServerShutdown(message.data);
        break;
        
      default:
        // Emit custom events
        this.emit(message.type, message.data);
        this.emit('message', message);
    }
  }

  private handleConnectionReady(data: any): void {
    this.emit('ready', data);
  }

  private handleError(message: any): void {
    const error = new Error(message.error?.message || 'Server error');
    (error as any).code = message.error?.code;
    (error as any).retry = message.error?.retry;
    
    this.emit('error', error);
  }

  private handleServerShutdown(data: any): void {
    this.emit('server.shutdown', data);
    
    // Schedule reconnect after the specified delay
    if (data.reconnectAfter && this.config.reconnect) {
      setTimeout(() => this.connect(), data.reconnectAfter);
    }
  }

  private handleDisconnect(code: number, reason: string): void {
    this.setState(ClientState.DISCONNECTED);
    this.stopHeartbeat();
    this.ws = undefined;
    
    // Clear pending acknowledgments
    for (const [id, pending] of this.pendingAcks) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Connection lost'));
    }
    this.pendingAcks.clear();
    
    this.emit('disconnected', { code, reason });
    
    // Attempt reconnection
    if (this.config.reconnect && this.reconnectAttempt < this.config.reconnectAttempts) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.setState(ClientState.RECONNECTING);
    
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempt),
      this.config.reconnectMaxDelay
    );
    
    this.reconnectAttempt++;
    
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempt, 
      delay,
      maxAttempts: this.config.reconnectAttempts 
    });
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect().catch(() => {
        // Reconnection failed, will be rescheduled
      });
    }, delay);
  }

  // Message sending
  async send(type: string, data: any): Promise<any> {
    const message: ClientMessage = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now()
    };
    
    if (this.state !== ClientState.CONNECTED) {
      if (this.config.reconnect) {
        this.messageQueue.push(message);
        return Promise.resolve();
      } else {
        throw new Error('Not connected');
      }
    }
    
    return this.sendMessage(message);
  }

  private async sendMessage(message: ClientMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not ready'));
        return;
      }
      
      // Set up acknowledgment handler
      const timeout = window.setTimeout(() => {
        this.pendingAcks.delete(message.id);
        reject(new Error('Request timeout'));
      }, this.config.timeout);
      
      this.pendingAcks.set(message.id, { resolve, reject, timeout });
      
      // Send message
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timeout);
        this.pendingAcks.delete(message.id);
        reject(error);
      }
    });
  }

  // Convenience method for emitting events
  emit(event: string, data?: any): boolean {
    if (event !== 'error' && event !== 'message') {
      // Also send to server for custom events
      this.send(event, data).catch(() => {
        // Ignore send errors for emit
      });
    }
    
    return super.emit(event, data);
  }

  // Room management
  async joinRoom(roomId: string): Promise<void> {
    await this.send('room.join', { roomId });
    this.rooms.add(roomId);
  }

  async leaveRoom(roomId: string): Promise<void> {
    await this.send('room.leave', { roomId });
    this.rooms.delete(roomId);
  }

  getRooms(): string[] {
    return Array.from(this.rooms);
  }

  // Synchronization
  async sendOperation(roomId: string, operation: any): Promise<void> {
    await this.send('sync.operation', { roomId, operation });
  }

  // Connection state
  getState(): ClientState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === ClientState.CONNECTED;
  }

  private setState(state: ClientState): void {
    if (this.state !== state) {
      const oldState = this.state;
      this.state = state;
      this.emit('stateChange', { oldState, newState: state });
    }
  }

  // Heartbeat management
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send('ping', { timestamp: Date.now() }).catch(() => {
          // Ignore heartbeat errors
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  // Message queue management
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message).catch(() => {
        // Re-queue failed messages
        this.messageQueue.unshift(message);
        break;
      });
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    this.setState(ClientState.CLOSING);
    
    // Cancel reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    // Stop heartbeat
    this.stopHeartbeat();
    
    // Clear message queue
    this.messageQueue = [];
    
    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = undefined;
    }
    
    this.setState(ClientState.CLOSED);
    this.emit('closed');
  }

  // Utility
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export for browser usage
if (typeof window !== 'undefined') {
  (window as any).RealtimeClient = RealtimeClient;
}