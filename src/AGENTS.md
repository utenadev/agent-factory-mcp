# SRC DIRECTORY KNOWLEDGE BASE

**Generated:** 2026-01-24T22:04:45+09:00

---

## OVERVIEW
The `src/` directory contains the core source code for Agent Factory MCP. It is organized into modular components that follow a **metadata-driven design** for dynamic MCP tool generation.

---

## STRUCTURE
```
src/
├── index.ts              # MCP server entry point
├── constants.ts          # Shared constants and type definitions
├── tools/                # Tool registry and dynamic tool factory
├── providers/            # AI provider implementations (Qwen, Generic CLI, etc.)
├── parsers/              # CLI help parsers (planned)
├── types/                # TypeScript type definitions
└── utils/                # Utilities (config, logging, progress management)
```

---

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Server Initialization** | `index.ts` | MCP server setup, provider registration |
| **Tool Metadata** | `types/cli-metadata.ts` | `CliToolMetadata`, `CliOption` types |
| **Dynamic Tool Factory** | `tools/dynamic-tool-factory.ts` | Generates MCP tools from metadata |
| **Tool Registry** | `tools/registry.ts` | Manages registered tools and providers |
| **Base Provider** | `providers/base-cli.provider.ts` | `AIProvider` interface, `BaseCliProvider` |
| **Qwen Provider** | `providers/qwen.provider.ts` | Qwen-specific implementation |
| **CLI Parsing** | `parsers/help-parser.ts` | CLI `--help` 出力のパーサー（開発中） |
| **Command Execution** | `utils/commandExecutor.ts` | CLI command execution with timeout |
| **Progress Management** | `utils/progressManager.ts` | MCP progress updates for long-running tools |

---

## CONVENTIONS
- **Provider Pattern**: All AI providers extend `BaseCliProvider` and implement `AIProvider`.
- **Metadata-Driven**: Tools are generated dynamically from `CliToolMetadata`.
- **Type Safety**: Zod schemas are used for input validation in dynamic tools.
- **Progress Updates**: Long-running tools (e.g., Qwen) use `ProgressManager` to send updates every 25 seconds.

---

## ANTI-PATTERNS
- **Static Metadata**: Avoid hardcoding CLI tool metadata. Use `HelpParser` (planned) for auto-generation.
- **Direct Command Execution**: Always use `executeCommand` from `utils/commandExecutor.ts` to enforce timeouts.
- **Ignoring Progress Updates**: Always implement progress updates for tools with execution times > 10 seconds.

---

## UNIQUE STYLES
- **Dynamic Tool Generation**: Tools are generated at runtime from metadata, enabling zero-code registration.
- **Multi-Provider Support**: The architecture supports multiple AI providers (Qwen, Gemini, Aider, etc.) simultaneously.
- **Persona Configuration**: System prompts can be configured to create specialized AI agents (e.g., `code-reviewer`, `doc-writer`).

---

## NOTES
- **Entry Point**: `index.ts` initializes the MCP server and registers providers.
- **Tool Registration**: Providers are registered via `registerProvider` in `tools/index.ts`.
- **Future Work**: `HelpParser` will auto-generate metadata from `--help` output.