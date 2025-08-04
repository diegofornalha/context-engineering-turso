import { PeerToPeerSync } from '../sync-protocols/peer-to-peer';
import { ConflictResolver } from '../conflict-resolver';
import { createClient, Client } from '@libsql/client';

/**
 * Collaborative Document Editing with CRDT-based Sync
 * 
 * This example demonstrates:
 * - Real-time collaborative text editing
 * - Operational transformation for concurrent edits
 * - Cursor position synchronization
 * - Presence awareness (who's editing)
 * - Version history and rollback
 */

export interface DocumentOperation {
  id: string;
  documentId: string;
  userId: string;
  type: 'insert' | 'delete' | 'format';
  position: number;
  content?: string;
  length?: number;
  attributes?: Record<string, any>;
  timestamp: number;
  vectorClock: Record<string, number>;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  version: number;
  lastModified: number;
  collaborators: string[];
  operations: DocumentOperation[];
}

export interface UserPresence {
  userId: string;
  documentId: string;
  cursor: {
    position: number;
    selection?: { start: number; end: number };
  };
  color: string;
  lastSeen: number;
}

// CRDT implementation for text
class TextCRDT {
  private chars: Array<{
    id: string;
    char: string;
    visible: boolean;
    after?: string;
    before?: string;
  }> = [];
  
  private siteId: string;
  private counter: number = 0;

  constructor(siteId: string) {
    this.siteId = siteId;
  }

  generateCharId(): string {
    return `${this.siteId}-${this.counter++}`;
  }

  insert(position: number, char: string): DocumentOperation {
    const id = this.generateCharId();
    const before = position > 0 ? this.chars[position - 1]?.id : undefined;
    const after = position < this.chars.length ? this.chars[position]?.id : undefined;

    this.chars.splice(position, 0, {
      id,
      char,
      visible: true,
      before,
      after
    });

    return {
      id: `op-${id}`,
      documentId: '',
      userId: this.siteId,
      type: 'insert',
      position,
      content: char,
      timestamp: Date.now(),
      vectorClock: {}
    };
  }

  delete(position: number): DocumentOperation {
    if (position >= 0 && position < this.chars.length) {
      this.chars[position].visible = false;
      
      return {
        id: `op-${this.generateCharId()}`,
        documentId: '',
        userId: this.siteId,
        type: 'delete',
        position,
        length: 1,
        timestamp: Date.now(),
        vectorClock: {}
      };
    }
    
    throw new Error('Invalid position');
  }

  applyRemoteOperation(op: DocumentOperation) {
    switch (op.type) {
      case 'insert':
        // Find correct position based on CRDT ordering
        const insertPos = this.findInsertPosition(op);
        this.chars.splice(insertPos, 0, {
          id: op.id,
          char: op.content!,
          visible: true
        });
        break;
        
      case 'delete':
        const charIndex = this.chars.findIndex(c => c.id === op.id);
        if (charIndex !== -1) {
          this.chars[charIndex].visible = false;
        }
        break;
    }
  }

  private findInsertPosition(op: DocumentOperation): number {
    // Simplified - in real implementation would use proper CRDT ordering
    return op.position;
  }

  getText(): string {
    return this.chars
      .filter(c => c.visible)
      .map(c => c.char)
      .join('');
  }
}

export class CollaborativeEditingSync {
  private p2pSync: PeerToPeerSync;
  private client: Client;
  private textCRDT: TextCRDT;
  private presenceMap: Map<string, UserPresence> = new Map();
  private operationBuffer: DocumentOperation[] = [];
  private vectorClock: Record<string, number> = {};

  constructor(
    private config: {
      userId: string;
      nodeUrl: string;
      authToken?: string;
      peers: Array<{
        userId: string;
        url: string;
        authToken?: string;
      }>;
      userColor?: string;
    }
  ) {
    // Initialize P2P sync for real-time collaboration
    this.p2pSync = new PeerToPeerSync({
      localNode: {
        nodeId: `editor-${config.userId}`,
        url: config.nodeUrl,
        authToken: config.authToken,
        wsPort: 9000 + parseInt(config.userId.slice(-4), 16)
      },
      peers: config.peers.map(peer => ({
        nodeId: `editor-${peer.userId}`,
        url: peer.url,
        authToken: peer.authToken,
        wsPort: 9000 + parseInt(peer.userId.slice(-4), 16)
      })),
      gossipInterval: 100, // Very fast for real-time editing
      syncBatchSize: 10
    });

    this.client = createClient({
      url: config.nodeUrl,
      authToken: config.authToken
    });

    this.textCRDT = new TextCRDT(config.userId);
    this.vectorClock[config.userId] = 0;
  }

  async initialize() {
    // Create collaborative editing tables
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        last_modified INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS document_operations (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        operation_type TEXT NOT NULL,
        position INTEGER NOT NULL,
        content TEXT,
        length INTEGER,
        attributes TEXT,
        vector_clock TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS document_presence (
        user_id TEXT NOT NULL,
        document_id TEXT NOT NULL,
        cursor_position INTEGER NOT NULL,
        selection_start INTEGER,
        selection_end INTEGER,
        color TEXT NOT NULL,
        last_seen INTEGER NOT NULL,
        PRIMARY KEY (user_id, document_id)
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS document_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        content TEXT NOT NULL,
        operations TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_by TEXT NOT NULL
      )
    `);

    // Create indexes
    await this.client.execute(`
      CREATE INDEX IF NOT EXISTS idx_operations_document 
      ON document_operations(document_id, timestamp)
    `);

    // Start P2P sync
    await this.p2pSync.startGossip();

    // Set up real-time listeners
    this.setupRealtimeSync();

    // Start presence broadcasting
    this.startPresenceBroadcast();
  }

  private setupRealtimeSync() {
    // Listen for incoming operations
    this.p2pSync.on('event:synced', async (event) => {
      if (event.data && event.data.table_name === 'document_operations') {
        const operation = JSON.parse(event.data.data);
        await this.handleRemoteOperation(operation);
      }
    });

    // Listen for presence updates
    this.p2pSync.on('event:synced', async (event) => {
      if (event.data && event.data.table_name === 'document_presence') {
        const presence = JSON.parse(event.data.data);
        this.updatePresence(presence);
      }
    });
  }

  async createDocument(title: string, initialContent: string = ''): Promise<Document> {
    const documentId = this.generateDocumentId();
    
    const document: Document = {
      id: documentId,
      title,
      content: initialContent,
      version: 1,
      lastModified: Date.now(),
      collaborators: [this.config.userId],
      operations: []
    };

    await this.client.execute(`
      INSERT INTO documents (id, title, content, version, last_modified)
      VALUES (?, ?, ?, ?, ?)
    `, [
      document.id,
      document.title,
      document.content,
      document.version,
      document.lastModified
    ]);

    // Initialize CRDT with content
    for (let i = 0; i < initialContent.length; i++) {
      this.textCRDT.insert(i, initialContent[i]);
    }

    return document;
  }

  async openDocument(documentId: string): Promise<Document> {
    // Load document
    const result = await this.client.execute(
      'SELECT * FROM documents WHERE id = ?',
      [documentId]
    );

    if (result.rows.length === 0) {
      throw new Error('Document not found');
    }

    const doc = result.rows[0];

    // Load operations
    const operations = await this.client.execute(`
      SELECT * FROM document_operations
      WHERE document_id = ?
      ORDER BY timestamp ASC
    `, [documentId]);

    // Rebuild CRDT from operations
    for (const op of operations.rows) {
      const operation: DocumentOperation = {
        id: op.id as string,
        documentId: op.document_id as string,
        userId: op.user_id as string,
        type: op.operation_type as any,
        position: op.position as number,
        content: op.content as string,
        length: op.length as number,
        attributes: op.attributes ? JSON.parse(op.attributes as string) : undefined,
        timestamp: op.timestamp as number,
        vectorClock: JSON.parse(op.vector_clock as string)
      };

      this.textCRDT.applyRemoteOperation(operation);
      this.mergeVectorClock(operation.vectorClock);
    }

    return {
      id: doc.id as string,
      title: doc.title as string,
      content: this.textCRDT.getText(),
      version: doc.version as number,
      lastModified: doc.last_modified as number,
      collaborators: await this.getCollaborators(documentId),
      operations: operations.rows as any[]
    };
  }

  async insertText(
    documentId: string,
    position: number,
    text: string
  ): Promise<void> {
    const operations: DocumentOperation[] = [];

    // Create operation for each character
    for (let i = 0; i < text.length; i++) {
      this.incrementVectorClock();
      
      const op = this.textCRDT.insert(position + i, text[i]);
      op.documentId = documentId;
      op.vectorClock = { ...this.vectorClock };
      
      operations.push(op);
    }

    // Batch insert operations
    await this.applyOperations(documentId, operations);
  }

  async deleteText(
    documentId: string,
    position: number,
    length: number
  ): Promise<void> {
    const operations: DocumentOperation[] = [];

    for (let i = 0; i < length; i++) {
      this.incrementVectorClock();
      
      const op = this.textCRDT.delete(position);
      op.documentId = documentId;
      op.vectorClock = { ...this.vectorClock };
      
      operations.push(op);
    }

    await this.applyOperations(documentId, operations);
  }

  async formatText(
    documentId: string,
    position: number,
    length: number,
    attributes: Record<string, any>
  ): Promise<void> {
    this.incrementVectorClock();

    const operation: DocumentOperation = {
      id: this.generateOperationId(),
      documentId,
      userId: this.config.userId,
      type: 'format',
      position,
      length,
      attributes,
      timestamp: Date.now(),
      vectorClock: { ...this.vectorClock }
    };

    await this.applyOperations(documentId, [operation]);
  }

  private async applyOperations(
    documentId: string,
    operations: DocumentOperation[]
  ): Promise<void> {
    const batch = this.client.batch();

    for (const op of operations) {
      // Store operation
      batch.push(`
        INSERT INTO document_operations (
          id, document_id, user_id, operation_type,
          position, content, length, attributes,
          vector_clock, timestamp
        ) VALUES (
          '${op.id}',
          '${op.documentId}',
          '${op.userId}',
          '${op.type}',
          ${op.position},
          ${op.content ? `'${op.content}'` : 'NULL'},
          ${op.length || 'NULL'},
          ${op.attributes ? `'${JSON.stringify(op.attributes)}'` : 'NULL'},
          '${JSON.stringify(op.vectorClock)}',
          ${op.timestamp}
        )
      `);

      // Propagate via P2P
      await this.p2pSync.recordEvent('insert', 'document_operations', op);
    }

    await batch.execute();

    // Update document version and content
    await this.updateDocument(documentId);
  }

  private async updateDocument(documentId: string) {
    const content = this.textCRDT.getText();
    
    await this.client.execute(`
      UPDATE documents
      SET content = ?,
          version = version + 1,
          last_modified = ?
      WHERE id = ?
    `, [content, Date.now(), documentId]);
  }

  async updateCursor(
    documentId: string,
    position: number,
    selection?: { start: number; end: number }
  ): Promise<void> {
    const presence: UserPresence = {
      userId: this.config.userId,
      documentId,
      cursor: {
        position,
        selection
      },
      color: this.config.userColor || this.generateUserColor(),
      lastSeen: Date.now()
    };

    await this.client.execute(`
      INSERT OR REPLACE INTO document_presence (
        user_id, document_id, cursor_position,
        selection_start, selection_end, color, last_seen
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      presence.userId,
      presence.documentId,
      presence.cursor.position,
      presence.cursor.selection?.start || null,
      presence.cursor.selection?.end || null,
      presence.color,
      presence.lastSeen
    ]);

    // Broadcast presence
    await this.p2pSync.recordEvent('update', 'document_presence', presence);
    
    // Update local presence
    this.presenceMap.set(presence.userId, presence);
  }

  async getActiveCollaborators(documentId: string): Promise<UserPresence[]> {
    const result = await this.client.execute(`
      SELECT * FROM document_presence
      WHERE document_id = ?
      AND last_seen > ?
    `, [documentId, Date.now() - 30000]); // Active in last 30 seconds

    return result.rows.map(row => ({
      userId: row.user_id as string,
      documentId: row.document_id as string,
      cursor: {
        position: row.cursor_position as number,
        selection: row.selection_start !== null ? {
          start: row.selection_start as number,
          end: row.selection_end as number
        } : undefined
      },
      color: row.color as string,
      lastSeen: row.last_seen as number
    }));
  }

  async createVersion(documentId: string, message?: string): Promise<number> {
    const document = await this.openDocument(documentId);
    
    const result = await this.client.execute(`
      INSERT INTO document_versions (
        document_id, version, content, operations,
        timestamp, created_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      documentId,
      document.version,
      document.content,
      JSON.stringify(document.operations),
      Date.now(),
      this.config.userId
    ]);

    return result.lastInsertRowid as number;
  }

  async getVersionHistory(documentId: string): Promise<any[]> {
    const result = await this.client.execute(`
      SELECT * FROM document_versions
      WHERE document_id = ?
      ORDER BY timestamp DESC
    `, [documentId]);

    return result.rows;
  }

  async rollbackToVersion(documentId: string, versionId: number): Promise<void> {
    const version = await this.client.execute(
      'SELECT * FROM document_versions WHERE id = ?',
      [versionId]
    );

    if (version.rows.length === 0) {
      throw new Error('Version not found');
    }

    const versionData = version.rows[0];

    // Clear current operations
    await this.client.execute(
      'DELETE FROM document_operations WHERE document_id = ?',
      [documentId]
    );

    // Restore operations from version
    const operations = JSON.parse(versionData.operations as string);
    const batch = this.client.batch();

    for (const op of operations) {
      batch.push(`
        INSERT INTO document_operations (
          id, document_id, user_id, operation_type,
          position, content, length, attributes,
          vector_clock, timestamp
        ) VALUES (
          '${op.id}',
          '${op.documentId}',
          '${op.userId}',
          '${op.type}',
          ${op.position},
          ${op.content ? `'${op.content}'` : 'NULL'},
          ${op.length || 'NULL'},
          ${op.attributes ? `'${JSON.stringify(op.attributes)}'` : 'NULL'},
          '${JSON.stringify(op.vectorClock)}',
          ${op.timestamp}
        )
      `);
    }

    await batch.execute();

    // Update document
    await this.client.execute(`
      UPDATE documents
      SET content = ?,
          version = ?,
          last_modified = ?
      WHERE id = ?
    `, [
      versionData.content,
      versionData.version,
      Date.now(),
      documentId
    ]);

    // Rebuild CRDT
    this.textCRDT = new TextCRDT(this.config.userId);
    for (const op of operations) {
      this.textCRDT.applyRemoteOperation(op);
    }
  }

  private async handleRemoteOperation(operation: DocumentOperation) {
    // Check if we've already applied this operation
    const existing = await this.client.execute(
      'SELECT id FROM document_operations WHERE id = ?',
      [operation.id]
    );

    if (existing.rows.length > 0) return;

    // Apply to CRDT
    this.textCRDT.applyRemoteOperation(operation);

    // Store operation
    await this.client.execute(`
      INSERT INTO document_operations (
        id, document_id, user_id, operation_type,
        position, content, length, attributes,
        vector_clock, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      operation.id,
      operation.documentId,
      operation.userId,
      operation.type,
      operation.position,
      operation.content || null,
      operation.length || null,
      operation.attributes ? JSON.stringify(operation.attributes) : null,
      JSON.stringify(operation.vectorClock),
      operation.timestamp
    ]);

    // Update document
    await this.updateDocument(operation.documentId);

    // Merge vector clocks
    this.mergeVectorClock(operation.vectorClock);

    // Emit event for UI update
    this.emit('operation:applied', operation);
  }

  private updatePresence(presence: UserPresence) {
    this.presenceMap.set(presence.userId, presence);
    this.emit('presence:updated', presence);
  }

  private startPresenceBroadcast() {
    // Broadcast presence every 5 seconds
    setInterval(async () => {
      for (const [_, presence] of this.presenceMap) {
        if (presence.userId === this.config.userId) {
          presence.lastSeen = Date.now();
          await this.updateCursor(
            presence.documentId,
            presence.cursor.position,
            presence.cursor.selection
          );
        }
      }

      // Clean up stale presence
      for (const [userId, presence] of this.presenceMap) {
        if (Date.now() - presence.lastSeen > 30000) {
          this.presenceMap.delete(userId);
          this.emit('presence:left', { userId });
        }
      }
    }, 5000);
  }

  private incrementVectorClock() {
    this.vectorClock[this.config.userId] = 
      (this.vectorClock[this.config.userId] || 0) + 1;
  }

  private mergeVectorClock(otherClock: Record<string, number>) {
    for (const [userId, value] of Object.entries(otherClock)) {
      this.vectorClock[userId] = Math.max(
        this.vectorClock[userId] || 0,
        value
      );
    }
  }

  private async getCollaborators(documentId: string): Promise<string[]> {
    const result = await this.client.execute(`
      SELECT DISTINCT user_id FROM document_operations
      WHERE document_id = ?
    `, [documentId]);

    return result.rows.map(row => row.user_id as string);
  }

  private generateDocumentId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOperationId(): string {
    return `op-${this.config.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
      '#FECA57', '#DDA0DD', '#98D8C8', '#F7DC6F'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private emit(event: string, data: any) {
    // This would integrate with your app's event system
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
  }

  async shutdown() {
    await this.p2pSync.stopGossip();
  }
}