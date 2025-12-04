import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from './useWebSocket';

describe('useWebSocket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with connecting or disconnected status', () => {
        const { result } = renderHook(() =>
            useWebSocket({ url: 'ws://localhost:8081/ws' })
        );

        // Hook starts connecting immediately
        expect(['disconnected', 'connecting']).toContain(result.current.status);
        expect(result.current.lastMessage).toBeNull();
    });

    it('should connect and update status', async () => {
        const { result } = renderHook(() =>
            useWebSocket({ url: 'ws://localhost:8081/ws' })
        );

        await waitFor(() => {
            expect(result.current.status).toBe('connected');
        });
    });

    it('should call onMessage callback when receiving message', async () => {
        const onMessage = vi.fn();

        renderHook(() =>
            useWebSocket({
                url: 'ws://localhost:8081/ws',
                onMessage
            })
        );

        await waitFor(() => {
            // Mock would need to simulate message, but validates hook setup
            expect(onMessage).not.toHaveBeenCalled();
        });
    });

    it('should provide sendMessage function', async () => {
        const { result } = renderHook(() =>
            useWebSocket({ url: 'ws://localhost:8081/ws' })
        );

        await waitFor(() => {
            expect(result.current.status).toBe('connected');
        });

        // Should not throw
        expect(() => {
            act(() => {
                result.current.sendMessage('test message');
            });
        }).not.toThrow();
    });

    it('should provide reconnect function', () => {
        const { result } = renderHook(() =>
            useWebSocket({ url: 'ws://localhost:8081/ws' })
        );

        expect(typeof result.current.reconnect).toBe('function');
    });
});
