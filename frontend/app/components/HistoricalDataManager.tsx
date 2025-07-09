
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { apiClient } from '../lib/api';
import { formatNumber, formatRelativeTime } from '../lib/utils';
import { 
  Database, 
  RefreshCw, 
  Download, 
  Users, 
  Activity, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Loader,
  Play,
  Pause,
  BarChart3,
  Calendar,
  Zap,
  FileText,
  Settings
} from 'lucide-react';

interface SyncProgress {
  current: number;
  total: number;
  currentWallet: string;
  isActive: boolean;
  stage: 'discovering' | 'syncing' | 'completed' | 'idle';
  errors: string[];
  startTime: number | null;
  estimatedTimeRemaining: number | null;
}

interface HistoricalStats {
  totalWallets: number;
  totalTransactions: number;
  walletsWithTransactions: number;
  oldestTransaction: string | null;
  newestTransaction: string | null;
  totalSynced: number;
  totalFailed: number;
}

export function HistoricalDataManager() {
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    current: 0,
    total: 0,
    currentWallet: '',
    isActive: false,
    stage: 'idle',
    errors: [],
    startTime: null,
    estimatedTimeRemaining: null,
  });

  const [historicalStats, setHistoricalStats] = useState<HistoricalStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistoricalStats();
    
    // Update stats every 30 seconds during sync
    const interval = setInterval(() => {
      if (syncProgress.isActive) {
        loadHistoricalStats();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [syncProgress.isActive]);

  const loadHistoricalStats = async () => {
    try {
      const [walletStats, transactionStats] = await Promise.all([
        apiClient.getWalletStats(),
        apiClient.getTransactionStats(),
      ]);

      setHistoricalStats({
        totalWallets: walletStats.totalWallets,
        totalTransactions: walletStats.totalTransactions,
        walletsWithTransactions: walletStats.totalWallets, // Simplified for now
        oldestTransaction: null, // Would need custom endpoint
        newestTransaction: null, // Would need custom endpoint
        totalSynced: walletStats.totalTransactions > 0 ? walletStats.totalWallets : 0,
        totalFailed: 0, // Would track this during sync
      });
    } catch (err) {
      console.error('Failed to load historical stats:', err);
    }
  };

  const discoverTopHolders = async (limit: number = 100) => {
    try {
      setError(null);
      setSyncProgress(prev => ({
        ...prev,
        isActive: true,
        stage: 'discovering',
        current: 0,
        total: limit,
        startTime: Date.now(),
        errors: [],
      }));

      const result = await apiClient.discoverTopHolders(limit);
      
      setSyncProgress(prev => ({
        ...prev,
        stage: 'completed',
        current: result.wallets.length,
        total: result.wallets.length,
        isActive: false,
      }));

      await loadHistoricalStats();
      return result.wallets.length;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover top holders');
      setSyncProgress(prev => ({
        ...prev,
        isActive: false,
        stage: 'idle',
        errors: [...prev.errors, err instanceof Error ? err.message : 'Discovery failed'],
      }));
      throw err;
    }
  };

  const syncAllHistoricalData = async (transactionsPerWallet: number = 100) => {
    try {
      setError(null);
      
      // First get all wallets
      const walletsResponse = await apiClient.getAllWallets();
      const wallets = walletsResponse.wallets;

      if (wallets.length === 0) {
        throw new Error('No wallets found. Please discover top holders first.');
      }

      setSyncProgress({
        current: 0,
        total: wallets.length,
        currentWallet: '',
        isActive: true,
        stage: 'syncing',
        errors: [],
        startTime: Date.now(),
        estimatedTimeRemaining: null,
      });

      let successCount = 0;
      let failedCount = 0;
      const batchSize = 5; // Process 5 wallets at a time

      for (let i = 0; i < wallets.length; i += batchSize) {
        const batch = wallets.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (wallet, batchIndex) => {
          const currentIndex = i + batchIndex;
          
          setSyncProgress(prev => ({
            ...prev,
            current: currentIndex,
            currentWallet: wallet.address,
            estimatedTimeRemaining: prev.startTime ? 
              ((Date.now() - prev.startTime) / (currentIndex + 1)) * (prev.total - currentIndex - 1) : null,
          }));

          try {
            await apiClient.syncWalletTransactions(wallet.address, transactionsPerWallet);
            return { success: true, wallet: wallet.address };
          } catch (error) {
            console.error(`Failed to sync wallet ${wallet.address}:`, error);
            return { success: false, wallet: wallet.address, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        });

        const results = await Promise.allSettled(batchPromises);
        
        results.forEach((result, batchIndex) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              successCount++;
            } else {
              failedCount++;
              setSyncProgress(prev => ({
                ...prev,
                errors: [...prev.errors, `${result.value.wallet}: ${result.value.error}`],
              }));
            }
          } else {
            failedCount++;
            const walletAddress = batch[batchIndex]?.address || 'unknown';
            setSyncProgress(prev => ({
              ...prev,
              errors: [...prev.errors, `${walletAddress}: ${result.reason}`],
            }));
          }
        });

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < wallets.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      setSyncProgress(prev => ({
        ...prev,
        stage: 'completed',
        current: wallets.length,
        currentWallet: '',
        isActive: false,
      }));

      await loadHistoricalStats();
      return { success: successCount, failed: failedCount };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync historical data');
      setSyncProgress(prev => ({
        ...prev,
        isActive: false,
        stage: 'idle',
        errors: [...prev.errors, err instanceof Error ? err.message : 'Sync failed'],
      }));
      throw err;
    }
  };

  const performFullHistoricalSync = async () => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Discover top holders
      const discoveredCount = await discoverTopHolders(100);
      
      // Step 2: Sync all historical transactions
      const syncResult = await syncAllHistoricalData(200); // 200 transactions per wallet
      
      setError(null);
      return { discoveredCount, syncResult };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Full sync failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const stopSync = () => {
    setSyncProgress(prev => ({
      ...prev,
      isActive: false,
      stage: 'idle',
    }));
  };

  const clearErrors = () => {
    setSyncProgress(prev => ({
      ...prev,
      errors: [],
    }));
  };

  const exportHistoricalData = async () => {
    try {
      setLoading(true);
      const csvData = await apiClient.exportTransactions();
      
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tokenwise_historical_data_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (syncProgress.total === 0) return 0;
    return Math.round((syncProgress.current / syncProgress.total) * 100);
  };

  const getEstimatedTimeText = () => {
    if (!syncProgress.estimatedTimeRemaining) return 'Calculating...';
    
    const minutes = Math.floor(syncProgress.estimatedTimeRemaining / 60000);
    const seconds = Math.floor((syncProgress.estimatedTimeRemaining % 60000) / 1000);
    
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s remaining`;
    }
    return `~${seconds}s remaining`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historical Data Manager</h1>
        <p className="text-muted-foreground">Discover wallets and sync complete transaction history</p>
      </div>

      {/* Current Status Overview */}
      {historicalStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Wallets</p>
                  <p className="text-2xl font-bold">{formatNumber(historicalStats.totalWallets)}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                  <p className="text-2xl font-bold">{formatNumber(historicalStats.totalTransactions)}</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sync Coverage</p>
                  <p className="text-2xl font-bold">
                    {historicalStats.totalWallets > 0 
                      ? Math.round((historicalStats.totalSynced / historicalStats.totalWallets) * 100)
                      : 0
                    }%
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Status</p>
                  <Badge variant={historicalStats.totalTransactions > 0 ? "default" : "secondary"}>
                    {historicalStats.totalTransactions > 0 ? "Ready" : "No Data"}
                  </Badge>
                </div>
                <Database className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Progress */}
      {syncProgress.isActive && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader className="h-5 w-5 animate-spin" />
              {syncProgress.stage === 'discovering' ? 'Discovering Top Holders' : 'Syncing Historical Data'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress: {syncProgress.current} / {syncProgress.total}</span>
                <span>{getProgressPercentage()}%</span>
              </div>
              <Progress value={getProgressPercentage()} className="h-2" />
            </div>

            {syncProgress.currentWallet && (
              <div className="text-sm text-muted-foreground">
                Currently processing: <code className="bg-muted px-2 py-1 rounded">{syncProgress.currentWallet}</code>
              </div>
            )}

            {syncProgress.estimatedTimeRemaining && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {getEstimatedTimeText()}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={stopSync} variant="destructive" size="sm">
                <Pause className="h-4 w-4 mr-2" />
                Stop Sync
              </Button>
              {syncProgress.errors.length > 0 && (
                <Button onClick={clearErrors} variant="outline" size="sm">
                  Clear Errors ({syncProgress.errors.length})
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Historical Data Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => discoverTopHolders(100)} 
              disabled={syncProgress.isActive || loading}
              className="h-20 flex-col"
            >
              <Users className="h-6 w-6 mb-2" />
              <span>Discover Top 100 Holders</span>
            </Button>

            <Button 
              onClick={() => syncAllHistoricalData(100)} 
              disabled={syncProgress.isActive || loading}
              variant="outline" 
              className="h-20 flex-col"
            >
              <RefreshCw className="h-6 w-6 mb-2" />
              <span>Sync All Transactions</span>
            </Button>

            <Button 
              onClick={performFullHistoricalSync} 
              disabled={syncProgress.isActive || loading}
              variant="default" 
              className="h-20 flex-col"
            >
              <Zap className="h-6 w-6 mb-2" />
              <span>Full Historical Sync</span>
            </Button>
          </div>

          <Separator />

          <div className="flex flex-wrap gap-3">
            <Button onClick={exportHistoricalData} variant="outline" size="sm" disabled={loading}>
              <Download className="h-4 w-4 mr-2" />
              Export Historical Data
            </Button>
            
            <Button onClick={loadHistoricalStats} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span>{error}</span>
            <Button onClick={() => setError(null)} variant="outline" size="sm">
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Errors */}
      {syncProgress.errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Sync Errors ({syncProgress.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {syncProgress.errors.map((error, index) => (
                <div key={index} className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
            <Button onClick={clearErrors} variant="outline" size="sm" className="mt-3">
              Clear All Errors
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completion Message */}
      {syncProgress.stage === 'completed' && !syncProgress.isActive && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Sync completed successfully! Processed {syncProgress.current} items.
            {syncProgress.errors.length > 0 && ` (${syncProgress.errors.length} errors occurred)`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}