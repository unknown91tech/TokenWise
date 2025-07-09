
import { prisma } from '../config/database';
import { solanaService, TransactionInfo } from './solanaService';
import { logger } from '../utils/logger';
import { serializeBigInt } from '../utils/serialization';
import { Transaction, TransactionType, TransactionStatus } from '@prisma/client';

export interface TransactionWithWallet extends Transaction {
  wallet: {
    address: string;
    rank: number | null;
  };
}

export interface TransactionStats {
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
  totalTransfers: number;
  protocolBreakdown: Record<string, number>;
  hourlyActivity: Array<{ hour: number; count: number }>;
  topActiveWallets: Array<{ address: string; count: number }>;
}

export interface HistoricalDataStats {
  totalWallets: number;
  walletsWithTransactions: number;
  totalTransactions: number;
  dateRange: { oldest: Date | null; newest: Date | null };
  topProtocols: Array<{ protocol: string; count: number }>;
}

export interface HistoricalAnalytics {
  summary: {
    totalTransactions: number;
    totalVolume: number;
    avgTransactionSize: number;
    uniqueWallets: number;
  };
  trends: {
    dailyVolume: Array<{ date: string; volume: number; transactions: number }>;
    protocolDistribution: Array<{ protocol: string; volume: number; transactions: number }>;
    walletActivity: Array<{ address: string; transactions: number; volume: number }>;
  };
  insights: {
    mostActiveDay: { date: string; transactions: number };
    largestTransaction: { signature: string; amount: number; date: string };
    topTrader: { address: string; transactions: number };
  };
}

export class TransactionService {
  /**
   * Store a new transaction
   */
  async storeTransaction(transactionInfo: TransactionInfo): Promise<Transaction> {
    try {
      // First, ensure the wallet exists
      const wallet = await prisma.wallet.findUnique({
        where: { address: transactionInfo.walletAddress },
      });

      if (!wallet) {
        throw new Error(`Wallet ${transactionInfo.walletAddress} not found`);
      }

      // Check if transaction already exists
      const existingTransaction = await prisma.transaction.findUnique({
        where: { signature: transactionInfo.signature },
      });

      if (existingTransaction) {
        logger.info(`Transaction ${transactionInfo.signature} already exists`);
        return existingTransaction;
      }

      // Create new transaction
      const transaction = await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          walletAddress: transactionInfo.walletAddress,
          signature: transactionInfo.signature,
          type: transactionInfo.type as TransactionType,
          amount: transactionInfo.amount,
          tokenAmount: transactionInfo.tokenAmount,
          protocol: transactionInfo.protocol || 'Unknown',
          timestamp: new Date(transactionInfo.blockTime ? transactionInfo.blockTime * 1000 : Date.now()),
          blockTime: transactionInfo.blockTime ? new Date(transactionInfo.blockTime * 1000) : null,
          slot: BigInt(transactionInfo.slot),
          fee: transactionInfo.fee,
          status: TransactionStatus.CONFIRMED,
        },
      });

      logger.info(`Stored transaction ${transaction.signature} for wallet ${transactionInfo.walletAddress}`);
      return transaction;
    } catch (error) {
      logger.error('Error storing transaction:', error);
      throw error;
    }
  }

  /**
   * Create sample transactions for testing
   */
  async createSampleTransactions(walletAddress: string, count: number = 10): Promise<number> {
    try {
      const wallet = await prisma.wallet.findUnique({
        where: { address: walletAddress },
      });

      if (!wallet) {
        logger.warn(`Wallet ${walletAddress} not found, skipping sample data`);
        return 0;
      }

      let createdCount = 0;
      const now = Date.now();

      for (let i = 0; i < count; i++) {
        const signature = this.generateRandomSignature();
        
        // Check if already exists
        const existing = await prisma.transaction.findUnique({
          where: { signature },
        });

        if (existing) continue;

        const type = this.getRandomTransactionType();
        const protocol = this.getRandomProtocol();
        const amount = Math.random() * 10; // 0-10 SOL
        const tokenAmount = Math.random() * 1000; // 0-1000 tokens
        const timestamp = new Date(now - (i * 3600000)); // Spread over hours

        await prisma.transaction.create({
          data: {
            walletId: wallet.id,
            walletAddress: walletAddress,
            signature: signature,
            type: type,
            amount: amount,
            tokenAmount: tokenAmount,
            protocol: protocol,
            timestamp: timestamp,
            blockTime: timestamp,
            slot: BigInt(Math.floor(Math.random() * 1000000) + 100000000),
            fee: Math.random() * 0.001, // Small fee
            status: TransactionStatus.CONFIRMED,
          },
        });

        createdCount++;
      }

      logger.info(`Created ${createdCount} sample transactions for wallet ${walletAddress}`);
      return createdCount;
    } catch (error) {
      logger.error(`Error creating sample transactions for ${walletAddress}:`, error);
      return 0;
    }
  }

  private generateRandomSignature(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz123456789';
    let signature = '';
    for (let i = 0; i < 88; i++) {
      signature += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return signature;
  }

  private getRandomTransactionType(): TransactionType {
    const types: TransactionType[] = ['BUY', 'SELL', 'TRANSFER'];
    const weights = [0.4, 0.35, 0.25]; // 40% buy, 35% sell, 25% transfer
    const random = Math.random();
    
    if (random < weights[0]) return 'BUY';
    if (random < weights[0] + weights[1]) return 'SELL';
    return 'TRANSFER';
  }

  private getRandomProtocol(): string {
    const protocols = ['Jupiter', 'Raydium', 'Orca', 'Serum', 'Unknown'];
    const weights = [0.35, 0.25, 0.2, 0.1, 0.1];
    const random = Math.random();
    
    let cumulativeWeight = 0;
    for (let i = 0; i < protocols.length; i++) {
      cumulativeWeight += weights[i];
      if (random < cumulativeWeight) {
        return protocols[i];
      }
    }
    return 'Unknown';
  }

  /**
   * Get transactions with optional filters
   */
  async getTransactions(
    filters: {
      walletAddress?: string;
      type?: TransactionType;
      protocol?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<TransactionWithWallet[]> {
    try {
      const where: any = {};

      if (filters.walletAddress) {
        where.walletAddress = filters.walletAddress;
      }

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.protocol) {
        where.protocol = filters.protocol;
      }

      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) {
          where.timestamp.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.timestamp.lte = filters.endDate;
        }
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          wallet: {
            select: {
              address: true,
              rank: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      });

      return transactions;
    } catch (error) {
      logger.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<TransactionStats> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) {
          where.timestamp.gte = startDate;
        }
        if (endDate) {
          where.timestamp.lte = endDate;
        }
      }

      // Get total counts
      const totalTransactions = await prisma.transaction.count({ where });
      const totalBuys = await prisma.transaction.count({
        where: { ...where, type: 'BUY' },
      });
      const totalSells = await prisma.transaction.count({
        where: { ...where, type: 'SELL' },
      });
      const totalTransfers = await prisma.transaction.count({
        where: { ...where, type: 'TRANSFER' },
      });

      // Get protocol breakdown
      const protocolData = await prisma.transaction.groupBy({
        by: ['protocol'],
        where,
        _count: { protocol: true },
      });

      const protocolBreakdown: Record<string, number> = {};
      protocolData.forEach((item) => {
        protocolBreakdown[item.protocol || 'Unknown'] = item._count.protocol;
      });

      // Get hourly activity for the last 24 hours
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const hourlyData = await prisma.$queryRaw<Array<{ hour: number; count: bigint }>>`
        SELECT 
          EXTRACT(HOUR FROM timestamp) as hour,
          COUNT(*) as count
        FROM transactions 
        WHERE timestamp >= ${last24Hours}
        GROUP BY EXTRACT(HOUR FROM timestamp)
        ORDER BY hour
      `;

      const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: 0,
      }));

      hourlyData.forEach((item) => {
        if (item.hour >= 0 && item.hour < 24) {
          hourlyActivity[item.hour] = {
            hour: item.hour,
            count: Number(item.count), // Convert BigInt to number
          };
        }
      });

      // Get top active wallets
      const topActiveWalletsData = await prisma.transaction.groupBy({
        by: ['walletAddress'],
        where,
        _count: { walletAddress: true },
        orderBy: { _count: { walletAddress: 'desc' } },
        take: 10,
      });

      const topActiveWallets = topActiveWalletsData.map((item) => ({
        address: item.walletAddress,
        count: item._count.walletAddress,
      }));

      return {
        totalTransactions,
        totalBuys,
        totalSells,
        totalTransfers,
        protocolBreakdown,
        hourlyActivity,
        topActiveWallets,
      };
    } catch (error) {
      logger.error('Error fetching transaction stats:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit: number = 20): Promise<TransactionWithWallet[]> {
    try {
      return await this.getTransactions({ limit });
    } catch (error) {
      logger.error('Error fetching recent transactions:', error);
      throw error;
    }
  }

  /**
   * Enhanced wallet transaction sync with better error handling and progress
   */
  async syncWalletTransactionsEnhanced(
    walletAddress: string, 
    limit: number = 100,
    onProgress?: (current: number, total: number) => void
  ): Promise<{ processed: number; errors: string[] }> {
    try {
      logger.info(`Enhanced sync for wallet ${walletAddress} (limit: ${limit})`);
      
      const errors: string[] = [];
      let processedCount = 0;

      // Use sample data for development
      if (process.env.USE_SAMPLE_DATA === 'true' || process.env.SKIP_REAL_TRANSACTIONS === 'true') {
        const sampleCount = Math.min(limit, 20);
        processedCount = await this.createSampleTransactions(walletAddress, sampleCount);
        onProgress?.(processedCount, sampleCount);
        return { processed: processedCount, errors };
      }

      // Real Solana data fetching
      try {
        const signatures = await solanaService.getWalletTransactions(walletAddress, limit);
        onProgress?.(0, signatures.length);

        for (let i = 0; i < signatures.length; i++) {
          try {
            const transactionInfo = await solanaService.parseTransaction(signatures[i].signature);
            
            if (transactionInfo) {
              await this.storeTransaction(transactionInfo);
              processedCount++;
            }
            
            onProgress?.(i + 1, signatures.length);
          } catch (error) {
            const errorMsg = `Failed to process transaction ${signatures[i].signature}: ${error}`;
            errors.push(errorMsg);
            logger.error(errorMsg);
          }

          // Rate limiting delay
          if (i % 10 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      } catch (error) {
        const errorMsg = `Failed to fetch transactions for ${walletAddress}: ${error}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }

      logger.info(`Enhanced sync completed for ${walletAddress}: ${processedCount} processed, ${errors.length} errors`);
      return { processed: processedCount, errors };
    } catch (error) {
      logger.error(`Enhanced sync failed for wallet ${walletAddress}:`, error);
      throw error;
    }
  }

  /**
   * Sync historical transactions for a wallet with enhanced error handling
   */
  async syncWalletTransactions(walletAddress: string, limit: number = 50): Promise<number> {
    try {
      logger.info(`Syncing transactions for wallet ${walletAddress}`);
      
      // Check if we should use sample data
      if (process.env.USE_SAMPLE_DATA === 'true' || process.env.SKIP_REAL_TRANSACTIONS === 'true') {
        logger.info(`Using sample data for wallet ${walletAddress}`);
        return await this.createSampleTransactions(walletAddress, Math.min(limit, 10));
      }

      const signatures = await solanaService.getWalletTransactions(walletAddress, limit);
      let processedCount = 0;

      for (const signatureInfo of signatures) {
        try {
          const transactionInfo = await solanaService.parseTransaction(signatureInfo.signature);
          
          if (transactionInfo) {
            await this.storeTransaction(transactionInfo);
            processedCount++;
          }
        } catch (error) {
          logger.error(`Error processing transaction ${signatureInfo.signature}:`, error);
          // Continue with other transactions
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(`Synced ${processedCount} transactions for wallet ${walletAddress}`);
      return processedCount;
    } catch (error) {
      logger.error(`Error syncing transactions for wallet ${walletAddress}:`, error);
      
      // Fallback to sample data if real sync fails
      if (process.env.NODE_ENV === 'development') {
        logger.info(`Fallback: Creating sample transactions for ${walletAddress}`);
        return await this.createSampleTransactions(walletAddress, 5);
      }
      
      throw error;
    }
  }

  /**
   * Sync transactions for all monitored wallets with better batching
   */
  async syncAllWalletTransactions(): Promise<{ success: number; failed: number }> {
    try {
      const wallets = await prisma.wallet.findMany({
        where: { isActive: true },
        select: { address: true },
      });

      let successCount = 0;
      let failedCount = 0;

      logger.info(`Starting sync for ${wallets.length} wallets`);

      // Process wallets in smaller batches to avoid overwhelming the RPC
      const batchSize = 5;
      for (let i = 0; i < wallets.length; i += batchSize) {
        const batch = wallets.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (wallet) => {
          try {
            await this.syncWalletTransactions(wallet.address, 5); // Reduced limit
            return { success: true, address: wallet.address };
          } catch (error) {
            logger.error(`Failed to sync wallet ${wallet.address}:`, error);
            return { success: false, address: wallet.address };
          }
        });

        const results = await Promise.allSettled(batchPromises);
        
        results.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              successCount++;
            } else {
              failedCount++;
            }
          } else {
            failedCount++;
          }
        });

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < wallets.length) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      logger.info(`Sync completed: ${successCount} success, ${failedCount} failed`);
      return { success: successCount, failed: failedCount };
    } catch (error) {
      logger.error('Error syncing all wallet transactions:', error);
      throw error;
    }
  }

  /**
   * Get historical data statistics
   */
  async getHistoricalDataStats(): Promise<HistoricalDataStats> {
    try {
      const [
        totalWallets,
        walletsWithTransactions,
        totalTransactions,
        protocolStats,
        dateRange
      ] = await Promise.all([
        prisma.wallet.count({ where: { isActive: true } }),
        prisma.wallet.count({
          where: {
            isActive: true,
            transactions: { some: {} }
          }
        }),
        prisma.transaction.count(),
        prisma.transaction.groupBy({
          by: ['protocol'],
          _count: { protocol: true },
          orderBy: { _count: { protocol: 'desc' } },
          take: 10
        }),
        prisma.transaction.aggregate({
          _min: { timestamp: true },
          _max: { timestamp: true }
        })
      ]);

      const topProtocols = protocolStats.map(stat => ({
        protocol: stat.protocol || 'Unknown',
        count: stat._count.protocol
      }));

      return {
        totalWallets,
        walletsWithTransactions,
        totalTransactions,
        dateRange: {
          oldest: dateRange._min.timestamp,
          newest: dateRange._max.timestamp
        },
        topProtocols
      };
    } catch (error) {
      logger.error('Error getting historical data stats:', error);
      throw error;
    }
  }

  /**
   * Get historical analytics with comprehensive insights
   */
  async getHistoricalAnalytics(
    startDate?: Date,
    endDate?: Date
  ): Promise<HistoricalAnalytics> {
    try {
      const where: any = {};
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      // Summary stats
      const [totalTransactions, volumeAgg, uniqueWallets] = await Promise.all([
        prisma.transaction.count({ where }),
        prisma.transaction.aggregate({
          where,
          _sum: { amount: true },
          _avg: { amount: true }
        }),
        prisma.transaction.findMany({
          where,
          select: { walletAddress: true },
          distinct: ['walletAddress']
        })
      ]);

      // Daily trends
      const dailyTrends = await prisma.$queryRaw<Array<{
        date: string;
        volume: number;
        transactions: bigint;
      }>>`
        SELECT 
          DATE(timestamp) as date,
          SUM(amount) as volume,
          COUNT(*) as transactions
        FROM transactions 
        ${startDate || endDate ? 'WHERE timestamp BETWEEN ? AND ?' : ''}
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
        LIMIT 30
      `;

      // Protocol distribution
      const protocolDist = await prisma.transaction.groupBy({
        by: ['protocol'],
        where,
        _sum: { amount: true },
        _count: { protocol: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 10
      });

      // Wallet activity
      const walletActivity = await prisma.transaction.groupBy({
        by: ['walletAddress'],
        where,
        _count: { walletAddress: true },
        _sum: { amount: true },
        orderBy: { _count: { walletAddress: 'desc' } },
        take: 20
      });

      // Insights
      const [largestTx, mostActiveWallet] = await Promise.all([
        prisma.transaction.findFirst({
          where,
          orderBy: { amount: 'desc' },
          select: { signature: true, amount: true, timestamp: true }
        }),
        walletActivity[0]
      ]);

      return {
        summary: {
          totalTransactions,
          totalVolume: volumeAgg._sum.amount || 0,
          avgTransactionSize: volumeAgg._avg.amount || 0,
          uniqueWallets: uniqueWallets.length
        },
        trends: {
          dailyVolume: dailyTrends.map(d => ({
            date: d.date,
            volume: d.volume,
            transactions: Number(d.transactions)
          })),
          protocolDistribution: protocolDist.map(p => ({
            protocol: p.protocol || 'Unknown',
            volume: p._sum.amount || 0,
            transactions: p._count.protocol
          })),
          walletActivity: walletActivity.map(w => ({
            address: w.walletAddress,
            transactions: w._count.walletAddress,
            volume: w._sum.amount || 0
          }))
        },
        insights: {
          mostActiveDay: dailyTrends[0] ? {
            date: dailyTrends[0].date,
            transactions: Number(dailyTrends[0].transactions)
          } : { date: '', transactions: 0 },
          largestTransaction: largestTx ? {
            signature: largestTx.signature,
            amount: largestTx.amount,
            date: largestTx.timestamp.toISOString()
          } : { signature: '', amount: 0, date: '' },
          topTrader: mostActiveWallet ? {
            address: mostActiveWallet.walletAddress,
            transactions: mostActiveWallet._count.walletAddress
          } : { address: '', transactions: 0 }
        }
      };
    } catch (error) {
      logger.error('Error getting historical analytics:', error);
      throw error;
    }
  }

  /**
   * Export transactions to CSV format
   */
  async exportTransactions(
    filters: {
      startDate?: Date;
      endDate?: Date;
      walletAddress?: string;
      type?: TransactionType;
    } = {}
  ): Promise<string> {
    try {
      const transactions = await this.getTransactions({
        ...filters,
        limit: 10000, // Large limit for export
      });

      // CSV header
      const csvHeader = 'Timestamp,Wallet Address,Type,Amount (SOL),Token Amount,Protocol,Signature,Fee\n';
      
      // CSV rows
      const csvRows = transactions.map(tx => {
        const timestamp = new Date(tx.timestamp).toISOString();
        const walletAddress = tx.walletAddress;
        const type = tx.type;
        const amount = tx.amount.toString();
        const tokenAmount = tx.tokenAmount.toString();
        const protocol = tx.protocol || 'Unknown';
        const signature = tx.signature;
        const fee = tx.fee?.toString() || '0';
        
        return `${timestamp},${walletAddress},${type},${amount},${tokenAmount},${protocol},${signature},${fee}`;
      }).join('\n');

      return csvHeader + csvRows;
    } catch (error) {
      logger.error('Error exporting transactions:', error);
      throw error;
    }
  }

  /**
   * Export historical transactions with advanced filters
   */
  async exportHistoricalTransactions(
    filters: {
      startDate?: Date;
      endDate?: Date;
      protocols?: string[];
      walletAddresses?: string[];
      transactionTypes?: TransactionType[];
    } = {}
  ): Promise<string> {
    try {
      const where: any = {};

      if (filters.startDate || filters.endDate) {
        where.timestamp = {};
        if (filters.startDate) where.timestamp.gte = filters.startDate;
        if (filters.endDate) where.timestamp.lte = filters.endDate;
      }

      if (filters.protocols && filters.protocols.length > 0) {
        where.protocol = { in: filters.protocols };
      }

      if (filters.walletAddresses && filters.walletAddresses.length > 0) {
        where.walletAddress = { in: filters.walletAddresses };
      }

      if (filters.transactionTypes && filters.transactionTypes.length > 0) {
        where.type = { in: filters.transactionTypes };
      }

      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          wallet: {
            select: {
              address: true,
              rank: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 50000, // Limit for performance
      });

      // Enhanced CSV with more fields
      const csvHeader = [
        'Timestamp',
        'Date',
        'Time',
        'Wallet Address',
        'Wallet Rank',
        'Transaction Type',
        'Token Amount',
        'SOL Amount',
        'Protocol',
        'Transaction Signature',
        'Fee (SOL)',
        'Status',
        'Block Time',
        'Slot'
      ].join(',') + '\n';

      const csvRows = transactions.map(tx => {
        const timestamp = new Date(tx.timestamp);
        const date = timestamp.toISOString().split('T')[0];
        const time = timestamp.toTimeString().split(' ')[0];
        
        return [
          tx.timestamp.toISOString(),
          date,
          time,
          tx.walletAddress,
          tx.wallet.rank || 'N/A',
          tx.type,
          tx.tokenAmount.toString(),
          tx.amount.toString(),
          tx.protocol || 'Unknown',
          tx.signature,
          tx.fee?.toString() || '0',
          tx.status,
          tx.blockTime?.toISOString() || '',
          tx.slot?.toString() || ''
        ].map(field => `"${field}"`).join(',');
      }).join('\n');

      return csvHeader + csvRows;
    } catch (error) {
      logger.error('Error exporting historical transactions:', error);
      throw error;
    }
  }

  /**
   * Cleanup old transactions
   */
  async cleanupOldTransactions(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const result = await prisma.transaction.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Cleaned up ${result.count} old transactions`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up old transactions:', error);
      throw error;
    }
  }

  /**
   * Clean up old transactions with archive option
   */
  async cleanupOldTransactionsWithArchive(
    daysToKeep: number = 30,
    archiveBeforeDelete: boolean = false
  ): Promise<{ deleted: number; archived?: number }> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      let archivedCount = 0;
      
      if (archiveBeforeDelete) {
        // Export data before deletion
        const archiveData = await this.exportHistoricalTransactions({
          endDate: cutoffDate
        });
        
        // Save to file system or cloud storage
        const fs = require('fs').promises;
        const archiveFileName = `archive_${cutoffDate.toISOString().split('T')[0]}.csv`;
        
        // Ensure archives directory exists
        try {
          await fs.mkdir('./archives', { recursive: true });
        } catch (err) {
          // Directory might already exist
        }
        
        await fs.writeFile(`./archives/${archiveFileName}`, archiveData);
        
        archivedCount = archiveData.split('\n').length - 2; // Subtract header and last empty line
      }

      const result = await prisma.transaction.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Cleaned up ${result.count} old transactions, archived: ${archivedCount}`);
      return { deleted: result.count, archived: archivedCount };
    } catch (error) {
      logger.error('Error cleaning up old transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction count by wallet
   */
  async getTransactionCountByWallet(): Promise<Record<string, number>> {
    try {
      const results = await prisma.transaction.groupBy({
        by: ['walletAddress'],
        _count: { walletAddress: true },
      });

      const counts: Record<string, number> = {};
      results.forEach((result) => {
        counts[result.walletAddress] = result._count.walletAddress;
      });

      return counts;
    } catch (error) {
      logger.error('Error getting transaction counts by wallet:', error);
      throw error;
    }
  }

  /**
   * Populate sample data for all wallets (development only)
   */
  async populateSampleDataForAllWallets(): Promise<{ walletsProcessed: number; transactionsCreated: number }> {
    try {
      if (process.env.NODE_ENV !== 'development') {
        throw new Error('Sample data population only allowed in development mode');
      }

      const wallets = await prisma.wallet.findMany({
        where: { isActive: true },
        select: { address: true },
      });

      let walletsProcessed = 0;
      let totalTransactionsCreated = 0;

      for (const wallet of wallets) {
        try {
          const transactionsCreated = await this.createSampleTransactions(
            wallet.address, 
            Math.floor(Math.random() * 15) + 5 // 5-20 transactions per wallet
          );
          
          if (transactionsCreated > 0) {
            walletsProcessed++;
            totalTransactionsCreated += transactionsCreated;
          }

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (error) {
          logger.error(`Error creating sample data for wallet ${wallet.address}:`, error);
        }
      }

      logger.info(`Sample data populated: ${walletsProcessed} wallets, ${totalTransactionsCreated} transactions`);
      return { walletsProcessed, transactionsCreated: totalTransactionsCreated };
    } catch (error) {
      logger.error('Error populating sample data:', error);
      throw error;
    }
  }
}

export const transactionService = new TransactionService();