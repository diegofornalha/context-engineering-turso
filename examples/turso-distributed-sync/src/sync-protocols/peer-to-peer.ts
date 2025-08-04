import { createClient, Client } from '@libsql/client';
import { EventEmitter } from 'events';
import WebSocket from 'ws';

export interface PeerConfig {
  nodeId: string;
  url: string;
  authToken?: string;
  wsPort?: number;
}

export interface P2PSyncConfig {
  localNode: PeerConfig;
  peers: PeerConfig[];
  gossipInterval?: number;
  syncBatchSize?: number;
}

interface VectorClock {
  [nodeId: string]: number;
}

interface GossipMessage {
  type: 'sync' | 'heartbeat' | 'vector-clock' | 'data';
  nodeId: string;
  vectorClock: VectorClock;
  data?: any;
  timestamp: number;
}

export class PeerToPeerSync extends EventEmitter {
  private client: Client;
  private peerClients: Map<string, Client> = new Map();
  private vectorClock: VectorClock = {};
  private wsServer?: WebSocket.Server;
  private peerConnections: Map<string, WebSocket> = new Map();
  private gossipInterval?: NodeJS.Timer;

  constructor(private config: P2PSyncConfig) {
    super();
    this.vectorClock[config.localNode.nodeId] = 0;
    this.initializeConnections();
  }

  private async initializeConnections() {
    // Initialize local client
    this.client = createClient({
      url: this.config.localNode.url,
      authToken: this.config.localNode.authToken
    });

    // Initialize peer clients
    for (const peer of this.config.peers) {
      const peerClient = createClient({
        url: peer.url,
        authToken: peer.authToken
      });
      this.peerClients.set(peer.nodeId, peerClient);
      
      // Initialize vector clock entry for peer
      this.vectorClock[peer.nodeId] = 0;
    }

    await this.setupP2PInfrastructure();
    await this.startWebSocketServer();
    await this.connectToPeers();
  }

  private async setupP2PInfrastructure() {
    // Create P2P sync tables
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS p2p_events (
        id TEXT PRIMARY KEY,
        node_id TEXT NOT NULL,
        vector_clock TEXT NOT NULL,
        event_type TEXT NOT NULL,
        table_name TEXT,
        data TEXT,
        timestamp INTEGER NOT NULL,
        synced_with TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS p2p_vector_clocks (
        node_id TEXT PRIMARY KEY,
        clock_value INTEGER NOT NULL,
        last_updated INTEGER NOT NULL
      )
    `);

    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS p2p_peer_status (
        peer_id TEXT PRIMARY KEY,
        last_seen INTEGER NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        vector_clock TEXT,
        sync_status TEXT
      )
    `);
  }

  private async startWebSocketServer() {
    const port = this.config.localNode.wsPort || 8000 + parseInt(this.config.localNode.nodeId.slice(-4), 16);
    
    this.wsServer = new WebSocket.Server({ port });
    
    this.wsServer.on('connection', (ws, req) => {
      const peerId = req.url?.slice(1); // Extract peer ID from URL
      if (!peerId) return;

      this.handlePeerConnection(peerId, ws);
    });

    this.emit('server:started', { port });
  }

  private async connectToPeers() {
    for (const peer of this.config.peers) {
      const wsUrl = `ws://localhost:${peer.wsPort || 8000 + parseInt(peer.nodeId.slice(-4), 16)}/${this.config.localNode.nodeId}`;
      
      try {
        const ws = new WebSocket(wsUrl);
        
        ws.on('open', () => {
          this.peerConnections.set(peer.nodeId, ws);
          this.emit('peer:connected', { peerId: peer.nodeId });
          
          // Send initial vector clock
          this.sendMessage(peer.nodeId, {
            type: 'vector-clock',
            nodeId: this.config.localNode.nodeId,
            vectorClock: this.vectorClock,
            timestamp: Date.now()
          });
        });

        ws.on('message', (data) => {
          const message = JSON.parse(data.toString()) as GossipMessage;
          this.handleGossipMessage(peer.nodeId, message);
        });

        ws.on('close', () => {
          this.peerConnections.delete(peer.nodeId);
          this.emit('peer:disconnected', { peerId: peer.nodeId });
          
          // Attempt reconnection after delay
          setTimeout(() => this.connectToPeers(), 5000);
        });

      } catch (error) {
        this.emit('peer:error', { peerId: peer.nodeId, error });
      }
    }
  }

  private handlePeerConnection(peerId: string, ws: WebSocket) {
    this.peerConnections.set(peerId, ws);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as GossipMessage;
      this.handleGossipMessage(peerId, message);
    });

    ws.on('close', () => {
      this.peerConnections.delete(peerId);
    });
  }

  private async handleGossipMessage(peerId: string, message: GossipMessage) {
    switch (message.type) {
      case 'vector-clock':
        await this.mergeVectorClocks(message.vectorClock);
        break;
      
      case 'sync':
        await this.handleSyncRequest(peerId, message);
        break;
      
      case 'data':
        await this.handleDataSync(peerId, message);
        break;
      
      case 'heartbeat':
        await this.updatePeerStatus(peerId, message);
        break;
    }
  }

  async startGossip() {
    // Start gossip protocol
    this.gossipInterval = setInterval(
      () => this.performGossipRound(),
      this.config.gossipInterval || 5000
    );

    this.emit('gossip:started');
  }

  async stopGossip() {
    if (this.gossipInterval) {
      clearInterval(this.gossipInterval);
    }

    // Close all connections
    for (const [_, ws] of this.peerConnections) {
      ws.close();
    }

    if (this.wsServer) {
      this.wsServer.close();
    }

    this.emit('gossip:stopped');
  }

  private async performGossipRound() {
    // Select random peers for gossip
    const peers = Array.from(this.peerConnections.keys());
    const selectedPeers = this.selectGossipPeers(peers);

    for (const peerId of selectedPeers) {
      await this.syncWithPeer(peerId);
    }

    // Send heartbeat to all peers
    this.broadcastMessage({
      type: 'heartbeat',
      nodeId: this.config.localNode.nodeId,
      vectorClock: this.vectorClock,
      timestamp: Date.now()
    });
  }

  private selectGossipPeers(peers: string[]): string[] {
    // Select sqrt(n) random peers for efficient gossip
    const count = Math.ceil(Math.sqrt(peers.length));
    const shuffled = peers.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private async syncWithPeer(peerId: string) {
    try {
      // Get events that peer might not have
      const peerClock = await this.getPeerVectorClock(peerId);
      const missingEvents = await this.getMissingEvents(peerClock);

      if (missingEvents.length > 0) {
        // Send missing events to peer
        for (const event of missingEvents) {
          this.sendMessage(peerId, {
            type: 'data',
            nodeId: this.config.localNode.nodeId,
            vectorClock: this.vectorClock,
            data: event,
            timestamp: Date.now()
          });
        }
      }

      // Request sync from peer
      this.sendMessage(peerId, {
        type: 'sync',
        nodeId: this.config.localNode.nodeId,
        vectorClock: this.vectorClock,
        timestamp: Date.now()
      });

    } catch (error) {
      this.emit('sync:error', { peerId, error });
    }
  }

  private async getMissingEvents(peerClock: VectorClock): Promise<any[]> {
    const conditions = [];
    
    for (const [nodeId, clockValue] of Object.entries(this.vectorClock)) {
      const peerValue = peerClock[nodeId] || 0;
      if (clockValue > peerValue) {
        conditions.push(`(node_id = '${nodeId}' AND CAST(json_extract(vector_clock, '$.${nodeId}') AS INTEGER) > ${peerValue})`);
      }
    }

    if (conditions.length === 0) return [];

    const result = await this.client.execute(`
      SELECT * FROM p2p_events
      WHERE ${conditions.join(' OR ')}
      ORDER BY timestamp ASC
      LIMIT ?
    `, [this.config.syncBatchSize || 100]);

    return result.rows;
  }

  private async handleSyncRequest(peerId: string, message: GossipMessage) {
    // Send our missing events to the peer
    const missingEvents = await this.getMissingEvents(message.vectorClock);
    
    for (const event of missingEvents) {
      this.sendMessage(peerId, {
        type: 'data',
        nodeId: this.config.localNode.nodeId,
        vectorClock: this.vectorClock,
        data: event,
        timestamp: Date.now()
      });
    }
  }

  private async handleDataSync(peerId: string, message: GossipMessage) {
    const event = message.data;
    
    // Check if we already have this event
    const existing = await this.client.execute(
      'SELECT id FROM p2p_events WHERE id = ?',
      [event.id]
    );

    if (existing.rows.length > 0) return;

    // Apply the event
    await this.applyEvent(event);
    
    // Update vector clocks
    await this.mergeVectorClocks(JSON.parse(event.vector_clock));
    
    // Mark as synced with this peer
    const syncedWith = JSON.parse(event.synced_with || '[]');
    if (!syncedWith.includes(this.config.localNode.nodeId)) {
      syncedWith.push(this.config.localNode.nodeId);
      
      await this.client.execute(
        'UPDATE p2p_events SET synced_with = ? WHERE id = ?',
        [JSON.stringify(syncedWith), event.id]
      );
    }

    this.emit('event:synced', { eventId: event.id, fromPeer: peerId });
  }

  private async applyEvent(event: any) {
    try {
      const data = JSON.parse(event.data);
      
      switch (event.event_type) {
        case 'insert':
          await this.applyInsert(event.table_name, data);
          break;
        case 'update':
          await this.applyUpdate(event.table_name, data);
          break;
        case 'delete':
          await this.applyDelete(event.table_name, data);
          break;
      }
    } catch (error) {
      this.emit('apply:error', { event, error });
    }
  }

  private async applyInsert(table: string, data: any) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    await this.client.execute(
      `INSERT OR IGNORE INTO ${table} (${columns}) VALUES (${placeholders})`,
      values
    );
  }

  private async applyUpdate(table: string, data: any) {
    const { id, ...updates } = data;
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [...Object.values(updates), id];

    await this.client.execute(
      `UPDATE ${table} SET ${setClause} WHERE id = ?`,
      values
    );
  }

  private async applyDelete(table: string, data: any) {
    await this.client.execute(
      `DELETE FROM ${table} WHERE id = ?`,
      [data.id]
    );
  }

  private async mergeVectorClocks(peerClock: VectorClock) {
    let updated = false;
    
    for (const [nodeId, value] of Object.entries(peerClock)) {
      if (!this.vectorClock[nodeId] || this.vectorClock[nodeId] < value) {
        this.vectorClock[nodeId] = value;
        updated = true;
      }
    }

    if (updated) {
      await this.persistVectorClock();
    }
  }

  private async persistVectorClock() {
    const batch = this.client.batch();
    
    for (const [nodeId, value] of Object.entries(this.vectorClock)) {
      batch.push(`
        INSERT OR REPLACE INTO p2p_vector_clocks (node_id, clock_value, last_updated)
        VALUES ('${nodeId}', ${value}, ${Date.now()})
      `);
    }

    await batch.execute();
  }

  private async getPeerVectorClock(peerId: string): Promise<VectorClock> {
    const result = await this.client.execute(
      'SELECT vector_clock FROM p2p_peer_status WHERE peer_id = ?',
      [peerId]
    );

    if (result.rows.length > 0 && result.rows[0].vector_clock) {
      return JSON.parse(result.rows[0].vector_clock as string);
    }

    return {};
  }

  private async updatePeerStatus(peerId: string, message: GossipMessage) {
    await this.client.execute(`
      INSERT OR REPLACE INTO p2p_peer_status (peer_id, last_seen, is_active, vector_clock, sync_status)
      VALUES (?, ?, ?, ?, ?)
    `, [
      peerId,
      Date.now(),
      true,
      JSON.stringify(message.vectorClock),
      'active'
    ]);
  }

  private sendMessage(peerId: string, message: GossipMessage) {
    const ws = this.peerConnections.get(peerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcastMessage(message: GossipMessage) {
    for (const [peerId, ws] of this.peerConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    }
  }

  // Public API for application use
  async recordEvent(eventType: string, table: string, data: any): Promise<void> {
    // Increment our vector clock
    this.vectorClock[this.config.localNode.nodeId]++;
    
    const eventId = `${this.config.localNode.nodeId}-${this.vectorClock[this.config.localNode.nodeId]}-${Date.now()}`;
    
    await this.client.execute(`
      INSERT INTO p2p_events (id, node_id, vector_clock, event_type, table_name, data, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      eventId,
      this.config.localNode.nodeId,
      JSON.stringify(this.vectorClock),
      eventType,
      table,
      JSON.stringify(data),
      Date.now()
    ]);

    await this.persistVectorClock();
    
    // Immediately propagate to connected peers
    this.broadcastMessage({
      type: 'data',
      nodeId: this.config.localNode.nodeId,
      vectorClock: this.vectorClock,
      data: {
        id: eventId,
        node_id: this.config.localNode.nodeId,
        vector_clock: JSON.stringify(this.vectorClock),
        event_type: eventType,
        table_name: table,
        data: JSON.stringify(data),
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  }

  async getNetworkStatus(): Promise<any> {
    const peers = await this.client.execute('SELECT * FROM p2p_peer_status');
    const localEvents = await this.client.execute('SELECT COUNT(*) as count FROM p2p_events');
    
    return {
      nodeId: this.config.localNode.nodeId,
      vectorClock: this.vectorClock,
      connectedPeers: Array.from(this.peerConnections.keys()),
      peerStatus: peers.rows,
      totalEvents: localEvents.rows[0].count,
      isActive: true
    };
  }
}