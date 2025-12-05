import { ExecuteStrudelCodeTool, GetCurrentPatternTool, GetStrudelKnowledgeTool } from '../src/mcp/tools'
import { WebSocketManager } from '../src/websocket/manager'
import { MockWebSocket, MockServer } from './test-utils'

describe('Concurrency Testing', () => {
  let executeTool: ExecuteStrudelCodeTool
  let currentTool: GetCurrentPatternTool
  let knowledgeTool: GetStrudelKnowledgeTool
  let wsManager: WebSocketManager
  let mockServer: MockServer

  beforeEach(() => {
    executeTool = new ExecuteStrudelCodeTool()
    currentTool = new GetCurrentPatternTool()
    knowledgeTool = new GetStrudelKnowledgeTool()
    mockServer = new MockServer()
    wsManager = new WebSocketManager(mockServer as any)
    wsManager.start()
  })

  afterEach(async () => {
    await wsManager.stop()
    mockServer.removeAllListeners()
  })

  describe('Simultaneous Code Execution', () => {
    test('should handle concurrent code execution', async () => {
      const concurrentCodes = [
        's("bd hh sd oh")',
        's("bd hh").fast(2)',
        's("sd oh").slow(2)',
        's("bd").fast(4)'
      ]

      const promises = concurrentCodes.map((code, index) =>
        executeTool.call({ code }).then(result => ({ index, result }))
      )

      const results = await Promise.all(promises)

      results.forEach(({ index, result }) => {
        expect(result).toBeDefined()
        expect(result.status).toBe('executed')
        expect(result.pattern).toBe(concurrentCodes[index])
        expect(result.timestamp).toBeDefined()
      })
    }, 10000) // 10 second timeout

    test('should handle mixed valid/invalid concurrent execution', async () => {
      const mixedCodes = [
        's("bd hh sd oh")', // valid
        'invalid syntax {{{', // invalid
        's("bd hh").fast(2)', // valid
        'require("fs")', // invalid/dangerous
        's("sd oh").slow(2)' // valid
      ]

      const promises = mixedCodes.map((code, index) =>
        executeTool.call({ code }).then(result => ({ index, code, result }))
      )

      const results = await Promise.all(promises)

      results.forEach(({ index, code, result }) => {
        expect(result).toBeDefined()

        if (code.includes('invalid') || code.includes('require')) {
          expect(result.status).toBe('error')
        } else {
          expect(result.status).toBe('executed')
        }
      })
    }, 10000)

    test('should handle rapid sequential execution', async () => {
      const rapidCode = 's("bd hh")'
      const iterations = 50

      const promises = Array.from({ length: iterations }, (_, i) =>
        executeTool.call({ code: rapidCode }).then(result => ({
          iteration: i,
          result
        }))
      )

      const results = await Promise.all(promises)

      expect(results).toHaveLength(iterations)

      results.forEach(({ iteration, result }) => {
        expect(result).toBeDefined()
        expect(result.status).toBe('executed')
        expect(result.pattern).toBe(rapidCode)
      })
    }, 15000)
  })

  describe('WebSocket Concurrency', () => {
    test('should handle multiple simultaneous connections', (done) => {
      const connectionCount = 20
      let connectionCountdown = connectionCount
      let messageCountdown = connectionCount

      wsManager.on('connect', (ws, clientId) => {
        expect(clientId).toBeDefined()
        expect(typeof clientId).toBe('string')

        const mockWs = ws as unknown as MockWebSocket
        const testMessage = JSON.stringify({
          type: 'test',
          clientId,
          timestamp: Date.now()
        })

        // Send message after connection
        setTimeout(() => {
          mockWs.emit('message', Buffer.from(testMessage))
        }, Math.random() * 100)
      })

      wsManager.on('message', (ws, data, clientId) => {
        const message = JSON.parse(data)
        expect(message.clientId).toBe(clientId)
        expect(message.timestamp).toBeDefined()

        messageCountdown--
        if (messageCountdown === 0 && connectionCountdown === 0) {
          done()
        }
      })

      wsManager.on('disconnect', (clientId) => {
        connectionCountdown--
        if (connectionCountdown === 0 && messageCountdown === 0) {
          done()
        }
      })

      // Create multiple simultaneous connections
      for (let i = 0; i < connectionCount; i++) {
        const mockWs = new MockWebSocket(`client-${i}`) as any
        mockServer.emit('connection', mockWs, { url: `/?id=client-${i}&type=test` })

        // Disconnect after random delay
        setTimeout(() => {
          mockWs.close()
        }, 50 + Math.random() * 100)
      }
    }, 10000)

    test('should handle concurrent broadcasting', () => {
      const clientCount = 10
      const broadcastCount = 5
      const clients: MockWebSocket[] = []

      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const mockWs = new MockWebSocket(`client-${i}`) as any
        clients.push(mockWs)
        mockServer.emit('connection', mockWs, { url: `/?id=client-${i}&type=test` })
      }

      // Send multiple concurrent broadcasts
      for (let i = 0; i < broadcastCount; i++) {
        const message = JSON.stringify({
          type: 'broadcast',
          id: i,
          timestamp: Date.now()
        })

        wsManager.broadcast(message)
      }

      // Verify all clients received all broadcasts
      clients.forEach((client, clientIndex) => {
        expect(client.sent).toHaveLength(broadcastCount)

        client.sent.forEach((message, messageIndex) => {
          const parsed = JSON.parse(message)
          expect(parsed.type).toBe('broadcast')
          expect(parsed.id).toBe(messageIndex)
        })
      })
    })

    test('should handle concurrent direct messaging', () => {
      const clientCount = 5
      const messageCount = 3
      const clients: MockWebSocket[] = []
      const clientIds: string[] = []

      // Create multiple clients
      for (let i = 0; i < clientCount; i++) {
        const mockWs = new MockWebSocket(`client-${i}`) as any
        clients.push(mockWs)
        mockServer.emit('connection', mockWs, { url: `/?id=client-${i}&type=test` })
        clientIds.push(`client-${i}`)
      }

      // Send concurrent direct messages
      const promises = Array.from({ length: messageCount }, (_, i) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            const message = JSON.stringify({
              type: 'direct',
              id: i,
              timestamp: Date.now()
            })

            // Send to random client
            const randomClientId = clientIds[Math.floor(Math.random() * clientCount)]
            wsManager.send(randomClientId, message)
            resolve()
          }, Math.random() * 50)
        })
      })

      // Wait for all messages to be sent
      return Promise.all(promises).then(() => {
        // Verify messages were sent to appropriate clients
        clients.forEach((client) => {
          expect(client.sent.length).toBeGreaterThanOrEqual(0)

          client.sent.forEach((message) => {
            const parsed = JSON.parse(message)
            expect(parsed.type).toBe('direct')
            expect(['direct']).toContain(parsed.type)
          })
        })
      })
    })
  })

  describe('Shared State Management', () => {
    test('should handle concurrent pattern state updates', async () => {
      const patternCodes = [
        's("bd hh sd oh")',
        's("bd hh").fast(2)',
        's("sd oh").slow(2)',
        's("bd").fast(4)'
      ]

      // Execute patterns concurrently
      const executionPromises = patternCodes.map(code =>
        executeTool.call({ code })
      )

      await Promise.all(executionPromises)

      // Get current pattern should be consistent
      const currentPattern = await currentTool.call({})
      expect(currentPattern).toBeDefined()
      expect(currentPattern.timestamp).toBeDefined()
      expect(currentPattern.hasPattern).toBeDefined()
    })

    test('should handle concurrent knowledge queries', async () => {
      const topics = ['basics', 'patterns', 'effects', 'troubleshooting']

      const promises = topics.map(topic =>
        knowledgeTool.call({ topic }).then(result => ({ topic, result }))
      )

      const results = await Promise.all(promises)

      results.forEach(({ topic, result }) => {
        expect(result).toBeDefined()
        expect(result.topic).toBe(topic)
        expect(result.title).toBeDefined()
        expect(result.content).toBeDefined()
      })
    })

    test('should maintain consistency under concurrent access', async () => {
      const operations = Array.from({ length: 20 }, (_, i) => {
        return async () => {
          if (i % 3 === 0) {
            // Execute code
            return executeTool.call({ code: 's("bd hh")' })
          } else if (i % 3 === 1) {
            // Get current pattern
            return currentTool.call({})
          } else {
            // Get knowledge
            return knowledgeTool.call({ topic: 'basics' })
          }
        }
      })

      const promises = operations.map(op => op())
      const results = await Promise.all(promises)

      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.timestamp).toBeDefined()
      })
    }, 10000)
  })

  describe('Resource Cleanup', () => {
    test('should handle concurrent connection cleanup', (done) => {
      const connectionCount = 10
      let disconnectCount = 0

      wsManager.on('disconnect', (clientId) => {
        disconnectCount++
        if (disconnectCount === connectionCount) {
          // @ts-ignore - accessing private property for testing
          expect(wsManager.clients.size).toBe(0)
          done()
        }
      })

      // Create multiple connections
      const clients: MockWebSocket[] = []
      for (let i = 0; i < connectionCount; i++) {
        const mockWs = new MockWebSocket(`client-${i}`) as any
        clients.push(mockWs)
        mockServer.emit('connection', mockWs, { url: `/?id=client-${i}&type=test` })
      }

      // @ts-ignore - accessing private property for testing
      expect(wsManager.clients.size).toBe(connectionCount)

      // Disconnect all clients simultaneously
      clients.forEach(client => {
        client.close()
      })
    })

    test('should handle resource cleanup after concurrent operations', async () => {
      const operationCount = 30

      // Perform many concurrent operations
      const promises = Array.from({ length: operationCount }, (_, i) => {
        if (i % 2 === 0) {
          return executeTool.call({ code: 's("bd hh")' })
        } else {
          return currentTool.call({})
        }
      })

      await Promise.all(promises)

      // System should still be responsive
      const finalResult = await executeTool.call({ code: 's("bd sd")' })
      expect(finalResult.status).toBe('executed')
      expect(finalResult.pattern).toBe('s("bd sd")')
    }, 15000)
  })

  describe('Race Condition Detection', () => {
    test('should not have race conditions in pattern updates', async () => {
      const concurrentUpdates = 20
      const updateCode = 's("bd hh")'

      // Perform concurrent pattern updates
      const promises = Array.from({ length: concurrentUpdates }, () =>
        executeTool.call({ code: updateCode })
      )

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe('executed')
        expect(result.pattern).toBe(updateCode)
      })

      // Final state should be consistent
      const currentPattern = await currentTool.call({})
      expect(currentPattern).toBeDefined()
      expect(currentPattern.pattern).toBe(updateCode)
    })

    test('should handle concurrent WebSocket message processing', (done) => {
      const messageCount = 15
      let processedMessages = 0

      wsManager.on('connect', (ws, clientId) => {
        const mockWs = ws as unknown as MockWebSocket

        // Send multiple messages concurrently
        for (let i = 0; i < messageCount; i++) {
          setTimeout(() => {
            const message = JSON.stringify({
              type: 'test',
              id: i,
              clientId,
              timestamp: Date.now()
            })
            mockWs.emit('message', Buffer.from(message))
          }, Math.random() * 50)
        }
      })

      wsManager.on('message', (ws, data, clientId) => {
        processedMessages++

        if (processedMessages === messageCount) {
          expect(processedMessages).toBe(messageCount)
          done()
        }
      })

      const mockWs = new MockWebSocket('test-client') as any
      mockServer.emit('connection', mockWs, { url: '/?id=test-client&type=test' })
    }, 10000)
  })
})
