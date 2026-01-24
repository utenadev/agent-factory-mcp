# Design Specification: Tool Configuration Schema

## Overview
To allow users to register AI CLI tools without modifying the source code, we will introduce a configuration file (e.g., `ai-tools.json` or `.env` configuration).

## Schema Definition

### 1. JSON Configuration (`ai-tools.json`)
This file will live in the project root or a user config directory.

```json
{
  "version": "1.0",
  "tools": [
    {
      "command": "qwen",
      "enabled": true,
      "providerType": "cli-auto", 
      "parserStrategy": "gnu", 
      "env": {
        "QWEN_API_KEY": "..."
      }
    },
    {
      "command": "ollama",
      "enabled": true,
      "subcommands": ["run", "list"],
      "defaultArgs": {
        "model": "llama3"
      }
    },
    {
      "command": "opencode",
      "alias": "code-assistant", 
      "description": "OpenCode interpreter"
    }
  ]
}
```

### 2. Field Descriptions

- **`command`** (Required): The binary name to execute (must be in system PATH).
- **`enabled`**: Toggle to temporarily disable a tool. Default: `true`.
- **`providerType`**: 
    - `"cli-auto"`: Use the auto-discovery help parser (Default).
    - `"custom"`: Use a specific TS class implementation (if available in code).
- **`parserStrategy`**: Hints for the parser.
    - `"gnu"`: Standard `-f, --flag` format.
    - `"go"`: Go-style flags `-flag`.
- **`subcommands`**: List of specific subcommands to register as separate tools (e.g., `ollama-run`).
- **`defaultArgs`**: Hardcoded default values for flags (e.g., always use `--json`).
- **`alias`**: Override the MCP tool name (default is `ask-<command>`).

## Environment Variable Fallback

For simple setups, we can support a comma-separated list in `.env`:

```bash
# Registers 'qwen' and 'ollama' with default settings
MCP_AI_TOOLS=qwen,ollama
```

## Loading Process

1. **Startup**: Server checks for `ai-tools.json`.
2. **Fallback**: If no JSON, checks `MCP_AI_TOOLS` env var.
3. **Initialization**:
   - For each configured tool, run `<command> --help`.
   - Parse metadata.
   - Register via `DynamicToolFactory`.
   - Log success/failure (e.g., "Command not found").
