import { EventEmitter } from 'events';

// Operation types for collaborative editing
export enum OperationType {
  INSERT = 'insert',
  DELETE = 'delete',
  FORMAT = 'format',
  MOVE = 'move'
}

export interface Operation {
  id: string;
  type: OperationType;
  position: number;
  length?: number;
  data?: any;
  userId: string;
  timestamp: number;
  version: number;
}

export interface DocumentState {
  content: string;
  version: number;
  operations: Operation[];
  lastModified: number;
}

export interface ConflictResolution {
  accepted: Operation[];
  rejected: Operation[];
  transformed: Operation[];
}

// Operational Transformation implementation
export class OperationalTransform {
  // Transform operation op1 against operation op2
  transform(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.type === OperationType.INSERT && op2.type === OperationType.INSERT) {
      return this.transformInsertInsert(op1, op2);
    } else if (op1.type === OperationType.INSERT && op2.type === OperationType.DELETE) {
      return this.transformInsertDelete(op1, op2);
    } else if (op1.type === OperationType.DELETE && op2.type === OperationType.INSERT) {
      return this.transformDeleteInsert(op1, op2);
    } else if (op1.type === OperationType.DELETE && op2.type === OperationType.DELETE) {
      return this.transformDeleteDelete(op1, op2);
    }
    
    // Default: no transformation needed
    return [op1, op2];
  }

  private transformInsertInsert(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.position < op2.position) {
      return [op1, { ...op2, position: op2.position + op1.length! }];
    } else if (op1.position > op2.position) {
      return [{ ...op1, position: op1.position + op2.length! }, op2];
    } else {
      // Same position - use timestamp for consistency
      if (op1.timestamp < op2.timestamp) {
        return [op1, { ...op2, position: op2.position + op1.length! }];
      } else {
        return [{ ...op1, position: op1.position + op2.length! }, op2];
      }
    }
  }

  private transformInsertDelete(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.position <= op2.position) {
      return [op1, { ...op2, position: op2.position + op1.length! }];
    } else if (op1.position >= op2.position + op2.length!) {
      return [{ ...op1, position: op1.position - op2.length! }, op2];
    } else {
      // Insert is within delete range - split the delete
      return [{ ...op1, position: op2.position }, op2];
    }
  }

  private transformDeleteInsert(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.position < op2.position) {
      return [op1, { ...op2, position: op2.position - Math.min(op1.length!, op2.position - op1.position) }];
    } else {
      return [{ ...op1, position: op1.position + op2.length! }, op2];
    }
  }

  private transformDeleteDelete(op1: Operation, op2: Operation): [Operation, Operation] {
    if (op1.position < op2.position) {
      if (op1.position + op1.length! <= op2.position) {
        // No overlap
        return [op1, { ...op2, position: op2.position - op1.length! }];
      } else {
        // Overlap - adjust lengths
        const overlap = Math.min(op1.position + op1.length! - op2.position, op2.length!);
        return [
          { ...op1, length: op1.length! - overlap },
          { ...op2, position: op1.position, length: op2.length! - overlap }
        ];
      }
    } else if (op1.position > op2.position) {
      return this.transformDeleteDelete(op2, op1).reverse() as [Operation, Operation];
    } else {
      // Same position
      const minLength = Math.min(op1.length!, op2.length!);
      return [
        { ...op1, length: op1.length! - minLength },
        { ...op2, length: op2.length! - minLength }
      ];
    }
  }
}

// Main synchronization engine
export class SyncEngine extends EventEmitter {
  private documents: Map<string, DocumentState> = new Map();
  private pendingOperations: Map<string, Operation[]> = new Map();
  private operationalTransform: OperationalTransform;
  private config: SyncEngineConfig;

  constructor(config: SyncEngineConfig = {}) {
    super();
    this.config = {
      maxHistorySize: 1000,
      conflictStrategy: 'operational-transform',
      ...config
    };
    this.operationalTransform = new OperationalTransform();
  }

  // Initialize a new document
  async createDocument(roomId: string, initialContent: string = ''): Promise<DocumentState> {
    const doc: DocumentState = {
      content: initialContent,
      version: 0,
      operations: [],
      lastModified: Date.now()
    };

    this.documents.set(roomId, doc);
    this.pendingOperations.set(roomId, []);
    
    this.emit('document.created', { roomId, document: doc });
    return doc;
  }

  // Apply an operation to a document
  async applyOperation(roomId: string, operation: Operation): Promise<SyncResult> {
    let doc = this.documents.get(roomId);
    if (!doc) {
      doc = await this.createDocument(roomId);
    }

    const pending = this.pendingOperations.get(roomId) || [];
    
    try {
      // Check version compatibility
      if (operation.version < doc.version) {
        // Operation is based on old version - transform it
        const transformed = await this.transformOperation(operation, doc, pending);
        operation = transformed;
      }

      // Apply the operation
      const result = this.executeOperation(doc, operation);
      
      // Update document state
      doc.content = result.content;
      doc.version++;
      doc.lastModified = Date.now();
      doc.operations.push(operation);
      
      // Trim history if needed
      if (doc.operations.length > this.config.maxHistorySize!) {
        doc.operations = doc.operations.slice(-this.config.maxHistorySize!);
      }

      this.emit('document.updated', { roomId, operation, document: doc });
      
      return {
        success: true,
        operation,
        document: doc,
        conflicts: []
      };
      
    } catch (error) {
      this.emit('sync.error', { roomId, operation, error });
      
      return {
        success: false,
        operation,
        document: doc,
        conflicts: [operation],
        error: error.message
      };
    }
  }

  // Transform an operation against the current document state
  private async transformOperation(
    operation: Operation, 
    doc: DocumentState, 
    pending: Operation[]
  ): Promise<Operation> {
    let transformed = operation;
    
    // Transform against all operations since the operation's version
    const relevantOps = doc.operations.filter(op => op.version >= operation.version);
    
    for (const op of relevantOps) {
      const [newTransformed] = this.operationalTransform.transform(transformed, op);
      transformed = newTransformed;
    }
    
    // Transform against pending operations
    for (const op of pending) {
      const [newTransformed] = this.operationalTransform.transform(transformed, op);
      transformed = newTransformed;
    }
    
    // Update version
    transformed.version = doc.version;
    
    return transformed;
  }

  // Execute an operation on document content
  private executeOperation(doc: DocumentState, operation: Operation): { content: string } {
    let content = doc.content;
    
    switch (operation.type) {
      case OperationType.INSERT:
        content = 
          content.slice(0, operation.position) + 
          operation.data + 
          content.slice(operation.position);
        break;
        
      case OperationType.DELETE:
        content = 
          content.slice(0, operation.position) + 
          content.slice(operation.position + operation.length!);
        break;
        
      case OperationType.FORMAT:
        // Format operations don't change content, just metadata
        // This would be handled by a rich text implementation
        break;
        
      case OperationType.MOVE:
        // Extract the text to move
        const textToMove = content.slice(operation.position, operation.position + operation.length!);
        // Remove from original position
        content = 
          content.slice(0, operation.position) + 
          content.slice(operation.position + operation.length!);
        // Insert at new position
        const targetPos = operation.data.targetPosition;
        content = 
          content.slice(0, targetPos) + 
          textToMove + 
          content.slice(targetPos);
        break;
    }
    
    return { content };
  }

  // Get current document state
  getDocument(roomId: string): DocumentState | undefined {
    return this.documents.get(roomId);
  }

  // Get operations since a specific version
  getOperationsSince(roomId: string, version: number): Operation[] {
    const doc = this.documents.get(roomId);
    if (!doc) return [];
    
    return doc.operations.filter(op => op.version > version);
  }

  // Resolve conflicts between multiple operations
  async resolveConflicts(roomId: string, operations: Operation[]): Promise<ConflictResolution> {
    const doc = this.documents.get(roomId);
    if (!doc) {
      throw new Error(`Document ${roomId} not found`);
    }

    const accepted: Operation[] = [];
    const rejected: Operation[] = [];
    const transformed: Operation[] = [];

    // Sort operations by timestamp
    operations.sort((a, b) => a.timestamp - b.timestamp);

    for (const op of operations) {
      try {
        // Try to apply the operation
        const result = await this.applyOperation(roomId, op);
        
        if (result.success) {
          accepted.push(op);
          if (op.version < doc.version) {
            transformed.push(result.operation);
          }
        } else {
          rejected.push(op);
        }
      } catch (error) {
        rejected.push(op);
      }
    }

    return { accepted, rejected, transformed };
  }

  // Create a checkpoint for recovery
  async createCheckpoint(roomId: string): Promise<Checkpoint> {
    const doc = this.documents.get(roomId);
    if (!doc) {
      throw new Error(`Document ${roomId} not found`);
    }

    const checkpoint: Checkpoint = {
      id: `checkpoint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      roomId,
      content: doc.content,
      version: doc.version,
      timestamp: Date.now()
    };

    this.emit('checkpoint.created', checkpoint);
    return checkpoint;
  }

  // Restore from checkpoint
  async restoreFromCheckpoint(checkpoint: Checkpoint): Promise<void> {
    const doc: DocumentState = {
      content: checkpoint.content,
      version: checkpoint.version,
      operations: [],
      lastModified: checkpoint.timestamp
    };

    this.documents.set(checkpoint.roomId, doc);
    this.pendingOperations.set(checkpoint.roomId, []);
    
    this.emit('checkpoint.restored', checkpoint);
  }

  // Garbage collection for old documents
  async cleanup(maxAge: number = 3600000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [roomId, doc] of this.documents) {
      if (now - doc.lastModified > maxAge) {
        this.documents.delete(roomId);
        this.pendingOperations.delete(roomId);
        cleaned++;
      }
    }

    return cleaned;
  }

  // Get sync engine metrics
  getMetrics(): SyncMetrics {
    const documents = Array.from(this.documents.values());
    
    return {
      totalDocuments: documents.length,
      totalOperations: documents.reduce((sum, doc) => sum + doc.operations.length, 0),
      averageVersion: documents.length > 0
        ? documents.reduce((sum, doc) => sum + doc.version, 0) / documents.length
        : 0,
      oldestDocument: documents.reduce((oldest, doc) => 
        !oldest || doc.lastModified < oldest.lastModified ? doc : oldest,
        null as DocumentState | null
      ),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private estimateMemoryUsage(): number {
    let size = 0;
    
    for (const doc of this.documents.values()) {
      size += doc.content.length;
      size += doc.operations.length * 200; // Rough estimate per operation
    }
    
    return size;
  }
}

// Types
export interface SyncEngineConfig {
  maxHistorySize?: number;
  conflictStrategy?: 'operational-transform' | 'last-write-wins' | 'manual';
}

export interface SyncResult {
  success: boolean;
  operation: Operation;
  document: DocumentState;
  conflicts: Operation[];
  error?: string;
}

export interface Checkpoint {
  id: string;
  roomId: string;
  content: string;
  version: number;
  timestamp: number;
}

export interface SyncMetrics {
  totalDocuments: number;
  totalOperations: number;
  averageVersion: number;
  oldestDocument: DocumentState | null;
  memoryUsage: number;
}