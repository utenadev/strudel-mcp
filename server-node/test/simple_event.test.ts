import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { WebSocketManager } from '../src/websocket/manager'
import { MockServer, MockWebSocket } from './test-utils'

describe('Simple Event Test', () => {
    let wsManager: WebSocketManager
    let mockServer: MockServer

    beforeEach(() => {
        mockServer = new MockServer()
        wsManager = new WebSocketManager(mockServer as any)
        wsManager.start()
    })

    afterEach(async () => {
        await wsManager.stop()
        mockServer.removeAllListeners()
    })

    test('should handle connection and message', async () => {
        const connected = new Promise<void>((resolve) => {
            wsManager.on('connect', (ws, clientId) => {
                console.log('Test: Connect event received', clientId)
                resolve()
            })
        })

        const messageReceived = new Promise<void>((resolve) => {
            wsManager.on('message', (ws, data, clientId) => {
                console.log('Test: Message event received', data.toString())
                resolve()
            })
        })

        const mockWs = new MockWebSocket('test-client') as any
        console.log('Test: Emitting connection')
        mockServer.emit('connection', mockWs, { url: '/?id=test-client' })

        await connected

        console.log('Test: Emitting message')
        mockWs.emit('message', Buffer.from('hello'))

        await messageReceived
        console.log('Test: Done')
    })
})
