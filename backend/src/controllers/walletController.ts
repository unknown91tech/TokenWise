

import { Request, Response } from 'express';
import { walletService } from '../services/walletService';
import { transactionService } from '../services/transactionService';
import { logger } from '../utils/logger';

export class WalletController {
  /**
   * Discover and store top token holders
   */
  async discoverTopHolders(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 60 } = req.query;
      const limitNumber = parseInt(limit as string, 10);

      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 1000) {
        res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 1000',
        });
        return;
      }

      const wallets = await walletService.discoverTopHolders(limitNumber);

      res.json({
        success: true,
        data: {
          wallets,
          count: wallets.length,
        },
      });
    } catch (error) {
      logger.error('Error in discoverTopHolders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to discover top holders',
      });
    }
  }

  /**
   * Discover bulk token holders with progress tracking
   */
  async discoverBulkHolders(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 100, batchSize = 20 } = req.body;
      
      if (limit > 1000) {
        res.status(400).json({
          success: false,
          error: 'Limit cannot exceed 1000',
        });
        return;
      }

      // Start the discovery process
      const discoveryId = `discovery_${Date.now()}`;
      
      // You might want to implement a job queue here for production
      // For now, we'll process it directly
      const wallets = await walletService.discoverTopHolders(limit);

      res.json({
        success: true,
        data: {
          discoveryId,
          wallets,
          count: wallets.length,
        },
      });
    } catch (error) {
      logger.error('Error in discoverBulkHolders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to discover bulk holders',
      });
    }
  }

  /**
   * Sync historical data for all wallets with progress tracking
   */
  async syncHistoricalData(req: Request, res: Response): Promise<void> {
    try {
      const { 
        transactionsPerWallet = 100, 
        batchSize = 5,
        walletAddresses = [] 
      } = req.body;

      let walletsToSync;
      
      if (walletAddresses.length > 0) {
        // Sync specific wallets
        walletsToSync = walletAddresses;
      } else {
        // Sync all active wallets
        const walletsResponse = await walletService.getAllWallets();
        walletsToSync = walletsResponse.map(w => w.address);
      }

      if (walletsToSync.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No wallets found to sync',
        });
        return;
      }

      // Start background sync process
      const syncId = `sync_${Date.now()}`;
      
      // Process in background (you might want to use a proper job queue)
      setImmediate(async () => {
        await this.performBulkSync(syncId, walletsToSync, transactionsPerWallet, batchSize);
      });

      res.json({
        success: true,
        data: {
          syncId,
          walletsCount: walletsToSync.length,
          message: 'Historical sync started',
        },
      });
    } catch (error) {
      logger.error('Error in syncHistoricalData:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start historical sync',
      });
    }
  }

  /**
   * Get sync status for progress tracking
   */
  async getSyncStatus(req: Request, res: Response): Promise<void> {
    try {
      const { syncId } = req.query;
      
      // In a real implementation, you'd store sync status in Redis or database
      // For now, return basic stats
      const stats = await walletService.getWalletStats();
      
      res.json({
        success: true,
        data: {
          syncId,
          status: 'completed', // This would be tracked properly
          progress: {
            current: stats.totalWallets,
            total: stats.totalWallets,
            percentage: 100,
          },
          stats,
        },
      });
    } catch (error) {
      logger.error('Error in getSyncStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sync status',
      });
    }
  }

  /**
   * Perform bulk sync in background
   */
  private async performBulkSync(
    syncId: string,
    walletAddresses: string[],
    transactionsPerWallet: number,
    batchSize: number
  ): Promise<void> {
    try {
      logger.info(`Starting bulk sync ${syncId} for ${walletAddresses.length} wallets`);
      
      let successCount = 0;
      let failedCount = 0;

      // Process wallets in batches
      for (let i = 0; i < walletAddresses.length; i += batchSize) {
        const batch = walletAddresses.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (address) => {
          try {
            await transactionService.syncWalletTransactions(address, transactionsPerWallet);
            return { success: true, address };
          } catch (error) {
            logger.error(`Failed to sync wallet ${address}:`, error);
            return { success: false, address, error };
          }
        });

        const results = await Promise.allSettled(batchPromises);
        
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.success) {
            successCount++;
          } else {
            failedCount++;
          }
        });

        // Add delay between batches
        if (i + batchSize < walletAddresses.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Log progress
        logger.info(`Bulk sync ${syncId} progress: ${i + batch.length}/${walletAddresses.length}`);
      }

      logger.info(`Bulk sync ${syncId} completed: ${successCount} success, ${failedCount} failed`);
    } catch (error) {
      logger.error(`Bulk sync ${syncId} failed:`, error);
    }
  }

  /**
   * Get all monitored wallets
   */
  async getAllWallets(req: Request, res: Response): Promise<void> {
    try {
      const wallets = await walletService.getAllWallets();

      res.json({
        success: true,
        data: {
          wallets,
          count: wallets.length,
        },
      });
    } catch (error) {
      logger.error('Error in getAllWallets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallets',
      });
    }
  }

  /**
   * Get wallets with statistics
   */
  async getWalletsWithStats(req: Request, res: Response): Promise<void> {
    try {
      const wallets = await walletService.getWalletsWithStats();

      res.json({
        success: true,
        data: {
          wallets,
          count: wallets.length,
        },
      });
    } catch (error) {
      logger.error('Error in getWalletsWithStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallets with stats',
      });
    }
  }

  /**
   * Get wallet by address
   */
  async getWalletByAddress(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      if (!address) {
        res.status(400).json({
          success: false,
          error: 'Wallet address is required',
        });
        return;
      }

      const wallet = await walletService.getWalletByAddress(address);

      if (!wallet) {
        res.status(404).json({
          success: false,
          error: 'Wallet not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { wallet },
      });
    } catch (error) {
      logger.error('Error in getWalletByAddress:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet',
      });
    }
  }

  /**
   * Get top active wallets
   */
  async getTopActiveWallets(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;
      const limitNumber = parseInt(limit as string, 10);

      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 50) {
        res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 50',
        });
        return;
      }

      const wallets = await walletService.getTopActiveWallets(limitNumber);

      res.json({
        success: true,
        data: {
          wallets,
          count: wallets.length,
        },
      });
    } catch (error) {
      logger.error('Error in getTopActiveWallets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top active wallets',
      });
    }
  }

  /**
   * Update wallet balance
   */
  async updateWalletBalance(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { balance, tokenAmount } = req.body;

      if (!address) {
        res.status(400).json({
          success: false,
          error: 'Wallet address is required',
        });
        return;
      }

      if (typeof balance !== 'number' || typeof tokenAmount !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Balance and tokenAmount must be numbers',
        });
        return;
      }

      const wallet = await walletService.updateWalletBalance(address, balance, tokenAmount);

      res.json({
        success: true,
        data: { wallet },
      });
    } catch (error) {
      logger.error('Error in updateWalletBalance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update wallet balance',
      });
    }
  }

  /**
   * Activate/Deactivate wallet monitoring
   */
  async toggleWalletStatus(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { isActive } = req.body;

      if (!address) {
        res.status(400).json({
          success: false,
          error: 'Wallet address is required',
        });
        return;
      }

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'isActive must be a boolean',
        });
        return;
      }

      const wallet = isActive
        ? await walletService.activateWallet(address)
        : await walletService.deactivateWallet(address);

      res.json({
        success: true,
        data: { wallet },
      });
    } catch (error) {
      logger.error('Error in toggleWalletStatus:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to toggle wallet status',
      });
    }
  }

  /**
   * Get wallet statistics summary
   */
  async getWalletStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await walletService.getWalletStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getWalletStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch wallet statistics',
      });
    }
  }
}

export const walletController = new WalletController();