import http from 'http'
import express from 'express'
import { WebSocketManager } from './websocket/manager'
import { MCPHandler } from './mcp/handler'
import { logger } from './utils/logger'
import { config } from './utils/config'

const app = express()
const server = http.createServer(app)
const wsManager = new WebSocketManager(server)
const mcpHandler = new MCPHandler()

// Middleware
app.use(express.json())
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// REST API Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/strudel/docs', (req, res) => {
  res.json(mcpHandler.getDocs())
})

// WebSocket Event Handlers
wsManager.on('connect', (ws, clientId) => {
  logger.info(`Client connected: ${clientId}`)
})

wsManager.on('message', (ws, message, clientId) => {
  logger.debug(`Message from ${clientId}: ${message}`)
  try {
    const result = mcpHandler.handleMessage(message, clientId)
    if (result) {
      wsManager.send(clientId, JSON.stringify(result))
    }
  } catch (error) {
    logger.error('Handler error:', error)
  }
})

wsManager.on('disconnect', (clientId) => {
  logger.info(`Client disconnected: ${clientId}`)
})

// Start Server
const PORT = config.port
const HOST = config.host

server.listen(PORT, HOST, () => {
  logger.info(`🎵 Strudel MCP Server running on http://${HOST}:${PORT}`)
  logger.info(`WebSocket: ws://${HOST}:${PORT}`)
  logger.info(`REST API: http://${HOST}:${PORT}/api/strudel/docs`)
  logger.info(`Environment: ${config.env}`)
})

// Graceful Shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...')
  server.close(() => {
    logger.info('Server closed')
    process.exit(0)
  })
})
