import { MCPTools } from './tools'
import { logger } from '../utils/logger'

export class MCPHandler {
  private tools: MCPTools

  constructor() {
    this.tools = new MCPTools()
  }

  handleMessage(message: string, clientId: string) {
    try {
      const parsed = JSON.parse(message)
      const { method, params } = parsed

      switch (method) {
        case 'initialize':
          return this.tools.initialize(params)
        case 'execute_strudel_code':
          return this.tools.executeStrudelCode(params)
        case 'get_current_pattern':
          return this.tools.getCurrentPattern(params)
        default:
          logger.warn(`Unknown method: ${method}`)
      }
    } catch (error) {
      logger.error('Message handling error:', error)
    }
  }

  getDocs() {
    return this.tools.getDocs()
  }
}
