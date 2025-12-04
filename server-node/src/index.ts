import { startMCPStdioServer, setWebSocketManager } from './mcp/stdio-handler';
import { WebSocketManager } from './websocket/manager';

// Start WebSocket server for frontend communication
const wsManager = new WebSocketManager(8081);
wsManager.start();

// Inject WebSocket manager into MCP server
setWebSocketManager(wsManager);

// Start MCP stdio server for LLM communication
startMCPStdioServer().catch((error) => {
    console.error('[ERROR] MCP Server failed to start:', error);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n[SHUTDOWN] Stopping servers...');
    wsManager.stop();
    process.exit(0);
});
