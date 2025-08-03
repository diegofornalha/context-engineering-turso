#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { BriefingGenerator } from './briefing-generator.js';
import { DataAggregator } from './data-aggregator.js';
import { TemplateEngine } from './template-engine.js';
import { VisualizationEngine } from './visualization-engine.js';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Initialize components
const briefingGenerator = new BriefingGenerator();
const dataAggregator = new DataAggregator();
const templateEngine = new TemplateEngine();
const visualizationEngine = new VisualizationEngine();

// Create MCP server
const server = new Server(
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

// Define tool schemas
const GenerateBriefingSchema = z.object({
  type: z.enum(['executive', 'technical', 'project', 'incident', 'strategic']),
  title: z.string().describe('Briefing title'),
  timeframe: z.object({
    start: z.string().describe('Start date (ISO format)'),
    end: z.string().describe('End date (ISO format)'),
  }).optional(),
  sources: z.array(z.object({
    type: z.enum(['github', 'database', 'api', 'metrics', 'file']),
    config: z.record(z.any()),
  })).optional(),
  format: z.enum(['html', 'pdf', 'markdown', 'pptx', 'json']).default('markdown'),
  template: z.string().optional(),
  audience: z.string().optional(),
});

const AggregateDataSchema = z.object({
  sources: z.array(z.object({
    type: z.enum(['github', 'database', 'api', 'metrics', 'file']),
    name: z.string(),
    config: z.record(z.any()),
  })),
  filters: z.record(z.any()).optional(),
  cache: z.boolean().default(true),
});

const CreateVisualizationSchema = z.object({
  type: z.enum(['dashboard', 'timeline', 'kpi', 'trend', 'comparison']),
  data: z.record(z.any()),
  options: z.object({
    title: z.string().optional(),
    theme: z.string().optional(),
    interactive: z.boolean().default(true),
  }).optional(),
});

const SearchBriefingsSchema = z.object({
  query: z.string().optional(),
  type: z.string().optional(),
  dateRange: z.object({
    start: z.string(),
    end: z.string(),
  }).optional(),
  limit: z.number().default(10),
});

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_briefing',
        description: 'Generate a comprehensive briefing based on type and requirements',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['executive', 'technical', 'project', 'incident', 'strategic'],
              description: 'Type of briefing to generate',
            },
            title: {
              type: 'string',
              description: 'Briefing title',
            },
            timeframe: {
              type: 'object',
              properties: {
                start: { type: 'string', description: 'Start date (ISO format)' },
                end: { type: 'string', description: 'End date (ISO format)' },
              },
            },
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['github', 'database', 'api', 'metrics', 'file'] },
                  config: { type: 'object' },
                },
              },
            },
            format: {
              type: 'string',
              enum: ['html', 'pdf', 'markdown', 'pptx', 'json'],
              default: 'markdown',
            },
            template: { type: 'string' },
            audience: { type: 'string' },
          },
          required: ['type', 'title'],
        },
      },
      {
        name: 'aggregate_data',
        description: 'Aggregate data from multiple sources for briefing generation',
        inputSchema: {
          type: 'object',
          properties: {
            sources: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['github', 'database', 'api', 'metrics', 'file'] },
                  name: { type: 'string' },
                  config: { type: 'object' },
                },
                required: ['type', 'name', 'config'],
              },
            },
            filters: { type: 'object' },
            cache: { type: 'boolean', default: true },
          },
          required: ['sources'],
        },
      },
      {
        name: 'create_visualization',
        description: 'Create data visualizations for briefings',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['dashboard', 'timeline', 'kpi', 'trend', 'comparison'],
            },
            data: { type: 'object' },
            options: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                theme: { type: 'string' },
                interactive: { type: 'boolean', default: true },
              },
            },
          },
          required: ['type', 'data'],
        },
      },
      {
        name: 'search_briefings',
        description: 'Search existing briefings',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            type: { type: 'string' },
            dateRange: {
              type: 'object',
              properties: {
                start: { type: 'string' },
                end: { type: 'string' },
              },
            },
            limit: { type: 'number', default: 10 },
          },
        },
      },
      {
        name: 'list_templates',
        description: 'List available briefing templates',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_briefing_status',
        description: 'Get status of a briefing generation task',
        inputSchema: {
          type: 'object',
          properties: {
            briefingId: { type: 'string', description: 'Briefing ID' },
          },
          required: ['briefingId'],
        },
      },
      {
        name: 'export_briefing',
        description: 'Export briefing to specified format',
        inputSchema: {
          type: 'object',
          properties: {
            briefingId: { type: 'string' },
            format: {
              type: 'string',
              enum: ['pdf', 'pptx', 'docx', 'html', 'markdown'],
            },
            options: { type: 'object' },
          },
          required: ['briefingId', 'format'],
        },
      },
      {
        name: 'schedule_briefing',
        description: 'Schedule recurring briefing generation',
        inputSchema: {
          type: 'object',
          properties: {
            config: { type: 'object' },
            schedule: {
              type: 'object',
              properties: {
                frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                time: { type: 'string' },
                timezone: { type: 'string' },
              },
            },
          },
          required: ['config', 'schedule'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'generate_briefing': {
        const params = GenerateBriefingSchema.parse(args);
        
        // Aggregate data if sources provided
        let data = {};
        if (params.sources) {
          data = await dataAggregator.aggregate(params.sources, params.timeframe);
        }
        
        // Generate briefing
        const briefing = await briefingGenerator.generate({
          type: params.type,
          title: params.title,
          data,
          template: params.template,
          audience: params.audience,
        });
        
        // Apply formatting
        const formatted = await templateEngine.format(briefing, params.format);
        
        return {
          content: [
            {
              type: 'text',
              text: typeof formatted === 'string' ? formatted : JSON.stringify(formatted, null, 2),
            },
          ],
        };
      }

      case 'aggregate_data': {
        const params = AggregateDataSchema.parse(args);
        const data = await dataAggregator.aggregate(params.sources, params.filters);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      case 'create_visualization': {
        const params = CreateVisualizationSchema.parse(args);
        const visualization = await visualizationEngine.create(
          params.type,
          params.data,
          params.options
        );
        
        return {
          content: [
            {
              type: 'text',
              text: visualization,
            },
          ],
        };
      }

      case 'search_briefings': {
        const params = SearchBriefingsSchema.parse(args);
        const results = await briefingGenerator.search(params);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'list_templates': {
        const templates = await templateEngine.listTemplates();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(templates, null, 2),
            },
          ],
        };
      }

      case 'get_briefing_status': {
        const { briefingId } = args as { briefingId: string };
        const status = await briefingGenerator.getStatus(briefingId);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(status, null, 2),
            },
          ],
        };
      }

      case 'export_briefing': {
        const { briefingId, format, options } = args as any;
        const exported = await briefingGenerator.export(briefingId, format, options);
        
        return {
          content: [
            {
              type: 'text',
              text: `Briefing exported to: ${exported.path}`,
            },
          ],
        };
      }

      case 'schedule_briefing': {
        const { config, schedule } = args as any;
        const scheduled = await briefingGenerator.schedule(config, schedule);
        
        return {
          content: [
            {
              type: 'text',
              text: `Briefing scheduled with ID: ${scheduled.scheduleId}`,
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid parameters: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      );
    }
    throw error;
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Briefing server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});