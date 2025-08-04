import { ChangeSet } from './sync-coordinator';

export type ConflictStrategy = 'last-write-wins' | 'custom' | 'merge';

export interface ConflictResolution {
  strategy: ConflictStrategy;
  resolvedData: Record<string, any>;
  winnerId: string;
  timestamp: number;
}

export class ConflictResolver {
  constructor(private defaultStrategy: ConflictStrategy) {}

  async resolve(
    change1: ChangeSet,
    change2: ChangeSet | any,
    strategy?: ConflictStrategy
  ): Promise<string> {
    const activeStrategy = strategy || this.defaultStrategy;

    switch (activeStrategy) {
      case 'last-write-wins':
        return this.lastWriteWins(change1, change2);
      
      case 'merge':
        return this.mergeChanges(change1, change2);
      
      case 'custom':
        return this.customResolve(change1, change2);
      
      default:
        throw new Error(`Unknown conflict resolution strategy: ${activeStrategy}`);
    }
  }

  private lastWriteWins(change1: ChangeSet, change2: ChangeSet | any): string {
    // If change2 is an error, use change1
    if (change2 instanceof Error) {
      return this.buildStatement(change1);
    }

    // Compare timestamps, newer wins
    const winner = change1.timestamp > change2.timestamp ? change1 : change2;
    return this.buildStatement(winner);
  }

  private mergeChanges(change1: ChangeSet, change2: ChangeSet | any): string {
    if (change2 instanceof Error) {
      return this.buildStatement(change1);
    }

    // For updates, merge non-conflicting fields
    if (change1.operation === 'update' && change2.operation === 'update') {
      const mergedData: Record<string, any> = {};
      
      // Start with change1 data
      Object.assign(mergedData, change1.data);
      
      // Overlay change2 data for non-conflicting fields
      for (const [key, value] of Object.entries(change2.data)) {
        if (!(key in change1.data) || change1.timestamp < change2.timestamp) {
          mergedData[key] = value;
        }
      }

      const mergedChange: ChangeSet = {
        ...change1,
        data: mergedData,
        timestamp: Math.max(change1.timestamp, change2.timestamp)
      };

      return this.buildStatement(mergedChange);
    }

    // For other operations, fall back to last-write-wins
    return this.lastWriteWins(change1, change2);
  }

  private customResolve(change1: ChangeSet, change2: ChangeSet | any): string {
    // This can be extended with custom business logic
    // For now, we'll implement a field-level resolution
    
    if (change2 instanceof Error) {
      return this.buildStatement(change1);
    }

    // Example: For inventory, always take the lower quantity (conservative approach)
    if (change1.table === 'inventory' && change1.data.quantity && change2.data.quantity) {
      const resolvedChange: ChangeSet = {
        ...change1,
        data: {
          ...change1.data,
          quantity: Math.min(change1.data.quantity, change2.data.quantity)
        }
      };
      return this.buildStatement(resolvedChange);
    }

    // Example: For user profiles, merge preferences
    if (change1.table === 'users' && change1.data.preferences && change2.data.preferences) {
      const mergedPreferences = {
        ...JSON.parse(change1.data.preferences || '{}'),
        ...JSON.parse(change2.data.preferences || '{}')
      };
      
      const resolvedChange: ChangeSet = {
        ...change1,
        data: {
          ...change1.data,
          ...change2.data,
          preferences: JSON.stringify(mergedPreferences)
        }
      };
      return this.buildStatement(resolvedChange);
    }

    // Default to last-write-wins
    return this.lastWriteWins(change1, change2);
  }

  private buildStatement(change: ChangeSet): string {
    switch (change.operation) {
      case 'insert':
        const insertColumns = Object.keys(change.data).join(', ');
        const insertValues = Object.values(change.data)
          .map(v => this.formatValue(v))
          .join(', ');
        return `INSERT OR REPLACE INTO ${change.table} (${insertColumns}) VALUES (${insertValues})`;
      
      case 'update':
        const updateSet = Object.entries(change.data)
          .filter(([k]) => k !== 'id') // Don't update the ID
          .map(([k, v]) => `${k} = ${this.formatValue(v)}`)
          .join(', ');
        return `UPDATE ${change.table} SET ${updateSet} WHERE id = ${this.formatValue(change.data.id)}`;
      
      case 'delete':
        return `DELETE FROM ${change.table} WHERE id = ${this.formatValue(change.data.id)}`;
      
      default:
        throw new Error(`Unknown operation: ${change.operation}`);
    }
  }

  private formatValue(value: any): string {
    if (value === null) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'boolean') return value ? '1' : '0';
    if (value instanceof Date) return `'${value.toISOString()}'`;
    return String(value);
  }

  // CRDT-based conflict resolution for specific data types
  async resolveCRDT(
    dataType: 'counter' | 'set' | 'map',
    value1: any,
    value2: any
  ): Promise<any> {
    switch (dataType) {
      case 'counter':
        // For counters, sum the increments
        return {
          value: (value1.value || 0) + (value2.value || 0),
          increments: [...(value1.increments || []), ...(value2.increments || [])]
        };
      
      case 'set':
        // For sets, union the elements
        const set1 = new Set(value1.elements || []);
        const set2 = new Set(value2.elements || []);
        return {
          elements: Array.from(new Set([...set1, ...set2])),
          tombstones: [...(value1.tombstones || []), ...(value2.tombstones || [])]
        };
      
      case 'map':
        // For maps, merge with last-write-wins per key
        const merged: Record<string, any> = {};
        const allKeys = new Set([
          ...Object.keys(value1.data || {}),
          ...Object.keys(value2.data || {})
        ]);
        
        for (const key of allKeys) {
          const v1 = value1.data?.[key];
          const v2 = value2.data?.[key];
          
          if (!v1) merged[key] = v2;
          else if (!v2) merged[key] = v1;
          else {
            // Compare timestamps
            merged[key] = v1.timestamp > v2.timestamp ? v1 : v2;
          }
        }
        
        return { data: merged };
      
      default:
        throw new Error(`Unknown CRDT type: ${dataType}`);
    }
  }

  // Vector clock comparison for causality tracking
  compareVectorClocks(vc1: Record<string, number>, vc2: Record<string, number>): 
    'concurrent' | 'before' | 'after' | 'equal' {
    let hasLess = false;
    let hasGreater = false;

    const allNodes = new Set([...Object.keys(vc1), ...Object.keys(vc2)]);

    for (const node of allNodes) {
      const v1 = vc1[node] || 0;
      const v2 = vc2[node] || 0;

      if (v1 < v2) hasLess = true;
      if (v1 > v2) hasGreater = true;
    }

    if (!hasLess && !hasGreater) return 'equal';
    if (hasLess && !hasGreater) return 'before';
    if (!hasLess && hasGreater) return 'after';
    return 'concurrent';
  }
}