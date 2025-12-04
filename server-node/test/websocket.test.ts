import {WebSocketManager} from '../src/websocket/manager'
import { MockWebSocket, MockServer } from './test-utils'

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager
  let mockServer: MockServer

  beforeEach(() => {
    mockServer = new MockServer()
    wsManager = new WebSocketManager(mockServer as any)
  })

  afterEach(() => {
    wsManager.removeAllListeners()
    mockServer.removeAllListeners()
  })

  describe('Connection Handling', () => {
    test('should handle new WebSocket connection', (done) => {
      wsManager.on('connect', (ws, clientId) => {
        expect(clientId).toBeDefined()
        expect(typeof clientId).toBe('string')
        expect(ws).toBeDefined()
        done()
      })

      // Simulate WebSocket connection
      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })

    test('should handle disconnection', (done) => {
      let clientId: string

      wsManager.on('connect', (ws, id) => {
        clientId = id
        const mockWs = ws as unknown as MockWebSocket
        mockWs.close()
      })

      wsManager.on('disconnect', (id) => {
        expect(id).toBe(clientId)
        done()
      })

      // Simulate connection and disconnection
      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })

    test('should handle WebSocket errors', (done) => {
      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        const testError = new Error('Test WebSocket error')
        mockWs.emit('error', testError)
        done()
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })
  })

  describe('Message Handling', () => {
    test('should handle incoming messages', (done) => {
      const testMessage = JSON.stringify({ type: 'test', data: 'hello' })
      
      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        mockWs.emit('message', Buffer.from(testMessage))
      })

      wsManager.on('message', (ws, data, clientId) => {
        expect(data).toBe(testMessage)
        expect(clientId).toBeDefined()
        done()
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })

    test('should handle malformed messages gracefully', (done) => {
      const malformedMessage = '{ invalid json'
      
      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        mockWs.emit('message', Buffer.from(malformedMessage))
      })

      wsManager.on('message', (ws, data, clientId) => {
        expect(data).toBe(malformedMessage)
        done()
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })
  })

  describe('Broadcasting', () => {
    test('should broadcast message to all connected clients', () => {
      const mockWs1 = new MockWebSocket() as any
      const mockWs2 = new MockWebSocket() as any
      
      mockServer.emit('connection', mockWs1)
      mockServer.emit('connection', mockWs2)

      const testMessage = JSON.stringify({ type: 'broadcast', data: 'test' })
      wsManager.broadcast(testMessage)

      expect(mockWs1.sent).toContain(testMessage)
      expect(mockWs2.sent).toContain(testMessage)
    })

    test('should not broadcast to disconnected clients', () => {
      const mockWs1 = new MockWebSocket() as any
      const mockWs2 = new MockWebSocket() as any
      
      mockServer.emit('connection', mockWs1)
      mockServer.emit('connection', mockWs2)

      // Disconnect one client
      mockWs1.close()
      mockWs1.readyState = 3 // WebSocket.CLOSED

      const testMessage = JSON.stringify({ type: 'broadcast', data: 'test' })
      wsManager.broadcast(testMessage)

      expect(mockWs1.sent).not.toContain(testMessage)
      expect(mockWs2.sent).toContain(testMessage)
    })
  })

  describe('Direct Messaging', () => {
    test('should send message to specific client', (done) => {
      let targetClientId: string

      wsManager.on('connect', (ws, clientId) => {
        targetClientId = clientId
        const mockWs = ws as unknown as MockWebSocket
        
        const testMessage = JSON.stringify({ type: 'direct', data: 'test' })
        wsManager.send(targetClientId, testMessage)

        expect(mockWs.sent).toContain(testMessage)
        done()
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })

    test('should handle sending to non-existent client', () => {
      const nonExistentClientId = 'non-existent-id'
      const testMessage = JSON.stringify({ type: 'direct', data: 'test' })
      
      // Should not throw error
      expect(() => {
        wsManager.send(nonExistentClientId, testMessage)
      }).not.toThrow()
    })
  })

  describe('Client Management', () => {
    test('should track connected clients', () => {
      const mockWs1 = new MockWebSocket() as any
      const mockWs2 = new MockWebSocket() as any
      
      mockServer.emit('connection', mockWs1)
      mockServer.emit('connection', mockWs2)

      // @ts-ignore - accessing private property for testing
      expect(wsManager.clients.size).toBe(2)
    })

    test('should remove disconnected clients', () => {
      const mockWs1 = new MockWebSocket() as any
      const mockWs2 = new MockWebSocket() as any
      
      mockServer.emit('connection', mockWs1)
      mockServer.emit('connection', mockWs2)

      // Disconnect one client
      mockWs1.close()

      // @ts-ignore - accessing private property for testing
      expect(wsManager.clients.size).toBe(1)
    })
  })
})
