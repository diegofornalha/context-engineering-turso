#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { get_cloud_config } from './config-hybrid.js';
import { CloudDatabaseClient } from './clients/database-hybrid.js';
import { WebServer } from './web-server.js';
// import { ErrorCode } from './common/errors.js';

// Get configuration
const config = get_cloud_config();

/**
 * Cloud-only Turso MCP Server
 */
class CloudTursoServer {
	private server: Server;
	private db_client: CloudDatabaseClient;
	
	constructor() {
		this.db_client = new CloudDatabaseClient();
		
		// Initialize server
		this.server = new Server({
			name: 'mcp-turso-cloud',
			version: '1.0.0',
		}, {
			capabilities: {
				resources: {},
				tools: {},
			},
		});
		
		// Setup request handlers
		this.setup_handlers();
	}
	
	private setup_handlers(): void {
		// List available tools
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			const tools = [
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
			];
			
			return { tools };
		});
		
		// Handle tool calls
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;
			
			try {
				switch (name) {
					case 'execute_read_only_query':
						const readResult = await this.db_client.execute_read_only_query(
							args.query,
							args.database
						);
						return { content: [{ type: 'text', text: JSON.stringify(readResult, null, 2) }] };
						
					case 'execute_query':
						const result = await this.db_client.execute_query(
							args.query,
							args.database
						);
						return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
						
					case 'list_databases':
						const databases = await this.db_client.list_databases();
						return { content: [{ type: 'text', text: JSON.stringify(databases, null, 2) }] };
						
					case 'get_database_info':
						const info = await this.db_client.get_database_info(args?.database || config.TURSO_DEFAULT_DATABASE);
						return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
						
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
		console.log(`🚀 Starting Cloud Turso MCP Server...`);
		console.log(`📊 Database: ${config.TURSO_DEFAULT_DATABASE}`);
		console.log(`🏢 Organization: ${config.TURSO_ORGANIZATION}`);
		console.log(`☁️ Mode: Cloud-only`);
		
		// Start the server
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		
		console.log(`✅ Cloud Turso MCP Server started successfully!`);
	}
	
	async stop(): Promise<void> {
		this.db_client.close();
		await this.server.close();
	}
}

// Legacy class name for compatibility
class HybridTursoServer extends CloudTursoServer {
	// All functionality inherited from CloudTursoServer
}

async function main() {
	const server = new CloudTursoServer();
	
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
main().catch(console.error);