import { MCPHandler } from '../src/mcp/handler'

describe('MCP Handler', () => {
  let handler: MCPHandler

  beforeEach(() => {
    handler = new MCPHandler()
  })

  test('should initialize', () => {
    const result = handler.handleMessage(JSON.stringify({ method: 'initialize' }), 'test-client')
    expect(result?.status).toBe('initialized')
  })

  test('should execute Strudel code', () => {
    const code = 's("bd hh sd oh")'
    handler.handleMessage(JSON.stringify({ method: 'execute_strudel_code', params: { code } }), 'test-client')
    const current = handler.handleMessage(JSON.stringify({ method: 'get_current_pattern' }), 'test-client')
    expect(current?.pattern).toBe(code)
  })

  test('should return docs', () => {
    const docs = handler.getDocs()
    expect(docs.tools).toBeDefined()
    expect(docs.tools.length).toBeGreaterThan(0)
  })
})
