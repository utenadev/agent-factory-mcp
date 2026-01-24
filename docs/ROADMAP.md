# Roadmap: Generic AI CLI Auto-Discovery

This roadmap outlines the path to achieving a fully dynamic MCP server that can integrate any AI CLI tool simply by parsing its `--help` output.

## Goal
To enable the server to recognize and register CLI tools (like OpenCode, Ollama, etc.) as MCP tools automatically, analyzing their capabilities from their help commands without manual code changes.

## Phases

### Phase 1: Help Parser Prototyping
**Focus:** Verify the feasibility of parsing `--help` output into `CliToolMetadata`.
- [ ] Create `src/parsers/help-parser.ts` (Core logic).
- [ ] Implement support for standard GNU-style help output (`-f, --flag Description`).
- [ ] Create unit tests using captured `--help` outputs from `qwen`, `ollama`, and `openai` CLIs.
- [ ] Verify that the parser can replicate the current manual metadata for Qwen.

### Phase 2: Configuration-Driven Registration
**Focus:** Allow users to add tools via a configuration file instead of code.
- [ ] Design configuration schema (`config.json` or YAML).
- [ ] Implement `GenericCliProvider` which initializes using only a command name and the Parser.
- [ ] Update `index.ts` to read config on startup, invoke `--help` for each tool, and register them.
- [ ] Handling "Bootstrapping": What if the CLI tool isn't installed? (Graceful degradation).

### Phase 3: Advanced Parsing & Subcommands
**Focus:** Support complex CLIs with subcommands (e.g., `git commit`, `ollama run`).
- [ ] Extend `CliToolMetadata` to support hierarchical commands (commands with sub-commands).
- [ ] Implement recursive parsing logic (parse `cmd --help`, find subcommands, parse `cmd sub --help`).
- [ ] Heuristic Type Inference: Guess argument types (boolean, string, number, file path) based on flag names and descriptions.

### Phase 4: Runtime Management
**Focus:** Zero-downtime tool addition via MCP.
- [ ] Create a system MCP tool: `register_cli_tool(command_name)`.
- [ ] Allow the AI assistant to request adding a new tool dynamically during a conversation.
- [ ] Persist these runtime additions to the configuration file.
