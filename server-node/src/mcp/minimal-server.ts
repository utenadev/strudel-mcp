import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Simple implementation for testing using Low-Level Server API
export async function startMinimalMCPServer() {
  const server = new Server(
    {
      name: 'strudel-mcp-minimal',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Set up handlers using proper schemas
  server.setRequestHandler(InitializeRequestSchema, async (request) => {
    return {
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: 'strudel-mcp-minimal',
        version: '1.0.0'
      }
    };
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [{
        name: 'test_tool',
        description: 'Test tool for minimal server',
        inputSchema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Test message'
            }
          },
          required: []
        }
      }]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === 'test_tool') {
      return {
        content: [{
          type: 'text',
          text: `Test tool received: ${args?.message || 'No message provided'}`
        }]
      };
    }
    
    throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log('Minimal MCP Server started successfully');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMinimalMCPServer().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}
