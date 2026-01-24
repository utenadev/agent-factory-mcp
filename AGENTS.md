# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-24T22:04:45+09:00
**Commit:** N/A (Local Development)
**Branch:** N/A (Local Development)

---

## OVERVIEW
Agent Factory MCP is a **universal Model Context Protocol (MCP) server** that dynamically discovers and registers CLI tools as MCP tools. It transforms any CLI tool (e.g., Qwen, Ollama, Aider) into an AI-powered agent with persona configuration. Built with TypeScript, it leverages a **metadata-driven design** to generate MCP tools from CLI tool metadata.

---

## STRUCTURE
```
.
├── src/                  # Source code
│   ├── index.ts          # MCP server entry point
│   ├── tools/            # Tool registry and factory
│   ├── providers/        # AI provider implementations
│   ├── parsers/          # CLI help parsers
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utilities (config, logging, etc.)
├── dist/                 # Compiled JavaScript (generated)
├── test/                 # Unit/integration tests (Node.js built-in test runner)
├── docs/                 # Documentation
├── CLAUDE.md             # Guidance for Claude Code
├── README.md             # Project documentation
├── Taskfile.yml          # Task runner configuration (go-task)
└── package.json          # Project configuration
```

---

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **MCP Server Setup** | `src/index.ts` | Entry point, server initialization |
| **Tool Registration** | `src/tools/` | Dynamic tool factory, registry |
| **AI Providers** | `src/providers/` | Qwen, generic CLI providers |
| **CLI Parsing** | `src/parsers/help-parser.ts` | Help output parser |
| **Configuration** | `src/utils/configLoader.ts` | Config loading logic |
| **Testing** | `test/` | Unit and integration tests |
| **Build/Run** | `package.json` | Scripts: `build`, `dev`, `start` |

---

## CONVENTIONS
- **Metadata-Driven Design**: CLI tool metadata (`CliToolMetadata`) is used to dynamically generate MCP tools via `DynamicToolFactory`.
- **Provider Pattern**: All AI providers extend `BaseCliProvider` and implement `AIProvider`.
- **Type Safety**: Zod schemas are used for tool input validation.
- **Progress Management**: Long-running tools use `ProgressManager` for MCP progress updates.
- **No Color**: `Logger` respects `NO_COLOR` environment variable.

---

## ANTI-PATTERNS
- **Static Metadata**: Avoid hardcoding CLI tool metadata. Use `HelpParser` (planned) to auto-generate metadata from `--help` output.
- **Direct File Edits**: Never modify files in `dist/` directly. Edit `src/` and rebuild.
- **Ignoring Timeouts**: Always respect the 10-minute timeout in `executeCommand`.
- **Suppressing Type Errors**: Never use `@ts-ignore` or `as any`. Fix type errors explicitly.

---

## UNIQUE STYLES
- **Persona Support**: Configure system prompts to create specialized AI agents (e.g., `code-reviewer`, `doc-writer`).
- **Runtime Registration**: Tools can be added dynamically via the `register_cli_tool` MCP tool.
- **Multi-Provider**: Support for multiple AI tools (Qwen, Gemini, Aider, etc.) simultaneously.

---

## COMMANDS
```bash
# Install dependencies
bun install

# Build
bun run build

# Development (build + run)
bun run dev

# Run (built)
bun run start

# Test
bun test

# Type check
bun run type-check

# Lint (Biome)
bun biome lint src

# Format (Biome)
bun biome format src --write

# Run all checks (type-check, lint, test)
task check
```

---

## NOTES
- **Generated Code**: `dist/` contains compiled JavaScript. Do not edit directly.
- **Entry Point**: `src/index.ts` initializes the MCP server and registers providers.
- **Dynamic Tools**: Tools are generated at runtime from `CliToolMetadata`.
- **Progress Updates**: Long-running tools (e.g., Qwen) send progress updates every 25 seconds to prevent MCP client timeouts.