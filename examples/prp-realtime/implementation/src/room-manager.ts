import { EventEmitter } from 'events';

export interface Room {
  id: string;
  members: Set<string>;
  state: Map<string, any>;
  metadata: RoomMetadata;
  createdAt: number;
  lastActivity: number;
}

export interface RoomMetadata {
  name?: string;
  maxMembers?: number;
  isPrivate?: boolean;
  owner?: string;
  tags?: string[];
}

export class RoomManager extends EventEmitter {
  private rooms: Map<string, Room> = new Map();
  private memberRooms: Map<string, Set<string>> = new Map();
  private roomTimers: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(private config: RoomManagerConfig = {}) {
    super();
    this.config = {
      maxRoomsPerMember: 10,
      roomTimeout: 3600000, // 1 hour
      maxMembersPerRoom: 100,
      ...config
    };
  }

  async createRoom(roomId: string, metadata: RoomMetadata = {}): Promise<Room> {
    if (this.rooms.has(roomId)) {
      throw new Error(`Room ${roomId} already exists`);
    }

    const room: Room = {
      id: roomId,
      members: new Set(),
      state: new Map(),
      metadata: {
        maxMembers: this.config.maxMembersPerRoom,
        ...metadata
      },
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.rooms.set(roomId, room);
    this.emit('room.created', room);
    
    // Set auto-cleanup timer
    this.resetRoomTimer(roomId);
    
    return room;
  }

  async addToRoom(roomId: string, connectionId: string): Promise<void> {
    // Get or create room
    let room = this.rooms.get(roomId);
    if (!room) {
      room = await this.createRoom(roomId);
    }

    // Check member limit
    if (room.metadata.maxMembers && room.members.size >= room.metadata.maxMembers) {
      throw new Error(`Room ${roomId} is full`);
    }

    // Check member's room limit
    const memberRooms = this.memberRooms.get(connectionId) || new Set();
    if (memberRooms.size >= this.config.maxRoomsPerMember!) {
      throw new Error(`Member ${connectionId} has reached room limit`);
    }

    // Add member to room
    room.members.add(connectionId);
    room.lastActivity = Date.now();

    // Track member's rooms
    memberRooms.add(roomId);
    this.memberRooms.set(connectionId, memberRooms);

    // Reset cleanup timer
    this.resetRoomTimer(roomId);

    this.emit('member.joined', { roomId, connectionId, room });
  }

  async removeFromRoom(roomId: string, connectionId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Remove member
    room.members.delete(connectionId);
    room.lastActivity = Date.now();

    // Update member's room list
    const memberRooms = this.memberRooms.get(connectionId);
    if (memberRooms) {
      memberRooms.delete(roomId);
      if (memberRooms.size === 0) {
        this.memberRooms.delete(connectionId);
      }
    }

    this.emit('member.left', { roomId, connectionId, room });

    // Check if room should be destroyed
    if (room.members.size === 0) {
      await this.destroyRoom(roomId);
    }
  }

  async destroyRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Clear timer
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(roomId);
    }

    // Remove all members
    for (const connectionId of room.members) {
      const memberRooms = this.memberRooms.get(connectionId);
      if (memberRooms) {
        memberRooms.delete(roomId);
      }
    }

    // Delete room
    this.rooms.delete(roomId);
    this.emit('room.destroyed', room);
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomMembers(roomId: string): string[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.members) : [];
  }

  getMemberRooms(connectionId: string): string[] {
    const rooms = this.memberRooms.get(connectionId);
    return rooms ? Array.from(rooms) : [];
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getTotalMembers(): number {
    return this.memberRooms.size;
  }

  // Room state management
  async updateRoomState(roomId: string, key: string, value: any): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.state.set(key, value);
    room.lastActivity = Date.now();
    
    this.emit('room.state.updated', { roomId, key, value });
  }

  getRoomState(roomId: string, key?: string): any {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    if (key) {
      return room.state.get(key);
    }
    
    // Return entire state as object
    const state: Record<string, any> = {};
    for (const [k, v] of room.state) {
      state[k] = v;
    }
    return state;
  }

  // Room metadata management
  async updateRoomMetadata(roomId: string, metadata: Partial<RoomMetadata>): Promise<void> {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }

    room.metadata = { ...room.metadata, ...metadata };
    room.lastActivity = Date.now();
    
    this.emit('room.metadata.updated', { roomId, metadata });
  }

  // Search and filtering
  findRooms(filter: RoomFilter): Room[] {
    const results: Room[] = [];
    
    for (const room of this.rooms.values()) {
      if (filter.isPrivate !== undefined && room.metadata.isPrivate !== filter.isPrivate) {
        continue;
      }
      
      if (filter.owner && room.metadata.owner !== filter.owner) {
        continue;
      }
      
      if (filter.tags && filter.tags.length > 0) {
        const roomTags = room.metadata.tags || [];
        const hasAllTags = filter.tags.every(tag => roomTags.includes(tag));
        if (!hasAllTags) continue;
      }
      
      if (filter.minMembers && room.members.size < filter.minMembers) {
        continue;
      }
      
      if (filter.maxMembers && room.members.size > filter.maxMembers) {
        continue;
      }
      
      results.push(room);
    }
    
    return results;
  }

  // Cleanup and maintenance
  private resetRoomTimer(roomId: string): void {
    // Clear existing timer
    const existingTimer = this.roomTimers.get(roomId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      const room = this.rooms.get(roomId);
      if (room && room.members.size === 0) {
        this.destroyRoom(roomId);
      }
    }, this.config.roomTimeout!);

    this.roomTimers.set(roomId, timer);
  }

  async cleanup(): Promise<void> {
    // Clear all timers
    for (const timer of this.roomTimers.values()) {
      clearTimeout(timer);
    }
    this.roomTimers.clear();

    // Destroy empty rooms
    const emptyRooms = Array.from(this.rooms.values())
      .filter(room => room.members.size === 0)
      .map(room => room.id);

    for (const roomId of emptyRooms) {
      await this.destroyRoom(roomId);
    }
  }

  // Analytics and monitoring
  getAnalytics(): RoomAnalytics {
    const rooms = Array.from(this.rooms.values());
    
    return {
      totalRooms: rooms.length,
      totalMembers: this.memberRooms.size,
      averageMembersPerRoom: rooms.length > 0 
        ? rooms.reduce((sum, room) => sum + room.members.size, 0) / rooms.length 
        : 0,
      emptyRooms: rooms.filter(r => r.members.size === 0).length,
      fullRooms: rooms.filter(r => 
        r.metadata.maxMembers && r.members.size >= r.metadata.maxMembers
      ).length,
      oldestRoom: rooms.reduce((oldest, room) => 
        !oldest || room.createdAt < oldest.createdAt ? room : oldest, 
        null as Room | null
      ),
      mostActiveRoom: rooms.reduce((mostActive, room) => 
        !mostActive || room.members.size > mostActive.members.size ? room : mostActive,
        null as Room | null
      )
    };
  }
}

// Types
export interface RoomManagerConfig {
  maxRoomsPerMember?: number;
  roomTimeout?: number;
  maxMembersPerRoom?: number;
}

export interface RoomFilter {
  isPrivate?: boolean;
  owner?: string;
  tags?: string[];
  minMembers?: number;
  maxMembers?: number;
}

export interface RoomAnalytics {
  totalRooms: number;
  totalMembers: number;
  averageMembersPerRoom: number;
  emptyRooms: number;
  fullRooms: number;
  oldestRoom: Room | null;
  mostActiveRoom: Room | null;
}