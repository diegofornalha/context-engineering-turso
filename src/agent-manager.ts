// SPARC Refinement - Green Phase Implementation
// Unified Agent Manager for local agents

import { LocalAgentLoader } from './local-agent-loader';
import { AgentValidator } from './agent-validator';
import { Agent, AgentCategory, AgentState, CoordinationRecord } from './types';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private activeAgents: Map<string, AgentState> = new Map();
  private agentCache: Map<string, Agent[]> = new Map();
  private lastError: string = '';
  private validationErrors: string[] = [];
  private executor = execAsync;
  private coordinationRecords: CoordinationRecord[] = [];

  constructor(
    private loader: LocalAgentLoader,
    private validator: AgentValidator
  ) {}

  async loadAllAgents(): Promise<Agent[]> {
    // Check cache first
    if (this.agentCache.has('all')) {
      return this.agentCache.get('all')!;
    }

    try {
      const agents = await this.loader.loadAllAgents();
      this.agentCache.set('all', agents);
      
      // Store agents in map for quick access
      agents.forEach(agent => {
        this.agents.set(agent.name, agent);
      });

      return agents;
    } catch (error) {
      this.lastError = `Failed to load agents: ${error}`;
      return [];
    }
  }

  async loadAgent(name: string): Promise<Agent | null> {
    try {
      const agent = await this.loader.loadAgent(name);
      if (!agent) {
        this.lastError = `Agent not found: ${name}`;
        return null;
      }

      if (!this.validator.validate(agent)) {
        this.validationErrors = this.validator.getErrors();
        return null;
      }

      return agent;
    } catch (error) {
      this.lastError = `Failed to load agent: ${error}`;
      return null;
    }
  }

  categorizeAgents(agents: Agent[]): AgentCategory {
    const categories: AgentCategory = {
      core: [],
      swarm: [],
      sparc: [],
      github: [],
      consensus: [],
      performance: [],
      specialized: []
    };

    agents.forEach(agent => {
      const category = this.determineCategory(agent);
      if (categories[category]) {
        categories[category].push(agent);
      }
    });

    return categories;
  }

  private determineCategory(agent: Agent): string {
    if (['coder', 'tester', 'reviewer', 'planner', 'researcher'].includes(agent.name)) {
      return 'core';
    }
    if (agent.name.includes('coordinator') || agent.name.includes('swarm')) {
      return 'swarm';
    }
    if (agent.name.includes('sparc') || ['specification', 'pseudocode', 'architecture', 'refinement'].includes(agent.name)) {
      return 'sparc';
    }
    if (agent.name.includes('github') || agent.name.includes('pr-') || agent.name.includes('issue')) {
      return 'github';
    }
    if (agent.name.includes('byzantine') || agent.name.includes('raft') || agent.name.includes('consensus')) {
      return 'consensus';
    }
    if (agent.name.includes('perf') || agent.name.includes('benchmark')) {
      return 'performance';
    }
    return 'specialized';
  }

  createCompatibilityWrapper(_mockClaudeFlowSpawn: Function) {
    return {
      spawn: async (options: { type: string; name: string }) => {
        // Map Claude Flow types to local agents
        const localType = this.mapClaudeFlowType(options.type);
        await this.spawnAgent(localType, options.name);
      }
    };
  }

  private mapClaudeFlowType(claudeFlowType: string): string {
    const mapping = this.getTypeMapping();
    return mapping[claudeFlowType] || claudeFlowType;
  }

  getTypeMapping(): Record<string, string> {
    return {
      'coordinator': 'task-orchestrator',
      'analyst': 'code-analyzer',
      'optimizer': 'perf-analyzer',
      'architect': 'system-architect',
      'documenter': 'api-docs',
      'monitor': 'swarm-monitor'
    };
  }

  async spawnAgent(type: string, name: string): Promise<AgentState> {
    // Check if agent already exists
    const existingKey = `${type}-${name}`;
    if (this.activeAgents.has(existingKey)) {
      return this.activeAgents.get(existingKey)!;
    }

    // Load agent definition
    await this.loadAllAgents();
    const agentDef = this.agents.get(type);
    if (!agentDef) {
      throw new Error(`Agent type not found: ${type}`);
    }

    const agentState: AgentState = {
      id: existingKey,
      name,
      type,
      baseType: type,
      status: 'active',
      spawnedAt: new Date(),
      capabilities: agentDef.capabilities
    };

    this.activeAgents.set(existingKey, agentState);
    return agentState;
  }

  getActiveAgent(name: string): AgentState | undefined {
    for (const [, agent] of this.activeAgents) {
      if (agent.name === name) {
        return agent;
      }
    }
    return undefined;
  }

  getActiveAgents(): AgentState[] {
    return Array.from(this.activeAgents.values());
  }

  setExecutor(executor: Function) {
    this.executor = executor as any;
  }

  async executePreHook(agentId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const agentState = this.activeAgents.get(agentId);
      if (!agentState) {
        return { success: false, error: 'Agent not found' };
      }

      const agentDef = this.agents.get(agentState.type);
      if (!agentDef || !agentDef.hooks?.pre) {
        return { success: true }; // No pre-hook defined
      }

      await this.executor(agentDef.hooks.pre);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Hook execution failed: ${error}` 
      };
    }
  }

  async getDeduplicatedHooks(agentId: string): Promise<string[]> {
    const agentState = this.activeAgents.get(agentId);
    if (!agentState) return [];

    const agentDef = this.agents.get(agentState.type);
    if (!agentDef || !agentDef.hooks) return [];

    const allHooks = [
      agentDef.hooks.pre || '',
      agentDef.hooks.post || ''
    ].filter(Boolean);

    // Deduplicate memory_store operations
    const seen = new Set<string>();
    const deduped: string[] = [];

    allHooks.forEach(hook => {
      const lines = hook.split('\n');
      lines.forEach(line => {
        if (line.includes('memory_store')) {
          const match = line.match(/memory_store "([^"]+)"/);
          if (match && !seen.has(match[1])) {
            seen.add(match[1]);
            deduped.push(line);
          }
        } else {
          deduped.push(line);
        }
      });
    });

    return deduped;
  }

  async saveAgentState(agentId: string): Promise<void> {
    const state = this.activeAgents.get(agentId);
    if (!state) return;

    // In real implementation, this would save to SQLite/memory
    // For now, we'll keep it in memory
  }

  async loadAgentState(agentId: string): Promise<AgentState | null> {
    return this.activeAgents.get(agentId) || null;
  }

  async recordCoordination(fromId: string, toId: string, data: any): Promise<void> {
    this.coordinationRecords.push({
      from: fromId,
      to: toId,
      timestamp: new Date(),
      ...data
    });
  }

  async getCoordination(agentId: string): Promise<CoordinationRecord[]> {
    return this.coordinationRecords.filter(
      record => record.from === agentId || record.to === agentId
    );
  }

  async generateMigrationScript(project: any): Promise<string> {
    const lines: string[] = [
      '#!/bin/bash',
      '# Migration script from Claude Flow to Local Agents',
      ''
    ];

    const mapping = this.getTypeMapping();
    
    project.claudeFlowAgents.forEach((agent: any) => {
      const localType = mapping[agent.type] || agent.type;
      lines.push(`# Migrating ${agent.type} -> ${localType}`);
      lines.push(`echo "Migrating agent: ${agent.name} (${agent.type} -> ${localType})"`);
      lines.push('');
    });

    lines.push('# Migration complete');
    lines.push('echo "Migration completed successfully!"');

    return lines.join('\n');
  }

  async captureSystemState(): Promise<any> {
    const agents = await this.loadAllAgents();
    const capabilities = new Set<string>();
    
    agents.forEach(agent => {
      agent.capabilities.forEach(cap => capabilities.add(cap));
    });

    return {
      agentCount: agents.length,
      capabilities: Array.from(capabilities),
      activeAgents: this.activeAgents.size,
      timestamp: new Date()
    };
  }

  async performMigration(options: { dryRun: boolean; preserveState: boolean }): Promise<void> {
    if (options.dryRun) {
      console.log('Dry run - no changes will be made');
    }

    // In real implementation, this would:
    // 1. Backup current state
    // 2. Update configurations
    // 3. Migrate active agents
    // 4. Validate migration
  }

  getLastError(): string {
    return this.lastError;
  }

  getValidationErrors(): string[] {
    return this.validationErrors;
  }
}