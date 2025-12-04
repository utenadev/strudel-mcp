import { ExecuteStrudelCodeTool, GetCurrentPatternTool, GetStrudelKnowledgeTool } from '../src/mcp/tools'
import { WebSocketManager } from '../src/websocket/manager'

// Mock WebSocket for testing
class MockWebSocket extends EventEmitter {
  readyState = 1 // WebSocket.OPEN
  sent: string[] = []
  id: string

  constructor(id: string) {
    super()
    this.id = id
  }

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

// Performance utilities
class PerformanceMonitor {
  static async measureExecutionTime<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<{ result: T; executionTime: number }> {
    const startTime = performance.now()
    const result = await operation()
    const endTime = performance.now()
    const executionTime = endTime - startTime

    console.log(`${label}: ${executionTime.toFixed(2)}ms`)
    return { result, executionTime }
  }

  static async measureMemoryUsage<T>(
    operation: () => Promise<T>,
    label: string
  ): Promise<{ result: T; memoryBefore: number; memoryAfter: number; memoryDelta: number }> {
    const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0
    const result = await operation()
    const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0
    const memoryDelta = memoryAfter - memoryBefore

    console.log(`${label}: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`)
    return { result, memoryBefore, memoryAfter, memoryDelta }
  }
}

describe('Performance and Load Testing', () => {
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

  describe('Response Time Benchmarks', () => {
    test('should execute simple patterns within acceptable time', async () => {
      const simplePatterns = [
        's("bd")',
        's("bd hh")',
        's("bd hh sd oh")',
        's("bd hh").fast(2)',
        's("sd oh").slow(2)'
      ]

      const times: number[] = []

      for (const pattern of simplePatterns) {
        const { executionTime } = await PerformanceMonitor.measureExecutionTime(
          () => executeTool.call({ code: pattern }),
          `Pattern: ${pattern}`
        )
        times.push(executionTime)
        
        // Individual patterns should execute within 100ms
        expect(executionTime).toBeLessThan(100)
      }

      // Average response time should be under 50ms
      const averageTime = times.reduce((a, b) => a + b) / times.length
      expect(averageTime).toBeLessThan(50)
    })

    test('should handle complex patterns within reasonable time', async () => {
      const complexPatterns = [
        's("bd hh sd oh").fast(2).slow(0.5)',
        'stack(s("bd hh"), s("sd oh").fast(4))',
        's("bd hh").fast(2) + s("sd oh").slow(2)',
        'jux("[bd hh] [sd oh]")',
        'every(2, s("bd hh sd oh"))'
      ]

      const times: number[] = []

      for (const pattern of complexPatterns) {
        const { executionTime } = await PerformanceMonitor.measureExecutionTime(
          () => executeTool.call({ code: pattern }),
          `Complex Pattern: ${pattern}`
        )
        times.push(executionTime)
        
        // Complex patterns should execute within 200ms
        expect(executionTime).toBeLessThan(200)
      }

      // Average response time should be under 150ms
      const averageTime = times.reduce((a, b) => a + b) / times.length
      expect(averageTime).toBeLessThan(150)
    })

    test('should handle knowledge queries efficiently', async () => {
      const topics = ['basics', 'patterns', 'effects', 'troubleshooting']
      const times: number[] = []

      for (const topic of topics) {
        const { executionTime } = await PerformanceMonitor.measureExecutionTime(
          () => knowledgeTool.call({ topic }),
          `Knowledge Query: ${topic}`
        )
        times.push(executionTime)
        
        // Knowledge queries should execute within 50ms
        expect(executionTime).toBeLessThan(50)
      }

      // Average response time should be under 30ms
      const averageTime = times.reduce((a, b) => a + b) / times.length
      expect(averageTime).toBeLessThan(30)
    })
  })

  describe('Load Testing', () => {
    test('should handle concurrent pattern execution load', async () => {
      const concurrentRequests = 50
      const testPattern = 's("bd hh sd oh")'

      const startTime = performance.now()
      
      const promises = Array.from({ length: concurrentRequests }, () =>
        executeTool.call({ code: testPattern })
      )

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe('executed')
      })

      // Concurrency overhead should be reasonable
      expect(totalTime).toBeLessThan(concurrentRequests * 100) // Less than 100ms per request average
      
      console.log(`Concurrent Load (${concurrentRequests} requests): ${totalTime.toFixed(2)}ms total`)
    }, 15000)

    test('should handle sustained load over time', async () => {
      const batchSize = 20
      const batchCount = 5
      const testPattern = 's("bd hh").fast(2)'

      const batchTimes: number[] = []

      for (let batch = 0; batch < batchCount; batch++) {
        const startTime = performance.now()
        
        const promises = Array.from({ length: batchSize }, () =>
          executeTool.call({ code: testPattern })
        )

        const results = await Promise.all(promises)
        const endTime = performance.now()
        const batchTime = endTime - startTime
        
        batchTimes.push(batchTime)

        // All requests in batch should succeed
        results.forEach(result => {
          expect(result.status).toBe('executed')
        })

        console.log(`Batch ${batch + 1}: ${batchTime.toFixed(2)}ms`)
        
        // Small delay between batches to simulate real usage
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Performance should not degrade significantly over time
      const averageBatchTime = batchTimes.reduce((a, b) => a + b) / batchTimes.length
      const maxBatchTime = Math.max(...batchTimes)
      
      expect(maxBatchTime).toBeLessThan(averageBatchTime * 2) // No more than 2x degradation
    }, 20000)

    test('should handle high-frequency WebSocket load', (done) => {
      const connectionCount = 10
      const messagesPerConnection = 50
      let totalMessagesProcessed = 0
      const expectedTotalMessages = connectionCount * messagesPerConnection

      const startTime = performance.now()

      wsManager.on('connect', (ws, clientId) => {
        const mockWs = ws as unknown as MockWebSocket
        
        // Send high-frequency messages
        for (let i = 0; i < messagesPerConnection; i++) {
          setTimeout(() => {
            const message = JSON.stringify({
              type: 'test',
              id: i,
              clientId,
              timestamp: Date.now()
            })
            mockWs.emit('message', Buffer.from(message))
          }, i * 5) // 5ms intervals = 200 messages per second
        }
      })

      wsManager.on('message', (ws, data, clientId) => {
        totalMessagesProcessed++
        
        if (totalMessagesProcessed === expectedTotalMessages) {
          const endTime = performance.now()
          const totalTime = endTime - startTime
          
          console.log(`WebSocket Load Test: ${totalTime.toFixed(2)}ms for ${expectedTotalMessages} messages`)
          expect(totalMessagesProcessed).toBe(expectedTotalMessages)
          done()
        }
      })

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const mockWs = new MockWebSocket(`client-${i}`) as any
        mockServer.emit('connection', mockWs)
      }
    }, 15000)
  })

  describe('Memory Usage Testing', () => {
    test('should handle memory usage efficiently during pattern execution', async () => {
      const executionCount = 100
      const testPattern = 's("bd hh sd oh")'

      const { memoryDelta } = await PerformanceMonitor.measureMemoryUsage(
        async () => {
          for (let i = 0; i < executionCount; i++) {
            await executeTool.call({ code: testPattern })
          }
        },
        `Memory Usage (${executionCount} executions)`
      )

      // Memory growth should be reasonable (less than 10MB for 100 executions)
      expect(memoryDelta).toBeLessThan(10 * 1024 * 1024)
    }, 20000)

    test('should handle memory usage during WebSocket operations', (done) => {
      const connectionCount = 20
      const messagesPerConnection = 10
      let totalMessagesProcessed = 0

      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0

      wsManager.on('connect', (ws, clientId) => {
        const mockWs = ws as unknown as MockWebSocket
        
        for (let i = 0; i < messagesPerConnection; i++) {
          const message = JSON.stringify({
            type: 'test',
            id: i,
            clientId,
            data: 'x'.repeat(1000), // 1KB payload
            timestamp: Date.now()
          })
          mockWs.emit('message', Buffer.from(message))
        }
      })

      wsManager.on('message', (ws, data, clientId) => {
        totalMessagesProcessed++
        
        if (totalMessagesProcessed === connectionCount * messagesPerConnection) {
          setTimeout(() => {
            const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0
            const memoryDelta = memoryAfter - memoryBefore
            
            console.log(`WebSocket Memory Usage: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`)
            
            // Memory usage should be reasonable
            expect(memoryDelta).toBeLessThan(50 * 1024 * 1024) // Less than 50MB
            done()
          }, 1000) // Allow time for garbage collection
        }
      })

      // Create connections
      for (let i = 0; i < connectionCount; i++) {
        const mockWs = new MockWebSocket(`client-${i}`) as any
        mockServer.emit('connection', mockWs)
      }
    }, 15000)

    test('should handle large message processing without memory leaks', (done) => {
      const largeMessageSize = 100000 // 100KB
      const messageCount = 10
      let processedCount = 0

      const memoryBefore = (performance as any).memory?.usedJSHeapSize || 0

      wsManager.on('connect', (ws, clientId) => {
        const mockWs = ws as unknown as MockWebSocket
        
        for (let i = 0; i < messageCount; i++) {
          const largeMessage = JSON.stringify({
            type: 'large',
            id: i,
            clientId,
            data: 'x'.repeat(largeMessageSize),
            timestamp: Date.now()
          })
          mockWs.emit('message', Buffer.from(largeMessage))
        }
      })

      wsManager.on('message', (ws, data, clientId) => {
        processedCount++
        
        if (processedCount === messageCount) {
          setTimeout(() => {
            const memoryAfter = (performance as any).memory?.usedJSHeapSize || 0
            const memoryDelta = memoryAfter - memoryBefore
            
            console.log(`Large Message Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`)
            
            // Memory should be cleaned up after processing large messages
            expect(memoryDelta).toBeLessThan(100 * 1024 * 1024) // Less than 100MB
            done()
          }, 2000) // Allow time for garbage collection
        }
      })

      const mockWs = new MockWebSocket('large-message-client') as any
      mockServer.emit('connection', mockWs)
    }, 10000)
  })

  describe('Stress Testing', () => {
    test('should handle maximum concurrent pattern execution', async () => {
      const maxConcurrentRequests = 200
      const testPattern = 's("bd hh")'

      console.log(`Stress Test: ${maxConcurrentRequests} concurrent requests`)
      
      const startTime = performance.now()
      
      const promises = Array.from({ length: maxConcurrentRequests }, (_, i) =>
        executeTool.call({ code: `${testPattern} #${i}` })
      )

      const results = await Promise.all(promises)
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe('executed')
      })

      // Even under stress, response time should be reasonable
      const averageTimePerRequest = totalTime / maxConcurrentRequests
      expect(averageTimePerRequest).toBeLessThan(200) // Less than 200ms average
      
      console.log(`Stress Test Complete: ${totalTime.toFixed(2)}ms total (${averageTimePerRequest.toFixed(2)}ms per request)`)
    }, 30000)

    test('should handle WebSocket connection stress', (done) => {
      const maxConnections = 100
      let connectedCount = 0
      let messageCount = 0

      const startTime = performance.now()

      wsManager.on('connect', (ws, clientId) => {
        connectedCount++
        const mockWs = ws as unknown as MockWebSocket
        
        // Send test message after connection
        setTimeout(() => {
          const message = JSON.stringify({
            type: 'stress',
            clientId,
            timestamp: Date.now()
          })
          mockWs.emit('message', Buffer.from(message))
        }, Math.random() * 100)
      })

      wsManager.on('message', (ws, data, clientId) => {
        messageCount++
        
        if (messageCount === maxConnections) {
          const endTime = performance.now()
          const totalTime = endTime - startTime
          
          console.log(`WebSocket Stress Test: ${totalTime.toFixed(2)}ms for ${maxConnections} connections`)
          expect(connectedCount).toBe(maxConnections)
          expect(messageCount).toBe(maxConnections)
          done()
        }
      })

      // Create maximum connections
      for (let i = 0; i < maxConnections; i++) {
        const mockWs = new MockWebSocket(`stress-client-${i}`) as any
        mockServer.emit('connection', mockWs)
      }
    }, 20000)

    test('should handle resource exhaustion scenarios', async () => {
      const resourceIntensivePattern = `
        // Generate resource-intensive pattern
        const complexPattern = Array(1000).fill('s("bd hh")').join(' + ');
        ${complexPattern}
      `

      // Should handle without crashing
      const result = await executeTool.call({ code: resourceIntensivePattern })
      expect(result).toBeDefined()
      
      // Either executes successfully or fails gracefully
      expect(['executed', 'error']).toContain(result.status)
    })
  })

  describe('Performance Regression Testing', () => {
    test('should maintain performance benchmarks over time', async () => {
      const benchmarkPatterns = [
        { pattern: 's("bd")', expectedTime: 10 },
        { pattern: 's("bd hh sd oh")', expectedTime: 30 },
        { pattern: 's("bd hh").fast(2)', expectedTime: 25 }
      ]

      const regressionResults: { pattern: string; actualTime: number; expectedTime: number; passed: boolean }[] = []

      for (const { pattern, expectedTime } of benchmarkPatterns) {
        const { executionTime } = await PerformanceMonitor.measureExecutionTime(
          () => executeTool.call({ code: pattern }),
          `Benchmark: ${pattern}`
        )

        const passed = executionTime <= expectedTime * 2 // Allow 2x tolerance
        regressionResults.push({ pattern, actualTime: executionTime, expectedTime, passed })

        expect(executionTime).toBeLessThan(expectedTime * 2) // Performance regression check
      }

      console.log('Performance Regression Results:')
      regressionResults.forEach(({ pattern, actualTime, expectedTime, passed }) => {
        const status = passed ? '✓' : '✗'
        console.log(`${status} ${pattern}: ${actualTime.toFixed(2)}ms (expected: ≤${expectedTime}ms)`)
      })

      // All benchmarks should pass
      const allPassed = regressionResults.every(result => result.passed)
      expect(allPassed).toBe(true)
    })

    test('should handle scalability testing', async () => {
      const scalabilityTests = [
        { name: 'Light Load', requests: 10, maxTime: 50 },
        { name: 'Medium Load', requests: 50, maxTime: 100 },
        { name: 'Heavy Load', requests: 100, maxTime: 200 }
      ]

      const scalabilityResults: { name: string; requests: number; totalTime: number; avgTime: number; passed: boolean }[] = []

      for (const { name, requests, maxTime } of scalabilityTests) {
        const startTime = performance.now()
        
        const promises = Array.from({ length: requests }, () =>
          executeTool.call({ code: 's("bd hh")' })
        )

        await Promise.all(promises)
        const endTime = performance.now()
        const totalTime = endTime - startTime
        const avgTime = totalTime / requests
        const passed = avgTime <= maxTime

        scalabilityResults.push({ name, requests, totalTime, avgTime, passed })
        expect(avgTime).toBeLessThanOrEqual(maxTime)
      }

      console.log('Scalability Test Results:')
      scalabilityResults.forEach(({ name, requests, totalTime, avgTime, passed }) => {
        const status = passed ? '✓' : '✗'
        console.log(`${status} ${name}: ${requests} requests in ${totalTime.toFixed(2)}ms (${avgTime.toFixed(2)}ms avg)`)
      })

      // All scalability tests should pass
      const allPassed = scalabilityResults.every(result => result.passed)
      expect(allPassed).toBe(true)
    })
  })
})
