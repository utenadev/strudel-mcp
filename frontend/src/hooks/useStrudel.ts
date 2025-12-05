import { useState, useCallback, useRef, useEffect } from 'react';

export interface StrudelState {
    isPlaying: boolean;
    isLoading: boolean;
    error: string | null;
    currentCode: string;
}

export interface UseStrudelReturn {
    state: StrudelState;
    evaluate: (code: string) => Promise<void>;
    play: () => void;
    stop: () => void;
    initialize: () => Promise<void>;
}

// Cyclist type for scheduler
interface Cyclist {
    start: () => void;
    stop: () => void;
    setPattern: (pattern: any) => Promise<void>;
}

// Initialize samples and synths
async function initializeStrudel() {
    const webaudio = await import('@strudel/webaudio');
    const { registerSynthSounds, registerZZFXSounds, samples } = webaudio as {
        registerSynthSounds: () => Promise<void>;
        registerZZFXSounds: () => Promise<void>;
        samples: (url: string) => Promise<void>;
    };

    const ds = 'https://raw.githubusercontent.com/felixroos/dough-samples/main';

    await Promise.all([
        registerSynthSounds(),
        registerZZFXSounds(),
        samples(`${ds}/tidal-drum-machines.json`),
        samples(`${ds}/piano.json`),
        samples(`${ds}/Dirt-Samples.json`),
    ]);
}

export function useStrudel(): UseStrudelReturn {
    const [state, setState] = useState<StrudelState>({
        isPlaying: false,
        isLoading: true,
        error: null,
        currentCode: '',
    });

    const cyclistRef = useRef<Cyclist | null>(null);
    const initializedRef = useRef(false);

    // Initialize audio and samples
    const initialize = useCallback(async () => {
        if (initializedRef.current) return;

        try {
            setState(prev => ({ ...prev, isLoading: true, error: null }));

            // Initialize audio context on first user interaction
            const webaudio = await import('@strudel/webaudio');
            const initAudioOnFirstClick = (webaudio as { initAudioOnFirstClick: () => void }).initAudioOnFirstClick;
            initAudioOnFirstClick();

            // Load samples and synths
            await initializeStrudel();

            initializedRef.current = true;
            setState(prev => ({ ...prev, isLoading: false }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Strudel';
            setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
            console.error('[Strudel] Initialization error:', err);
        }
    }, []);

    // Evaluate and play Strudel code
    const evaluate = useCallback(async (code: string) => {
        if (!code.trim()) return;

        try {
            setState(prev => ({ ...prev, error: null, currentCode: code }));

            // Dynamic imports for Strudel modules
            const [core, webaudio, transpilerModule] = await Promise.all([
                import('@strudel/core'),
                import('@strudel/webaudio'),
                import('@strudel/transpiler'),
            ]);

            const repl = (core as { repl: (opts: unknown) => any }).repl;
            const getAudioContext = (webaudio as { getAudioContext: () => AudioContext }).getAudioContext;
            const webaudioOutput = (webaudio as { webaudioOutput: unknown }).webaudioOutput;
            const transpiler = (transpilerModule as { transpiler: unknown }).transpiler;

            // Get audio context
            const audioContext = getAudioContext();
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Create new REPL instance
            // Using Strudel's repl function which returns { scheduler, evaluate, ... }
            const { scheduler, evaluate: strudelEvaluate } = repl({
                defaultOutput: webaudioOutput,
                transpiler,
                getTime: () => audioContext.currentTime,
            });

            cyclistRef.current = scheduler;

            // Evaluate using Strudel's built-in evaluate function
            // This handles transpilation, pattern evaluation, and scheduling
            await strudelEvaluate(code);

            setState(prev => ({ ...prev, isPlaying: true }));
            console.log('[Strudel] Playing:', code);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Evaluation error';
            setState(prev => ({ ...prev, error: errorMessage, isPlaying: false }));
            console.error('[Strudel] Evaluation error:', err);
        }
    }, []);

    // Play/resume
    const play = useCallback(() => {
        if (cyclistRef.current) {
            cyclistRef.current.start();
            setState(prev => ({ ...prev, isPlaying: true }));
        }
    }, []);

    // Stop playback
    const stop = useCallback(() => {
        if (cyclistRef.current) {
            cyclistRef.current.stop();
            setState(prev => ({ ...prev, isPlaying: false }));
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (cyclistRef.current) {
                cyclistRef.current.stop();
            }
        };
    }, []);

    return {
        state,
        evaluate,
        play,
        stop,
        initialize,
    };
}
