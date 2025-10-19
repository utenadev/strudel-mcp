@echo off
cd /d "C:\workspace\strudel-mcp\server-go"
echo Starting Go MCP server...
go run main.go websocket_server.go
