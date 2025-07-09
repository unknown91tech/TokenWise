
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { TransactionStats } from '../lib/types';
import { apiClient } from '../lib/api';
import { formatNumber, formatPercentage } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  RefreshCw, 
  AlertCircle,
  BarChart3,
  Database,
  ExternalLink,
  Info,
  Calendar,
  Clock,
  DollarSign,
  Users,
  Zap
} from 'lucide-react';

const PROTOCOL_COLORS = {
  Jupiter: '#FF6B35',
  Raydium: '#8B5CF6',
  Orca: '#06B6D4',
  Serum: '#6366F1',
  Unknown: '#6B7280',
} as const;

const TIME_FILTER_OPTIONS = [
  { value: '24h', label: '24 Hours', icon: Clock },
  { value: '7d', label: '7 Days', icon: Calendar },
  { value: '30d', label: '30 Days', icon: Calendar },
  { value: 'all', label: 'All Time', icon: Database },
] as const;

const EmptyStateCard = ({ 
  title, 
  description, 
  action, 
  icon: Icon 
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon: React.ElementType;
}) => (
  <Card className="border-dashed border-2">
    <CardContent className="flex flex-col items-center justify-center py-12">
      <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-center mb-6 max-w-md">{description}</p>
      {action}
    </CardContent>
  </Card>
);

const LoadingCard = ({ title }: { title: string }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-1/3"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded w-1/2"></div>
          <div className="h-3 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ErrorCard = ({ 
  title, 
  error, 
  onRetry 
}: { 
  title: string;
  error: string; 
  onRetry: () => void; 
}) => (
  <Card className="border-destructive/50">
    <CardHeader>
      <CardTitle className="text-destructive">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button onClick={onRetry} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

export function TransactionChart() {
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d' | 'all'>('24h');
  const [systemStatus, setSystemStatus] = useState({ hasData: false, isHealthy: false });

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let startDate: string | undefined;
      const now = new Date();
      
      switch (timeFilter) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        default:
          startDate = undefined;
      }
      
      const response = await apiClient.getTransactionStats(startDate);
      setStats(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    checkSystemHealth();
  }, [loadStats, timeFilter]);

  const checkSystemHealth = async () => {
    try {
      const health = await apiClient.getHealth();
      const walletStats = await apiClient.getWalletStats();
      
      setSystemStatus({
        hasData: walletStats.totalTransactions > 0,
        isHealthy: health.status === 'healthy'
      });
    } catch (err) {
      setSystemStatus({ hasData: false, isHealthy: false });
    }
  };

  const syncTransactions = async () => {
    try {
      setLoading(true);
      await apiClient.syncAllWalletTransactions();
      await loadStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync transactions');
    } finally {
      setLoading(false);
    }
  };

  // Show empty state if no data exists
  if (!loading && !error && (!stats || stats.totalTransactions === 0)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transaction Analytics</h2>
            <p className="text-muted-foreground">Comprehensive transaction and market analysis</p>
          </div>
          <div className="flex items-center gap-2">
            {TIME_FILTER_OPTIONS.map((filter) => (
              <Button
                key={filter.value}
                variant={timeFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter(filter.value as any)}
                className="flex items-center gap-2"
              >
                <filter.icon className="h-4 w-4" />
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
        
        <EmptyStateCard
          icon={BarChart3}
          title="No Transaction Data Available"
          description="Your wallets have been discovered, but no transaction history has been loaded yet. Sync transaction data to view analytics and insights."
          action={
            <div className="flex flex-col items-center gap-3">
              <Button onClick={syncTransactions} disabled={loading} size="lg">
                <Database className="h-4 w-4 mr-2" />
                Sync Transaction Data
              </Button>
              <Button variant="link" size="sm" onClick={() => window.location.href = '/'}>
                <ExternalLink className="h-3 w-3 mr-1" />
                Go to Setup Guide
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transaction Analytics</h2>
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
          <div className="flex gap-2">
            {TIME_FILTER_OPTIONS.map((filter) => (
              <Button
                key={filter.value}
                variant={timeFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                disabled
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <LoadingCard key={i} title={`Metric ${i}`} />
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <LoadingCard key={i} title={`Chart ${i}`} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transaction Analytics</h2>
            <p className="text-muted-foreground">Error loading analytics data</p>
          </div>
          <div className="flex gap-2">
            {TIME_FILTER_OPTIONS.map((filter) => (
              <Button
                key={filter.value}
                variant={timeFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeFilter(filter.value as any)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
        
        <ErrorCard 
          title="Analytics Error"
          error={error} 
          onRetry={loadStats} 
        />
      </div>
    );
  }

  // Prepare data for charts
  const transactionTypeData = stats ? [
    { name: 'Buys', value: stats.totalBuys, color: '#10B981', percentage: (stats.totalBuys / stats.totalTransactions * 100) },
    { name: 'Sells', value: stats.totalSells, color: '#EF4444', percentage: (stats.totalSells / stats.totalTransactions * 100) },
    { name: 'Transfers', value: stats.totalTransfers, color: '#3B82F6', percentage: (stats.totalTransfers / stats.totalTransactions * 100) },
  ].filter(item => item.value > 0) : [];

  const protocolData = stats && stats.protocolBreakdown ? Object.entries(stats.protocolBreakdown)
    .map(([protocol, count]) => ({
      name: protocol,
      value: count,
      color: PROTOCOL_COLORS[protocol as keyof typeof PROTOCOL_COLORS] || PROTOCOL_COLORS.Unknown,
      percentage: (count / stats.totalTransactions * 100),
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value) : [];

  const hourlyData = stats && stats.hourlyActivity ? stats.hourlyActivity : [];

  const buyToSellRatio = stats ? (stats.totalSells > 0 ? stats.totalBuys / stats.totalSells : stats.totalBuys) : 0;
  const sentiment = buyToSellRatio > 1.2 ? 'Bullish' : buyToSellRatio < 0.8 ? 'Bearish' : 'Neutral';
  const sentimentColor = sentiment === 'Bullish' ? 'text-green-600' : 
                        sentiment === 'Bearish' ? 'text-red-600' : 'text-yellow-600';

  return (
    <div className="space-y-8">
      {/* Header with Time Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transaction Analytics</h2>
          <p className="text-muted-foreground">Comprehensive transaction and market analysis</p>
        </div>
        <div className="flex items-center gap-2">
          {TIME_FILTER_OPTIONS.map((filter) => (
            <Button
              key={filter.value}
              variant={timeFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeFilter(filter.value as any)}
              className="flex items-center gap-2"
            >
              <filter.icon className="h-4 w-4" />
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* System Status Alert */}
      {!systemStatus.isHealthy && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            System health check failed. Some data may be outdated or incomplete.
          </AlertDescription>
        </Alert>
      )}

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
                <p className="text-3xl font-bold">{stats ? formatNumber(stats.totalTransactions) : '-'}</p>
                <Badge variant="outline" className="text-xs">
                  {timeFilter === 'all' ? 'All time' : `Last ${timeFilter}`}
                </Badge>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Activity className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Buys</p>
                <p className="text-3xl font-bold text-green-600">{stats ? formatNumber(stats.totalBuys) : '-'}</p>
                <Badge variant="default" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  {stats ? formatPercentage(stats.totalBuys, stats.totalTransactions) : '-'}
                </Badge>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Total Sells</p>
                <p className="text-3xl font-bold text-red-600">{stats ? formatNumber(stats.totalSells) : '-'}</p>
                <Badge variant="destructive" className="text-xs">
                  {stats ? formatPercentage(stats.totalSells, stats.totalTransactions) : '-'}
                </Badge>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Market Sentiment</p>
                <p className={`text-3xl font-bold ${sentimentColor}`}>
                  {sentiment}
                </p>
                <Badge 
                  variant={sentiment === 'Bullish' ? 'default' : sentiment === 'Bearish' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  B/S Ratio: {buyToSellRatio.toFixed(2)}
                </Badge>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                sentiment === 'Bullish' ? 'bg-green-100 dark:bg-green-900/20' : 
                sentiment === 'Bearish' ? 'bg-red-100 dark:bg-red-900/20' : 
                'bg-yellow-100 dark:bg-yellow-900/20'
              }`}>
                <Zap className={`h-6 w-6 ${
                  sentiment === 'Bullish' ? 'text-green-600 dark:text-green-400' : 
                  sentiment === 'Bearish' ? 'text-red-600 dark:text-red-400' : 
                  'text-yellow-600 dark:text-yellow-400'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Types Chart */}
        {transactionTypeData.length > 0 ? (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Transaction Types Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={transactionTypeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={60}
                      dataKey="value"
                      strokeWidth={2}
                    >
                      {transactionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any, name: any, props: any) => [
                        `${formatNumber(value)} (${props.payload.percentage.toFixed(1)}%)`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="flex justify-center gap-4">
                  {transactionTypeData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm font-medium">{entry.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyStateCard
            icon={BarChart3}
            title="No Transaction Types"
            description="No transaction type data available for the selected time period."
            action={
              <Button variant="outline" onClick={loadStats}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            }
          />
        )}

        {/* Protocol Distribution Chart */}
        {protocolData.length > 0 ? (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Protocol Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={protocolData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any, name: any, props: any) => [
                      `${formatNumber(value)} (${props.payload.percentage.toFixed(1)}%)`,
                      'Transactions'
                    ]}
                    labelStyle={{ color: 'var(--foreground)' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {protocolData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <EmptyStateCard
            icon={Database}
            title="No Protocol Data"
            description="No protocol distribution data available for the selected time period."
            action={
              <Button variant="outline" onClick={loadStats}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            }
          />
        )}

        {/* 24h Activity Pattern */}
        {hourlyData.length > 0 ? (
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                24-Hour Activity Pattern
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={hourlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${value}:00`}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: any) => [formatNumber(value), 'Transactions']}
                    labelFormatter={(label) => `Hour ${label}:00`}
                    labelStyle={{ color: 'var(--foreground)' }}
                    contentStyle={{ 
                      backgroundColor: 'var(--background)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    fill="url(#colorActivity)"
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                24-Hour Activity Pattern
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyStateCard
                icon={Clock}
                title="No Activity Data"
                description="No hourly activity data available. This chart shows transaction patterns throughout the day."
                action={
                  <Button variant="outline" onClick={loadStats}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </Button>
                }
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Active Wallets */}
      {stats && stats.topActiveWallets && stats.topActiveWallets.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Most Active Wallets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topActiveWallets.slice(0, 10).map((wallet, index) => (
                <div 
                  key={wallet.address} 
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <Badge variant="outline" className="min-w-[40px] justify-center">
                      #{index + 1}
                    </Badge>
                    <div>
                      <code className="text-sm font-mono">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </code>
                      <p className="text-xs text-muted-foreground">
                        {stats ? formatPercentage(wallet.count, stats.totalTransactions) : '-'} of total
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {wallet.count} txns
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Avg: {(wallet.count / (timeFilter === '24h' ? 1 : timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 365)).toFixed(1)}/day
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}