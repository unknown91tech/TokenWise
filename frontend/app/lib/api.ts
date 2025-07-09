import { 
  ApiResponse, 
  Wallet, 
  WalletWithStats, 
  WalletStats, 
  Transaction, 
  TransactionWithWallet, 
  TransactionStats,
  TransactionType,
  MonitoringStatus,
  HealthStatus
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Health endpoints
  async getHealth(): Promise<HealthStatus> {
    const response = await this.request<HealthStatus>('/health');
    return response as any;
  }

  // Wallet endpoints
  async getAllWallets(): Promise<{ wallets: Wallet[]; count: number }> {
    const response = await this.request<{ wallets: Wallet[]; count: number }>('/api/wallets');
    return response.data!;
  }

  async getWalletsWithStats(): Promise<{ wallets: WalletWithStats[]; count: number }> {
    const response = await this.request<{ wallets: WalletWithStats[]; count: number }>('/api/wallets/with-stats');
    return response.data!;
  }

  async getWalletStats(): Promise<WalletStats> {
    const response = await this.request<WalletStats>('/api/wallets/stats');
    return response.data!;
  }

  async getTopActiveWallets(limit: number = 10): Promise<{ wallets: WalletWithStats[]; count: number }> {
    const response = await this.request<{ wallets: WalletWithStats[]; count: number }>(`/api/wallets/top-active?limit=${limit}`);
    return response.data!;
  }

  async getWalletByAddress(address: string): Promise<{ wallet: Wallet }> {
    const response = await this.request<{ wallet: Wallet }>(`/api/wallets/${address}`);
    return response.data!;
  }

  async discoverTopHolders(limit: number = 60): Promise<{ wallets: Wallet[]; count: number }> {
    const response = await this.request<{ wallets: Wallet[]; count: number }>(`/api/wallets/discover?limit=${limit}`, {
      method: 'POST',
    });
    return response.data!;
  }

  async updateWalletBalance(address: string, balance: number, tokenAmount: number): Promise<{ wallet: Wallet }> {
    const response = await this.request<{ wallet: Wallet }>(`/api/wallets/${address}/balance`, {
      method: 'PATCH',
      body: JSON.stringify({ balance, tokenAmount }),
    });
    return response.data!;
  }

  async toggleWalletStatus(address: string, isActive: boolean): Promise<{ wallet: Wallet }> {
    const response = await this.request<{ wallet: Wallet }>(`/api/wallets/${address}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    });
    return response.data!;
  }

  // Enhanced Historical Data Methods
  async discoverBulkHolders(
    limit: number = 100, 
    batchSize: number = 20
  ): Promise<{ discoveryId: string; wallets: Wallet[]; count: number }> {
    const response = await this.request<{ discoveryId: string; wallets: Wallet[]; count: number }>('/api/wallets/discover-bulk', {
      method: 'POST',
      body: JSON.stringify({ limit, batchSize }),
    });
    return response.data!;
  }

  async syncHistoricalData(
    transactionsPerWallet: number = 100,
    batchSize: number = 5,
    walletAddresses: string[] = []
  ): Promise<{ syncId: string; walletsCount: number; message: string }> {
    const response = await this.request<{ syncId: string; walletsCount: number; message: string }>('/api/wallets/sync-historical', {
      method: 'POST',
      body: JSON.stringify({ 
        transactionsPerWallet, 
        batchSize, 
        walletAddresses 
      }),
    });
    return response.data!;
  }

  async getSyncStatus(syncId?: string): Promise<{
    syncId: string;
    status: string;
    progress: { current: number; total: number; percentage: number };
    stats: any;
  }> {
    const params = syncId ? `?syncId=${syncId}` : '';
    const response = await this.request<{
      syncId: string;
      status: string;
      progress: { current: number; total: number; percentage: number };
      stats: any;
    }>(`/api/wallets/sync-status${params}`);
    return response.data!;
  }

  // Transaction endpoints
  async getTransactions(filters: {
    walletAddress?: string;
    type?: TransactionType;
    protocol?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ transactions: TransactionWithWallet[]; count: number; filters: any }> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = `/api/transactions${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<{ transactions: TransactionWithWallet[]; count: number; filters: any }>(endpoint);
    return response.data!;
  }

  async getTransactionStats(startDate?: string, endDate?: string): Promise<TransactionStats> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const endpoint = `/api/transactions/stats${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<TransactionStats>(endpoint);
    return response.data!;
  }

  async getRecentTransactions(limit: number = 20): Promise<{ transactions: TransactionWithWallet[]; count: number }> {
    const response = await this.request<{ transactions: TransactionWithWallet[]; count: number }>(`/api/transactions/recent?limit=${limit}`);
    return response.data!;
  }

  async syncWalletTransactions(address: string, limit: number = 50): Promise<{ walletAddress: string; processedTransactions: number }> {
    const response = await this.request<{ walletAddress: string; processedTransactions: number }>(`/api/transactions/sync/${address}`, {
      method: 'POST',
      body: JSON.stringify({ limit }),
    });
    return response.data!;
  }

  async syncAllWalletTransactions(): Promise<{ success: number; failed: number }> {
    const response = await this.request<{ success: number; failed: number }>('/api/transactions/sync-all', {
      method: 'POST',
    });
    return response.data!;
  }

  async exportTransactions(filters: {
    startDate?: string;
    endDate?: string;
    walletAddress?: string;
    type?: TransactionType;
  } = {}): Promise<string> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const queryString = params.toString();
    const endpoint = `/api/transactions/export${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(`${this.baseURL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return await response.text();
  }

  // NEW: Enhanced Historical Data Methods
  async getHistoricalDataStats(): Promise<{
    totalWallets: number;
    walletsWithTransactions: number;
    totalTransactions: number;
    dateRange: { oldest: Date | null; newest: Date | null };
    topProtocols: Array<{ protocol: string; count: number }>;
  }> {
    const response = await this.request<any>('/api/transactions/historical-stats');
    return response.data!;
  }

  async getHistoricalAnalytics(
    startDate?: string,
    endDate?: string
  ): Promise<{
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
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const queryString = params.toString();
    const endpoint = `/api/transactions/analytics${queryString ? `?${queryString}` : ''}`;
    
    const response = await this.request<any>(endpoint);
    return response.data!;
  }

  async exportHistoricalTransactions(filters: {
    startDate?: string;
    endDate?: string;
    protocols?: string[];
    walletAddresses?: string[];
    transactionTypes?: string[];
  } = {}): Promise<string> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach(item => params.append(key, item));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const queryString = params.toString();
    const endpoint = `/api/transactions/export-historical${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(`${this.baseURL}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return await response.text();
  }

  async cleanupOldTransactions(daysToKeep: number = 30): Promise<{ deletedTransactions: number; daysToKeep: number }> {
    const response = await this.request<{ deletedTransactions: number; daysToKeep: number }>('/api/transactions/cleanup', {
      method: 'DELETE',
      body: JSON.stringify({ daysToKeep }),
    });
    return response.data!;
  }

  async cleanupWithArchive(daysToKeep: number = 30, archiveBeforeDelete: boolean = false): Promise<{ deleted: number; archived?: number }> {
    const response = await this.request<{ deleted: number; archived?: number }>('/api/transactions/cleanup-archive', {
      method: 'POST',
      body: JSON.stringify({ daysToKeep, archiveBeforeDelete }),
    });
    return response.data!;
  }

  // Monitoring endpoints
  async getMonitoringStatus(): Promise<MonitoringStatus> {
    const response = await this.request<MonitoringStatus>('/api/monitoring/status');
    return response.data!;
  }

  async startMonitoring(): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>('/api/monitoring/start', {
      method: 'POST',
    });
    return response.data!;
  }

  async stopMonitoring(): Promise<{ message: string }> {
    const response = await this.request<{ message: string }>('/api/monitoring/stop', {
      method: 'POST',
    });
    return response.data!;
  }

  // Utility methods for complete historical setup
  async performCompleteHistoricalSetup(
    holdersLimit: number = 100,
    transactionsPerWallet: number = 200,
    onProgress?: (stage: string, current: number, total: number) => void
  ): Promise<{
    discoveredWallets: number;
    syncedTransactions: number;
    errors: string[];
  }> {
    try {
      // Step 1: Discover holders
      onProgress?.('discovering', 0, holdersLimit);
      const discoveryResult = await this.discoverTopHolders(holdersLimit);
      onProgress?.('discovering', discoveryResult.count, holdersLimit);

      // Step 2: Sync historical data
      onProgress?.('syncing', 0, discoveryResult.count);
      const syncResult = await this.syncAllWalletTransactions();
      onProgress?.('syncing', syncResult.success, discoveryResult.count);

      return {
        discoveredWallets: discoveryResult.count,
        syncedTransactions: syncResult.success,
        errors: [] // Would collect errors from actual implementation
      };
    } catch (error) {
      throw new Error(`Complete setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get analytics for specific time periods
  async getTransactionAnalyticsPeriod(
    period: '24h' | '7d' | '30d' | '90d' | 'all',
    walletAddress?: string
  ): Promise<TransactionStats> {
    const now = new Date();
    let startDate: string | undefined;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
      default:
        startDate = undefined;
    }
    
    return await this.getTransactionStats(startDate);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);