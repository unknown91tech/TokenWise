'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { TransactionSyncManager } from './TransactionSyncManager';
import { WalletStats, HealthStatus } from '../lib/types';
import { apiClient } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { 
  Wallet, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  RefreshCw, 
  AlertCircle,
  CheckCircle,
  BarChart3,
  Monitor,
  Settings,
  Database
} from 'lucide-react';

export function Dashboard() {
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    loadDashboardData();
    loadHealthStatus();
    
    // Refresh health status every 30 seconds
    const healthInterval = setInterval(loadHealthStatus, 30000);
    
    return () => {
      clearInterval(healthInterval);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = await apiClient.getWalletStats();
      setWalletStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadHealthStatus = async () => {
    try {
      const healthData = await apiClient.getHealth();
      setHealth(healthData);
    } catch (err) {
      console.error('Failed to load health status:', err);
    }
  };

  const discoverTopHolders = async () => {
    try {
      setLoading(true);
      await apiClient.discoverTopHolders(60);
      await loadDashboardData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover top holders');
    } finally {
      setLoading(false);
    }
  };

  const exportTransactions = async () => {
    try {
      const csvData = await apiClient.exportTransactions();
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tokenwise_transactions_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export transactions');
    }
  };

  const NavLink = ({ href, icon: Icon, children }: { href: string; icon: React.ElementType; children: React.ReactNode }) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
        }`}
      >
        <Icon className="h-4 w-4" />
        <span>{children}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">TokenWise</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Real-time wallet intelligence on Solana
              </p>
            </div>
            
            <div className="flex items-center space-x-4 mt-4 lg:mt-0">
              {/* Health Status */}
              {health && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                  health.status === 'healthy'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {health.status === 'healthy' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span>System {health.status}</span>
                </div>
              )}
              
              <Button onClick={loadDashboardData} variant="outline" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              <Button onClick={exportTransactions} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 mr-2" />
              <span>{error}</span>
              <Button
                onClick={() => setError(null)}
                variant="ghost"
                size="sm"
                className="ml-auto"
              >
                ×
              </Button>
            </div>
          </div>
        )}

        {/* Overview Content - Only show on home page */}
        {pathname === '/' && (
          <div className="space-y-6">
            {/* Check if we need to show setup guide */}
            {!loading && walletStats && walletStats.totalTransactions === 0 ? (
              <div className="text-center py-12">
                <div className="max-w-md mx-auto">
                  <Settings className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Welcome to TokenWise!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Let's get you started by setting up your wallet monitoring and historical data collection.
                  </p>
                  <div className="space-y-3">
                    <Link href="/setup">
                      <Button className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Start Setup Guide
                      </Button>
                    </Link>
                    <Link href="/setup/historical">
                      <Button variant="outline" className="w-full">
                        <Database className="h-4 w-4 mr-2" />
                        Manage Historical Data
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overview Stats */}
                {walletStats && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="card-hover">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Total Wallets</p>
                            <p className="text-2xl font-bold">{formatNumber(walletStats.totalWallets)}</p>
                          </div>
                          <Wallet className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-hover">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                            <p className="text-2xl font-bold">{formatNumber(walletStats.totalTransactions)}</p>
                          </div>
                          <Activity className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-hover">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Buy/Sell Ratio</p>
                            <p className="text-2xl font-bold">{walletStats.buyToSellRatio.toFixed(2)}</p>
                            <p className={`text-sm ${
                              walletStats.buyToSellRatio > 1 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {walletStats.buyToSellRatio > 1 ? 'Bullish' : 'Bearish'}
                            </p>
                          </div>
                          {walletStats.buyToSellRatio > 1 ? (
                            <TrendingUp className="h-8 w-8 text-green-500" />
                          ) : (
                            <TrendingDown className="h-8 w-8 text-red-500" />
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="card-hover">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-500">Recent Activity</p>
                            <p className="text-2xl font-bold">{walletStats.recentActivity.length}</p>
                            <p className="text-sm text-gray-500">Last 24h</p>
                          </div>
                          <Activity className="h-8 w-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Link href="/setup">
                        <Button variant="outline" className="h-20 w-full flex-col">
                          <Settings className="h-6 w-6 mb-2" />
                          <span>Setup Guide</span>
                        </Button>
                      </Link>

                      <Link href="/setup/historical">
                        <Button variant="outline" className="h-20 w-full flex-col">
                          <Database className="h-6 w-6 mb-2" />
                          <span>Historical Data</span>
                        </Button>
                      </Link>
                      
                      <Link href="/monitor">
                        <Button variant="outline" className="h-20 w-full flex-col">
                          <Monitor className="h-6 w-6 mb-2" />
                          <span>Live Monitor</span>
                        </Button>
                      </Link>
                      
                      <Button onClick={exportTransactions} variant="outline" className="h-20 flex-col">
                        <Download className="h-6 w-6 mb-2" />
                        <span>Export Data</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                {walletStats?.recentActivity && walletStats.recentActivity.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {walletStats.recentActivity.slice(0, 5).map((transaction) => (
                          <div
                            key={transaction.signature}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                transaction.type === 'BUY' ? 'bg-green-100 text-green-800' :
                                transaction.type === 'SELL' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {transaction.type}
                              </span>
                              <code className="text-sm">
                                {transaction.wallet.address.slice(0, 6)}...{transaction.wallet.address.slice(-4)}
                              </code>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">{formatNumber(transaction.amount)} SOL</p>
                              <p className="text-xs text-gray-500">
                                {new Date(transaction.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}