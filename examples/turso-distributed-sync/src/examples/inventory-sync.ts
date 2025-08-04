import { EventualConsistencySync } from '../sync-protocols/eventual';
import { MasterSlaveSync } from '../sync-protocols/master-slave';
import { createClient, Client } from '@libsql/client';

/**
 * Distributed Inventory Management System
 * 
 * This example demonstrates:
 * - Multi-warehouse inventory synchronization
 * - Conservative conflict resolution for stock levels
 * - Real-time stock transfers between locations
 * - Audit trail for all inventory movements
 */

export interface InventoryItem {
  sku: string;
  locationId: string;
  quantity: number;
  reserved: number;
  available: number;
  lastUpdated: number;
  version: number;
}

export interface StockMovement {
  id: string;
  type: 'adjustment' | 'sale' | 'purchase' | 'transfer' | 'return';
  sku: string;
  fromLocation?: string;
  toLocation?: string;
  quantity: number;
  reason?: string;
  userId: string;
  timestamp: number;
}

export interface InventoryAlert {
  id: string;
  sku: string;
  locationId: string;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock' | 'sync_conflict';
  threshold?: number;
  currentLevel?: number;
  timestamp: number;
}

export class DistributedInventorySync {
  private eventualSync: EventualConsistencySync;
  private masterSlaveSync?: MasterSlaveSync;
  private client: Client;

  constructor(
    private config: {
      nodes: Array<{
        id: string;
        url: string;
        authToken?: string;
        location: string;
        isMaster?: boolean;
      }>;
      syncMode: 'eventual' | 'master-slave';
      lowStockThreshold?: number;
      conflictResolution?: 'conservative' | 'optimistic';
    }
  ) {
    // Set up eventual consistency sync for all nodes
    this.eventualSync = new EventualConsistencySync({
      nodes: config.nodes.map(n => ({
        id: n.id,
        url: n.url,
        authToken: n.authToken,
        weight: n.isMaster ? 2 : 1
      })),
      consistency: 'eventual',
      quorumSize: Math.ceil(config.nodes.length / 2),
      conflictResolution: 'custom'
    });

    // Optionally set up master-slave for critical operations
    if (config.syncMode === 'master-slave') {
      const master = config.nodes.find(n => n.isMaster);
      const slaves = config.nodes.filter(n => !n.isMaster);

      if (master) {
        this.masterSlaveSync = new MasterSlaveSync({
          master: {
            url: master.url,
            authToken: master.authToken
          },
          slaves: slaves.map(s => ({
            url: s.url,
            authToken: s.authToken,
            readonly: false
          })),
          replicationDelay: 1000,
          batchSize: 100
        });
      }
    }

    // Local client for primary node
    const primaryNode = config.nodes[0];
    this.client = createClient({
      url: primaryNode.url,
      authToken: primaryNode.authToken
    });
  }

  async initialize() {
    // Create inventory tables on all nodes
    for (const node of this.config.nodes) {
      const client = createClient({
        url: node.url,
        authToken: node.authToken
      });

      // Inventory table with versioning
      await client.execute(`
        CREATE TABLE IF NOT EXISTS inventory (
          sku TEXT NOT NULL,
          location_id TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          reserved INTEGER NOT NULL DEFAULT 0,
          available INTEGER GENERATED ALWAYS AS (quantity - reserved) VIRTUAL,
          min_stock_level INTEGER DEFAULT 0,
          max_stock_level INTEGER,
          reorder_point INTEGER,
          reorder_quantity INTEGER,
          last_updated INTEGER NOT NULL,
          version INTEGER NOT NULL DEFAULT 1,
          metadata TEXT,
          PRIMARY KEY (sku, location_id)
        )
      `);

      // Stock movements for audit trail
      await client.execute(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id TEXT PRIMARY KEY,
          movement_type TEXT NOT NULL,
          sku TEXT NOT NULL,
          from_location TEXT,
          to_location TEXT,
          quantity INTEGER NOT NULL,
          reason TEXT,
          user_id TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          applied BOOLEAN DEFAULT FALSE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Inventory alerts
      await client.execute(`
        CREATE TABLE IF NOT EXISTS inventory_alerts (
          id TEXT PRIMARY KEY,
          sku TEXT NOT NULL,
          location_id TEXT NOT NULL,
          alert_type TEXT NOT NULL,
          threshold INTEGER,
          current_level INTEGER,
          resolved BOOLEAN DEFAULT FALSE,
          timestamp INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes
      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku)
      `);

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_movements_sku_timestamp 
        ON stock_movements(sku, timestamp DESC)
      `);

      await client.execute(`
        CREATE INDEX IF NOT EXISTS idx_alerts_unresolved 
        ON inventory_alerts(resolved, timestamp DESC)
      `);

      // Create triggers for stock level monitoring
      await this.createStockMonitoringTriggers(client);
    }

    // Start replication if using master-slave
    if (this.masterSlaveSync) {
      await this.masterSlaveSync.startReplication();
    }

    // Start anti-entropy process
    setInterval(() => this.eventualSync.runAntiEntropy(), 30000); // Every 30 seconds
  }

  private async createStockMonitoringTriggers(client: Client) {
    // Trigger for low stock alerts
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS low_stock_alert
      AFTER UPDATE ON inventory
      WHEN NEW.available <= NEW.min_stock_level AND NEW.available > 0
      BEGIN
        INSERT INTO inventory_alerts (
          id, sku, location_id, alert_type, threshold, 
          current_level, timestamp
        ) VALUES (
          lower(hex(randomblob(16))),
          NEW.sku,
          NEW.location_id,
          'low_stock',
          NEW.min_stock_level,
          NEW.available,
          unixepoch() * 1000
        );
      END;
    `);

    // Trigger for out of stock alerts
    await client.execute(`
      CREATE TRIGGER IF NOT EXISTS out_of_stock_alert
      AFTER UPDATE ON inventory
      WHEN NEW.available <= 0
      BEGIN
        INSERT INTO inventory_alerts (
          id, sku, location_id, alert_type, current_level, timestamp
        ) VALUES (
          lower(hex(randomblob(16))),
          NEW.sku,
          NEW.location_id,
          'out_of_stock',
          0,
          unixepoch() * 1000
        );
      END;
    `);
  }

  async adjustStock(
    sku: string,
    locationId: string,
    adjustment: number,
    reason: string,
    userId: string
  ): Promise<void> {
    const movementId = this.generateMovementId();
    const timestamp = Date.now();

    // Record the movement first
    const movement: StockMovement = {
      id: movementId,
      type: 'adjustment',
      sku,
      toLocation: locationId,
      quantity: adjustment,
      reason,
      userId,
      timestamp
    };

    // Use appropriate sync method
    if (this.config.syncMode === 'master-slave' && this.masterSlaveSync) {
      // Execute on master
      await this.masterSlaveSync.executeOnMaster(`
        INSERT INTO stock_movements (
          id, movement_type, sku, to_location, quantity, 
          reason, user_id, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        movement.id, movement.type, movement.sku,
        movement.toLocation, movement.quantity,
        movement.reason, movement.userId, movement.timestamp
      ]);

      // Update inventory with conflict detection
      await this.updateInventoryWithConflictResolution(
        sku, locationId, adjustment
      );
    } else {
      // Use eventual consistency
      await this.eventualSync.write(
        'stock_movements',
        movementId,
        movement
      );

      await this.updateInventoryEventually(sku, locationId, adjustment);
    }
  }

  private async updateInventoryWithConflictResolution(
    sku: string,
    locationId: string,
    adjustment: number
  ): Promise<void> {
    const maxRetries = 3;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        // Get current inventory with version
        const current = await this.client.execute(`
          SELECT quantity, version FROM inventory
          WHERE sku = ? AND location_id = ?
        `, [sku, locationId]);

        if (current.rows.length === 0) {
          // New inventory item
          await this.client.execute(`
            INSERT INTO inventory (
              sku, location_id, quantity, last_updated, version
            ) VALUES (?, ?, ?, ?, 1)
          `, [sku, locationId, Math.max(0, adjustment), Date.now()]);
          return;
        }

        const currentQuantity = current.rows[0].quantity as number;
        const currentVersion = current.rows[0].version as number;
        let newQuantity = currentQuantity + adjustment;

        // Conservative approach for negative adjustments
        if (this.config.conflictResolution === 'conservative' && adjustment < 0) {
          newQuantity = Math.max(0, newQuantity);
        }

        // Optimistic update with version check
        const result = await this.client.execute(`
          UPDATE inventory
          SET quantity = ?, 
              version = version + 1,
              last_updated = ?
          WHERE sku = ? 
            AND location_id = ?
            AND version = ?
        `, [newQuantity, Date.now(), sku, locationId, currentVersion]);

        if (result.rowsAffected > 0) {
          return; // Success
        }

        // Version mismatch, retry
        retries++;
        await this.delay(100 * retries); // Exponential backoff

      } catch (error) {
        if (retries === maxRetries - 1) throw error;
        retries++;
      }
    }

    // Log conflict if we couldn't resolve
    await this.logSyncConflict(sku, locationId, adjustment);
  }

  private async updateInventoryEventually(
    sku: string,
    locationId: string,
    adjustment: number
  ): Promise<void> {
    // Use CRDT-like approach for inventory
    const inventoryUpdate = {
      sku,
      location_id: locationId,
      adjustment,
      timestamp: Date.now(),
      node_id: this.config.nodes[0].id
    };

    await this.eventualSync.write(
      'inventory',
      `${sku}-${locationId}`,
      inventoryUpdate,
      'eventual'
    );
  }

  async transferStock(
    sku: string,
    fromLocation: string,
    toLocation: string,
    quantity: number,
    userId: string
  ): Promise<void> {
    const movementId = this.generateMovementId();
    const timestamp = Date.now();

    // Create transfer movement
    const movement: StockMovement = {
      id: movementId,
      type: 'transfer',
      sku,
      fromLocation,
      toLocation,
      quantity,
      userId,
      timestamp
    };

    // For transfers, we need stronger consistency
    await this.eventualSync.write(
      'stock_movements',
      movementId,
      movement,
      'causal' // Ensure causal consistency for transfers
    );

    // Update both locations atomically
    await Promise.all([
      this.updateInventoryWithConflictResolution(sku, fromLocation, -quantity),
      this.updateInventoryWithConflictResolution(sku, toLocation, quantity)
    ]);
  }

  async reserveStock(
    sku: string,
    locationId: string,
    quantity: number,
    orderId: string
  ): Promise<boolean> {
    try {
      // Check availability first
      const available = await this.checkAvailability(sku, locationId);
      
      if (available < quantity) {
        return false;
      }

      // Reserve stock
      const result = await this.client.execute(`
        UPDATE inventory
        SET reserved = reserved + ?
        WHERE sku = ? 
          AND location_id = ?
          AND available >= ?
      `, [quantity, sku, locationId, quantity]);

      if (result.rowsAffected === 0) {
        return false;
      }

      // Record reservation
      await this.client.execute(`
        INSERT INTO stock_movements (
          id, movement_type, sku, to_location, quantity,
          reason, user_id, timestamp
        ) VALUES (?, 'sale', ?, ?, ?, ?, 'system', ?)
      `, [
        this.generateMovementId(),
        sku,
        locationId,
        -quantity,
        `Order: ${orderId}`,
        Date.now()
      ]);

      return true;

    } catch (error) {
      console.error('Reserve stock error:', error);
      return false;
    }
  }

  async checkAvailability(
    sku: string,
    locationId?: string
  ): Promise<number> {
    if (locationId) {
      // Check specific location
      const result = await this.client.execute(`
        SELECT available FROM inventory
        WHERE sku = ? AND location_id = ?
      `, [sku, locationId]);

      return result.rows[0]?.available as number || 0;
    } else {
      // Check total availability across all locations
      const result = await this.client.execute(`
        SELECT SUM(available) as total FROM inventory
        WHERE sku = ?
      `, [sku]);

      return result.rows[0]?.total as number || 0;
    }
  }

  async getStockLevels(sku: string): Promise<InventoryItem[]> {
    const result = await this.client.execute(`
      SELECT * FROM inventory
      WHERE sku = ?
      ORDER BY location_id
    `, [sku]);

    return result.rows.map(row => ({
      sku: row.sku as string,
      locationId: row.location_id as string,
      quantity: row.quantity as number,
      reserved: row.reserved as number,
      available: row.available as number,
      lastUpdated: row.last_updated as number,
      version: row.version as number
    }));
  }

  async getMovementHistory(
    sku: string,
    options?: {
      locationId?: string;
      startDate?: number;
      endDate?: number;
      limit?: number;
    }
  ): Promise<StockMovement[]> {
    let query = `
      SELECT * FROM stock_movements
      WHERE sku = ?
    `;
    const params: any[] = [sku];

    if (options?.locationId) {
      query += ' AND (from_location = ? OR to_location = ?)';
      params.push(options.locationId, options.locationId);
    }

    if (options?.startDate) {
      query += ' AND timestamp >= ?';
      params.push(options.startDate);
    }

    if (options?.endDate) {
      query += ' AND timestamp <= ?';
      params.push(options.endDate);
    }

    query += ' ORDER BY timestamp DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const result = await this.client.execute(query, params);

    return result.rows.map(row => ({
      id: row.id as string,
      type: row.movement_type as any,
      sku: row.sku as string,
      fromLocation: row.from_location as string,
      toLocation: row.to_location as string,
      quantity: row.quantity as number,
      reason: row.reason as string,
      userId: row.user_id as string,
      timestamp: row.timestamp as number
    }));
  }

  async getActiveAlerts(locationId?: string): Promise<InventoryAlert[]> {
    let query = `
      SELECT * FROM inventory_alerts
      WHERE resolved = FALSE
    `;
    const params: any[] = [];

    if (locationId) {
      query += ' AND location_id = ?';
      params.push(locationId);
    }

    query += ' ORDER BY timestamp DESC';

    const result = await this.client.execute(query, params);

    return result.rows.map(row => ({
      id: row.id as string,
      sku: row.sku as string,
      locationId: row.location_id as string,
      alertType: row.alert_type as any,
      threshold: row.threshold as number,
      currentLevel: row.current_level as number,
      timestamp: row.timestamp as number
    }));
  }

  async resolveAlert(alertId: string): Promise<void> {
    await this.client.execute(`
      UPDATE inventory_alerts
      SET resolved = TRUE
      WHERE id = ?
    `, [alertId]);
  }

  async generateStockReport(locationId?: string): Promise<any> {
    const inventory = await this.client.execute(
      locationId
        ? 'SELECT * FROM inventory WHERE location_id = ?'
        : 'SELECT * FROM inventory',
      locationId ? [locationId] : []
    );

    const movements = await this.client.execute(`
      SELECT 
        movement_type,
        COUNT(*) as count,
        SUM(ABS(quantity)) as total_quantity
      FROM stock_movements
      WHERE timestamp > ?
      ${locationId ? 'AND (from_location = ? OR to_location = ?)' : ''}
      GROUP BY movement_type
    `, locationId 
      ? [Date.now() - 86400000, locationId, locationId]
      : [Date.now() - 86400000]
    );

    const alerts = await this.getActiveAlerts(locationId);

    return {
      timestamp: new Date(),
      location: locationId || 'all',
      summary: {
        totalSkus: inventory.rows.length,
        totalQuantity: inventory.rows.reduce((sum, row) => 
          sum + (row.quantity as number), 0
        ),
        totalReserved: inventory.rows.reduce((sum, row) => 
          sum + (row.reserved as number), 0
        ),
        totalAvailable: inventory.rows.reduce((sum, row) => 
          sum + (row.available as number), 0
        )
      },
      movements: movements.rows,
      activeAlerts: alerts.length,
      alerts: alerts
    };
  }

  private generateMovementId(): string {
    return `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async logSyncConflict(
    sku: string,
    locationId: string,
    adjustment: number
  ): Promise<void> {
    await this.client.execute(`
      INSERT INTO inventory_alerts (
        id, sku, location_id, alert_type, 
        current_level, timestamp
      ) VALUES (?, ?, ?, 'sync_conflict', ?, ?)
    `, [
      this.generateMovementId(),
      sku,
      locationId,
      adjustment,
      Date.now()
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    if (this.masterSlaveSync) {
      await this.masterSlaveSync.stopReplication();
    }
  }
}