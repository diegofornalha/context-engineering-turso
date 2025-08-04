import { createClient, Client } from '@libsql/client';
import { EventEmitter } from 'events';

export interface EventualConsistencyConfig {
  nodes: Array<{
    id: string;
    url: string;
    authToken?: string;
    weight?: number; // For weighted quorum
  }>;
  consistency: 'strong' | 'eventual' | 'causal';
  quorumSize?: number; // Minimum nodes for consensus
  maxClockDrift?: number; // Maximum allowed clock drift in ms
  conflictResolution?: 'lww' | 'mvcc' | 'crdt';
}

interface DotContext {
  nodeId: string;
  counter: number;
}

interface DottedVersion {
  dots: DotContext[];
  context: Map<string, number>;
}

export class EventualConsistencySync extends EventEmitter {
  private clients: Map<string, Client> = new Map();
  private nodeWeights: Map<string, number> = new Map();
  private logicalClocks: Map<string, number> = new Map();
  private pendingWrites: Map<string, any[]> = new Map();

  constructor(private config: EventualConsistencyConfig) {
    super();
    this.initializeNodes();
  }

  private async initializeNodes() {
    for (const node of this.config.nodes) {
      const client = createClient({
        url: node.url,
        authToken: node.authToken
      });
      
      this.clients.set(node.id, client);
      this.nodeWeights.set(node.id, node.weight || 1);
      this.logicalClocks.set(node.id, 0);
      
      await this.setupEventualConsistencyTables(node.id, client);
    }
  }

  private async setupEventualConsistencyTables(nodeId: string, client: Client) {
    // Version vector table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS version_vectors (
        record_id TEXT NOT NULL,
        node_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (record_id, node_id)
      )
    `);

    // Causal dependencies table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS causal_dependencies (
        event_id TEXT PRIMARY KEY,
        depends_on TEXT NOT NULL,
        node_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      )
    `);

    // CRDT metadata table
    await client.execute(`
      CREATE TABLE IF NOT EXISTS crdt_metadata (
        record_id TEXT PRIMARY KEY,
        crdt_type TEXT NOT NULL,
        node_states TEXT NOT NULL,
        merged_value TEXT,
        last_updated INTEGER NOT NULL
      )
    `);

    // Anti-entropy log
    await client.execute(`
      CREATE TABLE IF NOT EXISTS anti_entropy_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        node_id TEXT NOT NULL,
        record_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        data TEXT NOT NULL,
        version_vector TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        propagated_to TEXT DEFAULT '[]'
      )
    `);
  }

  // Read with configurable consistency
  async read(
    table: string,
    recordId: string,
    consistency?: 'strong' | 'eventual' | 'causal'
  ): Promise<any> {
    const activeConsistency = consistency || this.config.consistency;

    switch (activeConsistency) {
      case 'strong':
        return this.strongRead(table, recordId);
      case 'causal':
        return this.causalRead(table, recordId);
      case 'eventual':
      default:
        return this.eventualRead(table, recordId);
    }
  }

  private async strongRead(table: string, recordId: string): Promise<any> {
    // Read from quorum of nodes
    const quorum = this.calculateQuorum();
    const results = new Map<string, any>();
    const versions = new Map<string, number>();

    const readPromises = Array.from(this.clients.entries())
      .slice(0, quorum)
      .map(async ([nodeId, client]) => {
        try {
          const result = await client.execute(
            `SELECT * FROM ${table} WHERE id = ?`,
            [recordId]
          );
          
          if (result.rows.length > 0) {
            results.set(nodeId, result.rows[0]);
            
            // Get version
            const versionResult = await client.execute(
              'SELECT version FROM version_vectors WHERE record_id = ? AND node_id = ?',
              [recordId, nodeId]
            );
            
            if (versionResult.rows.length > 0) {
              versions.set(nodeId, versionResult.rows[0].version as number);
            }
          }
        } catch (error) {
          this.emit('read:error', { nodeId, error });
        }
      });

    await Promise.all(readPromises);

    // Return the most recent version
    let mostRecent = null;
    let highestVersion = -1;

    for (const [nodeId, data] of results) {
      const version = versions.get(nodeId) || 0;
      if (version > highestVersion) {
        highestVersion = version;
        mostRecent = data;
      }
    }

    return mostRecent;
  }

  private async causalRead(table: string, recordId: string): Promise<any> {
    // Read with causal consistency - ensure all dependencies are satisfied
    const primaryNode = this.selectPrimaryNode();
    const client = this.clients.get(primaryNode)!;

    // Get the record and its causal dependencies
    const [record, dependencies] = await Promise.all([
      client.execute(`SELECT * FROM ${table} WHERE id = ?`, [recordId]),
      client.execute(
        'SELECT depends_on FROM causal_dependencies WHERE event_id LIKE ?',
        [`${recordId}-%`]
      )
    ]);

    if (record.rows.length === 0) return null;

    // Verify all dependencies are satisfied
    const dependencyIds = dependencies.rows.map(row => row.depends_on as string);
    const satisfied = await this.verifyDependencies(dependencyIds, client);

    if (!satisfied) {
      // Wait for dependencies to be satisfied
      await this.waitForDependencies(dependencyIds);
      return this.causalRead(table, recordId);
    }

    return record.rows[0];
  }

  private async eventualRead(table: string, recordId: string): Promise<any> {
    // Read from any available node
    const nodeId = this.selectRandomNode();
    const client = this.clients.get(nodeId)!;

    const result = await client.execute(
      `SELECT * FROM ${table} WHERE id = ?`,
      [recordId]
    );

    return result.rows[0] || null;
  }

  // Write with configurable consistency
  async write(
    table: string,
    recordId: string,
    data: any,
    consistency?: 'strong' | 'eventual' | 'causal'
  ): Promise<void> {
    const activeConsistency = consistency || this.config.consistency;

    switch (activeConsistency) {
      case 'strong':
        return this.strongWrite(table, recordId, data);
      case 'causal':
        return this.causalWrite(table, recordId, data);
      case 'eventual':
      default:
        return this.eventualWrite(table, recordId, data);
    }
  }

  private async strongWrite(table: string, recordId: string, data: any): Promise<void> {
    // Write to quorum of nodes
    const quorum = this.calculateQuorum();
    const timestamp = Date.now();
    const version = this.incrementLogicalClock(recordId);

    const writePromises = Array.from(this.clients.entries())
      .slice(0, quorum)
      .map(async ([nodeId, client]) => {
        try {
          // Perform the write
          const columns = Object.keys(data).join(', ');
          const placeholders = Object.keys(data).map(() => '?').join(', ');
          const values = Object.values(data);

          await client.execute(
            `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
            values
          );

          // Update version vector
          await client.execute(`
            INSERT OR REPLACE INTO version_vectors (record_id, node_id, version, timestamp)
            VALUES (?, ?, ?, ?)
          `, [recordId, nodeId, version, timestamp]);

          // Log for anti-entropy
          await this.logForAntiEntropy(nodeId, client, {
            recordId,
            operation: 'write',
            table,
            data,
            version,
            timestamp
          });

        } catch (error) {
          this.emit('write:error', { nodeId, error });
          throw error;
        }
      });

    const results = await Promise.allSettled(writePromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;

    if (successful < quorum) {
      throw new Error(`Write failed: only ${successful}/${quorum} nodes succeeded`);
    }

    // Async propagation to remaining nodes
    this.propagateToRemainingNodes(table, recordId, data, version, timestamp);
  }

  private async causalWrite(
    table: string,
    recordId: string,
    data: any,
    dependencies?: string[]
  ): Promise<void> {
    // Ensure causal dependencies are satisfied before writing
    if (dependencies && dependencies.length > 0) {
      const primaryNode = this.selectPrimaryNode();
      const client = this.clients.get(primaryNode)!;
      
      const satisfied = await this.verifyDependencies(dependencies, client);
      if (!satisfied) {
        await this.waitForDependencies(dependencies);
      }
    }

    const eventId = `${recordId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const version = this.incrementLogicalClock(recordId);

    // Write to primary node first
    const primaryNode = this.selectPrimaryNode();
    const client = this.clients.get(primaryNode)!;

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    await client.execute(
      `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
      values
    );

    // Record causal dependencies
    if (dependencies && dependencies.length > 0) {
      for (const dep of dependencies) {
        await client.execute(`
          INSERT INTO causal_dependencies (event_id, depends_on, node_id, timestamp)
          VALUES (?, ?, ?, ?)
        `, [eventId, dep, primaryNode, timestamp]);
      }
    }

    // Propagate causally
    await this.causalPropagate(table, recordId, data, version, timestamp, dependencies);
  }

  private async eventualWrite(table: string, recordId: string, data: any): Promise<void> {
    // Write to any available node and let it propagate
    const nodeId = this.selectRandomNode();
    const client = this.clients.get(nodeId)!;
    const timestamp = Date.now();
    const version = this.incrementLogicalClock(recordId);

    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    await client.execute(
      `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
      values
    );

    // Log for anti-entropy
    await this.logForAntiEntropy(nodeId, client, {
      recordId,
      operation: 'write',
      table,
      data,
      version,
      timestamp
    });

    // Async propagation
    this.asyncPropagate(table, recordId, data, version, timestamp, nodeId);
  }

  // Anti-entropy process
  async runAntiEntropy() {
    const nodes = Array.from(this.clients.keys());
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        await this.syncNodes(nodes[i], nodes[j]);
      }
    }

    this.emit('anti-entropy:completed');
  }

  private async syncNodes(nodeId1: string, nodeId2: string) {
    const client1 = this.clients.get(nodeId1)!;
    const client2 = this.clients.get(nodeId2)!;

    // Get unpropagated entries from node1
    const entries1 = await client1.execute(`
      SELECT * FROM anti_entropy_log
      WHERE propagated_to NOT LIKE '%${nodeId2}%'
      ORDER BY timestamp ASC
      LIMIT 100
    `);

    // Apply to node2
    for (const entry of entries1.rows) {
      try {
        await this.applyAntiEntropyEntry(nodeId2, client2, entry);
        
        // Mark as propagated
        const propagatedTo = JSON.parse(entry.propagated_to as string || '[]');
        propagatedTo.push(nodeId2);
        
        await client1.execute(
          'UPDATE anti_entropy_log SET propagated_to = ? WHERE id = ?',
          [JSON.stringify(propagatedTo), entry.id]
        );
      } catch (error) {
        this.emit('anti-entropy:error', { from: nodeId1, to: nodeId2, error });
      }
    }
  }

  private async applyAntiEntropyEntry(nodeId: string, client: Client, entry: any) {
    const data = JSON.parse(entry.data);
    const versionVector = JSON.parse(entry.version_vector);

    // Check if we already have a newer version
    const currentVersion = await this.getVersionVector(client, entry.record_id);
    
    if (this.isNewer(versionVector, currentVersion)) {
      // Apply the update
      if (entry.operation === 'write') {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);

        await client.execute(
          `INSERT OR REPLACE INTO ${entry.table} (${columns}) VALUES (${placeholders})`,
          values
        );

        // Update version vector
        await this.updateVersionVector(client, entry.record_id, nodeId, versionVector);
      }
    }
  }

  // CRDT operations
  async mergeCRDT(
    recordId: string,
    crdtType: 'g-counter' | 'pn-counter' | 'g-set' | 'or-set' | 'lww-register',
    localValue: any,
    remoteValue: any
  ): Promise<any> {
    switch (crdtType) {
      case 'g-counter':
        return this.mergeGCounter(localValue, remoteValue);
      
      case 'pn-counter':
        return this.mergePNCounter(localValue, remoteValue);
      
      case 'g-set':
        return this.mergeGSet(localValue, remoteValue);
      
      case 'or-set':
        return this.mergeORSet(localValue, remoteValue);
      
      case 'lww-register':
        return this.mergeLWWRegister(localValue, remoteValue);
      
      default:
        throw new Error(`Unknown CRDT type: ${crdtType}`);
    }
  }

  private mergeGCounter(local: any, remote: any): any {
    const merged: Record<string, number> = {};
    const allNodes = new Set([...Object.keys(local), ...Object.keys(remote)]);

    for (const node of allNodes) {
      merged[node] = Math.max(local[node] || 0, remote[node] || 0);
    }

    return merged;
  }

  private mergePNCounter(local: any, remote: any): any {
    return {
      positive: this.mergeGCounter(local.positive || {}, remote.positive || {}),
      negative: this.mergeGCounter(local.negative || {}, remote.negative || {})
    };
  }

  private mergeGSet(local: Set<any>, remote: Set<any>): Set<any> {
    return new Set([...local, ...remote]);
  }

  private mergeORSet(local: any, remote: any): any {
    const adds = new Map<string, Set<string>>();
    const removes = new Map<string, Set<string>>();

    // Merge adds
    const allAdds = [...(local.adds || []), ...(remote.adds || [])];
    for (const [elem, dots] of allAdds) {
      if (!adds.has(elem)) adds.set(elem, new Set());
      for (const dot of dots) {
        adds.get(elem)!.add(dot);
      }
    }

    // Merge removes
    const allRemoves = [...(local.removes || []), ...(remote.removes || [])];
    for (const [elem, dots] of allRemoves) {
      if (!removes.has(elem)) removes.set(elem, new Set());
      for (const dot of dots) {
        removes.get(elem)!.add(dot);
      }
    }

    // Compute effective set
    const effectiveSet = new Set<string>();
    for (const [elem, addDots] of adds) {
      const removeDots = removes.get(elem) || new Set();
      const hasLiveAdd = Array.from(addDots).some(dot => !removeDots.has(dot));
      if (hasLiveAdd) {
        effectiveSet.add(elem);
      }
    }

    return {
      adds: Array.from(adds),
      removes: Array.from(removes),
      elements: Array.from(effectiveSet)
    };
  }

  private mergeLWWRegister(local: any, remote: any): any {
    if (local.timestamp > remote.timestamp) return local;
    if (remote.timestamp > local.timestamp) return remote;
    
    // Timestamps are equal, use node ID as tiebreaker
    return local.nodeId > remote.nodeId ? local : remote;
  }

  // Helper methods
  private calculateQuorum(): number {
    if (this.config.quorumSize) return this.config.quorumSize;
    return Math.floor(this.clients.size / 2) + 1;
  }

  private selectPrimaryNode(): string {
    // Select node with highest weight
    let primary = '';
    let maxWeight = -1;

    for (const [nodeId, weight] of this.nodeWeights) {
      if (weight > maxWeight) {
        maxWeight = weight;
        primary = nodeId;
      }
    }

    return primary;
  }

  private selectRandomNode(): string {
    const nodes = Array.from(this.clients.keys());
    return nodes[Math.floor(Math.random() * nodes.length)];
  }

  private incrementLogicalClock(recordId: string): number {
    const current = this.logicalClocks.get(recordId) || 0;
    const next = current + 1;
    this.logicalClocks.set(recordId, next);
    return next;
  }

  private async verifyDependencies(dependencies: string[], client: Client): Promise<boolean> {
    for (const dep of dependencies) {
      const result = await client.execute(
        'SELECT COUNT(*) as count FROM anti_entropy_log WHERE event_id = ?',
        [dep]
      );
      
      if (result.rows[0].count === 0) {
        return false;
      }
    }
    return true;
  }

  private async waitForDependencies(dependencies: string[]): Promise<void> {
    // Simple exponential backoff
    let delay = 100;
    const maxDelay = 5000;

    while (true) {
      const satisfied = await this.checkAllDependencies(dependencies);
      if (satisfied) break;

      await this.delay(delay);
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  private async checkAllDependencies(dependencies: string[]): Promise<boolean> {
    for (const [_, client] of this.clients) {
      const satisfied = await this.verifyDependencies(dependencies, client);
      if (satisfied) return true;
    }
    return false;
  }

  private async logForAntiEntropy(
    nodeId: string,
    client: Client,
    entry: any
  ): Promise<void> {
    const versionVector = await this.getVersionVector(client, entry.recordId);
    
    await client.execute(`
      INSERT INTO anti_entropy_log (node_id, record_id, operation, data, version_vector, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      nodeId,
      entry.recordId,
      entry.operation,
      JSON.stringify(entry.data),
      JSON.stringify(versionVector),
      entry.timestamp
    ]);
  }

  private async getVersionVector(client: Client, recordId: string): Promise<any> {
    const result = await client.execute(
      'SELECT node_id, version FROM version_vectors WHERE record_id = ?',
      [recordId]
    );

    const vector: Record<string, number> = {};
    for (const row of result.rows) {
      vector[row.node_id as string] = row.version as number;
    }
    return vector;
  }

  private async updateVersionVector(
    client: Client,
    recordId: string,
    nodeId: string,
    vector: any
  ): Promise<void> {
    const batch = client.batch();
    
    for (const [node, version] of Object.entries(vector)) {
      batch.push(`
        INSERT OR REPLACE INTO version_vectors (record_id, node_id, version, timestamp)
        VALUES ('${recordId}', '${node}', ${version}, ${Date.now()})
      `);
    }

    await batch.execute();
  }

  private isNewer(vector1: any, vector2: any): boolean {
    let hasNewer = false;
    let hasOlder = false;

    for (const [node, v1] of Object.entries(vector1)) {
      const v2 = vector2[node] || 0;
      if (v1 > v2) hasNewer = true;
      if (v1 < v2) hasOlder = true;
    }

    return hasNewer && !hasOlder;
  }

  private async propagateToRemainingNodes(
    table: string,
    recordId: string,
    data: any,
    version: number,
    timestamp: number
  ) {
    // Async propagation to nodes not in quorum
    setTimeout(async () => {
      const quorum = this.calculateQuorum();
      const remainingNodes = Array.from(this.clients.entries()).slice(quorum);

      for (const [nodeId, client] of remainingNodes) {
        try {
          const columns = Object.keys(data).join(', ');
          const placeholders = Object.keys(data).map(() => '?').join(', ');
          const values = Object.values(data);

          await client.execute(
            `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
            values
          );

          await client.execute(`
            INSERT OR REPLACE INTO version_vectors (record_id, node_id, version, timestamp)
            VALUES (?, ?, ?, ?)
          `, [recordId, nodeId, version, timestamp]);

        } catch (error) {
          this.emit('propagation:error', { nodeId, error });
        }
      }
    }, 0);
  }

  private async causalPropagate(
    table: string,
    recordId: string,
    data: any,
    version: number,
    timestamp: number,
    dependencies?: string[]
  ) {
    // Propagate while maintaining causal order
    const propagationOrder = await this.determinePropagationOrder(dependencies);
    
    for (const nodeId of propagationOrder) {
      if (nodeId === this.selectPrimaryNode()) continue;
      
      const client = this.clients.get(nodeId)!;
      try {
        const columns = Object.keys(data).join(', ');
        const placeholders = Object.keys(data).map(() => '?').join(', ');
        const values = Object.values(data);

        await client.execute(
          `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
          values
        );

      } catch (error) {
        this.emit('causal-propagation:error', { nodeId, error });
      }
    }
  }

  private async asyncPropagate(
    table: string,
    recordId: string,
    data: any,
    version: number,
    timestamp: number,
    sourceNodeId: string
  ) {
    // Fire and forget propagation
    setImmediate(async () => {
      for (const [nodeId, client] of this.clients) {
        if (nodeId === sourceNodeId) continue;

        try {
          const columns = Object.keys(data).join(', ');
          const placeholders = Object.keys(data).map(() => '?').join(', ');
          const values = Object.values(data);

          await client.execute(
            `INSERT OR REPLACE INTO ${table} (${columns}) VALUES (${placeholders})`,
            values
          );

        } catch (error) {
          // Log but don't fail
          this.emit('async-propagation:error', { nodeId, error });
        }
      }
    });
  }

  private async determinePropagationOrder(dependencies?: string[]): Promise<string[]> {
    // Simple topological sort based on dependencies
    const nodes = Array.from(this.clients.keys());
    
    if (!dependencies || dependencies.length === 0) {
      return nodes;
    }

    // For now, return nodes in order
    // Could be extended with more sophisticated ordering
    return nodes;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}