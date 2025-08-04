# 📊 Diagramas de Arquitetura Detalhados

## 1. Visão de Componentes

```mermaid
graph TB
    subgraph "User Interface"
        CLI[CLI Tool]
        API[REST API]
        HOOKS[Hooks System]
    end
    
    subgraph "Orchestration Core"
        ROUTER[Request Router]
        CONTEXT[Context Manager]
        DECISION[Decision Engine]
        
        ROUTER --> CONTEXT
        CONTEXT --> DECISION
    end
    
    subgraph "Execution Engines"
        subgraph "PRP Module"
            PRP_RESEARCH[Research Engine]
            PRP_STRUCT[Structure Engine]
            PRP_GEN[Generator Engine]
        end
        
        subgraph "SPARC Module"
            SPARC_SPEC[Specification]
            SPARC_PSEUDO[Pseudocode]
            SPARC_ARCH[Architecture]
            SPARC_REF[Refinement]
            SPARC_COMP[Completion]
        end
        
        subgraph "Swarm Module"
            SWARM_TOPO[Topology Manager]
            SWARM_COORD[Coordinator]
            SWARM_EXEC[Parallel Executor]
        end
    end
    
    subgraph "Agent System"
        AGENT_LOADER[Agent Loader]
        LOCAL_AGENTS[Local Agents<br/>.claude/agents/]
        AGENT_RUNTIME[Agent Runtime]
        
        AGENT_LOADER --> LOCAL_AGENTS
        LOCAL_AGENTS --> AGENT_RUNTIME
    end
    
    subgraph "Core Services"
        MEMORY[Memory Service]
        TASK_QUEUE[Task Queue]
        MONITOR[Monitor Service]
        CACHE[Cache Layer]
    end
    
    subgraph "Storage"
        SQLITE[(Local SQLite)]
        TURSO[(Turso Cloud)]
        FS[File System]
    end
    
    %% Connections
    CLI --> ROUTER
    API --> ROUTER
    HOOKS --> ROUTER
    
    DECISION --> PRP_RESEARCH
    DECISION --> SPARC_SPEC
    DECISION --> SWARM_TOPO
    
    PRP_GEN --> MEMORY
    SPARC_COMP --> MEMORY
    SWARM_EXEC --> MEMORY
    
    AGENT_RUNTIME --> PRP_RESEARCH
    AGENT_RUNTIME --> SPARC_SPEC
    AGENT_RUNTIME --> SWARM_COORD
    
    MEMORY --> SQLITE
    MEMORY --> TURSO
    TASK_QUEUE --> FS
    
    MONITOR -.-> ROUTER
    MONITOR -.-> MEMORY
    MONITOR -.-> AGENT_RUNTIME
    
    style CLI fill:#f9f,stroke:#333,stroke-width:4px
    style ROUTER fill:#bbf,stroke:#333,stroke-width:4px
    style MEMORY fill:#bfb,stroke:#333,stroke-width:4px
    style LOCAL_AGENTS fill:#fbf,stroke:#333,stroke-width:4px
```

## 2. Fluxo de Decisão

```mermaid
flowchart TD
    START[User Request] --> ANALYZE[Analyze Request Type]
    
    ANALYZE --> CHECK_RESEARCH{Requires<br/>Research?}
    CHECK_RESEARCH -->|Yes| PRP[Use PRP Engine]
    CHECK_RESEARCH -->|No| CHECK_DEV{Requires<br/>Development?}
    
    CHECK_DEV -->|Yes| CHECK_TDD{TDD<br/>Approach?}
    CHECK_TDD -->|Yes| SPARC[Use SPARC Engine]
    CHECK_TDD -->|No| DIRECT[Direct Implementation]
    
    CHECK_DEV -->|No| CHECK_COORD{Requires<br/>Coordination?}
    CHECK_COORD -->|Yes| CHECK_COMPLEX{Complex<br/>Task?}
    CHECK_COMPLEX -->|Yes| SWARM[Use Swarm Engine]
    CHECK_COMPLEX -->|No| SIMPLE[Simple Execution]
    
    CHECK_COORD -->|No| BASIC[Basic Operation]
    
    PRP --> EXEC[Execute with Agents]
    SPARC --> EXEC
    SWARM --> EXEC
    DIRECT --> EXEC
    SIMPLE --> EXEC
    BASIC --> EXEC
    
    EXEC --> RESULT[Return Results]
    
    style START fill:#f96,stroke:#333,stroke-width:4px
    style PRP fill:#9f9,stroke:#333,stroke-width:4px
    style SPARC fill:#99f,stroke:#333,stroke-width:4px
    style SWARM fill:#f99,stroke:#333,stroke-width:4px
    style RESULT fill:#9ff,stroke:#333,stroke-width:4px
```

## 3. Agent Resolution Flow

```mermaid
flowchart LR
    REQUEST[Agent Request] --> CHECK_LOCAL{Local Agent<br/>Exists?}
    
    CHECK_LOCAL -->|Yes| LOAD_LOCAL[Load from<br/>.claude/agents/]
    CHECK_LOCAL -->|No| CHECK_FALLBACK{Fallback<br/>Available?}
    
    LOAD_LOCAL --> PARSE[Parse YAML<br/>Frontmatter]
    PARSE --> VALIDATE[Validate<br/>Capabilities]
    VALIDATE --> CREATE[Create Agent<br/>Instance]
    
    CHECK_FALLBACK -->|Yes| MOCK[Use Mock<br/>Agent]
    CHECK_FALLBACK -->|No| ERROR[Throw Error]
    
    MOCK --> CREATE
    CREATE --> RUNTIME[Agent Runtime<br/>Environment]
    
    RUNTIME --> HOOKS[Apply Hooks]
    HOOKS --> PRE[Pre-execution<br/>Hook]
    PRE --> EXECUTE[Execute Task]
    EXECUTE --> POST[Post-execution<br/>Hook]
    POST --> COMPLETE[Task Complete]
    
    style REQUEST fill:#faa,stroke:#333,stroke-width:2px
    style LOAD_LOCAL fill:#afa,stroke:#333,stroke-width:2px
    style CREATE fill:#aaf,stroke:#333,stroke-width:2px
    style COMPLETE fill:#aff,stroke:#333,stroke-width:2px
```

## 4. Memory System Architecture

```mermaid
graph TB
    subgraph "Memory Interface"
        STORE[Store API]
        RETRIEVE[Retrieve API]
        SEARCH[Search API]
        SYNC[Sync API]
    end
    
    subgraph "Memory Manager"
        ROUTER[Storage Router]
        CACHE[Cache Layer]
        SERIALIZER[Data Serializer]
        CONFLICT[Conflict Resolver]
    end
    
    subgraph "Storage Backends"
        subgraph "Local Storage"
            SQLITE_LOCAL[(SQLite<br/>Primary)]
            FS_CACHE[File Cache]
        end
        
        subgraph "Cloud Storage"
            TURSO_CLOUD[(Turso<br/>Sync)]
            S3_BACKUP[S3 Backup]
        end
    end
    
    subgraph "Sync Engine"
        SYNC_DETECT[Change Detection]
        SYNC_QUEUE[Sync Queue]
        SYNC_APPLY[Apply Changes]
    end
    
    STORE --> ROUTER
    RETRIEVE --> CACHE
    SEARCH --> ROUTER
    SYNC --> SYNC_DETECT
    
    ROUTER --> SERIALIZER
    SERIALIZER --> SQLITE_LOCAL
    SERIALIZER --> TURSO_CLOUD
    
    CACHE --> SQLITE_LOCAL
    CACHE --> FS_CACHE
    
    SYNC_DETECT --> SYNC_QUEUE
    SYNC_QUEUE --> SYNC_APPLY
    SYNC_APPLY --> TURSO_CLOUD
    SYNC_APPLY --> CONFLICT
    CONFLICT --> SQLITE_LOCAL
    
    TURSO_CLOUD -.-> S3_BACKUP
    
    style STORE fill:#f9f,stroke:#333,stroke-width:2px
    style CACHE fill:#9ff,stroke:#333,stroke-width:2px
    style SQLITE_LOCAL fill:#9f9,stroke:#333,stroke-width:2px
    style TURSO_CLOUD fill:#99f,stroke:#333,stroke-width:2px
```

## 5. Parallel Execution Pattern

```mermaid
sequenceDiagram
    participant User
    participant Orchestrator
    participant Queue
    participant Agent1
    participant Agent2
    participant Agent3
    participant Memory
    
    User->>Orchestrator: Submit Complex Task
    Orchestrator->>Orchestrator: Analyze & Decompose
    
    Orchestrator->>Queue: Enqueue Subtask 1
    Orchestrator->>Queue: Enqueue Subtask 2
    Orchestrator->>Queue: Enqueue Subtask 3
    
    par Parallel Execution
        Queue->>Agent1: Assign Subtask 1
        Agent1->>Agent1: Process
        Agent1->>Memory: Store Progress
        Agent1->>Queue: Complete
    and
        Queue->>Agent2: Assign Subtask 2
        Agent2->>Agent2: Process
        Agent2->>Memory: Store Progress
        Agent2->>Queue: Complete
    and
        Queue->>Agent3: Assign Subtask 3
        Agent3->>Agent3: Process
        Agent3->>Memory: Store Progress
        Agent3->>Queue: Complete
    end
    
    Queue->>Orchestrator: All Tasks Complete
    Orchestrator->>Memory: Aggregate Results
    Memory->>Orchestrator: Combined Output
    Orchestrator->>User: Return Final Result
```

## 6. Error Handling Flow

```mermaid
flowchart TD
    OPERATION[Operation] --> TRY{Try<br/>Execute}
    
    TRY -->|Success| SUCCESS[Return Result]
    TRY -->|Error| CATCH[Catch Error]
    
    CATCH --> ANALYZE{Error<br/>Type?}
    
    ANALYZE -->|Transient| RETRY{Retry<br/>Count?}
    RETRY -->|< 3| BACKOFF[Exponential<br/>Backoff]
    BACKOFF --> TRY
    RETRY -->|>= 3| LOG_FAIL[Log Failure]
    
    ANALYZE -->|Agent Error| FALLBACK{Fallback<br/>Available?}
    FALLBACK -->|Yes| USE_FALLBACK[Use Fallback<br/>Agent]
    USE_FALLBACK --> TRY
    FALLBACK -->|No| GRACEFUL[Graceful<br/>Degradation]
    
    ANALYZE -->|System Error| CRITICAL[Critical Error<br/>Handler]
    CRITICAL --> NOTIFY[Notify Admin]
    CRITICAL --> SAFE_MODE[Enter Safe Mode]
    
    LOG_FAIL --> ERROR_RESULT[Return Error]
    GRACEFUL --> ERROR_RESULT
    SAFE_MODE --> ERROR_RESULT
    
    style SUCCESS fill:#9f9,stroke:#333,stroke-width:2px
    style ERROR_RESULT fill:#f99,stroke:#333,stroke-width:2px
    style CRITICAL fill:#f66,stroke:#333,stroke-width:2px
```

## 7. Performance Optimization

```mermaid
graph LR
    subgraph "Request Pipeline"
        REQ[Request] --> VALIDATE[Validate]
        VALIDATE --> CACHE_CHECK{Cache<br/>Hit?}
        CACHE_CHECK -->|Yes| RETURN_CACHE[Return Cached]
        CACHE_CHECK -->|No| PROCESS[Process]
    end
    
    subgraph "Optimization Layer"
        BATCH[Batch Similar<br/>Requests]
        DEDUPE[Deduplicate<br/>Operations]
        COMPRESS[Compress<br/>Data]
        PARALLEL[Parallelize<br/>Execution]
    end
    
    subgraph "Execution"
        EXEC[Execute] --> MONITOR_PERF[Monitor<br/>Performance]
        MONITOR_PERF --> OPTIMIZE{Need<br/>Optimization?}
        OPTIMIZE -->|Yes| ADJUST[Adjust<br/>Parameters]
        OPTIMIZE -->|No| CONTINUE[Continue]
    end
    
    PROCESS --> BATCH
    BATCH --> DEDUPE
    DEDUPE --> COMPRESS
    COMPRESS --> PARALLEL
    PARALLEL --> EXEC
    
    CONTINUE --> CACHE_RESULT[Cache Result]
    CACHE_RESULT --> RETURN[Return]
    RETURN_CACHE --> RETURN
    
    ADJUST --> EXEC
    
    style REQ fill:#ff9,stroke:#333,stroke-width:2px
    style RETURN_CACHE fill:#9f9,stroke:#333,stroke-width:2px
    style PARALLEL fill:#99f,stroke:#333,stroke-width:2px
    style RETURN fill:#9ff,stroke:#333,stroke-width:2px
```

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV_CLI[Dev CLI]
        DEV_AGENTS[Local Agents]
        DEV_DB[(Dev SQLite)]
    end
    
    subgraph "Staging"
        STAGE_API[Staging API]
        STAGE_SWARM[Staging Swarm]
        STAGE_TURSO[(Staging Turso)]
    end
    
    subgraph "Production"
        subgraph "Load Balancer"
            LB[HAProxy/Nginx]
        end
        
        subgraph "API Servers"
            API1[API Server 1]
            API2[API Server 2]
            API3[API Server 3]
        end
        
        subgraph "Worker Pool"
            WORKER1[Worker 1]
            WORKER2[Worker 2]
            WORKER3[Worker 3]
            WORKER4[Worker 4]
        end
        
        subgraph "Data Layer"
            REDIS[(Redis Cache)]
            TURSO_PROD[(Turso Primary)]
            TURSO_REPLICA[(Turso Replica)]
        end
        
        subgraph "Monitoring"
            METRICS[Prometheus]
            LOGS[ELK Stack]
            ALERTS[AlertManager]
        end
    end
    
    DEV_CLI --> DEV_AGENTS
    DEV_AGENTS --> DEV_DB
    
    STAGE_API --> STAGE_SWARM
    STAGE_SWARM --> STAGE_TURSO
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> WORKER1
    API2 --> WORKER2
    API3 --> WORKER3
    API1 --> WORKER4
    
    WORKER1 --> REDIS
    WORKER2 --> REDIS
    WORKER3 --> TURSO_PROD
    WORKER4 --> TURSO_PROD
    
    TURSO_PROD --> TURSO_REPLICA
    
    API1 --> METRICS
    API2 --> METRICS
    API3 --> METRICS
    METRICS --> ALERTS
    
    style LB fill:#f96,stroke:#333,stroke-width:4px
    style REDIS fill:#f99,stroke:#333,stroke-width:2px
    style TURSO_PROD fill:#99f,stroke:#333,stroke-width:2px
    style METRICS fill:#9f9,stroke:#333,stroke-width:2px
```

---

*Diagramas criados para complementar a arquitetura simplificada*
*Architecture Agent - SPARC Phase 3*