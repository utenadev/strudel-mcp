import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStrudel } from './useStrudel';

// Mock Strudel modules
vi.mock('@strudel/core', () => ({
    repl: vi.fn(() => ({
        scheduler: {
            start: vi.fn(),
            stop: vi.fn(),
            setPattern: vi.fn().mockResolvedValue(undefined),
        },
    })),
}));

vi.mock('@strudel/webaudio', () => ({
    initAudioOnFirstClick: vi.fn(),
    getAudioContext: vi.fn(() => ({
        state: 'running',
        currentTime: 0,
        resume: vi.fn().mockResolvedValue(undefined),
    })),
    webaudioOutput: vi.fn(),
    registerSynthSounds: vi.fn().mockResolvedValue(undefined),
    registerZZFXSounds: vi.fn().mockResolvedValue(undefined),
    samples: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@strudel/transpiler', () => ({
    transpiler: vi.fn((code: string) => code),
}));

describe('useStrudel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should initialize with loading state', () => {
        const { result } = renderHook(() => useStrudel());

        expect(result.current.state.isLoading).toBe(true);
        expect(result.current.state.isPlaying).toBe(false);
        expect(result.current.state.error).toBeNull();
        expect(result.current.state.currentCode).toBe('');
    });

    it('should provide initialize function', () => {
        const { result } = renderHook(() => useStrudel());

        expect(typeof result.current.initialize).toBe('function');
    });

    it('should provide evaluate function', () => {
        const { result } = renderHook(() => useStrudel());

        expect(typeof result.current.evaluate).toBe('function');
    });

    it('should provide play and stop functions', () => {
        const { result } = renderHook(() => useStrudel());

        expect(typeof result.current.play).toBe('function');
        expect(typeof result.current.stop).toBe('function');
    });

    it('should not evaluate empty code', async () => {
        const { result } = renderHook(() => useStrudel());

        await act(async () => {
            await result.current.evaluate('');
        });

        expect(result.current.state.currentCode).toBe('');
        expect(result.current.state.isPlaying).toBe(false);
    });

    it('should update currentCode when evaluating', async () => {
        const { result } = renderHook(() => useStrudel());

        await act(async () => {
            await result.current.evaluate('s("bd hh sd oh")');
        });

        expect(result.current.state.currentCode).toBe('s("bd hh sd oh")');
        expect(result.current.state.isPlaying).toBe(true);
    });

    it('should handle evaluation errors gracefully', async () => {
        // Mock to throw error
        const mockRepl = await import('@strudel/core');
        vi.mocked(mockRepl.repl).mockImplementationOnce(() => {
            throw new Error('Evaluation failed');
        });

        const { result } = renderHook(() => useStrudel());

        await act(async () => {
            await result.current.evaluate('invalid code');
        });

        expect(result.current.state.error).toBe('Evaluation failed');
        expect(result.current.state.isPlaying).toBe(false);
    });
});
