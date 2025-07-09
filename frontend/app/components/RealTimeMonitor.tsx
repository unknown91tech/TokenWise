
'use client';

import React, { useState, useEffect } from 'react';

// Extend the Window interface to include 'ws'
declare global {
  interface Window {
    ws?: WebSocket;
  }
}
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { useWebSocket } from '../hooks/useWebSocket';
import { TransactionWithWallet, WebSocketMessage, MonitoringStatus } from '../lib/types';
import { apiClient } from '../lib/api';
import { formatAddress, formatNumber, formatRelativeTime } from '../lib/utils';
import { 
  Play, 
  Pause, 
  Wifi, 
  WifiOff, 
  Activity, 
  AlertCircle, 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Zap,
  Clock,
  Database,
  Signal,
  Users,
  DollarSign,
  Monitor,
  CheckCircle2,
  XCircle,
  Radio
} from 'lucide-react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';

interface ConnectionStats {
  isConnected: boolean;
  isConnecting: boolean;
  connectionTime: number | null;
  messagesReceived: number;
  lastMessageTime: number | null;
}

const ConnectionIndicator = ({ 
  isConnected, 
  isConnecting, 
  stats 
}: { 
  isConnected: boolean; 
  isConnecting: boolean;
  stats: ConnectionStats;
}) => {
  const getStatusColor = () => {
    if (isConnected) return 'text-green-600 dark:text-green-400';
    if (isConnecting) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStatusBg = () => {
    if (isConnected) return 'bg-green-100 dark:bg-green-900/20';
    if (isConnecting) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isConnecting) return 'Connecting...';
    return 'Disconnected';
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-full ${getStatusBg()} flex items-center justify-center`}>
        {isConnected ? (
          <Signal className={`h-5 w-5 ${getStatusColor()}`} />
        ) : isConnecting ? (
          <RefreshCw className={`h-5 w-5 ${getStatusColor()} animate-spin`} />
        ) : (
          <XCircle className={`h-5 w-5 ${getStatusColor()}`} />
        )}
      </div>
      <div>
        <p className={`font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>
        <p className="text-xs text-muted-foreground">
          {stats.messagesReceived} messages received
        </p>
      </div>
    </div>
  );
};

const TransactionCard = ({ 
  transaction, 
  isNew = false 
}: { 
  transaction: TransactionWithWallet;
  isNew?: boolean;
}) => {
  const getTransactionTypeColor = (type: string) => {
    switch (type.toUpperCase()) {
      case 'BUY':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'SELL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'TRANSFER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getProtocolColor = (protocol: string) => {
    switch (protocol?.toLowerCase()) {
      case 'jupiter':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'raydium':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'orca':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-300';
      case 'serum':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg transition-all duration-300 ${
        isNew 
          ? 'bg-primary/5 border-primary shadow-md animate-pulse' 
          : 'hover:bg-muted/50'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Badge className={getTransactionTypeColor(transaction.type)}>
            {transaction.type === 'BUY' ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : transaction.type === 'SELL' ? (
              <TrendingDown className="h-3 w-3 mr-1" />
            ) : (
              <Activity className="h-3 w-3 mr-1" />
            )}
            {transaction.type}
          </Badge>
          
          {transaction.protocol && (
            <Badge className={getProtocolColor(transaction.protocol)}>
              {transaction.protocol}
            </Badge>
          )}

          {isNew && (
            <Badge variant="default" className="bg-green-500 text-white animate-pulse">
              NEW
            </Badge>
          )}
        </div>
        
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatRelativeTime(transaction.timestamp)}
        </span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground text-xs mb-1">Wallet</p>
          <div className="flex items-center gap-2">
            <code className="text-xs font-mono">
              {formatAddress(transaction.walletAddress)}
            </code>
            <Badge variant="outline" className="text-xs px-1">
              #{transaction.wallet.rank || 'N/A'}
            </Badge>
          </div>
        </div>
        
        <div>
          <p className="text-muted-foreground text-xs mb-1">Token Amount</p>
          <p className="font-mono font-medium">{formatNumber(transaction.tokenAmount)}</p>
        </div>
        
        <div>
          <p className="text-muted-foreground text-xs mb-1">SOL Amount</p>
          <p className="font-mono font-medium flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {formatNumber(transaction.amount)}
          </p>
        </div>
        
        <div>
          <p className="text-muted-foreground text-xs mb-1">Signature</p>
          <code className="text-xs">{formatAddress(transaction.signature, 8)}</code>
        </div>
      </div>
    </div>
  );
};

export function RealTimeMonitor() {
  const [recentTransactions, setRecentTransactions] = useState<TransactionWithWallet[]>([]);
  const [newTransactionIds, setNewTransactionIds] = useState<Set<string>>(new Set());
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityCount, setActivityCount] = useState(0);
  const [connectionStats, setConnectionStats] = useState<ConnectionStats>({
    isConnected: false,
    isConnecting: false,
    connectionTime: null,
    messagesReceived: 0,
    lastMessageTime: null,
  });

  // WebSocket message handler
  const handleWebSocketMessage = (message: WebSocketMessage) => {
    setConnectionStats(prev => ({
      ...prev,
      messagesReceived: prev.messagesReceived + 1,
      lastMessageTime: Date.now(),
    }));

    switch (message.type) {
      case 'wallet_activity':
        if (message.data?.transactions) {
          const newTransactions = message.data.transactions;
          
          setRecentTransactions(prev => {
            const combined = [...newTransactions, ...prev];
            const unique = combined.filter((tx, index, arr) => 
              arr.findIndex(t => t.signature === tx.signature) === index
            );
            return unique.slice(0, 50);
          });
          
          // Mark new transactions for highlighting
          const newIds = new Set<string>(newTransactions.map((tx: any) => tx.signature));
          setNewTransactionIds(newIds);
          setTimeout(() => setNewTransactionIds(new Set()), 3000);
          
          setActivityCount(prev => prev + newTransactions.length);
        }
        break;
        
      case 'monitoring_started':
        setMonitoringStatus({
          isMonitoring: true,
          walletsCount: message.data?.walletsCount || 0,
        });
        break;
        
      case 'monitoring_stopped':
        setMonitoringStatus(prev => prev ? {
          ...prev,
          isMonitoring: false,
        } : null);
        break;
        
      case 'sync_completed':
        loadRecentTransactions();
        break;

      case 'recent_transactions':
        if (message.data?.transactions) {
          setRecentTransactions(message.data.transactions);
        }
        break;

      case 'status_update':
        if (message.data) {
          setMonitoringStatus(message.data);
        }
        break;
    }
  };

  // WebSocket connection
  const {
    isConnected,
    isConnecting,
    error: wsError,
    lastMessage,
  } = useWebSocket(WS_URL, {
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      setConnectionStats(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        connectionTime: Date.now(),
      }));
    },
    onDisconnect: () => {
      setConnectionStats(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectionTime: null,
      }));
    },
    reconnectAttempts: 10,
    reconnectInterval: 5000,
  });

  useEffect(() => {
    setConnectionStats(prev => ({
      ...prev,
      isConnected,
      isConnecting,
    }));
  }, [isConnected, isConnecting]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [transactionsResponse, statusResponse] = await Promise.all([
        apiClient.getRecentTransactions(20),
        apiClient.getMonitoringStatus(),
      ]);
      
      // The API returns { transactions: TransactionWithWallet[], count: number }
      setRecentTransactions(transactionsResponse.transactions);
      setMonitoringStatus(statusResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const response = await apiClient.getRecentTransactions(20);
      // The API returns { transactions: TransactionWithWallet[], count: number }
      setRecentTransactions(response.transactions);
    } catch (err) {
      console.error('Failed to load recent transactions:', err);
    }
  };

  const startMonitoring = async () => {
    try {
      await apiClient.startMonitoring();
      await loadMonitoringStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start monitoring');
    }
  };

  const stopMonitoring = async () => {
    try {
      await apiClient.stopMonitoring();
      await loadMonitoringStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop monitoring');
    }
  };

  const loadMonitoringStatus = async () => {
    try {
      const status = await apiClient.getMonitoringStatus();
      setMonitoringStatus(status);
    } catch (err) {
      console.error('Failed to load monitoring status:', err);
    }
  };

  const syncAllTransactions = async () => {
    try {
      setLoading(true);
      await apiClient.syncAllWalletTransactions();
      await loadRecentTransactions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync transactions');
    } finally {
      setLoading(false);
    }
  };

  const clearActivityCount = () => {
    setActivityCount(0);
  };

  const requestRecentTransactions = () => {
    if (isConnected && window.ws) {
      window.ws.send(JSON.stringify({
        type: 'get_recent_transactions',
        limit: 20
      }));
    }
  };

  const requestStatus = () => {
    if (isConnected && window.ws) {
      window.ws.send(JSON.stringify({
        type: 'get_status'
      }));
    }
  };

  if (loading && recentTransactions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Real-Time Monitor</h1>
          <p className="text-muted-foreground">Live transaction monitoring and wallet activity</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Real-Time Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Initializing monitor...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Real-Time Monitor</h1>
        <p className="text-muted-foreground">Live transaction monitoring and wallet activity</p>
      </div>

      {/* Enhanced Control Panel */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Real-Time Monitor
            </CardTitle>
            <ConnectionIndicator 
              isConnected={isConnected}
              isConnecting={isConnecting}
              stats={connectionStats}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Monitoring Status */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monitoring</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={monitoringStatus?.isMonitoring ? "default" : "secondary"}>
                    {monitoringStatus?.isMonitoring ? (
                      <>
                        <Radio className="h-3 w-3 mr-1 animate-pulse" />
                        Active
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                </div>
              </div>
              <Zap className={`h-8 w-8 ${monitoringStatus?.isMonitoring ? 'text-green-500' : 'text-muted-foreground'}`} />
            </div>

            {/* Monitored Wallets */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Wallets</p>
                <p className="text-2xl font-bold">{monitoringStatus?.walletsCount || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>

            {/* Live Activity Counter */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Live Activity</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{activityCount}</p>
                  {activityCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearActivityCount}
                      className="h-6 w-6 p-0"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
              <Activity className={`h-8 w-8 ${activityCount > 0 ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
            </div>

            {/* Connection Quality */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Connection</p>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? 'Online' : 'Offline'}
                </Badge>
              </div>
              {isConnected ? (
                <Wifi className="h-8 w-8 text-green-500" />
              ) : (
                <WifiOff className="h-8 w-8 text-red-500" />
              )}
            </div>
          </div>

          <Separator />

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-3">
            {monitoringStatus?.isMonitoring ? (
              <Button onClick={stopMonitoring} variant="destructive" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Stop Monitoring
              </Button>
            ) : (
              <Button onClick={startMonitoring} size="sm">
                <Play className="h-4 w-4 mr-2" />
                Start Monitoring
              </Button>
            )}
            
            <Button onClick={syncAllTransactions} variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Sync All
            </Button>
            
            <Button onClick={loadRecentTransactions} variant="outline" size="sm">
              <Database className="h-4 w-4 mr-2" />
              Refresh Feed
            </Button>

            {isConnected && (
              <>
                <Button onClick={requestRecentTransactions} variant="outline" size="sm">
                  <Signal className="h-4 w-4 mr-2" />
                  Request Live Data
                </Button>
                
                <Button onClick={requestStatus} variant="outline" size="sm">
                  <Monitor className="h-4 w-4 mr-2" />
                  Update Status
                </Button>
              </>
            )}
          </div>

          {/* Error Display */}
          {(error || wsError) && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between w-full">
                <span>{error || wsError}</span>
                <Button
                  onClick={() => {
                    setError(null);
                    loadInitialData();
                  }}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Transaction Feed */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live Transaction Feed
              {isConnected && (
                <Badge variant="default" className="animate-pulse">
                  LIVE
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Last updated: {connectionStats.lastMessageTime ? 
                new Date(connectionStats.lastMessageTime).toLocaleTimeString() : 
                'Never'
              }</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <TransactionCard
                  key={transaction.signature}
                  transaction={transaction}
                  isNew={newTransactionIds.has(transaction.signature)}
                />
              ))
            ) : (
              <div className="text-center py-16">
                <div className="flex flex-col items-center space-y-4">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">No Recent Transactions</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      {isConnected ? 
                        "Waiting for new transactions. Start monitoring to see real-time activity." :
                        "Connect to the WebSocket to see real-time transaction updates."
                      }
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      {!monitoringStatus?.isMonitoring && (
                        <Button onClick={startMonitoring} size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Start Monitoring
                        </Button>
                      )}
                      <Button onClick={loadRecentTransactions} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Load Recent
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Statistics */}
      {isConnected && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Signal className="h-5 w-5" />
              Connection Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Connected Since</p>
                  <p className="font-medium">
                    {connectionStats.connectionTime ? 
                      formatRelativeTime(new Date(connectionStats.connectionTime)) : 
                      'Just now'
                    }
                  </p>
                </div>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Messages Received</p>
                  <p className="font-medium">{connectionStats.messagesReceived}</p>
                </div>
                <Database className="h-6 w-6 text-blue-500" />
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="font-medium text-green-600">Healthy</p>
                </div>
                <Zap className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}