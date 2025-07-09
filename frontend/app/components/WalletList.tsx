
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';
import { WalletWithStats } from '../lib/types';
import { apiClient } from '../lib/api';
import { formatAddress, formatNumber, formatRelativeTime, copyToClipboard } from '../lib/utils';
import { 
  Copy, 
  ExternalLink, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Users,
  Clock,
  DollarSign,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

interface WalletListProps {
  onWalletSelect?: (wallet: WalletWithStats) => void;
}

type SortField = 'rank' | 'tokenAmount' | 'transactionCount' | 'lastActivity';
type SortDirection = 'asc' | 'desc';

export function WalletList({ onWalletSelect }: WalletListProps) {
  const [wallets, setWallets] = useState<WalletWithStats[]>([]);
  const [filteredWallets, setFilteredWallets] = useState<WalletWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  useEffect(() => {
    loadWallets();
  }, []);

  useEffect(() => {
    filterAndSortWallets();
  }, [wallets, searchTerm, sortField, sortDirection, statusFilter]);

  const loadWallets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getWalletsWithStats();
      setWallets(response.wallets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortWallets = () => {
    let filtered = [...wallets];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(wallet =>
        wallet.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        wallet.rank?.toString().includes(searchTerm)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(wallet =>
        statusFilter === 'active' ? wallet.isActive : !wallet.isActive
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'rank':
          aValue = a.rank || Infinity;
          bValue = b.rank || Infinity;
          break;
        case 'tokenAmount':
          aValue = a.tokenAmount;
          bValue = b.tokenAmount;
          break;
        case 'transactionCount':
          aValue = a.transactionCount;
          bValue = b.transactionCount;
          break;
        case 'lastActivity':
          aValue = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
          bValue = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredWallets(filtered);
  };

  const handleCopyAddress = async (address: string) => {
    try {
      await copyToClipboard(address);
      setCopySuccess(address);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleWalletClick = (wallet: WalletWithStats) => {
    setSelectedWallet(wallet.id);
    onWalletSelect?.(wallet);
  };

  const openSolscan = (address: string) => {
    window.open(`https://solscan.io/account/${address}`, '_blank');
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <SortAsc className="h-4 w-4" /> : 
      <SortDesc className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Token Holders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Loading wallets...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Token Holders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <ExternalLink className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-destructive font-medium mb-2">Failed to load wallets</p>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={loadWallets} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Token Holders ({filteredWallets.length})
          </CardTitle>
          <Button onClick={loadWallets} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by address or rank..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rank">Sort by Rank</SelectItem>
                <SelectItem value="tokenAmount">Sort by Balance</SelectItem>
                <SelectItem value="transactionCount">Sort by Activity</SelectItem>
                <SelectItem value="lastActivity">Sort by Last Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredWallets.map((wallet) => (
            <div
              key={wallet.id}
              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                selectedWallet === wallet.id 
                  ? 'bg-primary/5 border-primary shadow-md' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => handleWalletClick(wallet)}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="font-mono">
                    #{wallet.rank || 'N/A'}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {formatAddress(wallet.address)}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyAddress(wallet.address);
                      }}
                    >
                      {copySuccess === wallet.address ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSolscan(wallet.address);
                      }}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <Badge variant={wallet.isActive ? "default" : "secondary"}>
                  {wallet.isActive ? (
                    <>
                      <Activity className="h-3 w-3 mr-1" />
                      Active
                    </>
                  ) : (
                    'Inactive'
                  )}
                </Badge>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Token Balance
                  </p>
                  <p className="font-medium">{formatNumber(wallet.tokenAmount)}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Transactions
                  </p>
                  <p className="font-medium">{wallet.transactionCount}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Buys/Sells</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-green-600 flex items-center text-sm">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {wallet.totalBuys}
                    </span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-red-600 flex items-center text-sm">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      {wallet.totalSells}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last Activity
                  </p>
                  <p className="font-medium text-sm">
                    {wallet.lastActivity 
                      ? formatRelativeTime(wallet.lastActivity)
                      : 'No activity'
                    }
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredWallets.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium mb-1">No wallets found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your filters'
                    : 'Discover wallets to get started'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={loadWallets} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Discover Wallets
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}