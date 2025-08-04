require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const logger = require('./utils/logger');
const config = require('./config');

const PORT = config.port || 3000;

// Database connection
const connectDB = async () => {
  try {
    const mongoUri = config.db.uri || `mongodb://${config.db.host}:${config.db.port}/${config.db.name}`;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  await connectDB();
  
  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.env} mode`);
    logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(async () => {
      logger.info('HTTP server closed');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection:', err);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(1);
    });
  });
};

startServer();