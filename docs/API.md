# API Reference

This document describes the API for **Agent Factory MCP**, including MCP tools, configuration options, and extensibility points.

## MCP Tools

### System Tools

#### `register_cli_tool`

Dynamically register a CLI tool as an MCP tool during runtime.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `command` | string | ✅ | The CLI command to register (e.g., "ollama", "git") |
| `alias` | string | ❌ | Custom tool name (default: "ask-{command}") |
| `description` | string | ❌ | Custom description for the tool |
| `systemPrompt` | string | ❌ | System prompt for AI agent persona |
| `persist` | boolean | ❌ | Whether to save to ai-tools.json (default: false) |

**Returns:** Success message with tool details or error message.

**Example:**
```
register_cli_tool({
  command: "ollama",
  alias: "local-llm",
  description: "Run local LLM models via Ollama",
  systemPrompt: "You are a helpful AI assistant running locally.",
  persist: true
})
```

**Response:**
```
Successfully registered tool: local-llm
Command: ollama

Tool configuration saved to ai-tools.json.
```

#### `Ping`

A simple test tool that echoes back a message.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | ❌ | Optional message to echo back |

**Returns:** The message with "Ping response:" prefix.

#### `Help`

Shows the Agent Factory MCP help text.

**Parameters:** None

**Returns:** Help information about available tools and usage.

### AI Provider Tools

AI tools are dynamically generated based on registered CLI tools. The exact tools available depend on your configuration.

#### Generic AI Tool Structure

All AI tools follow this structure:

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | ✅ | The prompt/query to send to the AI |
| `{options}` | varies | ❌ | Tool-specific options (model, flags, etc.) |

**Example (ask-qwen):**
```
ask-qwen({
  prompt: "Explain this code",
  model: "qwen-max"
})
```

## Configuration API

### Configuration File: `ai-tools.json`

Located in your project root, this file defines which CLI tools to register as MCP tools.

### Schema

```typescript
interface ToolsConfig {
  $schema?: string;           // "./schema.json"
  version: string;            // "1.0"
  tools: ToolConfig[];
}

interface ToolConfig {
  // Required
  command: string;            // CLI command name

  // Optional
  enabled?: boolean;          // Default: true
  alias?: string;             // Default: "ask-{command}"
  description?: string;       // Auto-generated from --help
  systemPrompt?: string;      // AI persona configuration

  // Provider configuration
  providerType?: "cli-auto" | "custom";  // Default: "cli-auto"
  parserStrategy?: "gnu" | "go" | "custom";  // Help parsing strategy

  // Command configuration
  defaultArgs?: Record<string, string | number | boolean>;
  subcommands?: string[];     // For subcommand tools
  env?: Record<string, string>;  // Environment variables
}
```

### Example Configurations

#### Basic Configuration
```json
{
  "version": "1.0",
  "tools": [
    {
      "command": "qwen"
    }
  ]
}
```

#### Multiple AI Tools with Personas
```json
{
  "version": "1.0",
  "tools": [
    {
      "command": "qwen",
      "alias": "code-reviewer",
      "description": "Code review expert",
      "systemPrompt": "You are a senior code reviewer. Focus on security vulnerabilities, performance issues, and maintainability."
    },
    {
      "command": "qwen",
      "alias": "doc-writer",
      "description": "Documentation specialist",
      "systemPrompt": "You write clear, concise technical documentation."
    },
    {
      "command": "gemini",
      "alias": "vision-analyzer",
      "description": "Image and multimodal analysis"
    }
  ]
}
```

#### Advanced Configuration
```json
{
  "version": "1.0",
  "tools": [
    {
      "command": "ollama",
      "enabled": true,
      "alias": "local-llm",
      "description": "Run local LLM models",
      "defaultArgs": {
        "model": "llama3"
      },
      "env": {
        "OLLAMA_HOST": "http://localhost:11434"
      }
    }
  ]
}
```

## Configuration Loading Priority

The server searches for configuration files in this order:

1. `ai-tools.json` (recommended)
2. `.qwencoderc.json`
3. `qwencode.config.json`

The first file found is used; others are ignored.

## Command-Line API

### Direct Tool Registration

Register tools directly via command-line arguments:

```bash
npx agent-factory-mcp qwen gemini aider
```

Each argument is treated as a CLI command to register.

### Mixed Mode

Combine CLI arguments with configuration file:

```bash
# CLI args are processed first, then config file
npx agent-factory-mcp qwen  # Registers from CLI
# + tools from ai-tools.json
```

## Extensibility Points

### 1. Custom Provider

Create a custom provider for specialized CLI tools:

```typescript
// src/providers/custom.provider.ts
import { BaseCliProvider } from "./base-cli.provider.js";
import type { CliToolMetadata } from "../types/cli-metadata.js";
import type { ToolConfig } from "../utils/configLoader.js";

export class CustomProvider extends BaseCliProvider {
  id = "custom-provider";
  #metadata: CliToolMetadata;

  private constructor(metadata: CliToolMetadata) {
    super();
    this.#metadata = metadata;
  }

  static async create(config: ToolConfig): Promise<CustomProvider | null> {
    // Custom initialization logic
    const metadata: CliToolMetadata = {
      toolName: config.alias || `ask-${config.command}`,
      description: config.description || "Custom tool",
      command: config.command,
      toolType: "simple",
      options: [],
      systemPrompt: config.systemPrompt
    };

    return new CustomProvider(metadata);
  }

  getMetadata(): CliToolMetadata {
    return this.#metadata;
  }

  override async execute(args: Record<string, any>): Promise<string> {
    // Custom execution logic
    return `Custom result: ${JSON.stringify(args)}`;
  }
}

// Register in src/tools/index.ts
import { CustomProvider } from "../providers/custom.provider.js";
registerProvider(new CustomProvider(metadata));
```

### 2. Custom Parser

For CLI tools with non-standard help output:

```typescript
// src/parsers/custom-parser.ts
import type { CliToolMetadata } from "../types/cli-metadata.js";

export class CustomParser {
  static parse(command: string, helpOutput: string): CliToolMetadata {
    // Custom parsing logic for specific CLI format
    const options = extractOptions(helpOutput);
    const description = extractDescription(helpOutput);

    return {
      toolName: `ask-${command}`,
      description,
      command,
      toolType: "simple",
      options
    };
  }
}
```

### 3. Tool Middleware

Add custom behavior to tool execution:

```typescript
// In your provider
override async execute(
  args: Record<string, any>,
  onProgress?: (output: string) => void
): Promise<string> {
  // Pre-processing
  const processedArgs = transformArgs(args);

  // Execution
  const result = await super.execute(processedArgs, onProgress);

  // Post-processing
  return transformResult(result);
}
```

## TypeScript API

### Core Interfaces

#### AIProvider

```typescript
interface AIProvider {
  id: string;
  getMetadata(): CliToolMetadata;
  execute(args: Record<string, any>): Promise<string>;
}
```

#### CliToolMetadata

```typescript
interface CliToolMetadata {
  toolName: string;
  description: string;
  command: string;
  toolType: "simple" | "with-subcommands";
  options: CliOption[];
  argument?: CliArgument;
  subcommands?: SubcommandDefinition[];
  systemPrompt?: string;
}
```

#### UnifiedTool

```typescript
interface UnifiedTool {
  name: string;
  description: string;
  category?: "simple" | "ai" | "utility";
  zodSchema: z.ZodTypeAny;
  prompt?: {
    description: string;
    arguments?: Array<{
      name: string;
      description: string;
      required: boolean;
    }>;
  };
  execute(args: Record<string, any>): Promise<string>;
}
```

### Registration API

```typescript
import { registerProvider } from "./tools/registry.js";
import { CustomProvider } from "./providers/custom.provider.js";

// Register a provider instance
registerProvider(new CustomProvider(metadata));

// Or use async factory
const provider = await CustomProvider.create(config);
if (provider) {
  registerProvider(provider);
}
```

### Tool Registry API

```typescript
import {
  toolRegistry,
  registerProvider,
  toolExists,
  getToolDefinitions,
  executeTool
} from "./tools/registry.js";

// Check if tool exists
if (toolExists("ask-qwen")) {
  // Execute tool
  const result = await executeTool("ask-qwen", { prompt: "Hello" });
}

// Get all tool definitions (for MCP tools/list)
const tools = getToolDefinitions();
```

### Config Loader API

```typescript
import { ConfigLoader } from "./utils/configLoader.js";

// Load configuration
const result = ConfigLoader.load("/path/to/project");
if (result.config) {
  console.log("Loaded:", result.configPath);
}

// Save configuration
ConfigLoader.save(
  { version: "1.0", tools: [...] },
  "/path/to/ai-tools.json"
);

// Add tool to existing config
ConfigLoader.addTool({
  command: "new-tool",
  enabled: true
});

// Get JSON schema
const schema = ConfigLoader.getJsonSchema();
```

## Error Handling

### Provider Creation Errors

```typescript
const provider = await GenericCliProvider.create(config);
if (!provider) {
  // Command not found in PATH
  console.error("Tool not available");
}
```

### Tool Execution Errors

```typescript
try {
  const result = await executeTool(toolName, args);
} catch (error) {
  // Validation error (Zod) or execution error
  console.error(error.message);
}
```

### Config Loading Errors

```typescript
const result = ConfigLoader.load();
if (result.error) {
  // Schema validation error or file read error
  console.error("Config error:", result.error);
}
```

## Progress Reporting

Tools can report progress during long-running operations:

```typescript
override async execute(
  args: Record<string, any>,
  onProgress?: (output: string) => void
): Promise<string> {
  onProgress?.("Starting operation...");

  const result = await executeCommand(
    this.command,
    args,
    (output) => {
      // Stream progress updates
      onProgress?.(output);
    }
  );

  return result;
}
```

## Testing API

### Unit Testing Providers

```typescript
import { strict as assert } from "node:assert";
import { GenericCliProvider } from "../src/providers/generic-cli.provider.js";

describe("CustomProvider", async () => {
  it("should create provider from config", async () => {
    const config = { command: "test", enabled: true, providerType: "cli-auto" };
    const provider = await CustomProvider.create(config);
    assert.ok(provider);
  });

  it("should execute with args", async () => {
    const result = await provider.execute({ prompt: "test" });
    assert.equal(typeof result, "string");
  });
});
```

### Testing Config Loading

```typescript
import { ConfigLoader } from "../src/utils/configLoader.js";

describe("ConfigLoader", async () => {
  it("should load valid config", () => {
    const result = ConfigLoader.load("./test/fixtures");
    assert.strictEqual(result.config?.tools.length, 1);
  });
});
```

## Best Practices

1. **Always validate tool availability** before registering
2. **Use descriptive aliases** for multiple instances of the same tool
3. **Set appropriate system prompts** to shape AI behavior
4. **Use `defaultArgs`** for common configuration options
5. **Enable `persist`** when registering tools you want to keep
6. **Handle errors gracefully** in custom providers
7. **Test with actual CLI tools** to ensure compatibility
