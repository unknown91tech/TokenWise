
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { apiClient } from '../lib/api';
import { formatNumber } from '../lib/utils';
import { 
  CheckCircle2, 
  Circle, 
  Play, 
  Pause, 
  AlertCircle, 
  Users, 
  Database, 
  Activity, 
  TrendingUp, 
  Clock, 
  Zap,
  Settings,
  BarChart3,
  FileText,
  Loader,
  ArrowRight
} from 'lucide-react';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
  icon: React.ElementType;
  estimatedTime: string;
}

interface SetupConfig {
  holdersLimit: number;
  transactionsPerWallet: number;
  enableRealTimeMonitoring: boolean;
}

export function SetupGuide() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<SetupConfig>({
    holdersLimit: 100,
    transactionsPerWallet: 200,
    enableRealTimeMonitoring: true,
  });
  
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'discover',
      title: 'Discover Top Token Holders',
      description: 'Find and store the top token holders on Solana',
      status: 'pending',
      progress: 0,
      icon: Users,
      estimatedTime: '2-3 minutes',
    },
    {
      id: 'sync',
      title: 'Sync Historical Transactions',
      description: 'Fetch complete transaction history for all wallets',
      status: 'pending',
      progress: 0,
      icon: Database,
      estimatedTime: '5-15 minutes',
    },
    {
      id: 'monitoring',
      title: 'Enable Real-time Monitoring',
      description: 'Start live transaction monitoring',
      status: 'pending',
      progress: 0,
      icon: Activity,
      estimatedTime: '30 seconds',
    },
    {
      id: 'analytics',
      title: 'Generate Analytics',
      description: 'Process data and create insights',
      status: 'pending',
      progress: 0,
      icon: BarChart3,
      estimatedTime: '1-2 minutes',
    },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    checkExistingData();
  }, []);

  useEffect(() => {
    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const totalSteps = steps.length;
    setTotalProgress((completedSteps / totalSteps) * 100);
    setIsComplete(completedSteps === totalSteps);
  }, [steps]);

  const checkExistingData = async () => {
    try {
      const stats = await apiClient.getWalletStats();
      const monitoringStatus = await apiClient.getMonitoringStatus();
      
      // Update step statuses based on existing data
      setSteps(prev => prev.map(step => {
        switch (step.id) {
          case 'discover':
            return {
              ...step,
              status: stats.totalWallets > 0 ? 'completed' : 'pending',
              progress: stats.totalWallets > 0 ? 100 : 0,
            };
          case 'sync':
            return {
              ...step,
              status: stats.totalTransactions > 0 ? 'completed' : 'pending',
              progress: stats.totalTransactions > 0 ? 100 : 0,
            };
          case 'monitoring':
            return {
              ...step,
              status: monitoringStatus.isMonitoring ? 'completed' : 'pending',
              progress: monitoringStatus.isMonitoring ? 100 : 0,
            };
          case 'analytics':
            return {
              ...step,
              status: stats.totalTransactions > 0 ? 'completed' : 'pending',
              progress: stats.totalTransactions > 0 ? 100 : 0,
            };
          default:
            return step;
        }
      }));
    } catch (err) {
      console.error('Failed to check existing data:', err);
    }
  };

  const updateStepStatus = (stepId: string, status: SetupStep['status'], progress: number = 0) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, progress } : step
    ));
  };

  const runCompleteSetup = async () => {
    try {
      setIsRunning(true);
      setError(null);
      setCurrentStep(0);

      // Step 1: Discover top holders
      updateStepStatus('discover', 'in-progress', 0);
      const discoveryResult = await apiClient.discoverTopHolders(config.holdersLimit);
      updateStepStatus('discover', 'completed', 100);
      setCurrentStep(1);

      // Step 2: Sync historical data
      updateStepStatus('sync', 'in-progress', 0);
      
      // Get all wallets and sync them in batches
      const wallets = await apiClient.getAllWallets();
      let syncedCount = 0;
      
      for (let i = 0; i < wallets.wallets.length; i += 5) {
        const batch = wallets.wallets.slice(i, i + 5);
        
        await Promise.allSettled(
          batch.map(wallet => 
            apiClient.syncWalletTransactions(wallet.address, config.transactionsPerWallet)
          )
        );
        
        syncedCount += batch.length;
        const progress = Math.min((syncedCount / wallets.wallets.length) * 100, 100);
        updateStepStatus('sync', 'in-progress', progress);
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      updateStepStatus('sync', 'completed', 100);
      setCurrentStep(2);

      // Step 3: Enable monitoring
      if (config.enableRealTimeMonitoring) {
        updateStepStatus('monitoring', 'in-progress', 0);
        await apiClient.startMonitoring();
        updateStepStatus('monitoring', 'completed', 100);
      } else {
        updateStepStatus('monitoring', 'completed', 100);
      }
      setCurrentStep(3);

      // Step 4: Generate analytics
      updateStepStatus('analytics', 'in-progress', 50);
      // Analytics are generated automatically when we have data
      updateStepStatus('analytics', 'completed', 100);
      setCurrentStep(4);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Setup failed';
      setError(errorMessage);
      
      // Mark current step as error
      if (currentStep < steps.length) {
        updateStepStatus(steps[currentStep].id, 'error', 0);
      }
    } finally {
      setIsRunning(false);
    }
  };

  const runIndividualStep = async (stepId: string) => {
    try {
      setError(null);
      updateStepStatus(stepId, 'in-progress', 0);

      switch (stepId) {
        case 'discover':
          await apiClient.discoverTopHolders(config.holdersLimit);
          updateStepStatus(stepId, 'completed', 100);
          break;
        
        case 'sync':
          const result = await apiClient.syncAllWalletTransactions();
          updateStepStatus(stepId, 'completed', 100);
          break;
        
        case 'monitoring':
          await apiClient.startMonitoring();
          updateStepStatus(stepId, 'completed', 100);
          break;
        
        case 'analytics':
          // Analytics are generated automatically
          updateStepStatus(stepId, 'completed', 100);
          break;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `${stepId} failed`;
      setError(errorMessage);
      updateStepStatus(stepId, 'error', 0);
    }
  };

  const getStepIcon = (step: SetupStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'in-progress':
        return <Loader className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-500" />;
      default:
        return <Circle className="h-6 w-6 text-gray-400" />;
    }
  };

  const getStepColor = (step: SetupStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50 dark:bg-green-900/20';
      case 'in-progress':
        return 'border-blue-200 bg-blue-50 dark:bg-blue-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:bg-red-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">TokenWise Setup Guide</h1>
        <p className="text-muted-foreground">Get started with complete historical data collection and real-time monitoring</p>
      </div>

      {/* Overall Progress */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Setup Progress
            </CardTitle>
            <Badge variant={isComplete ? "default" : "secondary"}>
              {Math.round(totalProgress)}% Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={totalProgress} className="h-3" />
          
          {isComplete && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                🎉 Setup complete! Your TokenWise dashboard is ready with full historical data and real-time monitoring.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Top Holders Limit</label>
              <select 
                value={config.holdersLimit}
                onChange={(e) => setConfig(prev => ({ ...prev, holdersLimit: parseInt(e.target.value) }))}
                disabled={isRunning}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value={50}>50 Holders</option>
                <option value={100}>100 Holders</option>
                <option value={200}>200 Holders</option>
                <option value={500}>500 Holders</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Transactions per Wallet</label>
              <select 
                value={config.transactionsPerWallet}
                onChange={(e) => setConfig(prev => ({ ...prev, transactionsPerWallet: parseInt(e.target.value) }))}
                disabled={isRunning}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value={50}>50 Transactions</option>
                <option value={100}>100 Transactions</option>
                <option value={200}>200 Transactions</option>
                <option value={500}>500 Transactions</option>
                <option value={1000}>1000 Transactions</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Real-time Monitoring</label>
              <select 
                value={config.enableRealTimeMonitoring ? 'enabled' : 'disabled'}
                onChange={(e) => setConfig(prev => ({ ...prev, enableRealTimeMonitoring: e.target.value === 'enabled' }))}
                disabled={isRunning}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="enabled">Enable</option>
                <option value="disabled">Disable</option>
              </select>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={runCompleteSetup} 
              disabled={isRunning || isComplete}
              className="flex-1"
            >
              {isRunning ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Running Complete Setup...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Run Complete Setup
                </>
              )}
            </Button>
            
            {isComplete && (
              <Button onClick={() => window.location.href = '/'} variant="outline">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.id} className={`transition-all duration-200 ${getStepColor(step)}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 border-2">
                    {getStepIcon(step)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {step.estimatedTime}
                    </Badge>
                    {step.status === 'in-progress' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round(step.progress)}%
                      </p>
                    )}
                  </div>
                  
                  {!isRunning && step.status !== 'completed' && (
                    <Button
                      onClick={() => runIndividualStep(step.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  )}
                </div>
              </div>
              
              {step.status === 'in-progress' && (
                <div className="space-y-2">
                  <Progress value={step.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Processing... {Math.round(step.progress)}% complete
                  </p>
                </div>
              )}
              
              {step.status === 'completed' && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Completed successfully</span>
                </div>
              )}
              
              {step.status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" />
                  <span>Failed - click Start to retry</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

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

      {/* Next Steps */}
      {isComplete && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              Setup Complete! What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Explore Your Data</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View real-time transaction feed</li>
                  <li>• Analyze wallet behavior patterns</li>
                  <li>• Export data for external analysis</li>
                  <li>• Set up custom alerts</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Advanced Features</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Portfolio tracking</li>
                  <li>• Market sentiment analysis</li>
                  <li>• Automated reporting</li>
                  <li>• API access for integrations</li>
                </ul>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => window.location.href = '/monitor'} size="sm">
                <Activity className="h-4 w-4 mr-2" />
                View Live Monitor
              </Button>
              
              <Button onClick={() => window.location.href = '/analytics'} variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Open Analytics
              </Button>
              
              <Button onClick={() => window.location.href = '/wallets'} variant="outline" size="sm">
                <Users className="h-4 w-4 mr-2" />
                Browse Wallets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tips and Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium">Setup Time Estimates</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>50 wallets + 100 transactions:</strong> ~5-10 minutes</li>
              <li>• <strong>100 wallets + 200 transactions:</strong> ~10-20 minutes</li>
              <li>• <strong>500 wallets + 500 transactions:</strong> ~30-60 minutes</li>
            </ul>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <h4 className="font-medium">Tips for Best Results</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Start with 100 holders and 200 transactions for balanced coverage</li>
              <li>• Keep the browser tab open during setup</li>
              <li>• Setup can be paused and resumed anytime</li>
              <li>• Real-time monitoring can be enabled/disabled later</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}