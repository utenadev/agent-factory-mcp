# Roadmap: Generic AI CLI Auto-Discovery

> **Status: ✅ COMPLETE** - All phases implemented and released.

This roadmap outlines the path that was followed to achieve a fully dynamic MCP server that can integrate any AI CLI tool simply by parsing its `--help` output.

## Goal Achieved

The server now recognizes and registers CLI tools (like Qwen, Ollama, Gemini, etc.) as MCP tools automatically, analyzing their capabilities from their help commands without manual code changes.

## Phases

### ✅ Phase 1: Help Parser Prototyping
**Status:** Complete
**Focus:** Verified the feasibility of parsing `--help` output into `CliToolMetadata`.

- [x] Created `src/parsers/help-parser.ts` with core logic
- [x] Implemented support for standard GNU-style help output (`-f, --flag Description`)
- [x] Created unit tests using captured `--help` outputs
- [x] Verified type inference (boolean, string, number, file)
- [x] Added support for commander.js style help output

**Deliverables:**
- `HelpParser` class with regex patterns for options, arguments, and subcommands
- Test suite in `test/help-parser.test.js` (12 tests passing)

### ✅ Phase 2: Configuration-Driven Registration
**Status:** Complete
**Focus:** Allow users to add tools via a configuration file instead of code.

- [x] Designed configuration schema (`ai-tools.json`)
- [x] Implemented `GenericCliProvider` using `HelpParser`
- [x] Created `ConfigLoader` for loading and validating configuration
- [x] Updated `index.ts` to read config on startup
- [x] Implemented graceful degradation for missing CLI tools

**Deliverables:**
- `src/utils/configLoader.ts` with Zod validation
- `src/providers/generic-cli.provider.ts`
- `ai-tools.json.example` and `schema.json`
- Test suite in `test/configLoader.test.js` (8 tests passing)

### ✅ Phase 3: Advanced Parsing & Subcommands
**Status:** Complete
**Focus:** Support complex CLIs with subcommands (e.g., `git commit`, `ollama run`).

- [x] Extended `CliToolMetadata` to support hierarchical commands
- [x] Implemented subcommand detection and parsing
- [x] Added type inference heuristics for flag types
- [x] Support for subcommands in `HelpParser`

**Deliverables:**
- Extended `CliToolMetadata` with `toolType` and `subcommands`
- Subcommand parsing in `HelpParser`
- Test suite in `test/subcommands.test.js` (6 tests passing)

### ✅ Phase 4: Runtime Management
**Status:** Complete
**Focus:** Zero-downtime tool addition via MCP.

- [x] Created system MCP tool: `register_cli_tool`
- [x] Allow dynamic tool registration during conversations
- [x] Persist runtime additions to configuration file
- [x] Added `systemPrompt` support for AI persona configuration

**Deliverables:**
- `register_cli_tool` tool in `src/tools/simple-tools.ts`
- `ConfigLoader.addTool()` and `save()` methods
- Command-line argument parsing for quick tool registration
- `systemPrompt` field in configuration schema

## Implementation Summary

| Phase | Status | Tests | Key Files |
|-------|--------|-------|-----------|
| Phase 1 | ✅ | 12 | `src/parsers/help-parser.ts` |
| Phase 2 | ✅ | 8 | `src/providers/generic-cli.provider.ts`, `src/utils/configLoader.ts` |
| Phase 3 | ✅ | 6 | Subcommand support in `HelpParser` |
| Phase 4 | ✅ | 14 | `register_cli_tool`, CLI args, systemPrompt |

**Total:** 40 tests passing

## Post-Completion Enhancements

After completing the core roadmap, the following features were added:

1. **Command-line argument registration**
   ```bash
   npx agent-factory-mcp qwen gemini aider
   ```

2. **System prompt support**
   ```json
   {
     "command": "qwen",
     "alias": "code-reviewer",
     "systemPrompt": "You are a senior code reviewer..."
   }
   ```

3. **Repository rename**
   - Renamed from `qwencode-mcp-server` to `agent-factory-mcp`
   - Refreshed documentation with Mermaid diagrams

## Future Enhancements (Ideas)

### Testing & Quality Improvement (High Priority)
Following the MistralVibe test report analysis, the following areas need attention:
- [ ] **Implement Unit Tests for `BaseCliProvider`**: Improve coverage for the core base class (currently 0%).
- [ ] **Enhance `ConfigLoader` Error Handling Tests**: Add tests for invalid JSON, missing schemas, and permission issues.
- [ ] **Improve `Logger` Coverage**: Verify log level filtering and output formatting.
- [ ] **Automated Coverage Reporting**: Integrate coverage reporting into the CI pipeline.

### Other Ideas
- **Tool Marketplace**: Share and discover tool configurations
- **Web UI**: Browser-based configuration and testing interface
- **Custom Parser Strategies**: Pluggable parsers for non-standard help formats
- **Tool Versioning**: Support multiple versions of the same CLI tool
