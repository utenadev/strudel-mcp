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
- `describe_pattern` - Natural language description of patterns
- `suggest_modification` - Pattern modification suggestions
- `get_strudel_docs` - Context7 documentation access
- `take_page_snapshot` - Browser screenshot capabilities
- `analyze_performance` - Performance analysis tools
- `chrome_dev_tools` - Chrome DevTools integration

### Synchronization Features
- **BroadcastChannel API**: Cross-tab pattern synchronization
- **Real-time Updates**: Immediate pattern changes across multiple tabs/windows
- **Error Handling**: Robust error recovery and fallback mechanisms

## Quick Start

### Prerequisites
- Node.js (>=18)
- Go (>=1.21)
- Modern browser with WebSocket support

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/strudel-mcp.git
   cd strudel-mcp
   ```

2. **Install Go dependencies**:
   ```bash
   go mod tidy
   ```

3. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Build the Go server**:
   ```bash
   go build -o strudel-mcp.exe main.go websocket_server.go
   ```

5. **Start the WebSocket server**:
   ```bash
   ./strudel-mcp.exe -websocket -port 8081
   ```

6. **Start the frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

7. **Start MCP server**:
   ```bash
   ./strudel-mcp.exe
   ```

### Usage with LLM

Configure your LLM client (e.g., Qwen Code) to use the MCP server:

```json
{
  "mcpServers": {
    "strudel-mcp": {
      "command": "path/to/strudel-mcp.exe",
      "args": []
    }
  }
}
```

## Development

### Project Structure
```
strudel-mcp/
├── main.go                    # MCP server implementation
├── websocket_server.go        # WebSocket server
├── frontend/                  # Web-based Strudel interface
│   ├── src/
│   │   ├── main.js           # Main frontend application
│   │   └── style.css         # Styling
│   └── package.json
├── my/                        # Project metadata and tasks
│   ├── tasks.md              # Task management
│   └── easy_design.md        # Design documents
├── docs/                      # Documentation
└── test-*.js/html            # Test utilities
```

### Key Technologies
- **Backend**: Go with `github.com/metoro-io/mcp-golang`
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
See [./mcp-tools.md](./docs/mcp-tools.md) for detailed API documentation.

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
