// 簡単なMCPサーバー
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

const server = new Server({
  name: 'strudel-mcp-node',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

let currentPattern = '';

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'execute_strudel_code',
        description: 'Execute Strudel pattern code',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'Strudel pattern code to execute'
            }
          },
          required: ['code']
        }
      },
      {
        name: 'get_current_pattern',
        description: 'Get currently executing pattern',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'get_strudel_knowledge',
        description: 'Get Strudel documentation and knowledge',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic: basics, patterns, effects, troubleshooting'
            },
            query: {
              type: 'string',
              description: 'Search query'
            }
          },
          required: []
        }
      }
    ]
  };
});

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'execute_strudel_code':
        currentPattern = args.code;
        return {
          content: [{
            type: 'text',
            text: `Strudel code executed: ${args.code}`
          }]
        };
        
      case 'get_current_pattern':
        return {
          content: [{
            type: 'text',
            text: `Current pattern: ${currentPattern || 'none'}`
          }]
        };
        
      case 'get_strudel_knowledge':
        const topic = args.topic || 'basics';
        const knowledge = {
          basics: '# Strudel Basics\n\n## Basic patterns\n- s("bd hh sd oh") - Basic drum pattern\n- s("bd*2 hh*4") - Repeat patterns\n\n## Drum sounds\n- bd: bass drum\n- sd: snare drum\n- hh: hi-hat\n- oh: open hi-hat\n\n## Effects\n- .fast(2) - 2x speed\n- .slow(2) - 2x slower\n- .gain(0.5) - volume adjustment',
          patterns: '# Advanced Patterns\n\n## Polyrhythm\n- s("bd sd, hh*4") - Separate tracks\n- s("<bd hh> sd") - Alternation\n\n## Time manipulation\n- .ply("<1 2 3>") - Duplication',
          effects: '# Effects\n\n## Spatial\n- .room(0.5) - Reverb\n- .delay(0.3) - Delay',
          troubleshooting: '# Troubleshooting\n\n## Audio not playing?\n1. Check browser permissions\n2. Ensure user interaction\n3. Verify WebSocket connection'
        };
        
        return {
          content: [{
            type: 'text',
            text: knowledge[topic] || knowledge.basics
          }]
        };
        
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    return new McpError(ErrorCode.InternalError, error.message);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Strudel MCP server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
