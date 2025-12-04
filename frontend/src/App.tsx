import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const [status, setStatus] = useState('Disconnected');
  const [code, setCode] = useState('// Waiting for patterns from LLM...');
  const wsRef = useRef<WebSocket | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Update Strudel iframe when code changes
  useEffect(() => {
    if (iframeRef.current && code && code !== '// Waiting for patterns from LLM...') {
      const encodedCode = encodeURIComponent(btoa(code));
      const strudelUrl = `https://strudel.cc/#${encodedCode}`;
      iframeRef.current.src = strudelUrl;
    }
  }, [code]);

  // WebSocket connection
  useEffect(() => {
    let reconnectTimer: any;

    const connect = () => {
      const ws = new WebSocket('ws://localhost:8081/ws?type=strudel');
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('Connected');
        console.log('[WebSocket] Connected to MCP Server');
      };

      ws.onmessage = (event) => {
        const message = event.data;
        console.log('[WebSocket] Received:', message);

        if (message && message.trim()) {
          setCode(message);
        }
      };

      ws.onclose = () => {
        setStatus('Disconnected');
        console.log('[WebSocket] Disconnected. Reconnecting in 3s...');
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  const handleExecute = () => {
    if (code && code.trim()) {
      const encodedCode = encodeURIComponent(btoa(code));
      const strudelUrl = `https://strudel.cc/#${encodedCode}`;
      if (iframeRef.current) {
        iframeRef.current.src = strudelUrl;
      }
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1>🌀 Strudel MCP Player</h1>
        <div className={`status ${status.toLowerCase()}`}>
          Status: {status}
        </div>
      </header>

      <main>
        <div className="editor-section">
          <div className="editor-header">
            <h3>📝 Pattern Code</h3>
            <button onClick={handleExecute} className="execute-btn">
              ▶️ Execute in Strudel
            </button>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="code-editor"
            spellCheck={false}
            placeholder="Strudel pattern code will appear here..."
          />
        </div>

        <div className="strudel-section">
          <div className="strudel-header">
            <h3>🎵 Strudel REPL</h3>
          </div>
          <iframe
            ref={iframeRef}
            src="https://strudel.cc/#"
            className="strudel-iframe"
            title="Strudel REPL"
            allow="autoplay; midi"
          />
        </div>
      </main>

      <footer>
        <p>💡 Powered by Strudel & Bun | LLM sends patterns via MCP → WebSocket → Strudel REPL</p>
      </footer>
    </div>
  );
}

export default App;
