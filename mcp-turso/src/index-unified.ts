#!/usr/bin/env node
/**
 * Servidor MCP Turso Unificado
 * Compatível com Claude Code CLI e Cursor Agent
 * Combina todas as 10 tools em um único servidor
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { get_cloud_config } from './config-hybrid.js';
import { CloudDatabaseClient } from './clients/database-hybrid.js';
import { createClient } from '@libsql/client';
import { config as dotenvConfig } from 'dotenv';

// Carrega variáveis de ambiente
dotenvConfig();

// Get configuration
const config = get_cloud_config();

/**
 * Servidor MCP Turso Unificado
 * Suporta tanto ferramentas básicas quanto avançadas
 */
class UnifiedTursoServer {
  private server: Server;
  private db_client: CloudDatabaseClient;
  private memory_client: any = null;

  constructor() {
    this.db_client = new CloudDatabaseClient();
    
    // Initialize server
    this.server = new Server({
      name: 'mcp-turso-unified',
      version: '2.0.0',
    });

    // Setup request handlers
    this.setup_handlers();
  }

  // Inicializa cliente de memória para tools avançadas
  private getMemoryClient() {
    if (!this.memory_client) {
      const databaseUrl = process.env.TURSO_DATABASE_URL || 
                         `libsql://${config.TURSO_DEFAULT_DATABASE}-${config.TURSO_ORGANIZATION}.aws-us-east-1.turso.io`;
      const authToken = process.env.TURSO_AUTH_TOKEN;
      
      if (!authToken) {
        throw new Error("TURSO_AUTH_TOKEN é obrigatório para tools de memória");
      }
      
      this.memory_client = createClient({
        url: databaseUrl,
        authToken: authToken,
      });
    }
    return this.memory_client;
  }

  private setup_handlers() {
    // List available tools - TODAS AS 10 TOOLS
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = [
        // 4 TOOLS BÁSICAS (já funcionam no Claude Code)
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
        
        // 6 TOOLS AVANÇADAS (novas para o Claude Code)
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
        {
          name: 'setup_memory_tables',
          description: 'Configura as tabelas de memória (conversations e knowledge_base)',
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
          name: 'add_conversation',
          description: 'Adiciona uma mensagem à memória de conversas',
          inputSchema: {
            type: 'object',
            properties: {
              session_id: {
                type: 'string',
                description: 'ID da sessão',
              },
              role: {
                type: 'string',
                description: 'Papel (user/assistant/system)',
              },
              content: {
                type: 'string',
                description: 'Conteúdo da mensagem',
              },
              metadata: {
                type: 'object',
                description: 'Metadados adicionais (opcional)',
              },
            },
            required: ['session_id', 'role', 'content'],
          },
        },
        {
          name: 'get_conversations',
          description: 'Busca conversas por sessão',
          inputSchema: {
            type: 'object',
            properties: {
              session_id: {
                type: 'string',
                description: 'ID da sessão',
              },
              limit: {
                type: 'integer',
                description: 'Número máximo de mensagens (padrão: 50)',
              },
            },
            required: ['session_id'],
          },
        },
        {
          name: 'add_knowledge',
          description: 'Adiciona conhecimento à base',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Categoria do conhecimento',
              },
              topic: {
                type: 'string',
                description: 'Tópico',
              },
              content: {
                type: 'string',
                description: 'Conteúdo',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags (opcional)',
              },
              metadata: {
                type: 'object',
                description: 'Metadados adicionais (opcional)',
              },
            },
            required: ['category', 'topic', 'content'],
          },
        },
        {
          name: 'search_knowledge',
          description: 'Busca na base de conhecimento',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Termo de busca',
              },
              category: {
                type: 'string',
                description: 'Filtrar por categoria (opcional)',
              },
              limit: {
                type: 'integer',
                description: 'Número máximo de resultados (padrão: 10)',
              },
            },
            required: ['query'],
          },
        },
      ];
      
      return { tools };
    });
    
    // Handle tool calls - IMPLEMENTAÇÃO DE TODAS AS 10 TOOLS
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        // TOOLS BÁSICAS (1-4)
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
            
          // TOOLS AVANÇADAS (5-10)
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
            
          case 'setup_memory_tables':
            const client = this.getMemoryClient();
            
            // Criar tabela conversations
            await client.execute(`
              CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                metadata TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_session_id (session_id),
                INDEX idx_timestamp (timestamp)
              )
            `);
            
            // Criar tabela knowledge_base
            await client.execute(`
              CREATE TABLE IF NOT EXISTS knowledge_base (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                topic TEXT NOT NULL,
                content TEXT NOT NULL,
                tags TEXT,
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_category (category),
                INDEX idx_topic (topic)
              )
            `);
            
            return { 
              content: [{ 
                type: 'text', 
                text: JSON.stringify({ 
                  success: true, 
                  message: 'Tabelas de memória criadas com sucesso',
                  tables: ['conversations', 'knowledge_base']
                }, null, 2) 
              }] 
            };
            
          case 'add_conversation':
            const addConvClient = this.getMemoryClient();
            const convResult = await addConvClient.execute({
              sql: `INSERT INTO conversations (session_id, role, content, metadata) 
                    VALUES (?, ?, ?, ?)`,
              args: [
                args?.session_id as string,
                args?.role as string,
                args?.content as string,
                args?.metadata ? JSON.stringify(args.metadata) : null
              ]
            });
            
            return { 
              content: [{ 
                type: 'text', 
                text: JSON.stringify({ 
                  success: true, 
                  id: convResult.lastInsertRowid,
                  message: 'Conversa adicionada com sucesso'
                }, null, 2) 
              }] 
            };
            
          case 'get_conversations':
            const getConvClient = this.getMemoryClient();
            const limit = (args?.limit as number | undefined) || 50;
            const convs = await getConvClient.execute({
              sql: `SELECT * FROM conversations 
                    WHERE session_id = ? 
                    ORDER BY timestamp DESC 
                    LIMIT ?`,
              args: [args?.session_id as string, limit]
            });
            
            return { 
              content: [{ 
                type: 'text', 
                text: JSON.stringify({
                  session_id: args?.session_id as string,
                  conversations: convs.rows,
                  count: convs.rows.length
                }, null, 2) 
              }] 
            };
            
          case 'add_knowledge':
            const addKnowClient = this.getMemoryClient();
            const knowResult = await addKnowClient.execute({
              sql: `INSERT INTO knowledge_base (category, topic, content, tags, metadata) 
                    VALUES (?, ?, ?, ?, ?)`,
              args: [
                args?.category as string,
                args?.topic as string,
                args?.content as string,
                args?.tags ? JSON.stringify(args.tags) : null,
                args?.metadata ? JSON.stringify(args.metadata) : null
              ]
            });
            
            return { 
              content: [{ 
                type: 'text', 
                text: JSON.stringify({ 
                  success: true, 
                  id: knowResult.lastInsertRowid,
                  message: 'Conhecimento adicionado com sucesso'
                }, null, 2) 
              }] 
            };
            
          case 'search_knowledge':
            const searchClient = this.getMemoryClient();
            const searchLimit = (args?.limit as number | undefined) || 10;
            
            let searchQuery = `
              SELECT * FROM knowledge_base 
              WHERE (topic LIKE ? OR content LIKE ?)
            `;
            const searchArgs: any[] = [`%${args?.query as string}%`, `%${args?.query as string}%`];
            
            if (args?.category) {
              searchQuery += ' AND category = ?';
              searchArgs.push(args.category);
            }
            
            searchQuery += ' ORDER BY updated_at DESC LIMIT ?';
            searchArgs.push(searchLimit);
            
            const searchResults = await searchClient.execute({
              sql: searchQuery,
              args: searchArgs
            });
            
            return { 
              content: [{ 
                type: 'text', 
                text: JSON.stringify({
                  query: args?.query as string,
                  category: args?.category as string | undefined,
                  results: searchResults.rows,
                  count: searchResults.rows.length
                }, null, 2) 
              }] 
            };
            
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
    console.log(`🚀 Starting Unified Turso MCP Server v2.0...`);
    console.log(`📊 Database: ${config.TURSO_DEFAULT_DATABASE}`);
    console.log(`🏢 Organization: ${config.TURSO_ORGANIZATION}`);
    console.log(`🛠️ Tools: 10 (4 básicas + 6 avançadas)`);
    console.log(`🔧 Compatível com: Claude Code CLI & Cursor Agent`);
    
    // Start the server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log(`✅ Unified Turso MCP Server started successfully!`);
  }
  
  async stop(): Promise<void> {
    this.db_client.close();
    if (this.memory_client) {
      await this.memory_client.close();
    }
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