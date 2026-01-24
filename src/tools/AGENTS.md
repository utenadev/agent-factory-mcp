# TOOLS DIRECTORY KNOWLEDGE BASE

**Generated:** 2026-01-24T22:04:45+09:00

---

## OVERVIEW
The `src/tools/` directory contains the **tool registry** and **dynamic tool factory** for Agent Factory MCP. It enables runtime registration and generation of MCP tools from CLI tool metadata.

---

## STRUCTURE
```
src/tools/
├── index.ts              # Tool registration entry point
├── registry.ts           # Tool registry and provider management
├── dynamic-tool-factory.ts # Generates MCP tools from metadata
└── simple-tools.ts       # Static tools (Ping, Help, etc.)
```

---

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Tool Registration** | `index.ts` | Register providers and tools |
| **Tool Registry** | `registry.ts` | `toolRegistry`, `registerProvider` |
| **Dynamic Tool Factory** | `dynamic-tool-factory.ts` | Generates MCP tools from `CliToolMetadata` |
| **Static Tools** | `simple-tools.ts` | Ping, Help, and other static tools |

---

## CONVENTIONS
- **Metadata-Driven**: Tools are generated dynamically from `CliToolMetadata`.
- **Provider Pattern**: All providers are registered via `registerProvider`.
- **Zod Validation**: Input schemas are generated using Zod for type safety.
- **Runtime Registration**: Tools can be added dynamically via the `register_cli_tool` MCP tool.

---

## ANTI-PATTERNS
- **Hardcoded Tools**: Avoid hardcoding tools. Use `DynamicToolFactory` for metadata-driven generation.
- **Direct Registry Access**: Always use `registerProvider` to add tools to the registry.
- **Ignoring Validation**: Always validate tool inputs using Zod schemas.

---

## UNIQUE STYLES
- **Dynamic Tool Generation**: Tools are generated at runtime from metadata, enabling zero-code registration.
- **Multi-Provider Support**: The registry supports multiple AI providers (Qwen, Gemini, Aider, etc.).
- **Runtime Registration**: Tools can be added dynamically via MCP, enabling extensibility without code changes.

---

## NOTES
- **Entry Point**: `index.ts` initializes the tool registry and registers providers.
- **Tool Lifecycle**: Tools are generated from metadata and registered at runtime.
- **Runtime Registration**: Use `register_cli_tool({ command: "ollama", ... })` to add tools dynamically.
- **Future Work**: `HelpParser` will auto-generate metadata from `--help` output.