/**
 * CRDT (Conflict-free Replicated Data Type) Resolver for Turso Edge Computing
 * Implements various CRDT algorithms for automatic conflict resolution
 */

import { TursoClient } from '@turso/client';

export type CRDTType = 'g-counter' | 'pn-counter' | 'g-set' | 'or-set' | 'lww-register' | 'mv-register';

export interface CRDTMetadata {
  nodeId: string;
  timestamp: number;
  version: number;
  vectorClock: Map<string, number>;
}

export interface CRDTOperation {
  id: string;
  type: string;
  crdt: CRDTType;
  nodeId: string;
  timestamp: number;
  data: any;
  metadata: CRDTMetadata;
}

/**
 * Base CRDT interface
 */
export interface CRDT<T> {
  value(): T;
  merge(other: CRDT<T>): void;
  toJSON(): any;
  fromJSON(json: any): void;
}

/**
 * G-Counter: Grow-only counter
 */
export class GCounter implements CRDT<number> {
  private counts: Map<string, number> = new Map();

  constructor(nodeId: string) {
    this.counts.set(nodeId, 0);
  }

  increment(nodeId: string, amount: number = 1): void {
    const current = this.counts.get(nodeId) || 0;
    this.counts.set(nodeId, current + amount);
  }

  value(): number {
    let sum = 0;
    for (const count of this.counts.values()) {
      sum += count;
    }
    return sum;
  }

  merge(other: GCounter): void {
    for (const [nodeId, count] of other.counts.entries()) {
      const current = this.counts.get(nodeId) || 0;
      this.counts.set(nodeId, Math.max(current, count));
    }
  }

  toJSON(): any {
    return {
      type: 'g-counter',
      counts: Object.fromEntries(this.counts)
    };
  }

  fromJSON(json: any): void {
    this.counts = new Map(Object.entries(json.counts));
  }
}

/**
 * PN-Counter: Increment/decrement counter
 */
export class PNCounter implements CRDT<number> {
  private positive: GCounter;
  private negative: GCounter;

  constructor(nodeId: string) {
    this.positive = new GCounter(nodeId);
    this.negative = new GCounter(nodeId);
  }

  increment(nodeId: string, amount: number = 1): void {
    if (amount >= 0) {
      this.positive.increment(nodeId, amount);
    } else {
      this.negative.increment(nodeId, -amount);
    }
  }

  value(): number {
    return this.positive.value() - this.negative.value();
  }

  merge(other: PNCounter): void {
    this.positive.merge(other.positive);
    this.negative.merge(other.negative);
  }

  toJSON(): any {
    return {
      type: 'pn-counter',
      positive: this.positive.toJSON(),
      negative: this.negative.toJSON()
    };
  }

  fromJSON(json: any): void {
    this.positive.fromJSON(json.positive);
    this.negative.fromJSON(json.negative);
  }
}

/**
 * OR-Set: Observed-Remove Set
 */
export class ORSet<T> implements CRDT<Set<T>> {
  private elements: Map<string, { value: T; added: Set<string>; removed: Set<string> }> = new Map();
  private uid: number = 0;

  constructor(private nodeId: string) {}

  add(value: T): void {
    const key = JSON.stringify(value);
    const tag = `${this.nodeId}-${Date.now()}-${this.uid++}`;
    
    if (!this.elements.has(key)) {
      this.elements.set(key, {
        value,
        added: new Set([tag]),
        removed: new Set()
      });
    } else {
      const element = this.elements.get(key)!;
      element.added.add(tag);
    }
  }

  remove(value: T): void {
    const key = JSON.stringify(value);
    const element = this.elements.get(key);
    
    if (element) {
      for (const tag of element.added) {
        element.removed.add(tag);
      }
    }
  }

  value(): Set<T> {
    const result = new Set<T>();
    
    for (const element of this.elements.values()) {
      const effectiveTags = new Set(element.added);
      for (const tag of element.removed) {
        effectiveTags.delete(tag);
      }
      
      if (effectiveTags.size > 0) {
        result.add(element.value);
      }
    }
    
    return result;
  }

  merge(other: ORSet<T>): void {
    for (const [key, otherElement] of other.elements.entries()) {
      if (!this.elements.has(key)) {
        this.elements.set(key, {
          value: otherElement.value,
          added: new Set(otherElement.added),
          removed: new Set(otherElement.removed)
        });
      } else {
        const element = this.elements.get(key)!;
        
        // Union of added tags
        for (const tag of otherElement.added) {
          element.added.add(tag);
        }
        
        // Union of removed tags
        for (const tag of otherElement.removed) {
          element.removed.add(tag);
        }
      }
    }
  }

  toJSON(): any {
    const elements: any[] = [];
    
    for (const [key, element] of this.elements.entries()) {
      elements.push({
        key,
        value: element.value,
        added: Array.from(element.added),
        removed: Array.from(element.removed)
      });
    }
    
    return {
      type: 'or-set',
      elements
    };
  }

  fromJSON(json: any): void {
    this.elements.clear();
    
    for (const element of json.elements) {
      this.elements.set(element.key, {
        value: element.value,
        added: new Set(element.added),
        removed: new Set(element.removed)
      });
    }
  }
}

/**
 * LWW-Register: Last-Writer-Wins Register
 */
export class LWWRegister<T> implements CRDT<T | undefined> {
  private _value?: T;
  private timestamp: number = 0;
  private nodeId: string;

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  set(value: T): void {
    const now = Date.now();
    this._value = value;
    this.timestamp = now;
  }

  value(): T | undefined {
    return this._value;
  }

  merge(other: LWWRegister<T>): void {
    if (other.timestamp > this.timestamp ||
        (other.timestamp === this.timestamp && other.nodeId > this.nodeId)) {
      this._value = other._value;
      this.timestamp = other.timestamp;
    }
  }

  toJSON(): any {
    return {
      type: 'lww-register',
      value: this._value,
      timestamp: this.timestamp,
      nodeId: this.nodeId
    };
  }

  fromJSON(json: any): void {
    this._value = json.value;
    this.timestamp = json.timestamp;
    this.nodeId = json.nodeId;
  }
}

/**
 * Vector Clock for causality tracking
 */
export class VectorClock {
  private clock: Map<string, number> = new Map();

  increment(nodeId: string): void {
    const current = this.clock.get(nodeId) || 0;
    this.clock.set(nodeId, current + 1);
  }

  update(nodeId: string, timestamp: number): void {
    const current = this.clock.get(nodeId) || 0;
    this.clock.set(nodeId, Math.max(current, timestamp));
  }

  merge(other: VectorClock): void {
    for (const [nodeId, timestamp] of other.clock.entries()) {
      this.update(nodeId, timestamp);
    }
  }

  compare(other: VectorClock): 'before' | 'after' | 'concurrent' {
    let hasGreater = false;
    let hasLess = false;

    // Check all nodes in both clocks
    const allNodes = new Set([...this.clock.keys(), ...other.clock.keys()]);
    
    for (const nodeId of allNodes) {
      const thisTime = this.clock.get(nodeId) || 0;
      const otherTime = other.clock.get(nodeId) || 0;
      
      if (thisTime > otherTime) hasGreater = true;
      if (thisTime < otherTime) hasLess = true;
    }

    if (hasGreater && !hasLess) return 'after';
    if (hasLess && !hasGreater) return 'before';
    return 'concurrent';
  }

  toJSON(): any {
    return Object.fromEntries(this.clock);
  }

  fromJSON(json: any): void {
    this.clock = new Map(Object.entries(json));
  }
}

/**
 * CRDT Resolver manages CRDT operations across edge nodes
 */
export class CRDTResolver {
  private tursoClient: TursoClient;
  private nodeId: string;
  private crdts: Map<string, CRDT<any>> = new Map();
  private vectorClock: VectorClock = new VectorClock();

  constructor(tursoClient: TursoClient, nodeId: string) {
    this.tursoClient = tursoClient;
    this.nodeId = nodeId;
  }

  /**
   * Initialize CRDT tables
   */
  async initialize(): Promise<void> {
    // CRDT state table
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS crdt_state (
          id TEXT PRIMARY KEY,
          crdt_type TEXT NOT NULL,
          node_id TEXT NOT NULL,
          state TEXT NOT NULL,
          vector_clock TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          version INTEGER DEFAULT 1,
          INDEX idx_crdt_type (crdt_type),
          INDEX idx_node_id (node_id)
        )
      `
    });

    // CRDT operations log
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS crdt_operations (
          id TEXT PRIMARY KEY,
          crdt_id TEXT NOT NULL,
          operation_type TEXT NOT NULL,
          node_id TEXT NOT NULL,
          data TEXT NOT NULL,
          vector_clock TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          applied BOOLEAN DEFAULT FALSE,
          INDEX idx_crdt_ops (crdt_id, timestamp),
          INDEX idx_applied (applied, timestamp)
        )
      `
    });

    // Conflict resolution log
    await this.tursoClient.execute_query({
      query: `
        CREATE TABLE IF NOT EXISTS crdt_conflicts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          crdt_id TEXT NOT NULL,
          operation1_id TEXT NOT NULL,
          operation2_id TEXT NOT NULL,
          resolution_type TEXT NOT NULL,
          resolved_state TEXT NOT NULL,
          timestamp INTEGER DEFAULT (unixepoch())
        )
      `
    });
  }

  /**
   * Create or get a CRDT instance
   */
  async getCRDT<T>(id: string, type: CRDTType): Promise<CRDT<T>> {
    // Check cache
    if (this.crdts.has(id)) {
      return this.crdts.get(id)!;
    }

    // Load from database
    const result = await this.tursoClient.execute_read_only_query({
      query: `SELECT * FROM crdt_state WHERE id = ?`,
      params: [id]
    });

    let crdt: CRDT<T>;

    if (result.rows.length > 0) {
      // Restore from saved state
      const row = result.rows[0];
      crdt = this.createCRDT(row.crdt_type);
      crdt.fromJSON(JSON.parse(row.state));
      
      // Restore vector clock
      this.vectorClock.fromJSON(JSON.parse(row.vector_clock));
    } else {
      // Create new CRDT
      crdt = this.createCRDT(type);
      await this.saveCRDT(id, type, crdt);
    }

    this.crdts.set(id, crdt);
    return crdt;
  }

  /**
   * Apply operation to CRDT
   */
  async applyOperation(
    crdtId: string,
    operation: string,
    data: any
  ): Promise<void> {
    const crdt = this.crdts.get(crdtId);
    if (!crdt) {
      throw new Error(`CRDT not found: ${crdtId}`);
    }

    // Increment vector clock
    this.vectorClock.increment(this.nodeId);

    // Create operation record
    const op: CRDTOperation = {
      id: this.generateOperationId(),
      type: operation,
      crdt: this.getCRDTType(crdt),
      nodeId: this.nodeId,
      timestamp: Date.now(),
      data,
      metadata: {
        nodeId: this.nodeId,
        timestamp: Date.now(),
        version: 1,
        vectorClock: new Map(this.vectorClock.toJSON())
      }
    };

    // Apply operation locally
    this.applyOperationToInstance(crdt, operation, data);

    // Save operation to log
    await this.tursoClient.execute_query({
      query: `
        INSERT INTO crdt_operations 
        (id, crdt_id, operation_type, node_id, data, vector_clock, timestamp, applied)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      params: [
        op.id,
        crdtId,
        operation,
        this.nodeId,
        JSON.stringify(data),
        JSON.stringify(this.vectorClock.toJSON()),
        op.timestamp,
        true
      ]
    });

    // Save updated CRDT state
    await this.saveCRDT(crdtId, op.crdt, crdt);
  }

  /**
   * Sync CRDT operations from other nodes
   */
  async sync(fromTimestamp?: number): Promise<number> {
    const since = fromTimestamp || 0;
    let operationsApplied = 0;

    // Fetch operations from other nodes
    const operations = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT * FROM crdt_operations 
        WHERE node_id != ? AND timestamp > ? AND applied = FALSE
        ORDER BY timestamp ASC
        LIMIT 1000
      `,
      params: [this.nodeId, since]
    });

    for (const row of operations.rows) {
      try {
        await this.applyRemoteOperation(row);
        operationsApplied++;
      } catch (error) {
        console.error(`Failed to apply operation ${row.id}:`, error);
      }
    }

    return operationsApplied;
  }

  /**
   * Apply remote operation
   */
  private async applyRemoteOperation(row: any): Promise<void> {
    const remoteVectorClock = new VectorClock();
    remoteVectorClock.fromJSON(JSON.parse(row.vector_clock));

    // Check causality
    const comparison = this.vectorClock.compare(remoteVectorClock);
    
    if (comparison === 'after') {
      // We've already seen this operation (or a later one)
      return;
    }

    // Get or create CRDT
    const crdt = await this.getCRDT(row.crdt_id, row.crdt_type);
    const data = JSON.parse(row.data);

    if (comparison === 'concurrent') {
      // Concurrent operations - may need conflict resolution
      await this.handleConcurrentOperation(row.crdt_id, row.id, row.operation_type, data, crdt);
    } else {
      // Apply operation
      this.applyOperationToInstance(crdt, row.operation_type, data);
    }

    // Update vector clock
    this.vectorClock.merge(remoteVectorClock);

    // Mark as applied
    await this.tursoClient.execute_query({
      query: `UPDATE crdt_operations SET applied = TRUE WHERE id = ?`,
      params: [row.id]
    });

    // Save updated state
    await this.saveCRDT(row.crdt_id, row.crdt_type, crdt);
  }

  /**
   * Handle concurrent operations
   */
  private async handleConcurrentOperation(
    crdtId: string,
    operationId: string,
    operationType: string,
    data: any,
    crdt: CRDT<any>
  ): Promise<void> {
    // Get the last local operation for comparison
    const lastLocal = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT * FROM crdt_operations 
        WHERE crdt_id = ? AND node_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `,
      params: [crdtId, this.nodeId]
    });

    // Apply operation - CRDTs handle concurrent operations automatically
    this.applyOperationToInstance(crdt, operationType, data);

    // Log conflict resolution
    if (lastLocal.rows.length > 0) {
      await this.tursoClient.execute_query({
        query: `
          INSERT INTO crdt_conflicts 
          (crdt_id, operation1_id, operation2_id, resolution_type, resolved_state)
          VALUES (?, ?, ?, ?, ?)
        `,
        params: [
          crdtId,
          lastLocal.rows[0].id,
          operationId,
          'crdt-merge',
          JSON.stringify(crdt.toJSON())
        ]
      });
    }
  }

  /**
   * Apply operation to CRDT instance
   */
  private applyOperationToInstance(crdt: CRDT<any>, operation: string, data: any): void {
    switch (operation) {
      case 'increment':
        if (crdt instanceof GCounter || crdt instanceof PNCounter) {
          crdt.increment(data.nodeId || this.nodeId, data.amount || 1);
        }
        break;

      case 'add':
        if (crdt instanceof ORSet) {
          crdt.add(data.value);
        }
        break;

      case 'remove':
        if (crdt instanceof ORSet) {
          crdt.remove(data.value);
        }
        break;

      case 'set':
        if (crdt instanceof LWWRegister) {
          crdt.set(data.value);
        }
        break;

      case 'merge':
        if (data.state) {
          const other = this.createCRDT(this.getCRDTType(crdt));
          other.fromJSON(data.state);
          crdt.merge(other);
        }
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  /**
   * Create CRDT instance by type
   */
  private createCRDT(type: CRDTType): CRDT<any> {
    switch (type) {
      case 'g-counter':
        return new GCounter(this.nodeId);
      case 'pn-counter':
        return new PNCounter(this.nodeId);
      case 'or-set':
        return new ORSet(this.nodeId);
      case 'lww-register':
        return new LWWRegister(this.nodeId);
      default:
        throw new Error(`Unknown CRDT type: ${type}`);
    }
  }

  /**
   * Get CRDT type from instance
   */
  private getCRDTType(crdt: CRDT<any>): CRDTType {
    if (crdt instanceof GCounter) return 'g-counter';
    if (crdt instanceof PNCounter) return 'pn-counter';
    if (crdt instanceof ORSet) return 'or-set';
    if (crdt instanceof LWWRegister) return 'lww-register';
    throw new Error('Unknown CRDT instance type');
  }

  /**
   * Save CRDT state to database
   */
  private async saveCRDT(id: string, type: CRDTType, crdt: CRDT<any>): Promise<void> {
    await this.tursoClient.execute_query({
      query: `
        INSERT INTO crdt_state 
        (id, crdt_type, node_id, state, vector_clock, timestamp, version)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          state = ?,
          vector_clock = ?,
          timestamp = ?,
          version = version + 1
      `,
      params: [
        id,
        type,
        this.nodeId,
        JSON.stringify(crdt.toJSON()),
        JSON.stringify(this.vectorClock.toJSON()),
        Date.now(),
        1,
        JSON.stringify(crdt.toJSON()),
        JSON.stringify(this.vectorClock.toJSON()),
        Date.now()
      ]
    });
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op_${this.nodeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conflict resolution statistics
   */
  async getConflictStats(timeWindow?: number): Promise<any> {
    const since = Date.now() / 1000 - (timeWindow || 86400); // Default 24 hours

    const stats = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT 
          crdt_id,
          resolution_type,
          COUNT(*) as conflict_count,
          MAX(timestamp) as last_conflict
        FROM crdt_conflicts
        WHERE timestamp > ?
        GROUP BY crdt_id, resolution_type
        ORDER BY conflict_count DESC
      `,
      params: [since]
    });

    return stats.rows;
  }

  /**
   * Export CRDT state for backup or migration
   */
  async exportState(): Promise<any> {
    const state = await this.tursoClient.execute_read_only_query({
      query: `SELECT * FROM crdt_state WHERE node_id = ?`,
      params: [this.nodeId]
    });

    const operations = await this.tursoClient.execute_read_only_query({
      query: `
        SELECT * FROM crdt_operations 
        WHERE node_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 1000
      `,
      params: [this.nodeId]
    });

    return {
      nodeId: this.nodeId,
      vectorClock: this.vectorClock.toJSON(),
      states: state.rows,
      recentOperations: operations.rows,
      exportedAt: Date.now()
    };
  }

  /**
   * Import CRDT state
   */
  async importState(data: any): Promise<void> {
    // Import vector clock
    this.vectorClock.fromJSON(data.vectorClock);

    // Import CRDT states
    for (const state of data.states) {
      await this.tursoClient.execute_query({
        query: `
          INSERT OR REPLACE INTO crdt_state 
          (id, crdt_type, node_id, state, vector_clock, timestamp, version)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        params: [
          state.id,
          state.crdt_type,
          state.node_id,
          state.state,
          state.vector_clock,
          state.timestamp,
          state.version
        ]
      });
    }

    // Clear cache to force reload
    this.crdts.clear();
  }
}