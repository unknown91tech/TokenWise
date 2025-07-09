
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './ui/sheet';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { apiClient } from '../lib/api';
import { HealthStatus } from '../lib/types';
import { 
  Zap,
  Menu,
  Wallet,
  BarChart3,
  Monitor,
  Settings,
  Activity,
  Database,
  Wifi,
  WifiOff,
  Bell,
  User,
  LogOut,
  HelpCircle,
  Github,
  ExternalLink,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  description?: string;
}

interface HealthStatusProps {
  status: HealthStatus | null;
}

const HealthIndicator = ({ status }: HealthStatusProps) => {
  if (!status) return null;

  const isHealthy = status.status === 'healthy';
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          {isHealthy ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-500" />
          )}
          <span className="hidden sm:inline">
            {isHealthy ? 'Healthy' : 'Issues'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>System Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="p-2 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Overall Status</span>
            <Badge variant={isHealthy ? "default" : "destructive"}>
              {status.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Database</span>
            <Badge variant={status.services.database === 'healthy' ? "default" : "destructive"}>
              {status.services.database}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Solana RPC</span>
            <Badge variant={status.services.solana === 'healthy' ? "default" : "destructive"}>
              {status.services.solana}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Last updated: {new Date(status.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ThemeToggle = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme}>
      {theme === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export function Navbar() {
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [walletCount, setWalletCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      href: '/',
      label: 'Overview',
      icon: BarChart3,
      description: 'Dashboard and system overview'
    },
    {
      href: '/setup',
      label: 'Setup',
      icon: Settings,
      description: 'Configure your TokenWise instance'
    },
    {
      href: '/wallets',
      label: 'Wallets',
      icon: Wallet,
      badge: walletCount > 0 ? walletCount.toString() : undefined,
      description: 'Manage monitored wallets'
    },
    {
      href: '/analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'Transaction insights and charts'
    },
    {
      href: '/monitor',
      label: 'Live Monitor',
      icon: Monitor,
      description: 'Real-time transaction monitoring'
    },
  ];

  useEffect(() => {
    loadSystemData();
    const interval = setInterval(loadSystemData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSystemData = async () => {
    try {
      const [healthData, walletStats] = await Promise.all([
        apiClient.getHealth(),
        apiClient.getWalletStats(),
      ]);
      setHealth(healthData);
      setWalletCount(walletStats.totalWallets);
    } catch (error) {
      console.error('Failed to load system data:', error);
    }
  };

  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const NavLink = ({ item, mobile = false }: { item: NavItem; mobile?: boolean }) => {
    const isActive = isActiveRoute(item.href);
    
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
          mobile ? 'w-full' : ''
        } ${
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
        onClick={() => mobile && setIsOpen(false)}
      >
        <item.icon className="h-4 w-4" />
        <span className="font-medium">{item.label}</span>
        {item.badge && (
          <Badge variant={isActive ? "secondary" : "outline"} className="text-xs">
            {item.badge}
          </Badge>
        )}
        {mobile && (
          <div className="ml-auto text-xs text-muted-foreground">
            {item.description}
          </div>
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold tracking-tight">TokenWise</h1>
                <p className="text-xs text-muted-foreground leading-none">
                  Solana Wallet Intelligence
                </p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </nav>
          </div>

          {/* Right Side - Status, Theme, Actions */}
          <div className="flex items-center gap-2">
            {/* Health Status */}
            <HealthIndicator status={health} />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              <span className="sr-only">Notifications</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help & Support</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a 
                    href="https://github.com/your-repo/tokenwise" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    <span>GitHub</span>
                    <ExternalLink className="ml-auto h-3 w-3" />
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    TokenWise
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-2">
                  {navItems.map((item) => (
                    <NavLink key={item.href} item={item} mobile />
                  ))}
                </div>
                
                {/* Mobile System Status */}
                {health && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <h3 className="font-medium mb-3">System Status</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Overall</span>
                        <Badge variant={health.status === 'healthy' ? "default" : "destructive"}>
                          {health.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Database</span>
                        <Badge variant={health.services.database === 'healthy' ? "default" : "destructive"}>
                          {health.services.database}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Solana RPC</span>
                        <Badge variant={health.services.solana === 'healthy' ? "default" : "destructive"}>
                          {health.services.solana}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}