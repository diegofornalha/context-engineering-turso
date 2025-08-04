#!/usr/bin/env node
import { config } from "dotenv";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@libsql/client";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Load environment variables
config();

// Turso client
let tursoClient: any = null;

function getTursoClient() {
  if (!tursoClient) {
    const databaseUrl = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    
    if (!databaseUrl || !authToken) {
      throw new Error("TURSO_DATABASE_URL e TURSO_AUTH_TOKEN são obrigatórios");
    }
    
    tursoClient = createClient({
      url: databaseUrl,
      authToken: authToken,
    });
  }
  return tursoClient;
}

// Validation helper
function validateRequiredParams(args: any, requiredParams: string[]): void {
  for (const param of requiredParams) {
    if (!args?.[param]) {
      throw new Error(`Parâmetro obrigatório '${param}' não fornecido`);
    }
  }
}

// Create server instance
const server = new Server(
  {
    name: "mcp-turso-memory",
    version: "1.0.0",
  }
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "turso_list_databases",
        description: "List all databases in your Turso organization",
        inputSchema: {
          type: "object",
          properties: {
            random_string: {
              type: "string",
              description: "Dummy parameter for no-parameter tools",
            },
          },
          required: ["random_string"],
        },
      },
      {
        name: "turso_execute_query",
        description: "Execute a SQL query on the Turso database",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "SQL query to execute",
            },
            params: {
              type: "object",
              description: "Query parameters (optional)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "turso_execute_read_only_query",
        description: "Execute a read-only SQL query (SELECT, PRAGMA, EXPLAIN only)",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Read-only SQL query to execute",
            },
            params: {
              type: "object",
              description: "Query parameters (optional)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "turso_list_tables",
        description: "List all tables in the database",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "turso_describe_table",
        description: "Get schema information for a table",
        inputSchema: {
          type: "object",
          properties: {
            table: {
              type: "string",
              description: "Table name",
            },
          },
          required: ["table"],
        },
      },
      {
        name: "turso_add_conversation",
        description: "Add a conversation to memory",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier",
            },
            user_id: {
              type: "string",
              description: "User identifier",
            },
            message: {
              type: "string",
              description: "User message",
            },
            response: {
              type: "string",
              description: "AI response",
            },
            context: {
              type: "string",
              description: "Additional context",
            },
          },
          required: ["session_id", "message"],
        },
      },
      {
        name: "turso_get_conversations",
        description: "Get conversations from memory",
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session identifier (optional)",
            },
            limit: {
              type: "number",
              description: "Number of conversations to retrieve",
            },
          },
        },
      },
      {
        name: "turso_add_knowledge",
        description: "Add knowledge to the knowledge base",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Knowledge topic",
            },
            content: {
              type: "string",
              description: "Knowledge content",
            },
            source: {
              type: "string",
              description: "Source of knowledge",
            },
            tags: {
              type: "string",
              description: "Comma-separated tags",
            },
          },
          required: ["topic", "content"],
        },
      },
      {
        name: "turso_search_knowledge",
        description: "Search knowledge base",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query",
            },
            tags: {
              type: "string",
              description: "Filter by tags",
            },
            limit: {
              type: "number",
              description: "Number of results",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "turso_setup_memory_tables",
        description: "Setup memory system tables (conversations and knowledge_base)",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const client = getTursoClient();

    switch (name) {
      case "turso_list_databases":
        return {
          content: [
            {
              type: "text",
              text: `Available databases: meu-banco-memoria`,
            },
          ],
        };

      case "turso_execute_query":
        validateRequiredParams(args, ["query"]);
        const result = await client.execute({
          sql: args?.query as string,
          args: args?.params || {}
        });
        return {
          content: [
            {
              type: "text",
              text: `Query executed successfully:\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };

      case "turso_execute_read_only_query":
        validateRequiredParams(args, ["query"]);
        const readOnlyQuery = (args?.query as string).trim().toUpperCase();
        if (!readOnlyQuery.startsWith("SELECT") && !readOnlyQuery.startsWith("PRAGMA") && !readOnlyQuery.startsWith("EXPLAIN")) {
          throw new Error("Apenas consultas de leitura (SELECT, PRAGMA, EXPLAIN) são permitidas");
        }
        const readOnlyResult = await client.execute({
          sql: args?.query as string,
          args: args?.params || {}
        });
        return {
          content: [
            {
              type: "text",
              text: `Read-only query executed successfully:\n${JSON.stringify(readOnlyResult, null, 2)}`,
            },
          ],
        };

            case "turso_list_tables":
        const tablesResult = await client.execute({
          sql: `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
          args: []
        });
        return {
          content: [
            {
              type: "text",
              text: `Tables in database:\n${JSON.stringify(tablesResult, null, 2)}`,
            },
          ],
        };

      case "turso_describe_table":
        validateRequiredParams(args, ["table"]);
        const describeResult = await client.execute({
          sql: `
          PRAGMA table_info(${args?.table as string})`,
          args: []
        });
        return {
          content: [
            {
              type: "text",
              text: `Table schema for '${args?.table as string}':\n${JSON.stringify(describeResult, null, 2)}`,
            },
          ],
        };

      case "turso_add_conversation":
        validateRequiredParams(args, ["session_id", "message"]);
        const insertResult = await client.execute({
          sql: `INSERT INTO conversations (session_id, user_id, message, response, context, timestamp) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
          args: [args?.session_id as string, args?.user_id || null, args?.message as string, args?.response || null, args?.context || null]
        });
        return {
          content: [
            {
              type: "text",
              text: `Conversation added successfully. ID: ${insertResult.lastInsertRowid}`,
            },
          ],
        };

      case "turso_get_conversations":
        let getConversationsQuery = "SELECT * FROM conversations";
        const conversationsParams: any[] = [];
        
        if (args?.session_id) {
          getConversationsQuery += " WHERE session_id = ?";
          conversationsParams.push(args.session_id);
        }
        
        getConversationsQuery += " ORDER BY timestamp DESC";
        
        if (args?.limit) {
          getConversationsQuery += " LIMIT ?";
          conversationsParams.push(args.limit.toString());
        }
        
        const conversationsResult = await client.execute({
          sql: getConversationsQuery,
          args: conversationsParams
        });
        return {
          content: [
            {
              type: "text",
              text: `Conversations:\n${JSON.stringify(conversationsResult, null, 2)}`,
            },
          ],
        };

      case "turso_add_knowledge":
        validateRequiredParams(args, ["topic", "content"]);
        const knowledgeResult = await client.execute({
          sql: `INSERT INTO knowledge_base (topic, content, source, tags, created_at) VALUES (?, ?, ?, ?, datetime('now'))`,
          args: [args?.topic as string, args?.content as string, args?.source || null, args?.tags || null]
        });
        return {
          content: [
            {
              type: "text",
              text: `Knowledge added successfully. ID: ${knowledgeResult.lastInsertRowid}`,
            },
          ],
        };

      case "turso_search_knowledge":
        validateRequiredParams(args, ["query"]);
        let searchQuery = "SELECT * FROM knowledge_base WHERE topic LIKE ? OR content LIKE ?";
        const searchParams = [`%${args?.query as string}%`, `%${args?.query as string}%`];
        
        if (args?.tags) {
          searchQuery += " AND tags LIKE ?";
          searchParams.push(`%${args.tags}%`);
        }
        
        searchQuery += " ORDER BY created_at DESC";
        
        if (args?.limit) {
          searchQuery += " LIMIT ?";
          searchParams.push((args.limit as number).toString());
        }
        
        const searchResult = await client.execute({
          sql: searchQuery,
          args: searchParams
        });
        return {
          content: [
            {
              type: "text",
              text: `Search results:\n${JSON.stringify(searchResult, null, 2)}`,
            },
          ],
        };

      case "turso_setup_memory_tables":
        // Create conversations table
        await client.execute({
          sql: `
          CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            user_id TEXT,
            message TEXT NOT NULL,
            response TEXT,
            context TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          args: []
        });
        
        // Create knowledge_base table
        await client.execute({
          sql: `
          CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            topic TEXT NOT NULL,
            content TEXT NOT NULL,
            source TEXT,
            tags TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          args: []
        });
        
        return {
          content: [
            {
              type: "text",
              text: "Memory tables setup completed successfully",
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);