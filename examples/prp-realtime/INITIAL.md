# PRP Real-Time WebSocket System Example

## Overview
This example demonstrates how to use the PRP (Prompt-Resource-Presentation) framework to build production-ready real-time systems using WebSockets. We'll create a collaborative document editing system with room-based architecture, conflict resolution, and scalability patterns.

## The 3-Step Process

### Step 1: Define Your Context (This File)
This INITIAL.md file contains the high-level requirements and context for our real-time system.

### Step 2: Generate the PRP
Run the command to create a detailed PRP document:
```bash
/.claude/commands/generate-realtime-prp
```

### Step 3: Execute Implementation
Use the generated PRP to build the system:
```bash
/.claude/commands/execute-realtime-prp
```

## System Requirements

### Core Features
- **WebSocket Server**: Handle thousands of concurrent connections
- **Room Management**: Create/join/leave collaborative spaces
- **Event Broadcasting**: Real-time message distribution
- **Presence System**: Track active users in each room
- **Conflict Resolution**: Handle concurrent edits gracefully
- **Reconnection Logic**: Seamless recovery from network issues

### Technical Stack
- **Server**: Node.js with TypeScript
- **WebSocket Library**: ws or Socket.io
- **State Management**: In-memory with Redis for scaling
- **Protocol**: JSON-based message format
- **Authentication**: JWT tokens for secure connections

### Scalability Requirements
- Support 10,000+ concurrent connections
- Horizontal scaling with Redis pub/sub
- Load balancing with sticky sessions
- Graceful shutdown and failover

### Example Use Case: Collaborative Document Editor
```typescript
// User A types in document
{
  type: 'document.update',
  room: 'doc-123',
  data: {
    operation: 'insert',
    position: 42,
    text: 'Hello World',
    version: 5
  }
}

// Broadcast to all users in room
// Handle conflicts with operational transformation
// Update document state
```

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client A  │     │   Client B  │     │   Client C  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                    ┌──────▼──────┐
                    │  WebSocket  │
                    │   Server    │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
      ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐
      │   Room    │  │  Event  │  │   Sync    │
      │  Manager  │  │ Handler │  │  Engine   │
      └───────────┘  └─────────┘  └───────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │  (Scaling)  │
                    └─────────────┘
```

## Expected Outcomes

After running the PRP process, you'll have:
1. A detailed technical specification for the WebSocket system
2. Complete implementation with modular architecture
3. Client libraries for easy integration
4. Testing strategies and performance benchmarks
5. Deployment guide with scaling considerations

## Next Steps

1. Review this initial context
2. Run `/.claude/commands/generate-realtime-prp` to create the detailed PRP
3. Execute the implementation with `/.claude/commands/execute-realtime-prp`
4. Test with the provided client examples
5. Scale horizontally as needed

Remember: The PRP framework ensures we think through all aspects before coding, resulting in a more robust and maintainable real-time system.