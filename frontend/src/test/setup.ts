import '@testing-library/jest-dom';

// Mock Web Audio API
class MockAudioContext {
    state = 'running';
    currentTime = 0;

    resume() {
        return Promise.resolve();
    }

    suspend() {
        return Promise.resolve();
    }

    close() {
        return Promise.resolve();
    }
}

// @ts-expect-error - mock for testing
globalThis.AudioContext = MockAudioContext;
// @ts-expect-error - mock for testing
globalThis.webkitAudioContext = MockAudioContext;

// Mock WebSocket
class MockWebSocket {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    readyState = MockWebSocket.CONNECTING;
    onopen: (() => void) | null = null;
    onclose: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: ((error: unknown) => void) | null = null;

    constructor(_url: string) {
        setTimeout(() => {
            this.readyState = MockWebSocket.OPEN;
            this.onopen?.();
        }, 0);
    }

    send(_data: string) { }

    close() {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.();
    }
}

// @ts-expect-error - mock for testing
globalThis.WebSocket = MockWebSocket;
