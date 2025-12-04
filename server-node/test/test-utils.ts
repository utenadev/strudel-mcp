import { EventEmitter } from 'events'

// Base mock classes for all tests
export class MockWebSocket extends EventEmitter {
  readyState = 1 // WebSocket.OPEN
  sent: string[] = []
  id: string

  constructor(id?: string) {
    super()
    this.id = id || 'mock-client'
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

export class MockServer extends EventEmitter {
  constructor() {
    super()
  }
}

// Performance utilities
export class PerformanceMonitor {
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
