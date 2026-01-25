# Changelog

All notable changes to Agent Factory MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CLI argument parsing for quick tool registration
- systemPrompt support for AI agent persona configuration
- Comprehensive documentation (ARCHITECTURE.md, API.md)
- **Auto-Discovery** - Automatic detection of compatible AI CLI tools from PATH

### Changed
- Renamed project from qwencode-mcp-server to agent-factory-mcp
- Category generalized from "qwen" to "ai" for broader provider support
- **Migrated runtime from Node.js to Bun** (>= 1.0.0)
- **Adopted go-task as task runner** (see Taskfile.yml)
- **Replaced ESLint/Prettier with Biome** for linting and formatting
- **Migrated tests from Node.js built-in test runner to Bun test**

### Changed
- Renamed project from qwencode-mcp-server to agent-factory-mcp
- Category generalized from "qwen" to "ai" for broader provider support

### Refactored
- Simplified help-parser.ts with better code organization
- Simplified index.ts with extracted helper methods
- Simplified configLoader.ts with file operation helpers
- Simplified simple-tools.ts with helper functions
- Simplified progressManager.ts with progress helpers
- Simplified registry.ts with functional programming patterns
- Simplified generic-cli.provider.ts with metadata override helpers

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
