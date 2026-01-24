# PROVIDERS DIRECTORY KNOWLEDGE BASE

**Generated:** 2026-01-24T22:04:45+09:00

---

## OVERVIEW
The `src/providers/` directory contains **AI provider implementations** for Agent Factory MCP. Providers extend `BaseCliProvider` and implement the `AIProvider` interface to enable dynamic MCP tool generation.

---

## STRUCTURE
```
src/providers/
├── base-cli.provider.ts  # AIProvider interface, BaseCliProvider
├── qwen.provider.ts      # Qwen-specific implementation
└── generic-cli.provider.ts # Generic CLI provider (開発中)
```

---

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Provider Interface** | `base-cli.provider.ts` | `AIProvider` interface, `BaseCliProvider` |
| **Qwen Provider** | `qwen.provider.ts` | Qwen-specific implementation |
| **Metadata Definition** | `base-cli.provider.ts` | `CliToolMetadata` structure and requirements |
| **Command Execution** | `base-cli.provider.ts` | `executeCommand` with timeout and progress updates |

---

## CONVENTIONS
- **Provider Pattern**: All providers extend `BaseCliProvider` and implement `AIProvider`.
- **Metadata-Driven**: Providers define `CliToolMetadata` to enable dynamic tool generation.
- **Progress Updates**: Long-running commands (e.g., Qwen) use `ProgressManager` to send updates every 25 seconds.
- **Type Safety**: Provider methods are typed to ensure consistency.

---

## ANTI-PATTERNS
- **Static Metadata**: Avoid hardcoding CLI tool metadata. Use `HelpParser` (planned) for auto-generation.
- **Direct Command Execution**: Always use `executeCommand` from `BaseCliProvider` to enforce timeouts.
- **Ignoring Progress Updates**: Always implement progress updates for tools with execution times > 10 seconds.

---

## UNIQUE STYLES
- **Multi-Provider Support**: The architecture supports multiple AI providers (Qwen, Gemini, Aider, etc.) simultaneously.
- **Persona Configuration**: System prompts can be configured to create specialized AI agents (e.g., `code-reviewer`, `doc-writer`).
- **Runtime Registration**: Providers can be registered at runtime via `registerProvider`.

---

## NOTES
- **Base Provider**: `BaseCliProvider` provides shared functionality for CLI-based providers.
- **Qwen Implementation**: `QwenProvider` is the reference implementation for CLI-based providers.
- **Future Work**: `HelpParser` will auto-generate metadata from `--help` output.