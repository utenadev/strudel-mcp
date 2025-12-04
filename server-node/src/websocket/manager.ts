import { WebSocketServer, WebSocket } from 'ws';

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number;

  constructor(port: number = 8081) {
    this.port = port;
  }

  start() {
    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const type = new URL(req.url!, `http://localhost`).searchParams.get('type');
      console.log(`[WebSocket] Client connected (type: ${type || 'unknown'})`);

      this.clients.add(ws);

      ws.on('message', (data) => {
        const message = data.toString();
        console.log(`[WebSocket] Received: ${message}`);

        // Echo back or handle specific commands
        if (message === 'ping') {
          ws.send('pong');
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] Error:', error);
      });
    });

    console.log(`[WebSocket] Server listening on ws://localhost:${this.port}`);
  }

  broadcast(message: string) {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  stop() {
    this.clients.forEach(client => client.close());
    this.wss?.close();
  }
}