
import './utils/serialization';

import dotenv from 'dotenv';
import http from 'http';
import WebSocket from 'ws';
import express from 'express';
import { corsMiddleware } from './middleware/cors';
import { logger } from './utils/logger';
import walletRoutes from './routes/wallets';
import transactionRoutes from './routes/transactions';
import { databaseConfig } from './config/database';
import { solanaConfig } from './config/solana';
import { walletService } from './services/walletService';
import { transactionService } from './services/transactionService';
import { solanaService } from './services/solanaService';
import cron from 'node-cron';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Create Express app
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

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server for real-time updates
const wss = new WebSocket.Server({ 
  port: parseInt(WS_PORT as string),
  perMessageDeflate: false
});

// Store WebSocket connections
const wsConnections = new Set<WebSocket>();

// Function to broadcast messages to all connected clients
function broadcastToClients(message: any) {
  const messageStr = JSON.stringify(message);
  let clientCount = 0;
  
  wsConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
      clientCount++;
    } else {
      wsConnections.delete(ws);
    }
  });
  
  logger.info(`Broadcasted message to ${clientCount} clients`);
}

// Helper function to handle activity requests
async function handleActivityRequest(ws: WebSocket, data: any) {
  try {
    const walletAddress = data.walletAddress;
    
    if (!walletAddress) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'walletAddress is required for activity request',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // Get recent transactions for the wallet - this returns TransactionWithWallet[]
    const recentTransactions = await transactionService.getTransactions({
      walletAddress,
      limit: 10,
    });

    // Serialize the transactions to handle BigInt
    const serializedTransactions = recentTransactions.map(tx => ({
      ...tx,
      slot: tx.slot?.toString() || '0', // Convert BigInt to string
    }));

    // Send the activity data
    ws.send(JSON.stringify({
      type: 'wallet_activity',
      data: {
        walletAddress,
        transactions: serializedTransactions,
      },
      timestamp: new Date().toISOString()
    }));
    
    logger.info(`Sent activity data for wallet ${walletAddress}`);
    
  } catch (error) {
    logger.error('Error handling activity request:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to fetch wallet activity',
      timestamp: new Date().toISOString()
    }));
  }
}

// Helper function to handle recent transactions request
async function handleRecentTransactionsRequest(ws: WebSocket, data: any) {
  try {
    const limit = data.limit || 20;
    
    // getRecentTransactions calls getTransactions internally and returns TransactionWithWallet[]
    const recentTransactions = await transactionService.getRecentTransactions(limit);
    
    // Serialize the transactions to handle BigInt
    const serializedTransactions = recentTransactions.map((tx: any) => ({
      ...tx,
      slot: tx.slot?.toString() || '0', // Convert BigInt to string
    }));

    ws.send(JSON.stringify({
      type: 'recent_transactions',
      data: {
        transactions: serializedTransactions,
        count: serializedTransactions.length
      },
      timestamp: new Date().toISOString()
    }));
    
    logger.info(`Sent ${serializedTransactions.length} recent transactions`);
    
  } catch (error) {
    logger.error('Error handling recent transactions request:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Failed to fetch recent transactions',
      timestamp: new Date().toISOString()
    }));
  }
}

// Real-time monitoring class
class RealTimeMonitor {
  private subscriptions = new Map<string, number>();
  private isMonitoring = false;

  async startMonitoring(): Promise<void> {
    try {
      logger.info('Starting real-time monitoring...');

      const wallets = await walletService.getAllWallets();
      
      if (wallets.length === 0) {
        logger.warn('No wallets found. Discover wallets first.');
        this.isMonitoring = true; // Set to true anyway so UI shows correct status
        broadcastToClients({
          type: 'monitoring_started',
          data: {
            walletsCount: 0,
            message: 'Monitoring started but no wallets found. Discover wallets first.'
          }
        });
        return;
      }
      
      // Subscribe to account changes for each wallet
      let subscriptionCount = 0;
      for (const wallet of wallets) {
        try {
          const subscriptionId = solanaService.subscribeToAccountChanges(
            wallet.address,
            (accountInfo) => {
              this.handleAccountChange(wallet.address, accountInfo);
            }
          );
          
          this.subscriptions.set(wallet.address, subscriptionId);
          subscriptionCount++;
          logger.info(`Subscribed to wallet ${wallet.address}`);
        } catch (error) {
          logger.error(`Failed to subscribe to wallet ${wallet.address}:`, error);
        }
      }

      this.isMonitoring = true;
      logger.info(`Started monitoring ${subscriptionCount} wallets`);
      
      // Broadcast monitoring status
      broadcastToClients({
        type: 'monitoring_started',
        data: {
          walletsCount: subscriptionCount,
          totalWallets: wallets.length
        }
      });
    } catch (error) {
      logger.error('Error starting real-time monitoring:', error);
      throw error;
    }
  }

  async stopMonitoring(): Promise<void> {
    try {
      logger.info('Stopping real-time monitoring...');

      for (const [walletAddress, subscriptionId] of this.subscriptions) {
        try {
          await solanaService.unsubscribeFromAccountChanges(subscriptionId);
          logger.info(`Unsubscribed from wallet ${walletAddress}`);
        } catch (error) {
          logger.error(`Failed to unsubscribe from wallet ${walletAddress}:`, error);
        }
      }

      this.subscriptions.clear();
      this.isMonitoring = false;
      
      logger.info('Real-time monitoring stopped');
      
      // Broadcast monitoring status
      broadcastToClients({
        type: 'monitoring_stopped',
        data: {}
      });
    } catch (error) {
      logger.error('Error stopping real-time monitoring:', error);
      throw error;
    }
  }

  private async handleAccountChange(walletAddress: string, accountInfo: any): Promise<void> {
    try {
      logger.info(`Account change detected for wallet ${walletAddress}`);
      
      // Sync recent transactions for this wallet
      await transactionService.syncWalletTransactions(walletAddress, 5);
      
      // Get recent transactions to broadcast - this returns TransactionWithWallet[]
      const recentTransactions = await transactionService.getTransactions({
        walletAddress,
        limit: 5,
      });

      // Serialize the transactions to handle BigInt
      const serializedTransactions = recentTransactions.map(tx => ({
        ...tx,
        slot: tx.slot?.toString() || '0', // Convert BigInt to string
      }));

      // Broadcast to all connected clients
      broadcastToClients({
        type: 'wallet_activity',
        data: {
          walletAddress,
          transactions: serializedTransactions,
        }
      });
    } catch (error) {
      logger.error(`Error handling account change for ${walletAddress}:`, error);
    }
  }

  getStatus(): { isMonitoring: boolean; walletsCount: number } {
    return {
      isMonitoring: this.isMonitoring,
      walletsCount: this.subscriptions.size,
    };
  }
}

// Create real-time monitor instance
const realTimeMonitor = new RealTimeMonitor();

// Enhanced WebSocket connection handler
wss.on('connection', (ws: WebSocket, req) => {
  logger.info(`New WebSocket connection established from ${req.socket.remoteAddress}`);
  wsConnections.add(ws);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to TokenWise WebSocket',
    timestamp: new Date().toISOString()
  }));

  // Enhanced message handler with all supported message types
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      logger.info('WebSocket message received:', data);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({ 
            type: 'pong', 
            timestamp: new Date().toISOString() 
          }));
          break;
          
        case 'subscribe':
          ws.send(JSON.stringify({ 
            type: 'subscribed', 
            data: realTimeMonitor.getStatus(),
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'request_activity':
          handleActivityRequest(ws, data);
          break;
          
        case 'get_recent_transactions':
          handleRecentTransactionsRequest(ws, data);
          break;
          
        case 'get_status':
          ws.send(JSON.stringify({
            type: 'status_update',
            data: realTimeMonitor.getStatus(),
            timestamp: new Date().toISOString()
          }));
          break;
          
        case 'start_monitoring':
          realTimeMonitor.startMonitoring()
            .then(() => {
              ws.send(JSON.stringify({
                type: 'monitoring_started',
                data: realTimeMonitor.getStatus(),
                timestamp: new Date().toISOString()
              }));
            })
            .catch((error) => {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to start monitoring',
                error: error.message,
                timestamp: new Date().toISOString()
              }));
            });
          break;
          
        case 'stop_monitoring':
          realTimeMonitor.stopMonitoring()
            .then(() => {
              ws.send(JSON.stringify({
                type: 'monitoring_stopped',
                data: realTimeMonitor.getStatus(),
                timestamp: new Date().toISOString()
              }));
            })
            .catch((error) => {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to stop monitoring',
                error: error.message,
                timestamp: new Date().toISOString()
              }));
            });
          break;
          
        default:
          logger.warn('Unknown WebSocket message type:', data.type);
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: `Unknown message type: ${data.type}. Supported types: ping, subscribe, request_activity, get_recent_transactions, get_status, start_monitoring, stop_monitoring`,
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format. Please send valid JSON.',
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('close', () => {
    wsConnections.delete(ws);
    logger.info('WebSocket connection closed');
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    wsConnections.delete(ws);
  });
});

// Monitoring endpoints
app.get('/api/monitoring/status', (req, res) => {
  res.json({
    success: true,
    data: realTimeMonitor.getStatus(),
  });
});

app.post('/api/monitoring/start', async (req, res) => {
  try {
    await realTimeMonitor.startMonitoring();
    res.json({
      success: true,
      message: 'Real-time monitoring started',
    });
  } catch (error) {
    logger.error('Error starting monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start monitoring',
    });
  }
});

app.post('/api/monitoring/stop', async (req, res) => {
  try {
    await realTimeMonitor.stopMonitoring();
    res.json({
      success: true,
      message: 'Real-time monitoring stopped',
    });
  } catch (error) {
    logger.error('Error stopping monitoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop monitoring',
    });
  }
});

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
      monitoring: '/api/monitoring',
    },
    websocket: {
      url: `wss://tokenwise-1.onrender.com:${WS_PORT}`,
      supportedMessages: [
        'ping',
        'subscribe', 
        'request_activity',
        'get_recent_transactions',
        'get_status',
        'start_monitoring',
        'stop_monitoring'
      ]
    }
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

// Scheduled tasks
if (process.env.NODE_ENV !== 'test') {
  // Sync transactions every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      logger.info('Running scheduled transaction sync...');
      const result = await transactionService.syncAllWalletTransactions();
      logger.info(`Scheduled sync completed: ${result.success} success, ${result.failed} failed`);
      
      // Broadcast sync completion to all connected clients
      broadcastToClients({
        type: 'sync_completed',
        data: result
      });
    } catch (error) {
      logger.error('Scheduled transaction sync failed:', error);
    }
  });
}

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  try {
    await realTimeMonitor.stopMonitoring();
    await databaseConfig.disconnect();
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Start server
async function startServer() {
  try {
    // Connect to database
    await databaseConfig.connect();
    
    // Test Solana connection
    const connectionHealth = await solanaConfig.getConnectionHealth();
    if (connectionHealth) {
      logger.info('Solana connection healthy');
    } else {
      logger.warn('Solana connection unhealthy, using fallback mode');
    }
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`HTTP Server running on port ${PORT}`);
    });
    
    // Start WebSocket server
    logger.info(`WebSocket Server running on port ${WS_PORT}`);
    
    // Initialize monitoring (but don't start automatically)
    logger.info('TokenWise Backend started successfully');
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();