# Agent Coordination Patterns

## How Agents Work Together

This document details the coordination mechanisms that enable multiple agents to work together efficiently in a swarm topology.

## Coordination Architecture

### Hierarchical Topology
```
                    🎯 Orchestrator
                    /      |      \
                   /       |       \
           Coordinator  Coordinator  Coordinator
             /    \      /    \      /    \
         Agent  Agent Agent  Agent Agent  Agent
```

### Key Components

1. **Orchestrator**: Central coordination point
2. **Coordinators**: Domain-specific leaders
3. **Worker Agents**: Specialized executors
4. **Memory System**: Shared state management
5. **Hook System**: Event-based synchronization

## Communication Patterns

### 1. Memory-Based Coordination

```javascript
// Agent 1 stores decision
mcp__claude-flow__memory_usage {
  action: "store",
  key: "swarm/auth/design-decision",
  value: {
    decision: "Use JWT with refresh tokens",
    rationale: "Industry standard, stateless",
    dependencies: ["jsonwebtoken", "express-jwt"],
    interfaces: { ... }
  }
}

// Agent 2 retrieves and builds upon it
mcp__claude-flow__memory_usage {
  action: "retrieve",
  key: "swarm/auth/design-decision"
}
// Then implements based on the decision
```

### 2. Hook-Based Synchronization

```bash
# Pre-Task Hook - Load context
npx claude-flow@alpha hooks pre-task \
  --description "Implement auth endpoints" \
  --load-memory true

# Post-Edit Hook - Share progress
npx claude-flow@alpha hooks post-edit \
  --file "src/auth/controller.js" \
  --memory-key "swarm/auth/implementation"

# Notification Hook - Broadcast decisions
npx claude-flow@alpha hooks notify \
  --message "Auth implementation complete, JWT configured" \
  --broadcast true
```

### 3. Event-Driven Coordination

```javascript
// Real Example from Session
[Agent: Researcher]
1. Research PRP framework
2. Store findings in memory
3. Notify: "Research complete"

[Agent: Architect] (triggered by notification)
1. Retrieve research findings
2. Design system architecture
3. Store design in memory
4. Notify: "Architecture ready"

[Agents: Coders 1,2,3] (triggered simultaneously)
1. Retrieve architecture
2. Implement assigned components
3. Store progress continuously
4. Notify on completion
```

## Real Coordination Examples

### Example 1: Authentication System Development

```javascript
// Orchestrator initializes swarm
mcp__claude-flow__swarm_init {
  topology: "hierarchical",
  maxAgents: 6,
  strategy: "specialized"
}

// Spawn specialized agents
[Parallel Spawn]:
  - Agent: "Security Researcher" → Research auth best practices
  - Agent: "System Architect" → Design auth architecture
  - Agent: "Backend Coder" → Implement auth endpoints
  - Agent: "Frontend Coder" → Build auth UI
  - Agent: "Tester" → Create auth test suite
  - Agent: "Documenter" → Write auth documentation

// Coordination Flow:
1. Researcher stores best practices
2. Architect reads research, creates design
3. Coders read design, implement in parallel
4. Tester validates implementation
5. Documenter captures everything
```

### Example 2: Complex API Development

```
Phase 1: Discovery (Parallel)
├─ Agent 1: Research API patterns
├─ Agent 2: Analyze requirements
└─ Agent 3: Evaluate technologies

↓ Memory Sync Point ↓

Phase 2: Design (Parallel)
├─ Agent 4: Design data models
├─ Agent 5: Design API endpoints
└─ Agent 6: Design error handling

↓ Memory Sync Point ↓

Phase 3: Implementation (Parallel)
├─ Agent 7: Implement models
├─ Agent 8: Implement endpoints
├─ Agent 9: Implement middleware
└─ Agent 10: Implement tests
```

## Memory Coordination Patterns

### 1. Checkpoint Pattern
```javascript
// Each agent creates checkpoints
memory.store("checkpoint/agent1/phase1", { status: "complete", output: data })
memory.store("checkpoint/agent2/phase1", { status: "complete", output: data })

// Coordinator waits for all checkpoints
const ready = checkAllAgentsComplete("phase1")
if (ready) triggerPhase2()
```

### 2. Dependency Chain Pattern
```javascript
// Agent defines what it needs
const dependencies = [
  "swarm/research/api-patterns",
  "swarm/design/data-models"
]

// Wait for dependencies
const deps = await waitForDependencies(dependencies)

// Proceed with work
implementFeature(deps)
```

### 3. Broadcast Pattern
```javascript
// Critical decision broadcast
notify({
  type: "decision",
  scope: "global",
  message: "Switching to GraphQL",
  impact: ["api", "frontend", "tests"]
})

// All affected agents receive notification
```

## Coordination Protocols

### 1. Start Protocol
```bash
1. Pre-task hook → Load context
2. Check dependencies → Ensure prerequisites
3. Claim work item → Avoid duplication
4. Begin execution → Start actual work
```

### 2. Progress Protocol
```bash
1. Complete subtask → Finish work unit
2. Update memory → Store progress
3. Post-edit hook → Notify completion
4. Check messages → See if help needed
```

### 3. Completion Protocol
```bash
1. Final validation → Ensure quality
2. Store results → Save in memory
3. Update todos → Mark complete
4. Notify swarm → Broadcast done
```

## Conflict Resolution

### 1. Resource Conflicts
```javascript
// Optimistic locking in memory
const lock = acquireLock("resource/database-schema")
if (lock) {
  // Make changes
  updateSchema()
  releaseLock(lock)
} else {
  // Wait or work on something else
  workOnAlternativeTask()
}
```

### 2. Decision Conflicts
```javascript
// Consensus mechanism
const proposals = [
  { agent: "architect", choice: "REST" },
  { agent: "researcher", choice: "GraphQL" },
  { agent: "lead", choice: "GraphQL" }
]

const decision = resolveByPriority(proposals)
// Or: resolveByVoting(proposals)
// Or: resolveByOrchestrator(proposals)
```

## Performance Optimizations

### 1. Batch Memory Operations
```javascript
// Instead of multiple calls
memory.store(key1, value1)
memory.store(key2, value2)
memory.store(key3, value3)

// Use batch operation
memory.batchStore([
  { key: key1, value: value1 },
  { key: key2, value: value2 },
  { key: key3, value: value3 }
])
```

### 2. Intelligent Work Distribution
```javascript
// Analyze agent capabilities and workload
const workDistribution = {
  "heavy-computation": ["agent1", "agent2"], // More powerful
  "io-intensive": ["agent3", "agent4"],      // Optimized for I/O
  "creative-tasks": ["agent5", "agent6"]     // Specialized
}
```

### 3. Predictive Coordination
```javascript
// Anticipate next steps
if (currentPhase === "implementation") {
  // Pre-warm test environment
  prepareTestEnvironment()
  // Pre-load test data
  generateTestData()
}
```

## Best Practices

1. **Always use memory for coordination** - Never rely on implicit communication
2. **Batch operations** - Group related actions together
3. **Handle failures gracefully** - Assume agents can fail
4. **Document decisions** - Store rationale with choices
5. **Monitor coordination overhead** - Keep it under 5% of total time

## Metrics from Real Session

- **Memory Operations**: 150+ coordination points
- **Average Sync Time**: 230ms
- **Coordination Overhead**: 3.2% of total time
- **Conflict Rate**: 0.8% (12 conflicts in 1500 operations)
- **Success Rate**: 100% task completion

---

**Next**: [Performance Gains Analysis →](./performance-gains.md)