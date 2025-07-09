
import { Request, Response } from 'express';
import { transactionService } from '../services/transactionService';
import { TransactionType } from '@prisma/client';
import { logger } from '../utils/logger';

export class TransactionController {
  /**
   * Get transactions with filters
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const {
        walletAddress,
        type,
        protocol,
        startDate,
        endDate,
        limit = 100,
        offset = 0,
      } = req.query;

      const filters: any = {};

      if (walletAddress) {
        filters.walletAddress = walletAddress as string;
      }

      if (type && Object.values(TransactionType).includes(type as TransactionType)) {
        filters.type = type as TransactionType;
      }

      if (protocol) {
        filters.protocol = protocol as string;
      }

      if (startDate) {
        filters.startDate = new Date(startDate as string);
        if (isNaN(filters.startDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid startDate format',
          });
          return;
        }
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
        if (isNaN(filters.endDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format',
          });
          return;
        }
      }

      const limitNumber = parseInt(limit as string, 10);
      const offsetNumber = parseInt(offset as string, 10);

      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 1000) {
        res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 1000',
        });
        return;
      }

      if (isNaN(offsetNumber) || offsetNumber < 0) {
        res.status(400).json({
          success: false,
          error: 'Offset must be a non-negative number',
        });
        return;
      }

      filters.limit = limitNumber;
      filters.offset = offsetNumber;

      const transactions = await transactionService.getTransactions(filters);

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
          filters: {
            ...filters,
            startDate: filters.startDate?.toISOString(),
            endDate: filters.endDate?.toISOString(),
          },
        },
      });
    } catch (error) {
      logger.error('Error in getTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transactions',
      });
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      let startDateObj: Date | undefined;
      let endDateObj: Date | undefined;

      if (startDate) {
        startDateObj = new Date(startDate as string);
        if (isNaN(startDateObj.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid startDate format',
          });
          return;
        }
      }

      if (endDate) {
        endDateObj = new Date(endDate as string);
        if (isNaN(endDateObj.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format',
          });
          return;
        }
      }

      const stats = await transactionService.getTransactionStats(startDateObj, endDateObj);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getTransactionStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch transaction statistics',
      });
    }
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 20 } = req.query;
      const limitNumber = parseInt(limit as string, 10);

      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
        res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 100',
        });
        return;
      }

      const transactions = await transactionService.getRecentTransactions(limitNumber);

      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
        },
      });
    } catch (error) {
      logger.error('Error in getRecentTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent transactions',
      });
    }
  }

  /**
   * Sync transactions for a specific wallet
   */
  async syncWalletTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const { limit = 50 } = req.body;

      if (!address) {
        res.status(400).json({
          success: false,
          error: 'Wallet address is required',
        });
        return;
      }

      const limitNumber = parseInt(limit as string, 10);
      if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 1000) {
        res.status(400).json({
          success: false,
          error: 'Limit must be a number between 1 and 1000',
        });
        return;
      }

      const processedCount = await transactionService.syncWalletTransactions(address, limitNumber);

      res.json({
        success: true,
        data: {
          walletAddress: address,
          processedTransactions: processedCount,
        },
      });
    } catch (error) {
      logger.error('Error in syncWalletTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync wallet transactions',
      });
    }
  }

  /**
   * Sync transactions for all monitored wallets
   */
  async syncAllWalletTransactions(req: Request, res: Response): Promise<void> {
    try {
      const result = await transactionService.syncAllWalletTransactions();

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in syncAllWalletTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync all wallet transactions',
      });
    }
  }

  /**
   * Export transactions to CSV
   */
  async exportTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, walletAddress, type } = req.query;

      const filters: any = {};

      if (walletAddress) {
        filters.walletAddress = walletAddress as string;
      }

      if (type && Object.values(TransactionType).includes(type as TransactionType)) {
        filters.type = type as TransactionType;
      }

      if (startDate) {
        filters.startDate = new Date(startDate as string);
        if (isNaN(filters.startDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid startDate format',
          });
          return;
        }
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
        if (isNaN(filters.endDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format',
          });
          return;
        }
      }

      const csvData = await transactionService.exportTransactions(filters);

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=transactions_${Date.now()}.csv`);
      res.send(csvData);
    } catch (error) {
      logger.error('Error in exportTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export transactions',
      });
    }
  }

  /**
   * Cleanup old transactions
   */
  async cleanupOldTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { daysToKeep = 30 } = req.body;
      const daysNumber = parseInt(daysToKeep as string, 10);

      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        res.status(400).json({
          success: false,
          error: 'Days to keep must be a number between 1 and 365',
        });
        return;
      }

      const deletedCount = await transactionService.cleanupOldTransactions(daysNumber);

      res.json({
        success: true,
        data: {
          deletedTransactions: deletedCount,
          daysToKeep: daysNumber,
        },
      });
    } catch (error) {
      logger.error('Error in cleanupOldTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old transactions',
      });
    }
  }

  /**
   * Get historical data statistics
   */
  async getHistoricalDataStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await transactionService.getHistoricalDataStats();
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Error in getHistoricalDataStats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch historical data statistics',
      });
    }
  }

  /**
   * Get historical analytics
   */
  async getHistoricalAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      let startDateObj: Date | undefined;
      let endDateObj: Date | undefined;

      if (startDate) {
        startDateObj = new Date(startDate as string);
        if (isNaN(startDateObj.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid startDate format',
          });
          return;
        }
      }

      if (endDate) {
        endDateObj = new Date(endDate as string);
        if (isNaN(endDateObj.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format',
          });
          return;
        }
      }

      const analytics = await transactionService.getHistoricalAnalytics(startDateObj, endDateObj);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Error in getHistoricalAnalytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch historical analytics',
      });
    }
  }

  /**
   * Export historical transactions with advanced filters
   */
  async exportHistoricalTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { 
        startDate, 
        endDate, 
        protocols, 
        walletAddresses, 
        transactionTypes 
      } = req.query;

      const filters: any = {};

      if (startDate) {
        filters.startDate = new Date(startDate as string);
        if (isNaN(filters.startDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid startDate format',
          });
          return;
        }
      }

      if (endDate) {
        filters.endDate = new Date(endDate as string);
        if (isNaN(filters.endDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid endDate format',
          });
          return;
        }
      }

      if (protocols) {
        filters.protocols = Array.isArray(protocols) ? protocols : [protocols];
      }

      if (walletAddresses) {
        filters.walletAddresses = Array.isArray(walletAddresses) ? walletAddresses : [walletAddresses];
      }

      if (transactionTypes) {
        filters.transactionTypes = Array.isArray(transactionTypes) ? transactionTypes : [transactionTypes];
      }

      const csvData = await transactionService.exportHistoricalTransactions(filters);

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=historical_transactions_${Date.now()}.csv`);
      res.send(csvData);
    } catch (error) {
      logger.error('Error in exportHistoricalTransactions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export historical transactions',
      });
    }
  }

  /**
   * Cleanup old transactions with archive option
   */
  async cleanupWithArchive(req: Request, res: Response): Promise<void> {
    try {
      const { daysToKeep = 30, archiveBeforeDelete = false } = req.body;
      const daysNumber = parseInt(daysToKeep as string, 10);

      if (isNaN(daysNumber) || daysNumber < 1 || daysNumber > 365) {
        res.status(400).json({
          success: false,
          error: 'Days to keep must be a number between 1 and 365',
        });
        return;
      }

      const result = await transactionService.cleanupOldTransactionsWithArchive(
        daysNumber, 
        archiveBeforeDelete
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error in cleanupWithArchive:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old transactions',
      });
    }
  }
}

export const transactionController = new TransactionController();
