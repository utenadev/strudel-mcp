import { ExecuteStrudelCodeTool, GetCurrentPatternTool, GetStrudelKnowledgeTool } from '../src/mcp/tools'
import { WebSocketManager } from '../src/websocket/manager'
import { startMCPStdioServer } from '../src/mcp/stdio-handler'

// Mock Strudel Frontend for testing
class MockStrudelFrontend {
  ws: any = null
  receivedMessages: any[] = []
  connected: boolean = false

  constructor() {
    this.setupWebSocket()
  }

  private setupWebSocket() {
    // Simulate WebSocket connection to server
    this.ws = {
      readyState: 1, // WebSocket.OPEN
      send: (data: string) => {
        this.receivedMessages.push(JSON.parse(data))
      },
      close: () => {
        this.connected = false
      },
      on: (event: string, callback: Function) => {
        // Mock event handling
      }
    }
  }

  connect(serverUrl: string) {
    // Simulate connection process
    setTimeout(() => {
      this.connected = true
    }, 100)
  }

  sendPattern(code: string) {
    if (this.connected && this.ws) {
      const message = JSON.stringify({
        type: 'execute',
        code: code,
        timestamp: Date.now()
      })
      this.ws.send(message)
    }
  }

  getCurrentPattern() {
    if (this.connected && this.ws) {
      const message = JSON.stringify({
        type: 'getCurrentPattern',
        timestamp: Date.now()
      })
      this.ws.send(message)
    }
  }

  getKnowledge(topic: string) {
    if (this.connected && this.ws) {
      const message = JSON.stringify({
        type: 'getKnowledge',
        topic: topic,
        timestamp: Date.now()
      })
      this.ws.send(message)
    }
  }
}

// Mock Server
class MockServer extends EventEmitter {
  constructor() {
    super()
  }
}

describe('Integration Testing Framework', () => {
  let executeTool: ExecuteStrudelCodeTool
  let currentTool: GetCurrentPatternTool
  let knowledgeTool: GetStrudelKnowledgeTool
  let wsManager: WebSocketManager
  let mockServer: MockServer
  let mockFrontend: MockStrudelFrontend

  beforeEach(() => {
    executeTool = new ExecuteStrudelCodeTool()
    currentTool = new GetCurrentPatternTool()
    knowledgeTool = new GetStrudelKnowledgeTool()
    mockServer = new MockServer()
    wsManager = new WebSocketManager(mockServer as any)
    mockFrontend = new MockStrudelFrontend()
  })

  afterEach(() => {
    wsManager.removeAllListeners()
    mockServer.removeAllListeners()
  })

  describe('End-to-End Workflow Testing', () => {
    test('should handle complete pattern execution workflow', async () => {
      // Step 1: Frontend connects to server
      mockFrontend.connect('ws://localhost:8081')
      
      // Step 2: Simulate server connection
      const mockWs = {
        readyState: 1,
        send: jest.fn(),
        on: jest.fn()
      } as any
      
      wsManager.on('connect', (ws, clientId) => {
        expect(clientId).toBeDefined()
        
        // Step 3: Frontend sends pattern
        const testPattern = 's("bd hh sd oh")'
        mockFrontend.sendPattern(testPattern)
        
        // Step 4: Server processes pattern
        ws.emit('message', Buffer.from(JSON.stringify({
          type: 'execute',
          code: testPattern,
          clientId: clientId
        })))
      })

      mockServer.emit('connection', mockWs)

      // Step 5: Execute pattern via MCP
      const result = await executeTool.call({ code: 's("bd hh sd oh")' })
      expect(result.status).toBe('executed')
      expect(result.pattern).toBe('s("bd hh sd oh")')

      // Step 6: Get current pattern
      const currentPattern = await currentTool.call({})
      expect(currentPattern.hasPattern).toBeDefined()
      expect(currentPattern.timestamp).toBeDefined()
    })

    test('should handle real-time synchronization', (done) => {
      let clientCount = 0
      const expectedClients = 3
      let syncCount = 0

      wsManager.on('connect', (ws, clientId) => {
        clientCount++
        
        // Simulate pattern synchronization
        const syncMessage = JSON.stringify({
          type: 'patternSync',
          pattern: 's("bd hh")',
          clientId: clientId,
          timestamp: Date.now()
        })

        // Broadcast to all clients
        setTimeout(() => {
          wsManager.broadcast(syncMessage)
        }, 100)
      })

      wsManager.on('message', (ws, data, clientId) => {
        const message = JSON.parse(data)
        if (message.type === 'patternSync') {
          syncCount++
          
          if (syncCount === expectedClients) {
            expect(clientCount).toBe(expectedClients)
            expect(syncCount).toBe(expectedClients)
            done()
          }
        }
      })

      // Connect multiple clients
      for (let i = 0; i < expectedClients; i++) {
        const mockWs = {
          readyState: 1,
          send: jest.fn(),
          on: jest.fn()
        } as any
        mockServer.emit('connection', mockWs)
      }
    }, 5000)

    test('should handle cross-tab communication simulation', (done) => {
      const tabCount = 2
      let connectedTabs = 0
      let messagesReceived = 0

      wsManager.on('connect', (ws, clientId) => {
        connectedTabs++
        
        const mockWs = ws as any
        mockWs.tabId = `tab-${connectedTabs}`

        // Simulate tab communication
        if (connectedTabs === tabCount) {
          const broadcastMessage = JSON.stringify({
            type: 'tabBroadcast',
            sourceTab: 'tab-1',
            message: 'Pattern updated',
            timestamp: Date.now()
          })
          
          wsManager.broadcast(broadcastMessage)
        }
      })

      wsManager.on('message', (ws, data, clientId) => {
        const message = JSON.parse(data)
        if (message.type === 'tabBroadcast') {
          messagesReceived++
          
          if (messagesReceived === tabCount) {
            expect(connectedTabs).toBe(tabCount)
            expect(messagesReceived).toBe(tabCount)
            done()
          }
        }
      })

      // Connect multiple tabs
      for (let i = 0; i < tabCount; i++) {
        const mockWs = {
          readyState: 1,
          send: jest.fn(),
          on: jest.fn()
        } as any
        mockServer.emit('connection', mockWs)
      }
    }, 5000)
  })

  describe('MCP Protocol Integration', () => {
    test('should handle complete MCP tool execution cycle', async () => {
      const testWorkflow = [
        { tool: 'execute', code: 's("bd hh")' },
        { tool: 'get_current', params: {} },
        { tool: 'get_knowledge', params: { topic: 'basics' } },
        { tool: 'execute', code: 's("sd oh").fast(2)' },
        { tool: 'get_current', params: {} }
      ]

      const results = []

      for (const step of testWorkflow) {
        let result
        
        switch (step.tool) {
          case 'execute':
            result = await executeTool.call({ code: step.code })
            expect(result.status).toBe('executed')
            break
          case 'get_current':
            result = await currentTool.call(step.params)
            expect(result.timestamp).toBeDefined()
            break
          case 'get_knowledge':
            result = await knowledgeTool.call(step.params)
            expect(result.topic).toBe(step.params.topic)
            break
        }
        
        results.push(result)
      }

      expect(results).toHaveLength(testWorkflow.length)
    })

    test('should handle MCP error recovery workflow', async () => {
      // Step 1: Execute valid code
      const result1 = await executeTool.call({ code: 's("bd hh")' })
      expect(result1.status).toBe('executed')

      // Step 2: Execute invalid code
      const result2 = await executeTool.call({ code: 'invalid syntax {{{' })
      expect(result2.status).toBe('error')

      // Step 3: Execute valid code again (should recover)
      const result3 = await executeTool.call({ code: 's("sd oh")' })
      expect(result3.status).toBe('executed')

      // Step 4: Get current pattern should still work
      const result4 = await currentTool.call({})
      expect(result4.timestamp).toBeDefined()
    })

    test('should handle concurrent MCP requests', async () => {
      const concurrentRequests = [
        executeTool.call({ code: 's("bd hh")' }),
        executeTool.call({ code: 's("sd oh")' }),
        currentTool.call({}),
        knowledgeTool.call({ topic: 'basics' }),
        knowledgeTool.call({ topic: 'patterns' })
      ]

      const results = await Promise.all(concurrentRequests)
      
      results.forEach((result, index) => {
        expect(result).toBeDefined()
        expect(result.timestamp).toBeDefined()
        
        // Check specific expectations based on request type
        if (index < 2) { // execute calls
          expect(result.status).toBe('executed')
        } else if (index === 2) { // current pattern call
          expect(result.hasPattern).toBeDefined()
        } else { // knowledge calls
          expect(result.topic).toBeDefined()
        }
      })
    }, 10000)
  })

  describe('Frontend-Server Integration', () => {
    test('should handle frontend message processing', (done) => {
      const frontendMessages = [
        { type: 'execute', code: 's("bd hh")' },
        { type: 'getCurrentPattern', params: {} },
        { type: 'getKnowledge', topic: 'basics' },
        { type: 'execute', code: 's("sd oh").fast(2)' }
      ]

      let processedMessages = 0

      wsManager.on('connect', (ws, clientId) => {
        const mockWs = ws as any
        
        // Simulate frontend sending messages
        frontendMessages.forEach((message, index) => {
          setTimeout(() => {
            const messageData = JSON.stringify({
              ...message,
              clientId: clientId,
              timestamp: Date.now()
            })
            
            mockWs.emit('message', Buffer.from(messageData))
          }, index * 50)
        })
      })

      wsManager.on('message', (ws, data, clientId) => {
        const message = JSON.parse(data)
        processedMessages++
        
        if (processedMessages === frontendMessages.length) {
          expect(processedMessages).toBe(frontendMessages.length)
          done()
        }
      })

      const mockWs = {
        readyState: 1,
        send: jest.fn(),
        on: jest.fn()
      } as any
      
      mockServer.emit('connection', mockWs)
    }, 5000)

    test('should handle frontend disconnection and reconnection', (done) => {
      let disconnectionCount = 0
      let reconnectionCount = 0

      wsManager.on('disconnect', (clientId) => {
        disconnectionCount++
        
        // Simulate reconnection
        setTimeout(() => {
          const mockWs = {
            readyState: 1,
            send: jest.fn(),
            on: jest.fn()
          } as any
          mockServer.emit('connection', mockWs)
        }, 100)
      })

      wsManager.on('connect', (ws, clientId) => {
        reconnectionCount++
        
        if (disconnectionCount === 1 && reconnectionCount === 2) {
          expect(disconnectionCount).toBe(1)
          expect(reconnectionCount).toBe(2)
          done()
        }
      })

      // Initial connection
      const mockWs = {
        readyState: 1,
        send: jest.fn(),
        on: jest.fn(),
        close: () => {}
      } as any
      
      mockServer.emit('connection', mockWs)
      
      // Simulate disconnection
      setTimeout(() => {
        mockWs.close()
      }, 200)
    }, 5000)

    test('should handle frontend error scenarios', (done) => {
      const errorScenarios = [
        { type: 'invalid', data: 'malformed payload' },
        { type: 'execute', code: 'invalid syntax {{{' },
        { type: 'unknown', data: 'unknown command' }
      ]

      let errorCount = 0

      wsManager.on('connect', (ws, clientId) => {
        const mockWs = ws as any
        
        errorScenarios.forEach((scenario, index) => {
          setTimeout(() => {
            try {
              const messageData = JSON.stringify({
                ...scenario,
                clientId: clientId,
                timestamp: Date.now()
              })
              
              mockWs.emit('message', Buffer.from(messageData))
            } catch (error) {
              errorCount++
              
              if (errorCount === errorScenarios.length) {
                expect(errorCount).toBe(errorScenarios.length)
                done()
              }
            }
          }, index * 50)
        })
      })

      const mockWs = {
        readyState: 1,
        send: jest.fn(),
        on: jest.fn()
      } as any
      
      mockServer.emit('connection', mockWs)
    }, 5000)
  })

  describe('State Management Integration', () => {
    test('should maintain consistent state across operations', async () => {
      // Initial state
      const initialState = await currentTool.call({})
      expect(initialState.timestamp).toBeDefined()

      // Execute pattern
      await executeTool.call({ code: 's("bd hh")' })
      
      // Check state remains consistent
      const state1 = await currentTool.call({})
      expect(state1.hasPattern).toBeDefined()

      // Execute another pattern
      await executeTool.call({ code: 's("sd oh").fast(2)' })
      
      // Final state check
      const finalState = await currentTool.call({})
      expect(finalState.timestamp).toBeDefined()
      expect(finalState.timestamp).not.toBe(initialState.timestamp)
    })

    test('should handle concurrent state modifications', async () => {
      const concurrentModifications = Array.from({ length: 10 }, (_, i) => 
        executeTool.call({ code: `s("bd hh sd oh").fast(${i % 4 + 1})` })
      )

      const results = await Promise.all(concurrentModifications)
      
      // All should succeed
      results.forEach(result => {
        expect(result.status).toBe('executed')
      })

      // Final state should be consistent
      const finalState = await currentTool.call({})
      expect(finalState.timestamp).toBeDefined()
      expect(finalState.hasPattern).toBeDefined()
    })

    test('should handle state persistence simulation', async () => {
      // Simulate session save
      const sessionPatterns = []
      
      for (let i = 0; i < 5; i++) {
        const pattern = `s("bd hh sd oh").fast(${i + 1})`
        sessionPatterns.push(pattern)
        await executeTool.call({ code: pattern })
      }

      // Simulate session restore by checking current state
      const restoredState = await currentTool.call({})
      expect(restoredState.hasPattern).toBeDefined()
      expect(restoredState.timestamp).toBeDefined()
    })
  })

  describe('Real-world Scenario Testing', () => {
    test('should handle typical live coding session', async () => {
      const liveCodingSequence = [
        's("bd")', // Start with kick
        's("bd hh")', // Add hi-hats
        's("bd hh sd oh")', // Add snare and open hi-hat
        's("bd hh sd oh").fast(2)', // Double speed
        's("bd hh sd oh").fast(2).slow(0.5)', // Variations
        's("bd hh").fast(4) + s("sd oh").slow(2)' // Polyhythm
      ]

      const results = []
      
      for (const pattern of liveCodingSequence) {
        const result = await executeTool.call({ code: pattern })
        results.push(result)
        expect(result.status).toBe('executed')
        
        // Small delay to simulate real-time performance
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      expect(results).toHaveLength(liveCodingSequence.length)
    })

    test('should handle collaborative session simulation', (done) => {
      const collaborators = ['alice', 'bob', 'charlie']
      const collaborationMessages = []
      
      let connectedCount = 0
      let messagesExchanged = 0

      wsManager.on('connect', (ws, clientId) => {
        connectedCount++
        const collaborator = collaborators[connectedCount - 1]
        
        const mockWs = ws as any
        mockWs.collaborator = collaborator
        
        // Simulate collaborative pattern sharing
        setTimeout(() => {
          const shareMessage = JSON.stringify({
            type: 'patternShare',
            collaborator: collaborator,
            pattern: `s("bd hh from ${collaborator}")`,
            timestamp: Date.now()
          })
          
          wsManager.broadcast(shareMessage)
        }, connectedCount * 100)
      })

      wsManager.on('message', (ws, data, clientId) => {
        const message = JSON.parse(data)
        if (message.type === 'patternShare') {
          collaborationMessages.push(message)
          messagesExchanged++
          
          if (messagesExchanged === collaborators.length * (collaborators.length - 1)) {
            expect(connectedCount).toBe(collaborators.length)
            expect(collaborationMessages.length).toBeGreaterThan(0)
            done()
          }
        }
      })

      // Connect all collaborators
      collaborators.forEach(() => {
        const mockWs = {
          readyState: 1,
          send: jest.fn(),
          on: jest.fn()
        } as any
        mockServer.emit('connection', mockWs)
      })
    }, 10000)

    test('should handle error recovery in live performance', async () => {
      const performanceSequence = [
        's("bd hh")', // Valid pattern
        'invalid syntax {{{', // Invalid pattern
        's("bd hh sd oh")', // Recovery pattern
        'require("fs")', // Dangerous pattern (blocked)
        's("bd hh").fast(2)' // Final pattern
      ]

      const expectedResults = ['executed', 'error', 'executed', 'error', 'executed']
      const actualResults = []

      for (const pattern of performanceSequence) {
        const result = await executeTool.call({ code: pattern })
        actualResults.push(result.status)
      }

      expect(actualResults).toEqual(expectedResults)
    })
  })
})
