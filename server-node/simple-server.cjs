// 簡単なMCPサーバー (CommonJS)
const { createServer } = require('@modelcontextprotocol/sdk/server');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio');

let currentPattern = '';

const server = createServer(
  {
    name: 'strudel-mcp-node',
    version: '1.0.0',
  },
  {
    // capabilitiesにtoolsを追加
  }
);

// initializeリクエストの処理
server.setRequestHandler('initialize', async (request) => {
  return {
    protocolVersion: request.params.protocolVersion,
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'strudel-mcp-node',
      version: '1.0.0',
    },
  };
});

// listToolsリクエストの処理
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
              description: 'Strudel pattern code to execute',
            },
          },
          required: ['code'],
        },
      },
      {
        name: 'get_current_pattern',
        description: 'Get currently executing pattern',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_strudel_knowledge',
        description: 'Get Strudel documentation and knowledge',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic: basics, patterns, effects, troubleshooting',
            },
            query: {
              type: 'string',
              description: 'Search query',
            },
          },
          required: [],
        },
      },
    ],
  };
});

// callToolリクエストの処理
server.setRequestHandler('tools/call', async (request) => {
    try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
            case 'execute_strudel_code':
                currentPattern = args.code;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Strudel code executed: ${args.code}`,
                        },
                    ],
                };
                
            case 'get_current_pattern':
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Current pattern: ${currentPattern || 'none'}`,
                        },
                    ],
                };
                
            case 'get_strudel_knowledge':
                const topic = args.topic || 'basics';
                const knowledge = {
                    basics: `# Strudel Basics

## Basic patterns
- s("bd hh sd oh") - Basic drum pattern
- s("bd*2 hh*4") - Repeat patterns
- s("[bd hh] sd oh") - Group patterns

## Drum sounds
- bd: bass drum
- sd: snare drum
- hh: hi-hat  
- oh: open hi-hat

## Effects
- .fast(2) - 2x speed
- .slow(2) - 2x slower
- .gain(0.5) - volume adjustment`,
                    
                    patterns: `# Advanced Patterns

## Polyrhythm
- s("bd sd, hh*4") - Separate tracks
- s("<bd hh> sd") - Alternation

## Time manipulation
- .ply("<1 2 3>") - Duplication
- .off(1/16, x=>x.speed(2)) - Offset`,
                    
                    effects: `# Effects

## Spatial
- .room(0.5) - Reverb
- .delay(0.3) - Delay
                    
## Filtering
- .mask("<x@7 ~>/8") - Mask pattern`,
                    
                    troubleshooting: `# Troubleshooting

## Audio not playing?
1. Check browser permissions
2. Ensure user interaction
3. Verify WebSocket connection

## Common errors
- Check syntax: s("bd hh") not s(bd hh)
- Ensure brackets match: s("[bd hh]")`
                };
                
                return {
                    content: [
                        {
                            type: 'text',
                            text: knowledge[topic] || knowledge.basics,
                        },
                    ],
                };
                
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: `Error: ${error.message}`,
                },
            ],
        };
    }
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(console.error);
