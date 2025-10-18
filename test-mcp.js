#!/usr/bin/env node

// Simple MCP client test script
const { spawn } = require('child_process');

console.log('Testing MCP server with Strudel code...');

// Start MCP server
const mcpServer = spawn('./strudel-mcp.exe');

// Send JSON-RPC request for execute_strudel_code
const request = {
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    name: "execute_strudel_code",
    arguments: {
      code: "sound(\"bd hh sd oh\").bank(\"RolandTR909\")"
    }
  },
  id: 1
};

// Send the request
console.log('Sending request:', JSON.stringify(request, null, 2));
mcpServer.stdin.write(JSON.stringify(request) + '\n');

// Handle response
mcpServer.stdout.on('data', (data) => {
  console.log('MCP Server Response:', data.toString());
});

mcpServer.stderr.on('data', (data) => {
  console.error('MCP Server Error:', data.toString());
});

// Close after a short delay
setTimeout(() => {
  console.log('Closing MCP connection...');
  mcpServer.kill();
}, 5000);
