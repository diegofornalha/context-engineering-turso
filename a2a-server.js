/**
 * A2A Server for Context Engineering Turso
 * Implements Agent2Agent Protocol 1.0
 * Integrates PRP methodology within A2A standards
 */

const BaseA2AServer = require('../BaseA2AServer');
const ContextEngineeringAgent = require('./agents/context_engineering_agent');

const config = {
  port: process.env.A2A_PORT || 9993,
  agentClass: ContextEngineeringAgent,
  agentName: 'Context Engineering Turso Agent',
  basePath: __dirname,
  agentConfig: {
    // Configuration passed to agent
    prpPath: './prp-agent',
    tursoPath: './turso-agent',
    mcpPath: './mcp-turso'
  }
};

const server = new BaseA2AServer(config);

server.start().then(() => {
  console.log(`✅ Context Engineering Turso A2A Server running on port ${config.port}`);
}).catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});