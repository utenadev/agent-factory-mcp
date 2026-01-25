# Changelog

All notable changes to Agent Factory MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Claude CLI Integration** - Add `claude` to AI_TOOL_WHITELIST
- **Session Management** - Continue conversations using `sessionId` parameter
- **Per-Tool Servers** - Run each AI tool as separate MCP server
- **OpenCode Support** - Add `opencode` to supported tools (JSON output parsing)
- **Code Simplification** - Refactor `generic-cli.provider.ts` with private methods

### Changed
- **Bun as Primary Runtime** - Documentation updated to reflect Bun-first approach
- **CLI Tools Support** - Expand to support Claude (v2.1.19), Gemini (v0.25.2), OpenCode (v1.1.35)

### Fixed
- **CLI Tool Hangups** - Close stdin to prevent interactive mode blocking
- **Session Continuation** - Map `sessionId: "latest"` to `--continue` for tools that support it

### Documentation
- Updated README.md and README.ja.md with session management examples
- Added acknowledgments to [jamubc/gemini-mcp-tool](https://github.com/jamubc/gemini-mcp-tool)
- Updated WorkingLog.md with 270 lines of development history

### Test Coverage
- Session continuation verified with Gemini (context preservation)
- Claude integration tested with --print flag
- OpenCode JSON parsing and session continuation verified
- All functionality preserved after code refactoring

## [1.0.0] - 2026-01-24

### Added
- **Generic AI Provider Framework** - Zero-code registration of CLI tools as MCP tools
- **CLI Help Parser** - Automatic metadata extraction from `--help` output
- **Configuration-Driven Registration** - Register tools via `ai-tools.json`
- **Runtime Tool Registration** - `register_cli_tool` MCP tool for dynamic registration
- **Subcommand Support** - Parse and register CLI tools with subcommands
- **Multi-Provider Support** - Use multiple AI tools (Qwen, Gemini, Ollama, etc.) simultaneously

### Features
- Auto-discovers CLI tools from help output (commander.js format)
- Supports GNU-style flags with type hints: `[boolean]`, `[string]`, `[number]`
- Parses choices: `[choices: "a", "b", "c"]`
- Extracts default values: `[default: value]`
- Type inference from flag names and descriptions
- Configuration file support with Zod validation
- Graceful degradation for missing CLI tools
- Progress tracking for long-running commands

### Configuration
- `ai-tools.json` - Main configuration file
- `.qwencoderc.json` - Alternative config file
- `qwencode.config.json` - Alternative config file

### Tools
- `ask-qwen` - Qwen AI integration
- `register_cli_tool` - Dynamic tool registration
- `Ping` - Connection test tool
- `Help` - Help information

### Testing
- 42 tests covering all major functionality
- Help parser tests (12 tests)
- Config loader tests (8 tests)
- Subcommand tests (6 tests)
- Tool registry tests (14 tests)

### Documentation
- README.md and README.ja.md with usage examples
- Mermaid architecture and state transition diagrams
- API reference documentation
- Architecture documentation

## [0.1.0] - 2026-01-24

### Added
- Initial release as qwencode-mcp-server
- Qwen CLI integration via MCP protocol
- Basic tool execution with progress tracking
- Static tool definitions

[Unreleased]: https://github.com/utenadev/agent-factory-mcp/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/utenadev/agent-factory-mcp/releases/tag/v1.0.0
[0.1.0]: https://github.com/utenadev/qwencode-mcp/releases/tag/v0.1.0
