
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { apiClient } from '../lib/api';
import { 
  RefreshCw, 
  Database, 
  Wallet, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Play,
  Pause,
  Loader
} from 'lucide-react';

export function TransactionSyncManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    walletCount: number;
    totalTransactions: number;
    lastSync: string | null;
    isMonitoring: boolean;
  }>({
    walletCount: 0,
    totalTransactions: 0,
    lastSync: null,
    isMonitoring: false
  });
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState({
    current: 0,
    total: 0,
    isActive: false
  });

  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      setError(null);
      
      // Get wallet stats
      const walletStats = await apiClient.getWalletStats();
      
      // Get monitoring status
      const monitoringStatus = await apiClient.getMonitoringStatus();
      
      setSyncStatus({
        walletCount: walletStats.totalWallets,
        totalTransactions: walletStats.totalTransactions,
        lastSync: new Date().toISOString(),
        isMonitoring: monitoringStatus.isMonitoring
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check system status');
    }
  };

  const syncAllTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSyncProgress({ current: 0, total: syncStatus.walletCount, isActive: true });
      
      // Start sync for all wallets
      const result = await apiClient.syncAllWalletTransactions();
      
      // Update progress
      setSyncProgress({ 
        current: result.success, 
        total: result.success + result.failed, 
        isActive: false 
      });
      
      // Refresh status
      await checkSystemStatus();
      
      if (result.failed > 0) {
        setError(`Sync completed with ${result.failed} failures. ${result.success} wallets synced successfully.`);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync transactions');
      setSyncProgress({ current: 0, total: 0, isActive: false });
    } finally {
      setIsLoading(false);
    }
  };

  const startMonitoring = async () => {
    try {
      setError(null);
      await apiClient.startMonitoring();
      await checkSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start monitoring');
    }
  };

  const stopMonitoring = async () => {
    try {
      setError(null);
      await apiClient.stopMonitoring();
      await checkSystemStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop monitoring');
    }
  };

  const getHealthStatusColor = (hasTransactions: boolean) => {
    if (hasTransactions && syncStatus.isMonitoring) return 'text-green-600';
    if (hasTransactions) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthIcon = (hasTransactions: boolean) => {
    if (hasTransactions && syncStatus.isMonitoring) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (hasTransactions) return <Clock className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  const hasTransactions = syncStatus.totalTransactions > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Status & Data Sync</h1>
        <p className="text-gray-600 dark:text-gray-400">Manage wallet data synchronization and monitoring</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
            <Button
              onClick={() => setError(null)}
              variant="ghost"
              size="sm"
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </Button>
          </div>
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Monitored Wallets</p>
                <p className="text-2xl font-bold">{syncStatus.walletCount}</p>
              </div>
              <Wallet className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold">{syncStatus.totalTransactions}</p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">System Status</p>
                <div className="flex items-center space-x-2 mt-1">
                  {getHealthIcon(hasTransactions)}
                  <span className={`text-sm font-medium ${getHealthStatusColor(hasTransactions)}`}>
                    {hasTransactions && syncStatus.isMonitoring ? 'Fully Active' :
                     hasTransactions ? 'Data Ready' : 'No Data'}
                  </span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Step 1: Sync Transactions */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                hasTransactions ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {hasTransactions ? <CheckCircle className="h-5 w-5" /> : <Database className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-medium">Step 1: Sync Transaction History</h3>
                <p className="text-sm text-gray-500">
                  {hasTransactions ? 
                    `✓ ${syncStatus.totalTransactions} transactions loaded` : 
                    'Load historical transactions for all wallets'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {syncProgress.isActive && (
                <div className="text-sm text-gray-500">
                  {syncProgress.current}/{syncProgress.total}
                </div>
              )}
              <Button 
                onClick={syncAllTransactions} 
                disabled={isLoading || syncProgress.isActive}
                variant={hasTransactions ? "outline" : "default"}
              >
                {isLoading || syncProgress.isActive ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {hasTransactions ? 'Re-sync' : 'Sync All'}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Step 2: Start Monitoring */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                syncStatus.isMonitoring ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
              }`}>
                {syncStatus.isMonitoring ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-medium">Step 2: Real-time Monitoring</h3>
                <p className="text-sm text-gray-500">
                  {syncStatus.isMonitoring ? 
                    '✓ Real-time monitoring active' : 
                    'Start monitoring for new transactions'}
                </p>
              </div>
            </div>
            <Button 
              onClick={syncStatus.isMonitoring ? stopMonitoring : startMonitoring}
              variant={syncStatus.isMonitoring ? "destructive" : "default"}
              disabled={!hasTransactions}
            >
              {syncStatus.isMonitoring ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Monitoring
                </>
              )}
            </Button>
          </div>

          {/* Step 3: View Analytics */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                hasTransactions ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
              }`}>
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium">Step 3: View Analytics</h3>
                <p className="text-sm text-gray-500">
                  {hasTransactions ? 
                    'Analytics dashboard ready' : 
                    'Complete steps 1-2 to view analytics'}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              disabled={!hasTransactions}
              onClick={() => window.location.href = '/analytics'}
            >
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={checkSystemStatus} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
            <Button 
              onClick={() => window.location.href = '/wallets'} 
              variant="outline" 
              size="sm"
            >
              <Wallet className="h-4 w-4 mr-2" />
              View Wallets
            </Button>
            <Button 
              onClick={() => window.location.href = '/monitor'} 
              variant="outline" 
              size="sm"
              disabled={!hasTransactions}
            >
              <Activity className="h-4 w-4 mr-2" />
              Live Monitor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}