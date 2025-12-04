import { ExecuteStrudelCodeTool, GetCurrentPatternTool, GetStrudelKnowledgeTool } from '../src/mcp/tools'
import { WebSocketManager } from '../src/websocket/manager'
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js'
import { MockWebSocket, MockServer } from './test-utils'

describe('Error Handling Validation', () => {
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
  })

  afterEach(() => {
    wsManager.removeAllListeners()
    mockServer.removeAllListeners()
  })

  describe('MCP Tool Error Handling', () => {
    test('should handle invalid code execution gracefully', async () => {
      const invalidCode = 'invalid javascript syntax {{{'
      
      const result = await executeTool.call({ code: invalidCode })
      expect(result).toBeDefined()
      expect(result.status).toBe('error')
      expect(result.error).toBeDefined()
    })

    test('should handle empty code execution', async () => {
      const result = await executeTool.call({ code: '' })
      expect(result).toBeDefined()
      expect(result.status).toBe('error')
      expect(result.error).toContain('Code cannot be empty')
    })

    test('should handle null/undefined code', async () => {
      const result1 = await executeTool.call({ code: null as any })
      expect(result1.status).toBe('error')
      
      const result2 = await executeTool.call({ code: undefined as any })
      expect(result2.status).toBe('error')
    })

    test('should handle dangerous code patterns', async () => {
      const dangerousCodes = [
        'require("fs").readFileSync("/")',
        'process.exit(0)',
        'eval("malicious code")',
        'new Function("return process")',
        'require("child_process").exec("rm -rf /")'
      ]

      for (const code of dangerousCodes) {
        const result = await executeTool.call({ code })
        expect(result.status).toBe('error')
        expect(result.error).toContain('dangerous')
      }
    })

    test('should handle knowledge tool invalid topic', async () => {
      const result = await knowledgeTool.call({ topic: 'invalid-topic' })
      expect(result).toBeDefined()
      expect(result.availableTopics).toBeDefined()
      expect(result.availableTopics).toContain('basics')
    })

    test('should handle current pattern tool errors', async () => {
      // This should not throw but handle gracefully
      const result = await currentTool.call({})
      expect(result).toBeDefined()
      expect(result.timestamp).toBeDefined()
      expect(result.hasPattern).toBeDefined()
    })
  })

  describe('WebSocket Error Handling', () => {
    test('should handle WebSocket connection errors', (done) => {
      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        const testError = new Error('Connection failed')
        mockWs.emit('error', testError)
      })

      wsManager.on('error', (error) => {
        expect(error).toBeDefined()
        done()
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })

    test('should handle malformed message processing', (done) => {
      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        mockWs.emit('message', Buffer.from('invalid json {{{'))
      })

      wsManager.on('message', (ws, data, clientId) => {
        expect(data).toBe('invalid json {{{')
        done()
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })

    test('should handle large message processing', (done) => {
      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        const largeMessage = 'x'.repeat(1000000) // 1MB message
        mockWs.emit('message', Buffer.from(largeMessage))
      })

      wsManager.on('message', (ws, data, clientId) => {
        expect(data.length).toBe(1000000)
        done()
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })

    test('should handle send to disconnected client', () => {
      const nonExistentClientId = 'non-existent-client'
      const message = JSON.stringify({ type: 'test' })
      
      // Should not throw error
      expect(() => {
        wsManager.send(nonExistentClientId, message)
      }).not.toThrow()
    })

    test('should handle broadcast with no clients', () => {
      const message = JSON.stringify({ type: 'test' })
      
      // Should not throw error when no clients connected
      expect(() => {
        wsManager.broadcast(message)
      }).not.toThrow()
    })
  })

  describe('Network Failure Simulation', () => {
    test('should handle network timeout scenarios', (done) => {
      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        
        // Simulate network timeout
        setTimeout(() => {
          mockWs.emit('error', new Error('Network timeout'))
        }, 100)
      })

      let errorHandled = false
      wsManager.on('error', (error) => {
        if (error.message.includes('timeout')) {
          errorHandled = true
          expect(errorHandled).toBe(true)
          done()
        }
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })

    test('should handle connection reset errors', (done) => {
      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        mockWs.emit('error', new Error('ECONNRESET'))
      })

      wsManager.on('error', (error) => {
        expect(error.message).toContain('ECONNRESET')
        done()
      })

      const mockWs = new MockWebSocket() as any
      mockServer.emit('connection', mockWs)
    })
  })

  describe('Resource Exhaustion Testing', () => {
    test('should handle too many connections gracefully', () => {
      const maxConnections = 1000
      const clients: MockWebSocket[] = []

      // Simulate many connections
      for (let i = 0; i < maxConnections; i++) {
        const mockWs = new MockWebSocket() as any
        clients.push(mockWs)
        mockServer.emit('connection', mockWs)
      }

      // @ts-ignore - accessing private property for testing
      expect(wsManager.clients.size).toBe(maxConnections)

      // Clean up
      clients.forEach(client => client.close())
    })

    test('should handle memory pressure scenarios', async () => {
      const largePattern = Array(10000).fill('s("bd hh")').join(' + ');
      const largeCode = `
        // Generate large pattern
        const largePattern = Array(10000).fill('s("bd hh")').join(' + ');
        ${largePattern}
      `

      // Should handle large code without crashing
      const result = await executeTool.call({ code: largeCode })
      expect(result).toBeDefined()
    })
  })

  describe('Input Validation Edge Cases', () => {
    test('should handle extreme whitespace in code', async () => {
      const codeWithWhitespace = '   \n\t  s("bd hh")  \n\t   '
      
      const result = await executeTool.call({ code: codeWithWhitespace })
      expect(result.status).toBe('executed')
    })

    test('should handle special characters in code', async () => {
      const codeWithSpecialChars = 's("bd hh sd oh") // 特殊文字: ñüö ß 中文'
      
      const result = await executeTool.call({ code: codeWithSpecialChars })
      expect(result.status).toBe('executed')
    })

    test('should handle very long parameter names', async () => {
      const veryLongCode = `
        const ${'a'.repeat(1000)} = "test";
        s("bd hh")
      `
      
      const result = await executeTool.call({ code: veryLongCode })
      expect(result).toBeDefined()
    })
  })

  describe('Error Recovery Testing', () => {
    test('should recover from temporary failures', async () => {
      // First attempt with invalid code
      const result1 = await executeTool.call({ code: 'invalid syntax {{{' })
      expect(result1.status).toBe('error')

      // Second attempt with valid code should work
      const result2 = await executeTool.call({ code: 's("bd hh")' })
      expect(result2.status).toBe('executed')
    })

    test('should maintain state after errors', async () => {
      // Execute valid code
      await executeTool.call({ code: 's("bd hh")' })
      
      // Execute invalid code
      await executeTool.call({ code: 'invalid syntax' })
      
      // Get current pattern should still work
      const result = await currentTool.call({})
      expect(result).toBeDefined()
      expect(result.timestamp).toBeDefined()
    })
  })
})
