
import { prisma } from '../config/database';
import { solanaService } from './solanaService';
import { logger } from '../utils/logger';
import { serializeBigInt } from '../utils/serialization';
import { Wallet } from '@prisma/client';

export interface WalletWithStats extends Wallet {
  transactionCount: number;
  totalBuys: number;
  totalSells: number;
  lastActivity: Date | null;
}

export interface WalletStats {
  totalWallets: number;
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
  buyToSellRatio: number;
  recentActivity: any[]; // We'll serialize this properly
}

export class WalletService {
  /**
   * Discover and store top token holders
   */
  async discoverTopHolders(limit: number = 60): Promise<Wallet[]> {
    try {
      logger.info(`Discovering top ${limit} token holders`);
      
      const topHolders = await solanaService.getTopTokenHolders(limit);
      const wallets: Wallet[] = [];

      for (let i = 0; i < topHolders.length; i++) {
        const holder = topHolders[i];
        
        const wallet = await prisma.wallet.upsert({
          where: { address: holder.owner },
          update: {
            balance: holder.uiAmount,
            tokenAmount: holder.uiAmount,
            rank: i + 1,
            isActive: true,
            updatedAt: new Date(),
          },
          create: {
            address: holder.owner,
            balance: holder.uiAmount,
            tokenAmount: holder.uiAmount,
            rank: i + 1,
            isActive: true,
          },
        });

        wallets.push(wallet);
      }

      logger.info(`Successfully stored ${wallets.length} top holders`);
      return wallets;
    } catch (error) {
      logger.error('Error discovering top holders:', error);
      throw error;
    }
  }

  /**
   * Get all monitored wallets
   */
  async getAllWallets(): Promise<Wallet[]> {
    try {
      return await prisma.wallet.findMany({
        where: { isActive: true },
        orderBy: { rank: 'asc' },
      });
    } catch (error) {
      logger.error('Error fetching wallets:', error);
      throw error;
    }
  }

  /**
   * Get wallet by address
   */
  async getWalletByAddress(address: string): Promise<Wallet | null> {
    try {
      return await prisma.wallet.findUnique({
        where: { address },
      });
    } catch (error) {
      logger.error(`Error fetching wallet ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get wallets with transaction statistics
   */
  async getWalletsWithStats(): Promise<WalletWithStats[]> {
    try {
      const walletsWithCounts = await prisma.wallet.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: { transactions: true },
          },
        },
        orderBy: { rank: 'asc' },
      });

      const result: WalletWithStats[] = [];

      for (const wallet of walletsWithCounts) {
        // Get transaction stats for each wallet
        const [buyCount, sellCount, lastTransaction] = await Promise.all([
          prisma.transaction.count({
            where: { walletId: wallet.id, type: 'BUY' },
          }),
          prisma.transaction.count({
            where: { walletId: wallet.id, type: 'SELL' },
          }),
          prisma.transaction.findFirst({
            where: { walletId: wallet.id },
            orderBy: { timestamp: 'desc' },
            select: { timestamp: true },
          }),
        ]);

        result.push({
          ...wallet,
          transactionCount: wallet._count.transactions,
          totalBuys: buyCount,
          totalSells: sellCount,
          lastActivity: lastTransaction?.timestamp || null,
        });
      }

      return result;
    } catch (error) {
      logger.error('Error fetching wallets with stats:', error);
      throw error;
    }
  }

  /**
   * Get top active wallets
   */
  async getTopActiveWallets(limit: number = 10): Promise<WalletWithStats[]> {
    try {
      const walletsWithStats = await this.getWalletsWithStats();
      
      // Sort by transaction count and return top N
      return walletsWithStats
        .sort((a, b) => b.transactionCount - a.transactionCount)
        .slice(0, limit);
    } catch (error) {
      logger.error('Error fetching top active wallets:', error);
      throw error;
    }
  }

  /**
   * Update wallet balance
   */
  async updateWalletBalance(address: string, balance: number, tokenAmount: number): Promise<Wallet> {
    try {
      return await prisma.wallet.update({
        where: { address },
        data: {
          balance,
          tokenAmount,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`Error updating wallet balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Activate wallet monitoring
   */
  async activateWallet(address: string): Promise<Wallet> {
    try {
      return await prisma.wallet.update({
        where: { address },
        data: {
          isActive: true,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`Error activating wallet ${address}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate wallet monitoring
   */
  async deactivateWallet(address: string): Promise<Wallet> {
    try {
      return await prisma.wallet.update({
        where: { address },
        data: {
          isActive: false,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`Error deactivating wallet ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get wallet statistics summary with proper BigInt handling
   */
  async getWalletStats(): Promise<WalletStats> {
    try {
      // Get basic counts
      const [totalWallets, totalTransactions, totalBuys, totalSells] = await Promise.all([
        prisma.wallet.count({ where: { isActive: true } }),
        prisma.transaction.count(),
        prisma.transaction.count({ where: { type: 'BUY' } }),
        prisma.transaction.count({ where: { type: 'SELL' } }),
      ]);

      // Get recent activity with proper serialization
      const recentTransactionsRaw = await prisma.transaction.findMany({
        include: {
          wallet: {
            select: {
              address: true,
              rank: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });

      // Serialize the recent activity to handle BigInt
      const recentActivity = serializeBigInt(recentTransactionsRaw);

      const buyToSellRatio = totalSells > 0 ? totalBuys / totalSells : totalBuys;

      return {
        totalWallets,
        totalTransactions,
        totalBuys,
        totalSells,
        buyToSellRatio,
        recentActivity,
      };
    } catch (error) {
      logger.error('Error fetching wallet stats:', error);
      throw error;
    }
  }

  /**
   * Get wallet count
   */
  async getWalletCount(): Promise<number> {
    try {
      return await prisma.wallet.count({ where: { isActive: true } });
    } catch (error) {
      logger.error('Error getting wallet count:', error);
      throw error;
    }
  }

  /**
   * Delete wallet
   */
  async deleteWallet(address: string): Promise<void> {
    try {
      await prisma.wallet.delete({
        where: { address },
      });
      logger.info(`Deleted wallet ${address}`);
    } catch (error) {
      logger.error(`Error deleting wallet ${address}:`, error);
      throw error;
    }
  }
}

export const walletService = new WalletService();