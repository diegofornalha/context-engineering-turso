import { SyncCoordinator } from '../sync-coordinator';
import { PeerToPeerSync } from '../sync-protocols/peer-to-peer';
import { createClient } from '@libsql/client';

/**
 * Real-time Chat Application with Distributed Sync
 * 
 * This example demonstrates:
 * - Real-time message synchronization across regions
 * - Offline message queuing and sync
 * - Conflict-free message ordering
 * - Read receipts and typing indicators
 */

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  timestamp: number;
  edited?: boolean;
  deleted?: boolean;
  reactions?: Record<string, string[]>;
  readBy?: string[];
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: string[];
  lastMessage?: ChatMessage;
  lastActivity: number;
}

export class DistributedChatSync {
  private syncCoordinator: SyncCoordinator;
  private p2pSync?: PeerToPeerSync;
  
  constructor(
    private config: {
      primary: string;
      replicas: string[];
      authToken?: string;
      enableP2P?: boolean;
      userId: string;
    }
  ) {
    // Initialize sync coordinator for chat
    this.syncCoordinator = new SyncCoordinator({
      primary: config.primary,
      replicas: config.replicas,
      authToken: config.authToken,
      syncInterval: 1000, // 1 second for chat
      conflictStrategy: 'custom',
      enableRealtime: true
    });

    if (config.enableP2P) {
      // Initialize P2P sync for direct messaging
      this.p2pSync = new PeerToPeerSync({
        localNode: {
          nodeId: `chat-${config.userId}`,
          url: config.primary,
          authToken: config.authToken,
          wsPort: 8000 + parseInt(config.userId.slice(-4), 16)
        },
        peers: config.replicas.map((url, i) => ({
          nodeId: `chat-peer-${i}`,
          url,
          authToken: config.authToken
        })),
        gossipInterval: 2000,
        syncBatchSize: 50
      });
    }
  }

  async initialize() {
    // Create chat-specific tables
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    // Messages table with sync-friendly schema
    await client.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        edited BOOLEAN DEFAULT FALSE,
        deleted BOOLEAN DEFAULT FALSE,
        reactions TEXT DEFAULT '{}',
        read_by TEXT DEFAULT '[]',
        vector_clock TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Rooms table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        participants TEXT NOT NULL,
        last_activity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Typing indicators (ephemeral)
    await client.execute(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        room_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (room_id, user_id)
      )
    `);

    // Create indexes for performance
    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_room_timestamp 
      ON messages(room_id, timestamp DESC)
    `);

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_messages_user 
      ON messages(user_id)
    `);

    // Start sync processes
    await this.syncCoordinator.startSync();
    
    if (this.p2pSync) {
      await this.p2pSync.startGossip();
    }

    // Set up real-time listeners
    this.setupRealtimeSync();
  }

  private setupRealtimeSync() {
    // Listen for incoming messages
    this.syncCoordinator.on('realtime:change', async (change) => {
      if (change.table === 'messages') {
        this.handleIncomingMessage(change.data);
      }
    });

    // Listen for typing indicators
    this.syncCoordinator.on('realtime:typing', async (data) => {
      this.handleTypingIndicator(data);
    });
  }

  async sendMessage(roomId: string, content: string): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: this.generateMessageId(),
      roomId,
      userId: this.config.userId,
      content,
      timestamp: Date.now(),
      reactions: {},
      readBy: [this.config.userId]
    };

    // Store locally first (optimistic update)
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    await client.execute(`
      INSERT INTO messages (
        id, room_id, user_id, content, timestamp, reactions, read_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      message.id,
      message.roomId,
      message.userId,
      message.content,
      message.timestamp,
      JSON.stringify(message.reactions),
      JSON.stringify(message.readBy)
    ]);

    // Update room last activity
    await client.execute(`
      UPDATE rooms 
      SET last_activity = ? 
      WHERE id = ?
    `, [message.timestamp, roomId]);

    // If P2P is enabled, propagate directly
    if (this.p2pSync) {
      await this.p2pSync.recordEvent('insert', 'messages', message);
    }

    return message;
  }

  async editMessage(messageId: string, newContent: string): Promise<void> {
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    // Check ownership
    const result = await client.execute(
      'SELECT user_id FROM messages WHERE id = ?',
      [messageId]
    );

    if (result.rows.length === 0 || result.rows[0].user_id !== this.config.userId) {
      throw new Error('Cannot edit this message');
    }

    // Update message
    await client.execute(`
      UPDATE messages 
      SET content = ?, edited = TRUE, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newContent, messageId]);

    // Propagate edit
    if (this.p2pSync) {
      await this.p2pSync.recordEvent('update', 'messages', {
        id: messageId,
        content: newContent,
        edited: true
      });
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    // Soft delete to maintain sync integrity
    await client.execute(`
      UPDATE messages 
      SET deleted = TRUE, content = '[deleted]', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `, [messageId, this.config.userId]);

    if (this.p2pSync) {
      await this.p2pSync.recordEvent('update', 'messages', {
        id: messageId,
        deleted: true,
        content: '[deleted]'
      });
    }
  }

  async addReaction(messageId: string, emoji: string): Promise<void> {
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    // Get current reactions
    const result = await client.execute(
      'SELECT reactions FROM messages WHERE id = ?',
      [messageId]
    );

    if (result.rows.length === 0) return;

    const reactions = JSON.parse(result.rows[0].reactions as string || '{}');
    
    // Add user to emoji reactions (CRDT-like set union)
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }
    
    if (!reactions[emoji].includes(this.config.userId)) {
      reactions[emoji].push(this.config.userId);
    }

    // Update reactions
    await client.execute(`
      UPDATE messages 
      SET reactions = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [JSON.stringify(reactions), messageId]);

    if (this.p2pSync) {
      await this.p2pSync.recordEvent('update', 'messages', {
        id: messageId,
        reactions
      });
    }
  }

  async markAsRead(roomId: string, messageIds: string[]): Promise<void> {
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    // Batch update read receipts
    const batch = client.batch();

    for (const messageId of messageIds) {
      batch.push(`
        UPDATE messages 
        SET read_by = json_insert(read_by, '$[#]', '${this.config.userId}')
        WHERE id = '${messageId}' 
        AND json_extract(read_by, '$[0]') IS NOT '${this.config.userId}'
      `);
    }

    await batch.execute();

    // Propagate read receipts
    if (this.p2pSync) {
      for (const messageId of messageIds) {
        await this.p2pSync.recordEvent('update', 'messages', {
          id: messageId,
          readBy: { add: this.config.userId }
        });
      }
    }
  }

  async sendTypingIndicator(roomId: string): Promise<void> {
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    await client.execute(`
      INSERT OR REPLACE INTO typing_indicators (room_id, user_id, timestamp)
      VALUES (?, ?, ?)
    `, [roomId, this.config.userId, Date.now()]);

    // Broadcast typing indicator
    this.syncCoordinator.emit('realtime:typing', {
      roomId,
      userId: this.config.userId,
      timestamp: Date.now()
    });
  }

  async getMessages(
    roomId: string, 
    options?: {
      limit?: number;
      before?: number;
      after?: number;
    }
  ): Promise<ChatMessage[]> {
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    let query = `
      SELECT * FROM messages 
      WHERE room_id = ? AND deleted = FALSE
    `;
    const params: any[] = [roomId];

    if (options?.before) {
      query += ' AND timestamp < ?';
      params.push(options.before);
    }

    if (options?.after) {
      query += ' AND timestamp > ?';
      params.push(options.after);
    }

    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const result = await client.execute(query, params);

    return result.rows.map(row => ({
      id: row.id as string,
      roomId: row.room_id as string,
      userId: row.user_id as string,
      content: row.content as string,
      timestamp: row.timestamp as number,
      edited: Boolean(row.edited),
      deleted: Boolean(row.deleted),
      reactions: JSON.parse(row.reactions as string || '{}'),
      readBy: JSON.parse(row.read_by as string || '[]')
    }));
  }

  async getUnreadCount(roomId: string): Promise<number> {
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    const result = await client.execute(`
      SELECT COUNT(*) as count FROM messages
      WHERE room_id = ?
      AND deleted = FALSE
      AND NOT json_extract(read_by, '$') LIKE ?
    `, [roomId, `%${this.config.userId}%`]);

    return result.rows[0]?.count as number || 0;
  }

  async searchMessages(query: string, roomId?: string): Promise<ChatMessage[]> {
    const client = createClient({
      url: this.config.primary,
      authToken: this.config.authToken
    });

    let searchQuery = `
      SELECT * FROM messages
      WHERE deleted = FALSE
      AND content LIKE ?
    `;
    const params: any[] = [`%${query}%`];

    if (roomId) {
      searchQuery += ' AND room_id = ?';
      params.push(roomId);
    }

    searchQuery += ' ORDER BY timestamp DESC LIMIT 50';

    const result = await client.execute(searchQuery, params);

    return result.rows.map(row => ({
      id: row.id as string,
      roomId: row.room_id as string,
      userId: row.user_id as string,
      content: row.content as string,
      timestamp: row.timestamp as number,
      edited: Boolean(row.edited),
      deleted: Boolean(row.deleted),
      reactions: JSON.parse(row.reactions as string || '{}'),
      readBy: JSON.parse(row.read_by as string || '[]')
    }));
  }

  // Offline support
  async queueOfflineMessage(roomId: string, content: string): Promise<void> {
    const message: ChatMessage = {
      id: this.generateMessageId(),
      roomId,
      userId: this.config.userId,
      content,
      timestamp: Date.now(),
      reactions: {},
      readBy: [this.config.userId]
    };

    // Store in local queue
    if (typeof window !== 'undefined' && window.localStorage) {
      const queue = JSON.parse(
        window.localStorage.getItem('offline_messages') || '[]'
      );
      queue.push(message);
      window.localStorage.setItem('offline_messages', JSON.stringify(queue));
    }
  }

  async syncOfflineMessages(): Promise<void> {
    if (typeof window === 'undefined' || !window.localStorage) return;

    const queue = JSON.parse(
      window.localStorage.getItem('offline_messages') || '[]'
    );

    for (const message of queue) {
      try {
        await this.sendMessage(message.roomId, message.content);
      } catch (error) {
        console.error('Failed to sync offline message:', error);
      }
    }

    // Clear queue
    window.localStorage.removeItem('offline_messages');
  }

  private generateMessageId(): string {
    return `msg-${this.config.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleIncomingMessage(message: ChatMessage) {
    // Emit event for UI updates
    this.emit('message:received', message);
  }

  private handleTypingIndicator(data: any) {
    // Clean up old indicators (older than 3 seconds)
    const cutoff = Date.now() - 3000;
    
    // Emit typing event for UI
    if (data.timestamp > cutoff && data.userId !== this.config.userId) {
      this.emit('user:typing', {
        roomId: data.roomId,
        userId: data.userId
      });
    }
  }

  private emit(event: string, data: any) {
    // This would integrate with your app's event system
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
  }

  async shutdown() {
    await this.syncCoordinator.stopSync();
    if (this.p2pSync) {
      await this.p2pSync.stopGossip();
    }
  }
}