import { useState, useEffect, useRef, useCallback } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketReturn {
    status: ConnectionStatus;
    lastMessage: string | null;
    sendMessage: (message: string) => void;
    reconnect: () => void;
}

export interface UseWebSocketOptions {
    url: string;
    reconnectInterval?: number;
    onMessage?: (message: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
    const { url, reconnectInterval = 3000, onMessage } = options;

    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onMessageRef = useRef(onMessage);

    // Keep onMessage callback ref updated
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    const connect = useCallback(() => {
        // Clear any existing reconnect timer
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }

        // Close existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        setStatus('connecting');

        try {
            const ws = new WebSocket(url);
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus('connected');
                console.log('[WebSocket] Connected to', url);
            };

            ws.onmessage = (event) => {
                const message = event.data;
                console.log('[WebSocket] Received:', message);
                setLastMessage(message);

                if (onMessageRef.current && message?.trim()) {
                    onMessageRef.current(message);
                }
            };

            ws.onclose = () => {
                setStatus('disconnected');
                console.log('[WebSocket] Disconnected. Reconnecting in', reconnectInterval, 'ms...');
                reconnectTimerRef.current = setTimeout(connect, reconnectInterval);
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                setStatus('error');
                ws.close();
            };
        } catch (error) {
            console.error('[WebSocket] Connection error:', error);
            setStatus('error');
            reconnectTimerRef.current = setTimeout(connect, reconnectInterval);
        }
    }, [url, reconnectInterval]);

    const sendMessage = useCallback((message: string) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(message);
            console.log('[WebSocket] Sent:', message);
        } else {
            console.warn('[WebSocket] Cannot send - not connected');
        }
    }, []);

    const reconnect = useCallback(() => {
        connect();
    }, [connect]);

    // Initial connection
    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    return {
        status,
        lastMessage,
        sendMessage,
        reconnect,
    };
}
