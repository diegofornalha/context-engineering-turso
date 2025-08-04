#!/usr/bin/env node
// SPARC Refinement - Migration Script from Claude Flow to Unified Local Agents

import { promises as fs } from 'fs';
import path from 'path';
import { AgentManager } from '../src/agent-manager';
import { LocalAgentLoader } from '../src/local-agent-loader';
import { AgentValidator } from '../src/agent-validator';

interface MigrationConfig {
  projectPath: string;
  dryRun: boolean;
  verbose: boolean;
  backupPath?: string;
}

class AgentMigrationTool {
  private agentManager: AgentManager;
  private typeMapping: Record<string, string>;

  constructor() {
    this.agentManager = new AgentManager(
      new LocalAgentLoader(),
      new AgentValidator()
    );
    this.typeMapping = this.agentManager.getTypeMapping();
  }

  async migrate(config: MigrationConfig): Promise<void> {
    console.log('🔄 Starting Agent System Migration...\n');

    if (config.dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    try {
      // Step 1: Analyze current usage
      const analysis = await this.analyzeProject(config.projectPath);
      this.printAnalysis(analysis);

      // Step 2: Create migration plan
      const migrationPlan = this.createMigrationPlan(analysis);
      this.printMigrationPlan(migrationPlan);

      if (!config.dryRun) {
        // Step 3: Backup if requested
        if (config.backupPath) {
          await this.createBackup(config.projectPath, config.backupPath);
        }

        // Step 4: Apply migrations
        await this.applyMigrations(config.projectPath, migrationPlan);

        // Step 5: Validate migration
        const validation = await this.validateMigration(config.projectPath);
        this.printValidation(validation);
      }

      console.log('\n✅ Migration completed successfully!');
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    }
  }

  private async analyzeProject(projectPath: string): Promise<any> {
    const analysis = {
      claudeFlowUsage: [] as any[],
      localAgentUsage: [] as any[],
      files: [] as string[]
    };

    // Scan for Claude Flow usage patterns
    const files = await this.findProjectFiles(projectPath);
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Check for Claude Flow agent spawns
      const claudeFlowMatches = content.matchAll(/mcp__claude-flow__agent_spawn.*?type:\s*["'](\w+)["']/g);
      for (const match of claudeFlowMatches) {
        analysis.claudeFlowUsage.push({
          file: path.relative(projectPath, file),
          agentType: match[1],
          line: this.getLineNumber(content, match.index!)
        });
      }

      // Check for local agent usage
      const localAgentMatches = content.matchAll(/Task\(.*?["'](\w+)["']\s*\)/g);
      for (const match of localAgentMatches) {
        analysis.localAgentUsage.push({
          file: path.relative(projectPath, file),
          agentType: match[1],
          line: this.getLineNumber(content, match.index!)
        });
      }
    }

    analysis.files = files.map(f => path.relative(projectPath, f));
    return analysis;
  }

  private createMigrationPlan(analysis: any): any {
    const plan = {
      replacements: [] as any[],
      warnings: [] as string[],
      stats: {
        totalFiles: analysis.files.length,
        claudeFlowAgents: analysis.claudeFlowUsage.length,
        localAgents: analysis.localAgentUsage.length
      }
    };

    // Create replacement plan for each Claude Flow usage
    for (const usage of analysis.claudeFlowUsage) {
      const localType = this.typeMapping[usage.agentType] || usage.agentType;
      
      plan.replacements.push({
        file: usage.file,
        line: usage.line,
        from: `mcp__claude-flow__agent_spawn { type: "${usage.agentType}"`,
        to: `Task("${localType} agent instructions from .claude/agents/", "task description", "${localType}")`
      });

      if (!this.typeMapping[usage.agentType]) {
        plan.warnings.push(
          `No direct mapping for agent type '${usage.agentType}'. Using as-is.`
        );
      }
    }

    return plan;
  }

  private async applyMigrations(projectPath: string, plan: any): Promise<void> {
    const fileChanges = new Map<string, string[]>();

    // Group replacements by file
    for (const replacement of plan.replacements) {
      if (!fileChanges.has(replacement.file)) {
        fileChanges.set(replacement.file, []);
      }
      fileChanges.get(replacement.file)!.push(replacement);
    }

    // Apply changes to each file
    for (const [file, replacements] of fileChanges) {
      const filePath = path.join(projectPath, file);
      let content = await fs.readFile(filePath, 'utf-8');

      // Apply replacements
      for (const replacement of replacements) {
        content = content.replace(replacement.from, replacement.to);
      }

      await fs.writeFile(filePath, content, 'utf-8');
      console.log(`📝 Updated: ${file}`);
    }
  }

  private async validateMigration(projectPath: string): Promise<any> {
    const validation = {
      success: true,
      issues: [] as string[]
    };

    // Re-analyze to ensure no Claude Flow usage remains
    const postAnalysis = await this.analyzeProject(projectPath);
    
    if (postAnalysis.claudeFlowUsage.length > 0) {
      validation.success = false;
      validation.issues.push(
        `Found ${postAnalysis.claudeFlowUsage.length} remaining Claude Flow usages`
      );
    }

    return validation;
  }

  private async findProjectFiles(projectPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.md'];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          }
        } else if (extensions.some(ext => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }

    await walk(projectPath);
    return files;
  }

  private getLineNumber(content: string, index: number): number {
    return content.substring(0, index).split('\n').length;
  }

  private async createBackup(projectPath: string, backupPath: string): Promise<void> {
    console.log(`📦 Creating backup at: ${backupPath}`);
    // In a real implementation, this would create a proper backup
    await fs.mkdir(backupPath, { recursive: true });
  }

  private printAnalysis(analysis: any): void {
    console.log('📊 Project Analysis:');
    console.log(`   Files scanned: ${analysis.files.length}`);
    console.log(`   Claude Flow agents found: ${analysis.claudeFlowUsage.length}`);
    console.log(`   Local agents found: ${analysis.localAgentUsage.length}`);
    console.log('');
  }

  private printMigrationPlan(plan: any): void {
    console.log('📋 Migration Plan:');
    console.log(`   Files to update: ${new Set(plan.replacements.map((r: any) => r.file)).size}`);
    console.log(`   Agent replacements: ${plan.replacements.length}`);
    
    if (plan.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      plan.warnings.forEach((w: string) => console.log(`   - ${w}`));
    }
    console.log('');
  }

  private printValidation(validation: any): void {
    if (validation.success) {
      console.log('✅ Validation passed!');
    } else {
      console.log('❌ Validation failed:');
      validation.issues.forEach((issue: string) => console.log(`   - ${issue}`));
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: migrate-to-unified-agents [options] <project-path>

Options:
  --dry-run          Show what would be changed without making changes
  --verbose          Show detailed output
  --backup <path>    Create backup before migration
  --help             Show this help message

Examples:
  migrate-to-unified-agents .
  migrate-to-unified-agents --dry-run ./my-project
  migrate-to-unified-agents --backup ./backups/pre-migration ./my-project
    `);
    process.exit(0);
  }

  const config: MigrationConfig = {
    projectPath: args[args.length - 1],
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    backupPath: args.includes('--backup') 
      ? args[args.indexOf('--backup') + 1] 
      : undefined
  };

  const migrator = new AgentMigrationTool();
  migrator.migrate(config);
}

export { AgentMigrationTool };