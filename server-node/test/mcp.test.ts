import { ToolImplementations, ToolDefinitions } from '../src/mcp/tools'
import { ExecuteStrudelCodeTool, GetCurrentPatternTool, GetStrudelKnowledgeTool } from '../src/mcp/tools'

describe('MCP Tools', () => {
  let executeTool: ExecuteStrudelCodeTool
  let currentTool: GetCurrentPatternTool
  let knowledgeTool: GetStrudelKnowledgeTool

  beforeEach(() => {
    executeTool = new ExecuteStrudelCodeTool()
    currentTool = new GetCurrentPatternTool()
    knowledgeTool = new GetStrudelKnowledgeTool()
  })

  test('should execute Strudel code', async () => {
    const code = 's("bd hh sd oh")'
    const result = await executeTool.call({ code })
    expect(result.status).toBe('executed')
    expect(result.pattern).toBe(code)
    expect(result.timestamp).toBeDefined()
  })

  test('should get current pattern', async () => {
    const result = await currentTool.call({})
    expect(result.pattern).toBeDefined()
    expect(result.timestamp).toBeDefined()
    expect(result.hasPattern).toBeDefined()
  })

  test('should get Strudel knowledge basics', async () => {
    const result = await knowledgeTool.call({ topic: 'basics' })
    expect(result.topic).toBe('basics')
    expect(result.title).toBe('Strudel Basics')
    expect(result.content).toContain('基本文法')
    expect(result.examples).toBeDefined()
    expect(result.source).toBe('strudel.cc documentation (embedded)')
  })

  test('should get knowledge topics list', async () => {
    const result = await knowledgeTool.call({ topic: 'invalid' })
    expect(result.availableTopics).toContain('basics')
    expect(result.availableTopics).toContain('patterns')
    expect(result.availableTopics).toContain('effects')
    expect(result.availableTopics).toContain('troubleshooting')
  })

  test('should filter knowledge by query', async () => {
    const result = await knowledgeTool.call({
      topic: 'basics',
      query: 'bd'
    })
    // "bd" が examples に含まれているか確認
    expect(result.queryMatch).toBeDefined()
    if (result.relevantExamples) {
      expect(result.relevantExamples.length).toBeGreaterThan(0)
    }
  })
})

describe('Tool Definitions', () => {
  test('should have correct tool count', () => {
    expect(ToolDefinitions.length).toBe(3)
    expect(ToolImplementations.length).toBe(3)
  })

  test('should have required tools', () => {
    const toolNames = ToolDefinitions.map(td => td.name)
    expect(toolNames).toContain('execute_strudel_code')
    expect(toolNames).toContain('get_current_pattern')
    expect(toolNames).toContain('get_strudel_knowledge')
  })

  test('should have get_strudel_knowledge with proper schema', () => {
    const knowledgeTool = ToolDefinitions.find(td => td.name === 'get_strudel_knowledge')
    expect(knowledgeTool).toBeDefined()
    expect(knowledgeTool?.description).toContain('built-in')
  })
})
