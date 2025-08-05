/**
 * Simple A2A Server for Turso Database Agent
 * Runs on port 4243
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const TursoAgent = require('./agents/turso_agent');

const app = express();
const port = process.env.A2A_PORT || 4243;
const agent = new TursoAgent();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.get('/discover', async (req, res) => {
  const result = await agent.discover();
  res.json(result);
});

app.post('/communicate', async (req, res) => {
  try {
    const result = await agent.communicate(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/delegate', async (req, res) => {
  try {
    const result = await agent.delegate(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', async (req, res) => {
  const result = await agent.health();
  res.json(result);
});

app.get('/', (req, res) => {
  res.json({
    message: 'Turso A2A Database Agent Server',
    version: '1.0.0',
    port: port,
    endpoints: [
      'GET /discover',
      'POST /communicate',
      'POST /delegate',
      'GET /health'
    ],
    capabilities: [
      'Database queries',
      'Schema management',
      'Data synchronization',
      'Database migrations',
      'Backup and restore'
    ]
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Turso A2A Database Agent running on port ${port}`);
  console.log(`📍 http://localhost:${port}`);
  console.log(`💾 Database capabilities: Query, Schema, Sync, Migrate, Backup`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});