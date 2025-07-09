
export interface Wallet {
  id: string;
  address: string;
  balance: number;
  tokenAmount: number;
  rank: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WalletWithStats extends Wallet {
  transactionCount: number;
  totalBuys: number;
  totalSells: number;
  lastActivity: string | null;
}

export type TransactionType = 'BUY' | 'SELL' | 'TRANSFER';
export type TransactionStatus = 'PENDING' | 'CONFIRMED' | 'FAILED';

export interface Transaction {
  id: string;
  walletId: string;
  walletAddress: string;
  signature: string;
  type: TransactionType;
  amount: number;
  tokenAmount: number;
  protocol: string | null;
  timestamp: string;
  blockTime: string | null;
  slot: string;
  fee: number | null;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

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

export interface WalletStats {
  totalWallets: number;
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
  buyToSellRatio: number;
  recentActivity: TransactionWithWallet[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface WebSocketMessage {
  type: 'wallet_activity' | 'monitoring_started' | 'monitoring_stopped' | 'sync_completed' | 'subscribed' | 'pong' | 'error';
  data?: any;
  message?: string;
}

export interface MonitoringStatus {
  isMonitoring: boolean;
  walletsCount: number;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy';
    solana: 'healthy' | 'unhealthy';
  };
}
