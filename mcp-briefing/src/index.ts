#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Schema for briefing generation
const GenerateBriefingSchema = z.object({
  title: z.string().describe('Title of the briefing'),
  topic: z.string().describe('Main topic to cover'),
  sections: z.array(z.string()).optional().describe('Sections to include'),
  data: z.record(z.any()).optional().describe('Additional data to include'),
});

// Schema for simple data aggregation
const AggregateDataSchema = z.object({
  sources: z.array(z.object({
    name: z.string(),
    data: z.record(z.any()),
  })).describe('Data sources to aggregate'),
});

class BriefingServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-briefing',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_briefing',
          description: 'Generate a simple briefing in JSON format',
          inputSchema: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Briefing title' },
              topic: { type: 'string', description: 'Main topic' },
              sections: { 
                type: 'array',
                items: { type: 'string' },
                description: 'Sections to include (e.g., summary, key_points, recommendations)'
              },
              data: { 
                type: 'object',
                description: 'Additional data to include in briefing'
              },
            },
            required: ['title', 'topic'],
          },
        },
        {
          name: 'aggregate_data',
          description: 'Aggregate data from multiple sources into a single JSON',
          inputSchema: {
            type: 'object',
            properties: {
              sources: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    data: { type: 'object' },
                  },
                  required: ['name', 'data'],
                },
              },
            },
            required: ['sources'],
          },
        },
        {
          name: 'search_briefings',
          description: 'Search for existing briefings (returns mock data)',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Max results' },
            },
            required: ['query'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'generate_briefing':
          return this.generateBriefing(request.params.arguments);
        
        case 'aggregate_data':
          return this.aggregateData(request.params.arguments);
        
        case 'search_briefings':
          return this.searchBriefings(request.params.arguments);
        
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async generateBriefing(args: any) {
    const params = GenerateBriefingSchema.parse(args);
    
    // Generate a simple briefing structure
    const briefing = {
      id: `briefing_${Date.now()}`,
      title: params.title,
      topic: params.topic,
      generated_at: new Date().toISOString(),
      sections: {},
      metadata: {
        version: '1.0',
        generator: 'mcp-briefing',
      },
    };

    // Default sections if not specified
    const sections = params.sections || ['summary', 'key_points', 'recommendations'];
    
    // Generate content for each section
    if (sections.includes('summary')) {
      briefing.sections['summary'] = `This briefing covers ${params.topic}. ` +
        `Generated on ${new Date().toLocaleDateString()} for quick reference and decision making.`;
    }

    if (sections.includes('key_points')) {
      briefing.sections['key_points'] = [
        `Main focus area: ${params.topic}`,
        'Data has been aggregated from available sources',
        'Analysis includes latest available information',
        'Recommendations based on current trends',
      ];
    }

    if (sections.includes('recommendations')) {
      briefing.sections['recommendations'] = [
        'Continue monitoring the situation',
        'Review detailed metrics in appendix',
        'Schedule follow-up briefing if needed',
      ];
    }

    if (sections.includes('metrics')) {
      briefing.sections['metrics'] = {
        total_items: Math.floor(Math.random() * 100),
        completion_rate: Math.floor(Math.random() * 100) + '%',
        trend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
      };
    }

    // Include any additional data
    if (params.data) {
      briefing.sections['additional_data'] = params.data;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(briefing, null, 2),
        },
      ],
    };
  }

  private async aggregateData(args: any) {
    const params = AggregateDataSchema.parse(args);
    
    // Simple data aggregation
    const aggregated = {
      id: `aggregate_${Date.now()}`,
      timestamp: new Date().toISOString(),
      source_count: params.sources.length,
      data: {},
      summary: {},
    };

    // Combine all data sources
    params.sources.forEach((source) => {
      aggregated.data[source.name] = source.data;
      
      // Create simple summary
      aggregated.summary[source.name] = {
        keys: Object.keys(source.data),
        item_count: Object.keys(source.data).length,
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(aggregated, null, 2),
        },
      ],
    };
  }

  private async searchBriefings(args: any) {
    const { query, limit = 5 } = args;
    
    // Mock search results
    const results = {
      query,
      found: 3,
      briefings: [
        {
          id: 'briefing_001',
          title: 'Q4 2024 Summary',
          topic: 'quarterly_review',
          created: '2024-12-31T23:59:59Z',
          relevance: 0.95,
        },
        {
          id: 'briefing_002',
          title: 'Project Status Update',
          topic: 'project_management',
          created: '2024-12-15T10:00:00Z',
          relevance: 0.80,
        },
        {
          id: 'briefing_003',
          title: 'Technical Architecture Review',
          topic: 'architecture',
          created: '2024-12-01T14:30:00Z',
          relevance: 0.75,
        },
      ].slice(0, limit),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Briefing server running on stdio');
  }
}

// Start the server
const server = new BriefingServer();
server.run().catch(console.error);