import { z } from "zod";
import type { UnifiedTool } from "./registry.js";
import { GenericCliProvider } from "../providers/generic-cli.provider.js";
import { registerProvider } from "./registry.js";
import { ConfigLoader } from "../utils/configLoader.js";
import type { ToolConfig } from "../utils/configLoader.js";

// ============================================================================
// Schema Definitions
// ============================================================================

const pingArgsSchema = z.object({
  message: z.string().optional().describe("Optional message to echo back"),
});

const helpArgsSchema = z.object({});

const registerToolArgsSchema = z.object({
  command: z.string().describe("The CLI command to register (e.g., 'ollama', 'git')"),
  alias: z.string().optional().describe("Optional alias for the tool (defaults to 'ask-{command}')"),
  description: z.string().optional().describe("Custom description for the tool"),
  systemPrompt: z.string().optional().describe("System prompt for AI agent persona configuration"),
  persist: z.boolean().optional().describe("Whether to save to ai-tools.json (default: false)"),
});

// ============================================================================
// Helper Functions
// ============================================================================

function createToolConfig(params: {
  command: string;
  alias?: string;
  description?: string;
  systemPrompt?: string;
}): ToolConfig {
  const config: ToolConfig = {
    command: params.command,
    enabled: true,
    providerType: "cli-auto",
  };

  if (params.alias !== undefined) config.alias = params.alias;
  if (params.description !== undefined) config.description = params.description;
  if (params.systemPrompt !== undefined) config.systemPrompt = params.systemPrompt;

  return config;
}

function formatRegistrationSuccess(provider: GenericCliProvider, command: string): string {
  const metadata = provider.getMetadata();
  const lines = [
    `Successfully registered tool: ${metadata.toolName}`,
    `Command: ${command}`,
  ];

  if (metadata.subcommands?.length) {
    lines.push(`Subcommands: ${metadata.subcommands.map(sc => sc.name).join(", ")}`);
  }

  return lines.join("\n");
}

function formatPersistMessage(config: ToolConfig, persist?: boolean): string {
  if (!persist) {
    return "\nNote: Tool is registered for this session only. Use persist=true to save to ai-tools.json.";
  }

  const result = ConfigLoader.addTool(config);
  return result.success
    ? "\nTool configuration saved to ai-tools.json."
    : `\nWarning: Failed to save to configuration: ${result.error}`;
}

async function registerCliTool(
  command: string,
  alias: string | undefined,
  description: string | undefined,
  systemPrompt: string | undefined,
  persist: boolean | undefined
): Promise<string> {
  if (typeof command !== "string") {
    return "Error: 'command' must be a string.";
  }

  const params: { command: string; alias?: string; description?: string; systemPrompt?: string } = { command };
  if (alias !== undefined) params.alias = alias;
  if (description !== undefined) params.description = description;
  if (systemPrompt !== undefined) params.systemPrompt = systemPrompt;

  const config = createToolConfig(params);
  const provider = await GenericCliProvider.create(config);

  if (!provider) {
    return `Error: Command '${command}' not found in PATH. Please install it first.`;
  }

  registerProvider(provider);

  const result = formatRegistrationSuccess(provider, command);
  return result + formatPersistMessage(config, persist);
}

// ============================================================================
// Tool Definitions
// ============================================================================

export const pingTool: UnifiedTool = {
  name: "Ping",
  description: "A simple test tool that echoes back a message",
  zodSchema: pingArgsSchema,
  prompt: { description: "Test the connection to the server" },
  category: "simple",
  execute: async ({ message = "pong" }) => `Ping response: ${message}`,
};

const HELP_TEXT = `QwenCode MCP Tool Help:

Available tools:
- ask-qwen: Execute Qwen AI to get responses. Supports model selection.
- Ping: A simple test tool that echoes back a message
- register_cli_tool: Dynamically register a new CLI tool from an available command
- Help: Shows this help text

Usage examples:
- ask-qwen: Ask Qwen AI a question or analyze files
- Ping: Test the connection to the server
- register_cli_tool: Register 'ollama' to add ollama tools
- Help: Show this help information

Configuration:
- CLI args: npx agent-factory-mcp qwen gemini aider
- Config file: ai-tools.json for detailed configuration with system prompts`;

export const helpTool: UnifiedTool = {
  name: "Help",
  description: "Shows the QwenCode help text",
  zodSchema: helpArgsSchema,
  prompt: { description: "Display help information for QwenCode" },
  category: "simple",
  execute: async () => HELP_TEXT,
};

export const registerCliToolTool: UnifiedTool = {
  name: "register_cli_tool",
  description: "Dynamically register a CLI tool as an MCP tool. The tool must be available in PATH.",
  zodSchema: registerToolArgsSchema,
  prompt: { description: "Register a new CLI tool for use during this session" },
  category: "utility" as const,
  execute: async args => {
    try {
      const { command, alias, description, systemPrompt, persist } = args as any;
      return await registerCliTool(command, alias, description, systemPrompt, persist);
    } catch (error) {
      return `Error registering tool: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
};
