// SPARC Refinement - Type Definitions

export interface Agent {
  name: string;
  type: string;
  capabilities: string[];
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  hooks?: {
    pre?: string;
    post?: string;
  };
  content?: string;
  metadata?: Record<string, any>;
}

export interface AgentState {
  id: string;
  name: string;
  type: string;
  baseType: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  spawnedAt: Date;
  capabilities: string[];
  lastActivity?: Date;
  currentTask?: string;
}

export interface AgentCategory {
  core: Agent[];
  swarm: Agent[];
  sparc: Agent[];
  github: Agent[];
  consensus: Agent[];
  performance: Agent[];
  specialized: Agent[];
  [key: string]: Agent[]; // Index signature for dynamic access
}

export interface CoordinationRecord {
  from: string;
  to: string;
  timestamp: Date;
  task?: string;
  status?: string;
  data?: any;
}

export interface MigrationOptions {
  dryRun: boolean;
  preserveState: boolean;
  backupPath?: string;
  verbose?: boolean;
}

export interface SystemState {
  agentCount: number;
  capabilities: string[];
  activeAgents: number;
  timestamp: Date;
  memory?: {
    entries: number;
    size: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface HookExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  duration?: number;
}