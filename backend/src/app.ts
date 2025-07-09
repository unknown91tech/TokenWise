
import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { logger } from './utils/logger';
import walletRoutes from './routes/wallets';
import transactionRoutes from './routes/transactions';
import { databaseConfig } from './config/database';
import { solanaConfig } from './config/solana';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await databaseConfig.healthCheck();
    const solanaHealth = await solanaConfig.getConnectionHealth();

    const health = {
      status: dbHealth && solanaHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        solana: solanaHealth ? 'healthy' : 'unhealthy',
      },
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
});

// API Routes
app.use('/api/wallets', walletRoutes);
app.use('/api/transactions', transactionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TokenWise Backend',
    version: '1.0.0',
    description: 'Real-time wallet intelligence on Solana',
    endpoints: {
      health: '/health',
      wallets: '/api/wallets',
      transactions: '/api/transactions',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

export default app;