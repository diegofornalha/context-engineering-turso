#!/usr/bin/env node
/**
 * Servidor MCP Turso Unificado Simplificado
 * Compatível com Claude Code CLI e Cursor Agent
 * 6 tools essenciais (sem conversation/knowledge)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { get_cloud_config } from './config-hybrid.js';
import { CloudDatabaseClient } from './clients/database-hybrid.js';

// Get configuration
const config = get_cloud_config();

/**
 * Servidor MCP Turso Unificado Simplificado
 * 6 tools essenciais para ambas as ferramentas
 */
class UnifiedTursoServer {
  private server: Server;
  private db_client: CloudDatabaseClient;

  constructor() {
    this.db_client = new CloudDatabaseClient();
    
    // Initialize server
    this.server = new Server({
      name: 'mcp-turso-unified',
      version: '2.1.0',
    });

    // Setup request handlers
    this.setup_handlers();
  }

  private setup_handlers() {
    // List available tools - 6 TOOLS ESSENCIAIS
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        // 4 TOOLS BÁSICAS
        {
          name: 'execute_read_only_query',
          description: 'Execute a read-only SQL query (SELECT, PRAGMA, etc)',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The SQL query to execute',
              },
              database: {
                type: 'string',
                description: 'Database name (optional)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'execute_query',
          description: 'Execute any SQL query (including destructive operations)',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The SQL query to execute',
              },
              database: {
                type: 'string',
                description: 'Database name (optional)',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'list_databases',
          description: 'List all available databases',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'get_database_info',
          description: 'Get information about a specific database',
          inputSchema: {
            type: 'object',
            properties: {
              database: {
                type: 'string',
                description: 'Database name',
              },
            },
            required: ['database'],
          },
        },
        
        // 2 TOOLS AVANÇADAS ESSENCIAIS
        {
          name: 'list_tables',
          description: 'Lista todas as tabelas no banco de dados',
          inputSchema: {
            type: 'object',
            properties: {
              database: {
                type: 'string',
                description: 'Nome do banco de dados (opcional)',
              },
            },
            required: [],
          },
        },
        {
          name: 'describe_table',
          description: 'Descreve a estrutura de uma tabela',
          inputSchema: {
            type: 'object',
            properties: {
              table_name: {
                type: 'string',
                description: 'Nome da tabela',
              },
              database: {
                type: 'string',
                description: 'Nome do banco de dados (opcional)',
              },
            },
            required: ['table_name'],
          },
        },
      ];
      
      return { tools };
    });
    
    // Handle tool calls - IMPLEMENTAÇÃO DAS 6 TOOLS
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
          case 'execute_read_only_query':
            const readResult = await this.db_client.execute_read_only_query(
              args?.query as string,
              args?.database as string | undefined
            );
            return { content: [{ type: 'text', text: JSON.stringify(readResult, null, 2) }] };
            
          case 'execute_query':
            const result = await this.db_client.execute_query(
              args?.query as string,
              args?.database as string | undefined
            );
            return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            
          case 'list_databases':
            const databases = await this.db_client.list_databases();
            return { content: [{ type: 'text', text: JSON.stringify(databases, null, 2) }] };
            
          case 'get_database_info':
            const info = await this.db_client.get_database_info((args?.database as string) || config.TURSO_DEFAULT_DATABASE);
            return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
            
          case 'list_tables':
            const tablesQuery = "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name";
            const tablesResult = await this.db_client.execute_read_only_query(
              tablesQuery,
              args?.database as string | undefined
            );
            const tableNames = tablesResult.rows.map((row: any) => row.name);
            return { content: [{ type: 'text', text: JSON.stringify({ tables: tableNames }, null, 2) }] };
            
          case 'describe_table':
            const describeQuery = `PRAGMA table_info(${args?.table_name as string})`;
            const describeResult = await this.db_client.execute_read_only_query(
              describeQuery,
              args?.database as string | undefined
            );
            return { content: [{ type: 'text', text: JSON.stringify(describeResult, null, 2) }] };
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        throw error;
      }
    });
  }
  
  async start(): Promise<void> {
    console.log(`🚀 Starting Unified Turso MCP Server v2.1 (Simplified)...`);
    console.log(`📊 Database: ${config.TURSO_DEFAULT_DATABASE}`);
    console.log(`🏢 Organization: ${config.TURSO_ORGANIZATION}`);
    console.log(`🛠️ Tools: 6 essenciais (4 básicas + 2 avançadas)`);
    console.log(`🔧 Compatível com: Claude Code CLI & Cursor Agent`);
    
    // Start the server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log(`✅ Unified Turso MCP Server started successfully!`);
  }
  
  async stop(): Promise<void> {
    this.db_client.close();
    await this.server.close();
  }
}

async function main() {
  const server = new UnifiedTursoServer();
  
  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}