import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';
import { IncomingMessage } from 'http';

export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private port: number;

  constructor(portOrServer?: number | any) {
    super();
    if (typeof portOrServer === 'number') {
      this.port = portOrServer;
    } else if (portOrServer && typeof portOrServer === 'object') {
      // Allow passing a mock server or options object
      this.port = 8081;
      if (portOrServer.listen) {
        // It's likely a server instance, but we initialize wss in start() normally.
        // For testing with mock server passed in constructor:
        this.wss = portOrServer;
      }
    } else {
      this.port = 8081;
    }
  }

  start() {
    if (!this.wss) {
      this.wss = new WebSocketServer({ port: this.port });
    }

    this.wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
      const url = new URL(req.url!, `http://localhost`);
      const type = url.searchParams.get('type');
      // Use provided ID or generate one
      const clientId = url.searchParams.get('id') || `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log(`[WebSocket] Client connected (id: ${clientId}, type: ${type || 'unknown'})`);

      this.clients.set(clientId, ws);
      this.emit('connect', ws, clientId);

      ws.on('message', (data) => {
        const message = data.toString();
        // console.log(`[WebSocket] Received from ${clientId}: ${message}`);

        this.emit('message', ws, message, clientId);

        // Echo back or handle specific commands - keeping simple for now
        if (message === 'ping') {
          ws.send('pong');
        }
      });

      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
        this.emit('disconnect', clientId);
      });

      ws.on('error', (error) => {
        console.error(`[WebSocket] Error (${clientId}):`, error);
        this.emit('error', error, clientId);
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

  send(clientId: string, message: string) {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(message);
    } else {
      // console.warn(`[WebSocket] Cannot send to ${clientId}: Client not found or not open`);
    }
  }

  async stop(): Promise<void> {
    this.clients.forEach(client => client.close());
    this.clients.clear();

    if (this.wss) {
      return new Promise((resolve, reject) => {
        this.wss!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
        this.wss = null;
      });
    }
  }
}