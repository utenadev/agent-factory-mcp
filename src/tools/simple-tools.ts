import { z } from "zod";
import type { UnifiedTool } from "./registry.js";
import { GenericCliProvider } from "../providers/generic-cli.provider.js";
import { registerProvider } from "./registry.js";
import { ConfigLoader } from "../utils/configLoader.js";
import type { ToolConfig } from "../utils/configLoader.js";

const pingArgsSchema = z.object({
  message: z.string().optional().describe("Optional message to echo back"),
});

export const pingTool: UnifiedTool = {
  name: "Ping",
  description: "A simple test tool that echoes back a message",
  zodSchema: pingArgsSchema,
  prompt: {
    description: "Test the connection to the server",
  },
  category: "simple",
  execute: async args => {
    const message = args.message || "pong";
    return `Ping response: ${message}`;
  },
};

const helpArgsSchema = z.object({
  // No arguments needed for help
});

export const helpTool: UnifiedTool = {
  name: "Help",
  description: "Shows the QwenCode help text",
  zodSchema: helpArgsSchema,
  prompt: {
    description: "Display help information for QwenCode",
  },
  category: "simple",
  execute: async () => {
    return `QwenCode MCP Tool Help:

Available tools:
- ask-qwen: Execute Qwen AI to get responses. Supports model selection.
- Ping: A simple test tool that echoes back a message
- register_cli_tool: Dynamically register a new CLI tool from an available command
- Help: Shows this help text

Usage examples:
- ask-qwen: Ask Qwen AI a question or analyze files
- Ping: Test the connection to the server
- register_cli_tool: Register 'ollama' to add ollama tools
- Help: Show this help information`;
  },
};

const registerToolArgsSchema = z.object({
  command: z.string().describe("The CLI command to register (e.g., 'ollama', 'git')"),
  alias: z.string().optional().describe("Optional alias for the tool (defaults to 'ask-{command}')"),
  description: z.string().optional().describe("Custom description for the tool"),
  persist: z.boolean().optional().describe("Whether to save to ai-tools.json (default: false)"),
});

export const registerCliToolTool: UnifiedTool = {
  name: "register_cli_tool",
  description: "Dynamically register a CLI tool as an MCP tool. The tool must be available in PATH.",
  zodSchema: registerToolArgsSchema,
  prompt: {
    description: "Register a new CLI tool for use during this session",
  },
  category: "utility" as const,
  execute: async args => {
    const { command, alias, description, persist } = args;

    try {
      // Validate command is a string
      if (typeof command !== "string") {
        return `Error: 'command' must be a string.`;
      }

      // Create a basic tool config with required providerType
      const toolConfig: ToolConfig = {
        command,
        enabled: true,
        providerType: "cli-auto",
      };

      // Add optional properties only if they have values
      if (alias !== undefined && typeof alias === "string") {
        toolConfig.alias = alias;
      }
      if (description !== undefined && typeof description === "string") {
        toolConfig.description = description;
      }

      // Create the provider
      const provider = await GenericCliProvider.create(toolConfig);

      if (!provider) {
        return `Error: Command '${command}' not found in PATH. Please install it first.`;
      }

      // Register the tool
      registerProvider(provider);

      const metadata = provider.getMetadata();
      const toolName = metadata.toolName;

      let result = `Successfully registered tool: ${toolName}\n`;
      result += `Command: ${command}\n`;

      if (metadata.subcommands && metadata.subcommands.length > 0) {
        result += `Subcommands: ${metadata.subcommands.map(sc => sc.name).join(", ")}\n`;
      }

      // Persist to config if requested
      if (persist) {
        const saveResult = ConfigLoader.addTool(toolConfig);
        if (saveResult.success) {
          result += `\nTool configuration saved to ai-tools.json.`;
        } else {
          result += `\nWarning: Failed to save to configuration: ${saveResult.error}`;
        }
      } else {
        result += `\nNote: Tool is registered for this session only. Use persist=true to save to ai-tools.json.`;
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `Error registering tool: ${errorMessage}`;
    }
  },
};
