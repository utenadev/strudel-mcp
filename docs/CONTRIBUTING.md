# Contributing to Strudel MCP

Thank you for your interest in contributing to Strudel MCP! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites
- Go 1.21 or higher
- Node.js 18 or higher
- Git
- Modern web browser for testing

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/strudel-mcp.git
   cd strudel-mcp
   ```

2. **Install dependencies**
   ```bash
   # Go dependencies
   go mod tidy
   
   # Frontend dependencies
   cd frontend
   npm install
   cd ..
   ```

3. **Run development servers**
   ```bash
   # Terminal 1: WebSocket server
   go run main.go websocket_server.go -websocket -port 8081
   
   # Terminal 2: Frontend
   cd frontend
   npm run dev
   
   # Terminal 3: MCP server (for testing with LLM)
   go run main.go websocket_server.go
   ```

## Project Structure

```
strudel-mcp/
├── main.go                    # MCP server implementation
├── websocket_server.go        # WebSocket server
├── frontend/                  # Web-based interface
│   ├── src/
│   │   ├── main.js           # Main frontend code
│   │   └── style.css         # Styling
│   ├── package.json
│   └── index.html
├── my/                        # Project metadata and tasks
│   ├── tasks.md              # Task management and progress
│   └── easy_design.md        # Design documents
├── docs/                      # Documentation
├── test-*.js/html            # Test utilities and interfaces
├── README.md                  # Main project documentation
├── README.ja.md               # Japanese documentation
├── CONTRIBUTING.md            # Contribution guidelines
└── go.mod, go.sum           # Go dependencies
```

## Development Guidelines

### Code Style

#### Go Code
- Follow standard Go formatting (`gofmt`)
- Use meaningful variable and function names
- Add comments for exported functions
- Handle errors appropriately

#### JavaScript Code
- Use modern ES6+ syntax
- Follow consistent indentation (2 spaces)
- Add JSDoc comments for functions
- Use meaningful variable names

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (no functional impact)
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Maintenance tasks

Examples:
```
feat(frontend): add BroadcastChannel sync for multi-tab support
fix(websocket): handle connection timeout gracefully
docs(readme): update installation instructions
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, well-documented code
   - Add tests if applicable
   - Update documentation

3. **Test your changes**
   - Run the full application
   - Test both MCP and WebSocket functionality
   - Verify cross-browser compatibility

4. **Submit a pull request**
   - Provide a clear description of changes
   - Reference any related issues
   - Include screenshots for UI changes

## Testing

### Manual Testing
- Test WebSocket connections
- Verify MCP tool functionality
- Check cross-tab synchronization
- Test error scenarios

### Automated Testing
```bash
# Run Go tests
go test ./...

# Run frontend tests (when implemented)
cd frontend && npm test
```

## Code Review Process

1. **Self-review**: Ensure your code follows guidelines
2. **Automated checks**: Ensure all tests pass
3. **Peer review**: Another contributor reviews your code
4. **Approval**: Maintainer approves and merges

## Reporting Issues

When reporting bugs, please include:
- **Environment**: OS, browser versions, Go version
- **Steps to reproduce**: Detailed reproduction steps
- **Expected vs actual behavior**: Clear description
- **Error messages**: Any console/log output

## Feature Requests

Feature requests should include:
- **Problem statement**: What problem does this solve?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches you've considered
- **Additional context**: Any relevant information

## Areas for Contribution

### High Priority
- [ ] BroadcastChannel sync implementation
- [ ] Error handling improvements
- [ ] Cross-browser testing
- [ ] Documentation completion

### Medium Priority
- [ ] Additional MCP tools
- [ ] Performance optimizations
- [ ] Mobile browser support
- [ ] Plugin system

### Low Priority
- [ ] UI/UX improvements
- [ ] Additional example patterns
- [ ] Integration tests
- [ ] CI/CD pipeline

## Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For general questions and ideas
- **Documentation**: Check existing docs first

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License, consistent with the original Strudel project.

Thank you for contributing to Strudel MCP! 🎵
