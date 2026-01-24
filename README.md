# QwenCode MCP Tool

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Open Source](https://img.shields.io/badge/Open%20Source-❤️-red.svg)](https://github.com/qwen-team/qwen-mcp-tool)

</div>

> A Model Context Protocol (MCP) server that allows AI assistants to interact with QwenCode. It enables the AI to leverage the power of Qwen's capabilities for analysis, especially with large files and codebases using the `@` syntax for direction.

- Ask Qwen natural questions through other AI assistants!
- Leverage Qwen's powerful analysis capabilities directly in your AI workflows

**Note**: This project was inspired by [jamubc/gemini-mcp-tool](https://github.com/jamubc/gemini-mcp-tool) and adapted for Qwen integration.

## Repository Structure

```
qwencode-mcp-server/
├── LICENSE
├── package.json
├── README.ja.md
├── README.md
├── scripts
├── src
│   ├── constants.ts
│   ├── index.ts
│   ├── tools
│   └── utils
└── tsconfig.json
```

## Prerequisites

Before using this tool, ensure you have:

1. **[Node.js](https://nodejs.org/)** (v16.0.0 or higher)
2. **[QwenCode](https://github.com/QwenLM/Qwen)** installed and configured


### Installation

To use this tool, you need to install it first. Since this is not published as an npm package yet, you can install it directly from GitHub:

```bash
npm install -g github:utenadev/qwencode-mcp-server
```

Or use it directly with npx without installing:

```bash
npx github:utenadev/qwencode-mcp-server
```

Or use it with bunx (if you have Bun installed):

```bash
bunx github:utenadev/qwencode-mcp-server
```

### One-Line Setup

Once installed, register the MCP server with Claude:

```bash
claude mcp add qwen -- npx github:utenadev/qwencode-mcp-server
```

Or using bunx:

```bash
claude mcp add qwen -- bunx github:utenadev/qwencode-mcp-server
```

### Verify Installation

Type `/mcp` inside Claude Code to verify the qwen MCP is active.

---

### Alternative: Import from Claude Desktop

If you already have it configured in Claude Desktop:

1. Add to your Claude Desktop config:
```json
"qwen": {
  "command": "npx",
  "args": ["github:utenadev/qwencode-mcp-server"]
}
```

Or using bunx:
```json
"qwen": {
  "command": "bunx",
  "args": ["github:utenadev/qwencode-mcp-server"]
}
```

2. Import to Claude Code:
```bash
claude mcp add-from-claude-desktop
```

## Configuration

Register the MCP server with your MCP client:

### For NPX Usage (Recommended)

Add this configuration to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "qwen": {
      "command": "npx",
      "args": ["-y", "qwencode-mcp-server"]
    }
  }
}
```

### For Global Installation

If you installed globally, use this configuration instead:

```json
{
  "mcpServers": {
    "qwen": {
      "command": "npx",
      "args": ["github:utenadev/qwencode-mcp-server"]
    }
  }
}
}

Alternatively, if you prefer using bunx:

```json
{
  "mcpServers": {
    "qwen": {
      "command": "bunx",
      "args": ["github:utenadev/qwencode-mcp-server"]
    }
  }
}
}
```

**Configuration File Locations:**

- **Claude Desktop**:
  - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
  - **Linux**: `~/.config/claude/claude_desktop_config.json`

After updating the configuration, restart your terminal session.

## Example Workflow

- **Natural language**: "use qwen to explain index.html", "understand the massive project using qwen", "ask qwen to search for latest news"
- **Claude Code**: Type `/qwen` and commands will populate in Claude Code's interface.

## Usage Examples

### With File References (using @ syntax)

- `ask qwen to analyze @src/main.js and explain what it does`
- `use qwen to summarize @. the current directory`
- `analyze @package.json and tell me about dependencies`

### General Questions (without files)

- `ask qwen to search for the latest tech news`
- `use qwen to explain div centering`
- `ask qwen about best practices for React development related to @file_im_confused_about`

### Tools (for the AI)

These tools are designed to be used by the AI assistant.

- **`ask-qwen`**: Asks Qwen AI for its perspective. Can be used for general questions or complex analysis of files.
  - **`prompt`** (required): The analysis request. Use the `@` syntax to include file or directory references (e.g., `@src/main.js explain this code`) or ask general questions (e.g., `Please search for the latest news stories`).
  - **`model`** (optional): The Qwen model to use. Defaults to `qwen-max`.

- **`Ping`**: A simple test tool that echoes back a message.
- **`Help`**: Shows the QwenCode help text.

### Slash Commands (for the User)

You can use these commands directly in Claude Code's interface (compatibility with other clients has not been tested).

- **/analyze**: Analyzes files or directories using Qwen, or asks general questions.
  - **`prompt`** (required): The analysis prompt. Use `@` syntax to include files (e.g., `/analyze prompt:@src/ summarize this directory`) or ask general questions (e.g., `/analyze prompt:Please search for the latest news stories`).
- **/help**: Displays the QwenCode help information.
- **/ping**: Tests the connection to the server.
  - **`message`** (optional): A message to echo back.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

**Disclaimer:** This is an unofficial, third-party tool and is not affiliated with, endorsed, or sponsored by Alibaba Cloud or the Qwen team.