# 🔌 Especificação de Interfaces entre Componentes

## 1. Interface do Orchestrator Unificado

### 1.1 Interface de Entrada

```typescript
interface OrchestratorInput {
  // Comando principal
  command: {
    type: 'prp' | 'sparc' | 'swarm' | 'direct';
    action: string;
    parameters: Record<string, any>;
  };
  
  // Contexto da execução
  context: {
    sessionId: string;
    userId?: string;
    projectId?: string;
    workingDirectory: string;
  };
  
  // Opções de execução
  options: {
    parallel?: boolean;
    timeout?: number;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    hooks?: {
      pre?: string[];
      post?: string[];
    };
  };
}
```

### 1.2 Interface de Saída

```typescript
interface OrchestratorOutput {
  // Identificação
  id: string;
  timestamp: Date;
  
  // Resultado
  status: 'success' | 'error' | 'partial';
  result: any;
  
  // Metadados
  metadata: {
    duration: number;
    tokensUsed?: number;
    agentsUsed: string[];
    methodologyUsed: string;
  };
  
  // Erros (se houver)
  errors?: Array<{
    code: string;
    message: string;
    context?: any;
  }>;
}
```

## 2. Interface do Agent Manager

### 2.1 Agent Definition

```typescript
interface AgentDefinition {
  // Identificação
  name: string;
  type: string;
  version: string;
  
  // Metadados YAML
  frontmatter: {
    color?: string;
    priority?: string;
    capabilities: string[];
    sparc_phase?: string;
    hooks?: {
      pre?: string;
      post?: string;
    };
  };
  
  // Conteúdo
  description: string;
  instructions: string;
  examples?: string[];
}

interface AgentManager {
  // Carregar agente
  loadAgent(type: string): Promise<AgentDefinition>;
  
  // Spawnar agente
  spawnAgent(
    type: string,
    task: string,
    context?: any
  ): Promise<AgentInstance>;
  
  // Listar agentes disponíveis
  listAgents(): Promise<AgentDefinition[]>;
  
  // Validar agente
  validateAgent(definition: AgentDefinition): boolean;
}
```

### 2.2 Agent Instance

```typescript
interface AgentInstance {
  // Identificação
  id: string;
  type: string;
  name: string;
  
  // Estado
  status: 'idle' | 'working' | 'completed' | 'error';
  progress?: number;
  
  // Métodos
  execute(task: string): Promise<any>;
  abort(): Promise<void>;
  getStatus(): AgentStatus;
  
  // Hooks
  onProgress?: (progress: number) => void;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}
```

## 3. Interface das Metodologias

### 3.1 PRP Engine Interface

```typescript
interface PRPEngine {
  // Fases do PRP
  research(topic: string, options?: ResearchOptions): Promise<ResearchResult>;
  structure(data: ResearchResult): Promise<StructuredData>;
  generate(structured: StructuredData): Promise<PRPDocument>;
  
  // Fluxo completo
  generatePRP(
    topic: string,
    options?: PRPOptions
  ): Promise<PRPDocument>;
}

interface PRPDocument {
  id: string;
  topic: string;
  timestamp: Date;
  
  sections: {
    overview: string;
    requirements: string[];
    architecture?: string;
    implementation?: string;
    testing?: string;
    deployment?: string;
  };
  
  metadata: {
    sources: string[];
    confidence: number;
    tokensUsed: number;
  };
}
```

### 3.2 SPARC Engine Interface

```typescript
interface SPARCEngine {
  // Fases SPARC
  specification(requirements: string): Promise<Specification>;
  pseudocode(spec: Specification): Promise<Pseudocode>;
  architecture(pseudo: Pseudocode): Promise<Architecture>;
  refinement(arch: Architecture): Promise<Implementation>;
  completion(impl: Implementation): Promise<FinalProduct>;
  
  // TDD Flow
  tdd(feature: string, options?: TDDOptions): Promise<TDDResult>;
}

interface SPARCPhaseResult {
  phase: 'specification' | 'pseudocode' | 'architecture' | 'refinement' | 'completion';
  status: 'completed' | 'in-progress' | 'failed';
  output: any;
  tests?: TestResult[];
  documentation?: string;
}
```

### 3.3 Swarm Coordinator Interface

```typescript
interface SwarmCoordinator {
  // Inicialização
  initialize(config: SwarmConfig): Promise<SwarmInstance>;
  
  // Execução
  execute(
    task: string,
    agents: string[],
    topology: Topology
  ): Promise<SwarmResult>;
  
  // Monitoramento
  monitor(swarmId: string): SwarmStatus;
  
  // Controle
  pause(swarmId: string): Promise<void>;
  resume(swarmId: string): Promise<void>;
  terminate(swarmId: string): Promise<void>;
}

interface SwarmConfig {
  topology: 'hierarchical' | 'mesh' | 'ring' | 'star' | 'adaptive';
  maxAgents: number;
  strategy: 'parallel' | 'sequential' | 'adaptive';
  timeout?: number;
}
```

## 4. Interface do Memory Service

### 4.1 Storage Interface

```typescript
interface MemoryService {
  // Operações básicas
  store(key: string, value: any, ttl?: number): Promise<void>;
  retrieve(key: string): Promise<any>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  
  // Operações avançadas
  search(pattern: string, options?: SearchOptions): Promise<SearchResult[]>;
  list(prefix?: string): Promise<string[]>;
  
  // Sync
  sync(): Promise<SyncStatus>;
  forceSync(): Promise<void>;
  
  // Namespaces
  namespace(name: string): MemoryNamespace;
}

interface MemoryNamespace {
  name: string;
  store(key: string, value: any): Promise<void>;
  retrieve(key: string): Promise<any>;
  clear(): Promise<void>;
}
```

### 4.2 Sync Interface

```typescript
interface SyncService {
  // Estado de sincronização
  getStatus(): SyncStatus;
  
  // Operações de sync
  syncToCloud(): Promise<void>;
  syncFromCloud(): Promise<void>;
  resolveConflicts(strategy: ConflictStrategy): Promise<void>;
  
  // Configuração
  configure(options: SyncOptions): void;
}

interface SyncStatus {
  lastSync: Date;
  pendingChanges: number;
  conflicts: Conflict[];
  cloudStatus: 'connected' | 'disconnected' | 'error';
}
```

## 5. Interface de Hooks

### 5.1 Hook System

```typescript
interface HookSystem {
  // Registro de hooks
  register(event: string, handler: HookHandler): void;
  unregister(event: string, handler: HookHandler): void;
  
  // Execução
  execute(event: string, context: HookContext): Promise<void>;
  executeAll(event: string, context: HookContext): Promise<void[]>;
  
  // Hooks predefinidos
  preTask(context: TaskContext): Promise<void>;
  postTask(context: TaskContext, result: any): Promise<void>;
  preEdit(context: EditContext): Promise<void>;
  postEdit(context: EditContext): Promise<void>;
}

type HookHandler = (context: HookContext) => Promise<void> | void;

interface HookContext {
  event: string;
  timestamp: Date;
  data: any;
  session?: SessionInfo;
}
```

## 6. Interface de Monitoramento

### 6.1 Monitor Service

```typescript
interface MonitorService {
  // Métricas
  recordMetric(name: string, value: number, tags?: Record<string, string>): void;
  getMetrics(query: MetricQuery): Promise<Metric[]>;
  
  // Logs
  log(level: LogLevel, message: string, context?: any): void;
  getLogs(filter: LogFilter): Promise<LogEntry[]>;
  
  // Alertas
  createAlert(alert: AlertDefinition): void;
  getAlerts(status?: AlertStatus): Promise<Alert[]>;
  
  // Health checks
  checkHealth(): Promise<HealthStatus>;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, ComponentHealth>;
  timestamp: Date;
}
```

## 7. Interface de Comunicação entre Componentes

### 7.1 Message Bus

```typescript
interface MessageBus {
  // Publicar/Assinar
  publish(topic: string, message: Message): void;
  subscribe(topic: string, handler: MessageHandler): Subscription;
  
  // Request/Response
  request(topic: string, data: any, timeout?: number): Promise<any>;
  respond(topic: string, handler: ResponseHandler): void;
  
  // Broadcast
  broadcast(message: Message): void;
}

interface Message {
  id: string;
  topic: string;
  timestamp: Date;
  source: string;
  data: any;
  correlationId?: string;
}
```

### 7.2 Event System

```typescript
interface EventSystem {
  // Eventos
  emit(event: string, data: any): void;
  on(event: string, handler: EventHandler): void;
  once(event: string, handler: EventHandler): void;
  off(event: string, handler: EventHandler): void;
  
  // Eventos do sistema
  onAgentSpawned(handler: (agent: AgentInstance) => void): void;
  onTaskCompleted(handler: (result: TaskResult) => void): void;
  onError(handler: (error: SystemError) => void): void;
}
```

## 8. Exemplo de Integração

```typescript
// Exemplo de uso integrado das interfaces
async function executeComplexTask(task: string) {
  // 1. Orchestrator recebe a tarefa
  const orchestrator = new UnifiedOrchestrator();
  const input: OrchestratorInput = {
    command: {
      type: 'swarm',
      action: 'execute',
      parameters: { task }
    },
    context: {
      sessionId: generateId(),
      workingDirectory: process.cwd()
    },
    options: {
      parallel: true,
      priority: 'high'
    }
  };
  
  // 2. Orchestrator decide usar Swarm
  const swarm = orchestrator.getSwarmCoordinator();
  const swarmConfig: SwarmConfig = {
    topology: 'hierarchical',
    maxAgents: 8,
    strategy: 'parallel'
  };
  
  // 3. Agent Manager carrega agentes necessários
  const agentManager = orchestrator.getAgentManager();
  const agents = await agentManager.listAgents();
  const selectedAgents = selectAgentsForTask(agents, task);
  
  // 4. Swarm executa com agentes
  const swarmInstance = await swarm.initialize(swarmConfig);
  const result = await swarm.execute(
    task,
    selectedAgents.map(a => a.name),
    'hierarchical'
  );
  
  // 5. Memory Service armazena resultado
  const memory = orchestrator.getMemoryService();
  await memory.store(`task:${input.context.sessionId}`, result);
  
  // 6. Retorna resultado estruturado
  const output: OrchestratorOutput = {
    id: input.context.sessionId,
    timestamp: new Date(),
    status: 'success',
    result: result,
    metadata: {
      duration: Date.now() - startTime,
      agentsUsed: selectedAgents.map(a => a.name),
      methodologyUsed: 'swarm'
    }
  };
  
  return output;
}
```

---

*Especificação de interfaces para arquitetura simplificada*
*Architecture Agent - SPARC Phase 3*