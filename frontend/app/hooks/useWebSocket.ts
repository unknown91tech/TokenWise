
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketMessage } from '../lib/types';

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: any) => void;
  connect: () => void;
  disconnect: () => void;
  lastMessage: WebSocketMessage | null;
}

export function useWebSocket(
  url: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      ws.current = new WebSocket(url);

      // Store WebSocket reference globally for API client access
      if (typeof window !== 'undefined') {
        (window as any).wsConnection = ws.current;
      }

      ws.current.onopen = () => {
        if (!mountedRef.current) return;
        
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectCount.current = 0;
        
        // Send subscription message
        if (ws.current?.readyState === WebSocket.OPEN) {
          ws.current.send(JSON.stringify({ type: 'subscribe' }));
        }
        
        onConnect?.();
      };

      ws.current.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.current.onclose = () => {
        if (!mountedRef.current) return;
        
        setIsConnected(false);
        setIsConnecting(false);
        
        // Clear global reference
        if (typeof window !== 'undefined') {
          (window as any).wsConnection = null;
        }
        
        onDisconnect?.();

        // Attempt to reconnect if we haven't exceeded the limit
        if (reconnectCount.current < reconnectAttempts) {
          reconnectCount.current += 1;
          setError(`Connection lost. Reconnecting... (${reconnectCount.current}/${reconnectAttempts})`);
          reconnectTimer.current = setTimeout(() => {
            if (mountedRef.current) {
              connect();
            }
          }, reconnectInterval);
        } else {
          setError(`Failed to reconnect after ${reconnectAttempts} attempts`);
        }
      };

      ws.current.onerror = (event) => {
        if (!mountedRef.current) return;
        
        setError('WebSocket connection error');
        setIsConnecting(false);
        onError?.(event);
      };
    } catch (err) {
      if (!mountedRef.current) return;
      
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [url, onMessage, onConnect, onDisconnect, onError, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    // Clear global reference
    if (typeof window !== 'undefined') {
      (window as any).wsConnection = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
    reconnectCount.current = 0;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
      setError('Cannot send message: WebSocket not connected');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping/pong heartbeat
  useEffect(() => {
    if (!isConnected) return;

    const pingInterval = setInterval(() => {
      if (mountedRef.current && ws.current?.readyState === WebSocket.OPEN) {
        sendMessage({ type: 'ping' });
      }
    }, 30000); // Ping every 30 seconds

    return () => {
      clearInterval(pingInterval);
    };
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    connect,
    disconnect,
    lastMessage,
  };
}