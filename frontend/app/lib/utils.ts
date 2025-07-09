
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow } from 'date-fns';


export function formatNumber(num: number, decimals: number = 2): string {
  if (num === 0) return '0';
  
  if (num < 1000) {
    return num.toFixed(decimals);
  }
  
  if (num < 1000000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  if (num < 1000000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  
  return (num / 1000000000).toFixed(1) + 'B';
}

export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM dd, yyyy HH:mm');
}

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

export function formatPercentage(value: number, total: number): string {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(1) + '%';
}

export function getTransactionTypeColor(type: string): string {
  switch (type.toUpperCase()) {
    case 'BUY':
      return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
    case 'SELL':
      return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-300';
    case 'TRANSFER':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-300';
  }
}

export function getProtocolColor(protocol: string): string {
  switch (protocol.toLowerCase()) {
    case 'jupiter':
      return 'text-orange-600 bg-orange-100 dark:bg-orange-900 dark:text-orange-300';
    case 'raydium':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-300';
    case 'orca':
      return 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900 dark:text-cyan-300';
    case 'serum':
      return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900 dark:text-indigo-300';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-300';
  }
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'absolute';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    return new Promise((resolve, reject) => {
      if (document.execCommand('copy')) {
        resolve();
      } else {
        reject(new Error('Copy failed'));
      }
      document.body.removeChild(textArea);
    });
  }
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}