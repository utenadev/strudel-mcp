import { useEffect, useCallback } from 'react';
import { useStrudel, useWebSocket } from './hooks';
import './App.css';

const WS_URL = 'ws://localhost:8081/ws?type=strudel';

function App() {
  const { state: strudelState, evaluate, play, stop, initialize } = useStrudel();
  const { status: wsStatus, lastMessage } = useWebSocket({
    url: WS_URL,
    onMessage: useCallback((message: string) => {
      // Auto-evaluate code received from WebSocket
      if (message.trim()) {
        evaluate(message);
      }
    }, [evaluate]),
  });

  // Initialize Strudel on first user interaction
  const handleInitialize = useCallback(async () => {
    await initialize();
  }, [initialize]);

  // Handle manual code execution
  const handleExecute = useCallback(() => {
    if (strudelState.currentCode) {
      evaluate(strudelState.currentCode);
    }
  }, [evaluate, strudelState.currentCode]);

  // Handle play/stop toggle
  const handleTogglePlayback = useCallback(() => {
    if (strudelState.isPlaying) {
      stop();
    } else {
      play();
    }
  }, [strudelState.isPlaying, play, stop]);

  // Auto evaluate when receiving WebSocket message
  useEffect(() => {
    if (lastMessage && !strudelState.isLoading) {
      evaluate(lastMessage);
    }
  }, [lastMessage, strudelState.isLoading, evaluate]);

  const getStatusClass = () => {
    switch (wsStatus) {
      case 'connected': return 'connected';
      case 'connecting': return 'connecting';
      case 'error': return 'error';
      default: return 'disconnected';
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>🌀 Strudel MCP Player</h1>
        <div className="status-bar">
          <div className={`status ${getStatusClass()}`}>
            WebSocket: {wsStatus}
          </div>
          <div className={`status ${strudelState.isPlaying ? 'playing' : 'stopped'}`}>
            Audio: {strudelState.isPlaying ? '▶️ Playing' : '⏹️ Stopped'}
          </div>
        </div>
      </header>

      <main>
        {strudelState.isLoading && (
          <div className="loading-overlay" onClick={handleInitialize}>
            <div className="loading-content">
              <p>🎵 Click to Initialize Audio</p>
              <p className="loading-hint">Browser requires user interaction to start audio</p>
            </div>
          </div>
        )}

        <div className="editor-section">
          <div className="editor-header">
            <h3>📝 Pattern Code</h3>
            <div className="button-group">
              <button
                onClick={handleExecute}
                className="execute-btn"
                disabled={strudelState.isLoading || !strudelState.currentCode}
              >
                ▶️ Execute
              </button>
              <button
                onClick={handleTogglePlayback}
                className={`toggle-btn ${strudelState.isPlaying ? 'stop' : 'play'}`}
                disabled={strudelState.isLoading}
              >
                {strudelState.isPlaying ? '⏹️ Stop' : '▶️ Play'}
              </button>
            </div>
          </div>

          <textarea
            value={strudelState.currentCode || '// Waiting for patterns from LLM...'}
            className="code-editor"
            spellCheck={false}
            placeholder="Strudel pattern code will appear here..."
            readOnly
          />

          {strudelState.error && (
            <div className="error-panel">
              <strong>❌ Error:</strong> {strudelState.error}
            </div>
          )}
        </div>

        <div className="info-section">
          <h3>🎵 How It Works</h3>
          <ul>
            <li>LLM sends Strudel patterns via MCP → WebSocket</li>
            <li>Patterns are automatically evaluated and played</li>
            <li>Audio uses local Web Audio API (no iframe needed)</li>
          </ul>

          <h3>📚 Example Patterns</h3>
          <div className="example-patterns">
            <code>s("bd hh sd oh").fast(2)</code>
            <code>note("c3 e3 g3 b3").s("piano")</code>
            <code>s("bd*4, hh*8, ~ sd").gain(0.8)</code>
          </div>
        </div>
      </main>

      <footer>
        <p>💡 Powered by Strudel & Web Audio API | Local audio processing - no external dependencies</p>
      </footer>
    </div>
  );
}

export default App;
