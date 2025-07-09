
'use client';

import React, { useState } from 'react';
import { WalletList } from '../WalletList';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { WalletWithStats } from '../../lib/types';
import { formatNumber, formatAddress, formatRelativeTime, copyToClipboard } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Copy, ExternalLink, Wallet, TrendingUp, TrendingDown } from 'lucide-react';

export function WalletsPage() {
  const [selectedWallet, setSelectedWallet] = useState<WalletWithStats | null>(null);

  const handleCopyAddress = async (address: string) => {
    try {
      await copyToClipboard(address);
      // You might want to add a toast notification here
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const openSolscan = (address: string) => {
    window.open(`https://solscan.io/account/${address}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet Management</h1>
        <p className="text-muted-foreground">Monitor and analyze top token holders</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <WalletList onWalletSelect={setSelectedWallet} />
        </div>
        
        <div>
          {selectedWallet ? (
            <Card>
              <CardHeader>
                <CardTitle>Wallet Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Address</p>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm break-all bg-muted p-2 rounded">
                        {selectedWallet.address}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopyAddress(selectedWallet.address)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openSolscan(selectedWallet.address)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Rank</p>
                      <p className="font-medium">#{selectedWallet.rank || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={selectedWallet.isActive ? "default" : "secondary"}>
                        {selectedWallet.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Token Balance</p>
                      <p className="font-medium">{formatNumber(selectedWallet.tokenAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">SOL Balance</p>
                      <p className="font-medium">{formatNumber(selectedWallet.balance)} SOL</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Transactions</p>
                      <p className="font-medium">{selectedWallet.transactionCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Activity</p>
                      <p className="font-medium">
                        {selectedWallet.lastActivity 
                          ? formatRelativeTime(selectedWallet.lastActivity)
                          : 'No activity'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Buys</p>
                      <p className="font-medium text-green-600 flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" />
                        {selectedWallet.totalBuys}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sells</p>
                      <p className="font-medium text-red-600 flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        {selectedWallet.totalSells}
                      </p>
                    </div>
                  </div>

                  {/* Activity Summary */}
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Activity Summary</p>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Buy/Sell Ratio:</span>
                        <span className="text-sm font-medium">
                          {selectedWallet.totalSells > 0 
                            ? (selectedWallet.totalBuys / selectedWallet.totalSells).toFixed(2)
                            : selectedWallet.totalBuys
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg. Transactions/Day:</span>
                        <span className="text-sm font-medium">
                          {selectedWallet.lastActivity 
                            ? Math.round(selectedWallet.transactionCount / 
                                Math.max(1, Math.ceil((Date.now() - new Date(selectedWallet.lastActivity).getTime()) / (1000 * 60 * 60 * 24))))
                            : 0
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a wallet to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}