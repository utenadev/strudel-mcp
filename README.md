# Strudel MCP - Model Context Protocol Integration for Strudel

This project provides an MCP (Model Context Protocol) server that enables LLMs to interact with [Strudel](https://strudel.cc/) - a JavaScript port of the Tidal Cycles pattern language for live coding music.

## Overview

Strudel MCP allows Large Language Models (LLMs) to:
- Execute Strudel patterns via natural language commands
- Retrieve current pattern states
- Get Strudel documentation through Context7 integration
- Access browser development tools for debugging

## Architecture

```
┌─────────────┐    MCP     ┌──────────────┐    WebSocket    ┌─────────────┐
│   LLM       │ ◄──────► │ strudel-mcp  │ ◄─────────────► │  Strudel    │
│  (Qwen/     │  Protocol │   Server     │   Communication│  REPL/      │
│  etc.)      │           │ (Node.js ✨) │                │  Frontend   │
└─────────────┘           └──────────────┘                └─────────────┘
```

### Server Options

**Node.js (Recommended - NEW)**
```bash
cd server-node
npm install
npm run dev
```

**Go (Legacy - Phase-out planned)**
```bash
cd server-go
go run main.go
```

### Components

- **strudel-mcp (Go)**: MCP server with WebSocket communication
- **WebSocket Server**: Handles bidirectional communication between MCP and Strudel
- **Frontend**: Web-based Strudel interface with synchronization capabilities
- **Context7 Integration**: External documentation service for Strudel docs

## Original Strudel Project

This project is based on and inspired by the original Strudel project:
- **Original Repository**: [https://github.com/tidalcycles/strudel](https://github.com/tidalcycles/strudel)
- **Primary Source**: [https://codeberg.org/uzu/strudel](https://codeberg.org/uzu/strudel) (Codeberg mirror)
- **Official Website**: [https://strudel.cc](https://strudel.cc)
- **Documentation**: [https://strudel.cc/docs](https://strudel.cc/docs)

**Note**: 
- The `source_of_strudel/` directory was cloned from [https://codeberg.org/uzu/strudel](https://codeberg.org/uzu/strudel) on 2025-10-12 for development reference.
- The `strudel-repl/` directory contained a reference Strudel implementation copied on 2025-10-15.
- Both directories were local development references and are **not** included in this GitHub repository.

### License
This project follows the AGPL-3.0 license, consistent with the original Strudel project. See [LICENSE](LICENSE) file for details.

## Features

### MCP Tools
- `execute_strudel_code` - Execute Strudel patterns
- `get_current_pattern` - Get current active pattern  
- `get_strudel_knowledge` - Built-in Strudel documentation and knowledge base

### Synchronization Features
- **BroadcastChannel API**: Cross-tab pattern synchronization
- **Real-time Updates**: Immediate pattern changes across multiple tabs/windows
- **Error Handling**: Robust error recovery and fallback mechanisms

## Quick Start

### Prerequisites
- Node.js (>=18)
- Modern browser with WebSocket support

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/utenadev/strudel-mcp.git
   cd strudel-mcp
   ```

2. **Install Node.js dependencies**:
   ```bash
   cd server-node
   npm install
   cd ..
   ```

3. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Start the servers** (recommended - Node.js):
   ```bash
   # Terminal 1: Start MCP + WebSocket server
   cd server-node
   npm run dev
   
   # Terminal 2: Start frontend
   cd frontend
   npm run dev
   ```
   
   Or use the legacy Go server:
   ```bash
   cd server-go
   go run main.go websocket_server.go
   ```

### Usage with LLM

#### Qwen3-Coder + Qwen-code (MCP Configuration Required)

Create `.qwen/settings.json` in your project root:

**Production (built version)**:
```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "node",
      "args": ["server-node/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Development (npm dev)**:
```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "npm", 
      "args": ["run", "dev"],
      "cwd": "server-node",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      }
    }
  }
}
```

*Pre-built settings provided in this repository:*
- `.qwen/settings.json` - Production ready
- `.qwen/settings.dev.json` - Development mode

*Build first for production: `cd server-node && npm run build`*

#### Gemini CLI (MCP Configuration Required)

Configure `~/.gemini/settings.json`:

```json
{
  "selectedAuthType": "gemini-api-key",
  "theme": "Dracula",
  "mcpServers": {
    "strudel-mcp": {
      "command": "node",
      "args": ["/path/to/strudel-mcp/server-node/dist/index.js"],
      "cwd": "/path/to/strudel-mcp/server-node"
    }
  }
}
```

*Build first: `cd server-node && npm run build`*

*Verify with `/mcp` command in Gemini CLI*

#### Claude Desktop (MCP Configuration Required)

Configure Claude Desktop settings:

1. Open Claude Desktop → Settings → Developer → Edit Config
2. Add to `mcpServers`:

```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "node",
      "args": ["/path/to/strudel-mcp/server-node/dist/index.js"],
      "cwd": "/path/to/strudel-mcp/server-node"
    }
  }
}
```

3. Restart Claude Desktop
4. Verify tools are available in new chat

#### GitHub Copilot (MCP Configuration Required)

In VS Code with GitHub Copilot (v1.99+):

1. Open Settings → Extensions → GitHub Copilot
2. Enable "MCP servers in Copilot" policy
3. Use GitHub MCP Registry or manual configuration

```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "node",
      "args": ["/path/to/strudel-mcp/server-node/dist/index.js"],
      "cwd": "/path/to/strudel-mcp/server-node"
    }
  }
}
```

**Note**: Replace `/path/to/strudel-mcp` with your actual repository path

## Development

### Project Structure
```
strudel-mcp/
├── server-node/               # Node.js MCP server (recommended)
│   ├── src/
│   │   ├── index.ts          # Main server entry
│   │   ├── mcp/              # MCP protocol handlers
│   │   ├── websocket/        # WebSocket manager
│   │   └── utils/            # Utilities (logger, config)
│   ├── package.json          # Dependencies
│   └── tsconfig.json         # TypeScript config
├── server-go/                 # Legacy Go server
│   ├── main.go               # Go MCP implementation
│   └── websocket_server.go   # Go WebSocket server
├── frontend/                  # Web-based Strudel interface
│   ├── src/
│   │   ├── main.js           # Main frontend application
│   │   └── style.css         # Styling
│   └── package.json
├── docs/                      # Documentation
├── source_of_strudel/         # Strudel source reference (git submodule)
└── images/                    # Screenshots and assets
```

### Key Technologies
- **Backend (Node.js)**: TypeScript + Express + @modelcontextprotocol/sdk
- **Backend (Go)**: Go with `github.com/metoro-io/mcp-golang` (legacy)
- **Frontend**: Vanilla JavaScript with Vite
- **Communication**: WebSocket protocol
- **Synchronization**: BroadcastChannel API
- **Audio**: Web Audio API

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow existing code style and conventions
- Add appropriate error handling
- Update documentation for new features
- Test cross-browser compatibility

## Roadmap

- [ ] Enhanced pattern synchronization across multiple tabs
- [ ] Improved error handling and recovery
- [ ] Additional LLM tools for advanced pattern manipulation
- [ ] Performance optimizations
- [ ] Mobile browser support
- [ ] Plugin system for extensions

## API Reference

### WebSocket Endpoints
- `ws://localhost:8081/ws?type=mcp` - MCP client connection
- `ws://localhost:8081/ws?type=strudel` - Strudel frontend connection

### MCP Tool Reference

#### execute_strudel_code
Execute Strudel pattern code
```json
{
  "name": "execute_strudel_code",
  "arguments": {
    "code": "s('bd hh sd oh').fast(2)"
  }
}
```

#### get_current_pattern  
Get currently executing pattern
```json
{
  "name": "get_current_pattern",
  "arguments": {}
}
```

#### get_strudel_knowledge
Built-in Strudel documentation
```json
{
  "name": "get_strudel_knowledge",
  "arguments": {
    "topic": "basics",
    "query": "drum patterns"
  }
}
```

**Available topics**: `basics`, `patterns`, `effects`, `troubleshooting`

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Ensure port 8081 is available
   - Check firewall settings
   - Verify both servers are running

2. **Audio Not Playing**
   - Check browser audio permissions
   - Ensure user interaction initiated audio context
   - Verify Web Audio API support

3. **MCP Connection Issues**
   - Verify MCP server is running
   - Check LLM client configuration
   - Ensure stdio communication is working

### Logging
- Go server logs: Console output
- Frontend logs: Browser developer console
- WebSocket logs: Server console with verbose mode

## Acknowledgments

- **Original Strudel Team**: For creating an amazing live coding environment
- **TidalCycles Community**: For the pattern language inspiration
- **MCP Contributors**: For the Model Context Protocol standard

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details, consistent with the original Strudel project.

---

**Note**: This is an independent implementation inspired by Strudel. For the official Strudel project, please visit [strudel.cc](https://strudel.cc).
