// Type declarations for Strudel packages
// These packages don't ship with TypeScript definitions

declare module '@strudel/core' {
    export interface Cyclist {
        start: () => void;
        stop: () => void;
        setPattern: (code: string) => Promise<void>;
    }

    export interface ReplOptions {
        defaultOutput?: unknown;
        transpiler?: unknown;
        getTime?: () => number;
    }

    export interface ReplResult {
        scheduler: Cyclist;
        evaluate: (code: string) => Promise<unknown>;
    }

    export function repl(options?: ReplOptions): ReplResult;
    export function evalScope(...modules: unknown[]): Promise<void>;
    export function noteToMidi(note: string): number;
    export function valueToMidi(value: unknown): number;
    export class Pattern {
        fmap(fn: (v: unknown) => unknown): Pattern;
        s(sound: string): Pattern;
        release(value: number): Pattern;
    }
}

declare module '@strudel/webaudio' {
    export function initAudioOnFirstClick(): void;
    export function getAudioContext(): AudioContext;
    export function webaudioOutput(hap: unknown, deadline: number, duration: number): void;
    export function registerSynthSounds(): Promise<void>;
    export function registerZZFXSounds(): Promise<void>;
    export function samples(url: string): Promise<void>;
    export function aliasBank(url: string): void;
}

declare module '@strudel/transpiler' {
    export function transpiler(code: string): string;
}

declare module '@strudel/mini' {
    export function mini(code: string): unknown;
}

declare module '@strudel/tonal' {
    export const tonal: unknown;
}

declare module '@strudel/draw' {
    export function draw(pattern: unknown): unknown;
}

declare module '@strudel/codemirror' {
    export const strudelExtension: unknown;
}

declare module '@strudel/hydra' {
    export const hydra: unknown;
}

declare module '@strudel/soundfonts' {
    export function registerSoundfonts(): Promise<void>;
}

declare module '@strudel/midi' {
    export const midi: unknown;
}
