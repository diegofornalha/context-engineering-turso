// SPARC Refinement Phase - TDD Implementation
// Test Suite for Agent System Unification

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AgentManager } from '../src/agent-manager';
import { LocalAgentLoader } from '../src/local-agent-loader';
import { AgentValidator } from '../src/agent-validator';

describe('Agent System Unification', () => {
  let agentManager: AgentManager;
  let localAgentLoader: LocalAgentLoader;
  let agentValidator: AgentValidator;

  beforeEach(() => {
    localAgentLoader = new LocalAgentLoader();
    agentValidator = new AgentValidator();
    agentManager = new AgentManager(localAgentLoader, agentValidator);
  });

  describe('RED Phase - Agent Loading Tests', () => {
    it('should load all agents from .claude/agents/ directory', async () => {
      // Test will fail initially - no implementation yet
      const agents = await agentManager.loadAllAgents();
      
      expect(agents).toBeDefined();
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.length).toBeGreaterThanOrEqual(40); // Should load at least 40 agents
    });

    it('should parse YAML frontmatter from agent markdown files', async () => {
      const testAgentPath = '.claude/agents/core/coder.md';
      const agent = await localAgentLoader.loadAgent(testAgentPath);
      
      expect(agent).not.toBeNull();
      expect(agent).toHaveProperty('name', 'coder');
      expect(agent).toHaveProperty('type', 'developer');
      expect(agent).toHaveProperty('capabilities');
      expect(agent?.capabilities).toContain('code_generation');
    });

    it('should validate agent structure and required fields', async () => {
      const validAgent = {
        name: 'test-agent',
        type: 'developer',
        capabilities: ['testing'],
        description: 'Test agent',
        hooks: { pre: 'echo "start"', post: 'echo "end"' }
      };

      const isValid = agentValidator.validate(validAgent);
      expect(isValid).toBe(true);

      const invalidAgent = { name: 'invalid' }; // Missing required fields
      const isInvalid = agentValidator.validate(invalidAgent);
      expect(isInvalid).toBe(false);
    });

    it('should categorize agents by type', async () => {
      const agents = await agentManager.loadAllAgents();
      const categorized = agentManager.categorizeAgents(agents);
      
      expect(categorized).toHaveProperty('core');
      expect(categorized).toHaveProperty('swarm');
      expect(categorized).toHaveProperty('sparc');
      expect(categorized).toHaveProperty('github');
      expect(categorized.core).toContainEqual(
        expect.objectContaining({ name: 'coder' })
      );
    });
  });

  describe('RED Phase - Agent Compatibility Tests', () => {
    it('should provide compatibility wrapper for Claude Flow calls', async () => {
      // This ensures backward compatibility
      const mockClaudeFlowSpawn = jest.fn();
      const wrapper = agentManager.createCompatibilityWrapper(mockClaudeFlowSpawn);
      
      // Simulate Claude Flow agent spawn call
      await wrapper.spawn({ type: 'coder', name: 'API Developer' });
      
      // Should translate to local agent usage
      expect(mockClaudeFlowSpawn).not.toHaveBeenCalled();
      const spawnedAgent = agentManager.getActiveAgent('API Developer');
      expect(spawnedAgent).toBeDefined();
      expect(spawnedAgent?.baseType).toBe('coder');
    });

    it('should map Claude Flow agent types to local agents', () => {
      const mappings = agentManager.getTypeMapping();
      
      expect(mappings['coordinator']).toBe('task-orchestrator');
      expect(mappings['analyst']).toBe('code-analyzer');
      expect(mappings['optimizer']).toBe('perf-analyzer');
      expect(mappings['architect']).toBe('system-architect');
    });

    it('should handle duplicate agent spawn prevention', async () => {
      const agent1 = await agentManager.spawnAgent('coder', 'Backend Dev');
      const agent2 = await agentManager.spawnAgent('coder', 'Backend Dev');
      
      expect(agent1.id).toBe(agent2.id); // Same agent returned
      expect(agentManager.getActiveAgents().length).toBe(1);
    });
  });

  describe('RED Phase - Hook Execution Tests', () => {
    it('should execute pre and post hooks from agent definitions', async () => {
      const mockExec = jest.fn();
      agentManager.setExecutor(mockExec);
      
      const agent = await agentManager.spawnAgent('coder', 'Test Coder');
      await agentManager.executePreHook(agent.id);
      
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('echo "💻 Coder agent implementing: $TASK"')
      );
    });

    it('should deduplicate hooks across hierarchical agents', async () => {
      // Test that duplicate memory operations are prevented
      const agent = await agentManager.spawnAgent('hierarchical-coordinator', 'Lead');
      const hooks = await agentManager.getDeduplicatedHooks(agent.id);
      
      const memoryStores = hooks.filter(h => h.includes('memory_store'));
      const uniqueKeys = new Set(
        memoryStores.map(h => h.match(/memory_store "([^"]+)"/)?.[1])
      );
      
      expect(memoryStores.length).toBe(uniqueKeys.size);
    });
  });

  describe('RED Phase - Memory Integration Tests', () => {
    it('should store agent state in unified memory', async () => {
      const agent = await agentManager.spawnAgent('coder', 'Memory Test');
      await agentManager.saveAgentState(agent.id);
      
      const savedState = await agentManager.loadAgentState(agent.id);
      expect(savedState).toMatchObject({
        id: agent.id,
        name: 'Memory Test',
        type: 'coder',
        status: 'active'
      });
    });

    it('should track agent coordination through memory', async () => {
      const coordinator = await agentManager.spawnAgent('task-orchestrator', 'Lead');
      const coder = await agentManager.spawnAgent('coder', 'Dev');
      
      await agentManager.recordCoordination(coordinator.id, coder.id, {
        task: 'Implement authentication',
        status: 'in_progress'
      });
      
      const coordination = await agentManager.getCoordination(coordinator.id);
      expect(coordination).toHaveLength(1);
      expect(coordination[0]).toMatchObject({
        from: coordinator.id,
        to: coder.id,
        task: 'Implement authentication'
      });
    });
  });

  describe('RED Phase - Migration Tests', () => {
    it('should generate migration script from Claude Flow to local agents', async () => {
      const mockProject = {
        claudeFlowAgents: [
          { type: 'coordinator', name: 'Project Lead' },
          { type: 'coder', name: 'Backend Dev' },
          { type: 'analyst', name: 'Performance Analyst' }
        ]
      };

      const migrationScript = await agentManager.generateMigrationScript(mockProject);
      
      expect(migrationScript).toContain('task-orchestrator');
      expect(migrationScript).toContain('coder');
      expect(migrationScript).toContain('code-analyzer');
      expect(migrationScript).toContain('# Migration complete');
    });

    it('should validate migration without breaking existing functionality', async () => {
      const beforeMigration = await agentManager.captureSystemState();
      
      // Simulate migration
      await agentManager.performMigration({
        dryRun: false,
        preserveState: true
      });
      
      const afterMigration = await agentManager.captureSystemState();
      
      // All agents should still be accessible
      expect(afterMigration.agentCount).toBe(beforeMigration.agentCount);
      expect(afterMigration.capabilities).toEqual(beforeMigration.capabilities);
    });
  });
});

describe('Performance Optimization Tests', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager(
      new LocalAgentLoader(),
      new AgentValidator()
    );
  });

  it('should load agents with caching for performance', async () => {
    const start1 = performance.now();
    await agentManager.loadAllAgents();
    const duration1 = performance.now() - start1;

    const start2 = performance.now();
    await agentManager.loadAllAgents(); // Should use cache
    const duration2 = performance.now() - start2;

    expect(duration2).toBeLessThan(duration1 * 0.1); // 90% faster with cache
  });

  it('should handle concurrent agent operations efficiently', async () => {
    const operations = Array(100).fill(null).map((_, i) => 
      agentManager.spawnAgent('coder', `Dev-${i}`)
    );

    const start = performance.now();
    await Promise.all(operations);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(agentManager.getActiveAgents().length).toBe(100);
  });
});

describe('Error Handling and Recovery', () => {
  let agentManager: AgentManager;

  beforeEach(() => {
    agentManager = new AgentManager(
      new LocalAgentLoader(),
      new AgentValidator()
    );
  });

  it('should handle missing agent files gracefully', async () => {
    const result = await agentManager.loadAgent('non-existent-agent');
    
    expect(result).toBeNull();
    expect(agentManager.getLastError()).toMatch(/Agent not found/);
  });

  it('should validate and reject malformed agent definitions', async () => {
    // Test validator directly with malformed data
    const validator = new AgentValidator();
    const malformedAgentData = {
      name: 'broken-agent'
      // Missing required fields: type, capabilities, description
    };
    
    const isValid = validator.validate(malformedAgentData);
    
    expect(isValid).toBe(false);
    expect(validator.getErrors()).toContain('Missing required field: type');
  });

  it('should recover from hook execution failures', async () => {
    const agent = await agentManager.spawnAgent('coder', 'Faulty');
    
    // Simulate hook failure
    agentManager.setExecutor(() => {
      throw new Error('Hook execution failed');
    });

    const result = await agentManager.executePreHook(agent.id);
    
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Hook execution failed/);
    expect(agent.status).toBe('active'); // Agent should remain active
  });
});