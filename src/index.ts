#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
  type ListPromptsRequest,
  type GetPromptRequest,
  type Tool,
  type Prompt,
  type GetPromptResult,
  type CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { Logger } from "./utils/logger.js";
import { ProgressManager } from "./utils/progressManager.js";
import { ConfigLoader } from "./utils/configLoader.js";
import { registerProvider } from "./tools/registry.js";
import { GenericCliProvider } from "./providers/generic-cli.provider.js";
import type { ToolArguments } from "./constants.js";

import {
  getToolDefinitions,
  getPromptDefinitions,
  executeTool,
  toolExists,
  getPromptMessage,
} from "./tools/index.js";

const server = new Server(
  {
    name: "qwencode-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      notifications: {},
      logging: {},
    },
  }
);

// tools/list
server.setRequestHandler(
  ListToolsRequestSchema,
  async (request: ListToolsRequest): Promise<{ tools: Tool[] }> => {
    return { tools: getToolDefinitions() as unknown as Tool[] };
  }
);

// tools/get
server.setRequestHandler(
  CallToolRequestSchema,
  async (request: CallToolRequest): Promise<CallToolResult> => {
    const toolName: string = request.params.name;

    if (toolExists(toolName)) {
      // Type guard for _meta property (MCP extension)
      const paramsWithMeta = request.params as {
        name: string;
        arguments?: ToolArguments;
        _meta?: { progressToken?: string | number };
      };
      const progressToken = paramsWithMeta._meta?.progressToken;

      // Start progress updates if client requested them
      const progressData = ProgressManager.startUpdates(server, toolName, progressToken);

      try {
        const args: ToolArguments = (request.params.arguments as ToolArguments) || {};

        Logger.toolInvocation(toolName, request.params.arguments);

        // Execute the tool using the unified registry with progress callback
        const result = await executeTool(toolName, args, newOutput => {
          ProgressManager.updateOutput(newOutput);
        });

        ProgressManager.stopUpdates(server, progressData, true);

        return {
          content: [{ type: "text", text: result }],
          isError: false,
        };
      } catch (error) {
        ProgressManager.stopUpdates(server, progressData, false);

        Logger.error(`Error in tool '${toolName}':`, error);

        const errorMessage = error instanceof Error ? error.message : String(error);

        return {
          content: [{ type: "text", text: `Error executing ${toolName}: ${errorMessage}` }],
          isError: true,
        };
      }
    } else {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
  }
);

// prompts/list
server.setRequestHandler(
  ListPromptsRequestSchema,
  async (request: ListPromptsRequest): Promise<{ prompts: Prompt[] }> => {
    return { prompts: getPromptDefinitions() as unknown as Prompt[] };
  }
);

// prompts/get
server.setRequestHandler(
  GetPromptRequestSchema,
  async (request: GetPromptRequest): Promise<GetPromptResult> => {
    const promptName = request.params.name;
    const args = request.params.arguments || {};

    const promptMessage = getPromptMessage(promptName, args);

    if (!promptMessage) {
      throw new Error(`Unknown prompt: ${promptName}`);
    }

    return {
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: promptMessage,
          },
        },
      ],
    };
  }
);

// Start the server
async function main() {
  Logger.debug("init qwencode-mcp-server");

  // Load configuration file and register tools
  await initializeFromConfig();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  Logger.debug("qwencode-mcp-server listening on stdio");
}

/**
 * Initialize tools from configuration file.
 *
 * This function:
 * 1. Searches for ai-tools.json or similar config files
 * 2. Loads and validates the configuration
 * 3. For each enabled tool, creates a GenericCliProvider
 * 4. Registers the provider with the tool registry
 */
async function initializeFromConfig(): Promise<void> {
  const loadResult = ConfigLoader.load();

  // No config file found - this is okay, use defaults
  if (!loadResult.configPath) {
    Logger.debug("No configuration file found, using default tools only");
    return;
  }

  // Config file exists but failed to load
  if (loadResult.error) {
    Logger.error(`Failed to load config from ${loadResult.configPath}:`, loadResult.error);
    return;
  }

  Logger.debug(`Loaded configuration from ${loadResult.configPath}`);

  const config = loadResult.config!;
  const tools = config.tools || [];

  if (tools.length === 0) {
    Logger.debug("Configuration contains no tools");
    return;
  }

  // Resolve and register each tool
  const resolved = await ConfigLoader.resolveTools(tools);

  let registeredCount = 0;
  let skippedCount = 0;

  for (const resolvedTool of resolved) {
    const { config, toolName, isAvailable } = resolvedTool;

    // Skip tools that aren't available
    if (!isAvailable) {
      Logger.warn(
        `Tool '${toolName}' (command: ${config.command}) is not available in PATH - skipping`
      );
      skippedCount++;
      continue;
    }

    try {
      // Create provider using GenericCliProvider
      const provider = await GenericCliProvider.create(config);

      if (!provider) {
        Logger.warn(`Failed to create provider for '${toolName}' - skipping`);
        skippedCount++;
        continue;
      }

      // Register the provider
      registerProvider(provider);
      registeredCount++;
      Logger.debug(`Registered tool: ${toolName} (command: ${config.command})`);
    } catch (error) {
      Logger.error(`Failed to register tool '${toolName}':`, error);
      skippedCount++;
    }
  }

  Logger.info(
    `Configuration loaded: ${registeredCount} tools registered, ${skippedCount} skipped`
  );
}
main().catch(error => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
