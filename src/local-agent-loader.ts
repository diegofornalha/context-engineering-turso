// SPARC Refinement - Local Agent Loader Implementation
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { Agent } from './types';

export class LocalAgentLoader {
  private agentsDir = '.claude/agents';

  async loadAllAgents(): Promise<Agent[]> {
    const agents: Agent[] = [];
    
    try {
      const categories = await fs.readdir(this.agentsDir);
      
      for (const category of categories) {
        const categoryPath = path.join(this.agentsDir, category);
        const stat = await fs.stat(categoryPath);
        
        if (stat.isDirectory()) {
          const files = await fs.readdir(categoryPath);
          
          for (const file of files) {
            if (file.endsWith('.md')) {
              const filePath = path.join(categoryPath, file);
              const agent = await this.loadAgentFromFile(filePath);
              if (agent) {
                agents.push(agent);
              }
            }
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to load agents: ${error}`);
    }

    return agents;
  }

  async loadAgent(nameOrPath: string): Promise<Agent | null> {
    try {
      // If it's a full path, load directly
      if (nameOrPath.includes('/')) {
        return await this.loadAgentFromFile(nameOrPath);
      }

      // Otherwise, search for the agent by name
      const agents = await this.loadAllAgents();
      return agents.find(agent => agent.name === nameOrPath) || null;
    } catch (error) {
      console.error(`Error loading agent ${nameOrPath}:`, error);
      return null;
    }
  }

  private async loadAgentFromFile(filePath: string): Promise<Agent | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseAgentMarkdown(content);
    } catch (error) {
      console.error(`Error loading agent from ${filePath}:`, error);
      return null;
    }
  }

  private parseAgentMarkdown(content: string): Agent | null {
    // Extract YAML frontmatter
    const yamlMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!yamlMatch) {
      return null;
    }

    try {
      const yamlContent = yamlMatch[1];
      const frontmatter = yaml.load(yamlContent) as any;
      
      // Extract the markdown content after frontmatter
      const markdownContent = content.slice(yamlMatch[0].length).trim();

      return {
        name: frontmatter.name,
        type: frontmatter.type,
        capabilities: frontmatter.capabilities || [],
        description: frontmatter.description || '',
        priority: frontmatter.priority || 'medium',
        hooks: {
          pre: frontmatter.hooks?.pre || '',
          post: frontmatter.hooks?.post || ''
        },
        content: markdownContent,
        metadata: {
          color: frontmatter.color,
          sparc_phase: frontmatter.sparc_phase,
          ...frontmatter
        }
      };
    } catch (error) {
      console.error('Error parsing agent YAML:', error);
      return null;
    }
  }

  async loadAgentContent(path: string): Promise<string> {
    return await fs.readFile(path, 'utf-8');
  }
}