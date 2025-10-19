import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { ToolDefinitions, ToolImplementations } from './tools';

export async function startMCPStdioServer() {
  const server = new Server({
    name: 'strudel-mcp-node',
    version: '1.0.0',
  });

  // サーバー情報
  const serverInfo = { name: 'strudel-mcp-node', version: '1.0.0' };
  
  // イベントハンドラーを設定
  server.setRequestHandler('initialize', async (params: any) => {
    return {
      capabilities: {
        tools: {},
      },
      serverInfo,
    };
  });

  server.setRequestHandler('tools/list', async () => {
    return {
      tools: ToolDefinitions,
    };
  });

  server.setRequestHandler('tools/call', async (params: any) => {
    try {
      const { name, arguments: args } = params.params;
      const toolImpl = ToolImplementations.find(impl => impl.name === name);
      if (!toolImpl) {
        throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
      }
      // @ts-ignore: callメソッドの型が不明確な場合
      return await toolImpl.call(args);
    } catch (e: any) {
      if (e instanceof McpError) {
        return e;
      }
      return new McpError(ErrorCode.InternalError, e.message);
    }
  });
  await server.connect(new StdioServerTransport());
}

// 直接実行された場合にサーバーを起動
if (import.meta.url === `file://${process.argv[1]}`) {
  startMCPStdioServer().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}