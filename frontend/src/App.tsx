import { useEffect, useCallback, useState } from 'react';
import { useStrudel, useWebSocket } from './hooks';
import { GENRES, getPresetsByGenre } from './presets';
import type { PatternPreset } from './presets';
import './App.css';

const WS_URL = 'ws://localhost:8081/ws?type=strudel';

function App() {
  const { state: strudelState, evaluate, play, stop, initialize } = useStrudel();
  const { status: wsStatus } = useWebSocket({
    url: WS_URL,
    onMessage: useCallback((message: string) => {
      // Auto-evaluate code received from WebSocket
      if (message.trim()) {
        evaluate(message);
      }
    }, [evaluate]),
  });

  const [selectedGenre, setSelectedGenre] = useState<string>(GENRES[0]);
  const [presets, setPresets] = useState<PatternPreset[]>(getPresetsByGenre(GENRES[0]));
  const [editableCode, setEditableCode] = useState<string>('');

  // Update presets when genre changes
  useEffect(() => {
    setPresets(getPresetsByGenre(selectedGenre));
  }, [selectedGenre]);

  // Sync editable code with current playing code
  useEffect(() => {
    if (strudelState.currentCode) {
      setEditableCode(strudelState.currentCode);
    }
  }, [strudelState.currentCode]);

  // Initialize Strudel on first user interaction
  const handleInitialize = useCallback(async () => {
    await initialize();
  }, [initialize]);

  // Handle manual code execution
  const handleExecute = useCallback(() => {
    if (editableCode) {
      evaluate(editableCode);
    }
  }, [evaluate, editableCode]);

  // Handle play/stop toggle
  const handleTogglePlayback = useCallback(() => {
    if (strudelState.isPlaying) {
      stop();
    } else {
      play();
    }
  }, [strudelState.isPlaying, play, stop]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset: PatternPreset) => {
    setEditableCode(preset.code);
    evaluate(preset.code);
  }, [evaluate]);

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
                disabled={strudelState.isLoading || !editableCode}
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
            value={editableCode || '// Select a preset or wait for LLM patterns...'}
            onChange={(e) => setEditableCode(e.target.value)}
            className="code-editor"
            spellCheck={false}
            placeholder="Strudel pattern code will appear here..."
          />

          {strudelState.error && (
            <div className="error-panel">
              <strong>❌ Error:</strong> {strudelState.error}
            </div>
          )}
        </div>

        <div className="sidebar">
          <div className="presets-section">
            <h3>🎼 Genre Presets</h3>

            <div className="genre-tabs">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  className={`genre-tab ${selectedGenre === genre ? 'active' : ''}`}
                  onClick={() => setSelectedGenre(genre)}
                >
                  {genre.charAt(0).toUpperCase() + genre.slice(1)}
                </button>
              ))}
            </div>

            <div className="preset-list">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="preset-card"
                  onClick={() => handlePresetSelect(preset)}
                >
                  <div className="preset-header">
                    <span className="preset-name">{preset.name}</span>
                    {preset.bpm && <span className="preset-bpm">{preset.bpm} BPM</span>}
                  </div>
                  <p className="preset-description">{preset.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="info-section">
            <h3>🎵 How It Works</h3>
            <ul>
              <li>Select a genre and click a preset to play</li>
              <li>Edit the code and click Execute</li>
              <li>LLM can send patterns via MCP → WebSocket</li>
            </ul>
          </div>
        </div>
      </main>

      <footer>
        <p>💡 Powered by Strudel & Web Audio API | Local audio processing</p>
      </footer>
    </div>
  );
}

export default App;
