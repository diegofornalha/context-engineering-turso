// SPARC Refinement - Agent Validator Implementation

export class AgentValidator {
  private errors: string[] = [];

  validate(agent: any): boolean {
    this.errors = [];

    // Check required fields
    if (!agent.name) {
      this.errors.push('Missing required field: name');
    }

    if (!agent.type) {
      this.errors.push('Missing required field: type');
    }

    if (!agent.capabilities || !Array.isArray(agent.capabilities)) {
      this.errors.push('Missing or invalid field: capabilities (must be array)');
    }

    if (!agent.description) {
      this.errors.push('Missing required field: description');
    }

    // Validate field types
    if (agent.name && typeof agent.name !== 'string') {
      this.errors.push('Invalid field type: name must be string');
    }

    if (agent.type && typeof agent.type !== 'string') {
      this.errors.push('Invalid field type: type must be string');
    }

    // Validate hooks if present
    if (agent.hooks) {
      if (typeof agent.hooks !== 'object') {
        this.errors.push('Invalid field type: hooks must be object');
      } else {
        if (agent.hooks.pre && typeof agent.hooks.pre !== 'string') {
          this.errors.push('Invalid hook: pre must be string');
        }
        if (agent.hooks.post && typeof agent.hooks.post !== 'string') {
          this.errors.push('Invalid hook: post must be string');
        }
      }
    }

    // Validate capabilities content
    if (agent.capabilities && Array.isArray(agent.capabilities)) {
      agent.capabilities.forEach((cap: any, index: number) => {
        if (typeof cap !== 'string') {
          this.errors.push(`Invalid capability at index ${index}: must be string`);
        }
      });
    }

    // Validate agent type is from known types
    const validTypes = [
      'developer', 'coordinator', 'analyzer', 'tester', 
      'architect', 'researcher', 'planner', 'specialist'
    ];
    
    if (agent.type && !validTypes.includes(agent.type)) {
      // Allow but warn about unknown types
      console.warn(`Unknown agent type: ${agent.type}`);
    }

    return this.errors.length === 0;
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  validateAgentName(name: string): boolean {
    // Agent names should be lowercase, alphanumeric with hyphens
    const pattern = /^[a-z0-9-]+$/;
    return pattern.test(name);
  }

  validateCapability(capability: string): boolean {
    // Capabilities should be snake_case
    const pattern = /^[a-z_]+$/;
    return pattern.test(capability);
  }

  validateHookScript(script: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,  // rm -rf /
      /:(){ :|:& };:/,  // Fork bomb
      /dd\s+if=\/dev\/zero/,  // Disk wipe
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(script)) {
        issues.push(`Dangerous command pattern detected: ${pattern}`);
      }
    });

    // Check for required memory operations format
    const memoryOps = script.match(/memory_store\s+"([^"]+)"\s+"([^"]+)"/g);
    if (memoryOps) {
      memoryOps.forEach(op => {
        const match = op.match(/memory_store\s+"([^"]+)"\s+"([^"]+)"/);
        if (match && match[1].length > 100) {
          issues.push(`Memory key too long: ${match[1]}`);
        }
      });
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }
}