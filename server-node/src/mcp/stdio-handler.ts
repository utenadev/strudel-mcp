import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { WebSocketManager } from '../websocket/manager';

// Tool definitions and implementations
const ToolDefinitions = [
    {
        name: 'execute_strudel_code',
        description: 'Execute Strudel pattern code and send to frontend',
        inputSchema: {
            type: 'object' as const,
            properties: {
                code: {
                    type: 'string' as const,
                    description: 'Strudel pattern code to execute'
                }
            },
            required: ['code']
        }
    }
];

// WebSocket manager reference (injected from index.ts)
let wsManager: WebSocketManager | null = null;

export function setWebSocketManager(manager: WebSocketManager) {
    wsManager = manager;
}

async function executeStrudelCode(code: string) {
    console.log(`[MCP] Executing Strudel code: ${code}`);

    // Broadcast to all connected frontends via WebSocket
    if (wsManager) {
        wsManager.broadcast(code);
    }

    return {
        status: 'executed',
        pattern: code,
        timestamp: new Date().toISOString(),
        broadcasted: !!wsManager
    };
}

export async function startMCPStdioServer() {
    const server = new Server({
        name: 'strudel-mcp',
        version: '2.0.0',
    }, {
        capabilities: {
            tools: {}
        }
    });

    // Tools list handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: ToolDefinitions
        };
    });

    // Tools call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            const { name, arguments: args } = request.params;

            if (name === 'execute_strudel_code') {
                const code = (args as any)?.code;
                if (typeof code !== 'string') {
                    throw new McpError(ErrorCode.InvalidParams, 'code parameter must be a string');
                }
                const result = await executeStrudelCode(code);
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            }

            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        } catch (error: any) {
            if (error instanceof McpError) {
                throw error;
            }
            throw new McpError(ErrorCode.InternalError, error.message);
        }
    });

    await server.connect(new StdioServerTransport());
    console.error('[MCP] Server started on stdio');
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
    startMCPStdioServer().catch((error) => {
        console.error("Server error:", error);
        process.exit(1);
    });
}
