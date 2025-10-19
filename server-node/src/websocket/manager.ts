import { WebSocketServer } from 'ws'
import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger.ts'

export class WebSocketManager extends EventEmitter {
  private wss: WebSocketServer
  private clients: Map<string, any> = new Map()

  constructor(server: any) {
    super()
    this.wss = new WebSocketServer({ server })
    this.setupHandler()
  }

  private setupHandler() {
    this.wss.on('connection', (ws) => {
      const clientId = uuidv4()
      this.clients.set(clientId, ws)

      ws.on('message', (data: string) => {
        this.emit('message', ws, data.toString(), clientId)
      })

      ws.on('close', () => {
        this.clients.delete(clientId)
        this.emit('disconnect', clientId)
      })

      ws.on('error', (error) => {
        logger.error(`WebSocket error (${clientId}):`, error)
      })

      this.emit('connect', ws, clientId)
    })
  }

  broadcast(message: string) {
    this.clients.forEach((ws) => {
      if (ws.readyState === 1) {
        ws.send(message)
      }
    })
  }

  send(clientId: string, message: string) {
    const ws = this.clients.get(clientId)
    if (ws && ws.readyState === 1) {
      ws.send(message)
    }
  }
}