#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  type CallToolRequest,
  CallToolRequestSchema,
  type CallToolResult,
  type GetPromptRequest,
  GetPromptRequestSchema,
  type GetPromptResult,
  ListPromptsRequestSchema,
  ListToolsRequestSchema,
  type Prompt,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { ToolArguments } from "./constants.js";
import { GenericCliProvider } from "./providers/generic-cli.provider.js";
import {
  executeTool,
  getPromptDefinitions,
  getPromptMessage,
  getToolDefinitions,
  toolExists,
} from "./tools/index.js";
import { registerProvider } from "./tools/registry.js";
import { ConfigLoader } from "./utils/configLoader.js";
import type { ToolConfig } from "./utils/configLoader.js";
import { Logger } from "./utils/logger.js";
import { ProgressManager } from "./utils/progressManager.js";

// ============================================================================
// Server Configuration
// ============================================================================

function createServer(): Server {
  return new Server(
    {
      name: "agent-factory-mcp",
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
}

const server = createServer();

// ============================================================================
// MCP Request Handlers
// ============================================================================

/**
 * Handle tool execution with progress tracking and error handling.
 */
async function handleToolExecution(
  request: CallToolRequest,
  server: Server
): Promise<CallToolResult> {
  const toolName = request.params.name;

  if (!toolExists(toolName)) {
    throw new Error(`Unknown tool: ${toolName}`);
  }

  const paramsWithMeta = request.params as {
    name: string;
    arguments?: ToolArguments;
    _meta?: { progressToken?: string | number };
  };
  const progressToken = paramsWithMeta._meta?.progressToken;
  const progressData = ProgressManager.startUpdates(server, toolName, progressToken);

  try {
    const args: ToolArguments = (request.params.arguments as ToolArguments) || {};
    Logger.toolInvocation(toolName, request.params.arguments);

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
}

/**
 * Handle prompt retrieval with error handling.
 */
async function handlePromptGet(request: GetPromptRequest): Promise<GetPromptResult> {
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

// Register MCP request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: getToolDefinitions() as unknown as Tool[],
}));

server.setRequestHandler(CallToolRequestSchema, (req: CallToolRequest) =>
  handleToolExecution(req, server)
);

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: getPromptDefinitions() as unknown as Prompt[],
}));

server.setRequestHandler(GetPromptRequestSchema, handlePromptGet);

// ============================================================================
// Tool Registration Helpers
// ============================================================================

interface ToolRegistrationResult {
  registeredCount: number;
  skippedCount: number;
}

/**
 * Register a single tool from its configuration.
 * Returns true if successful, false otherwise.
 */
async function registerToolFromConfig(config: ToolConfig, toolName: string): Promise<boolean> {
  try {
    const provider = await GenericCliProvider.create(config);

    if (!provider) {
      Logger.warn(`Command '${config.command}' not found in PATH - skipping`);
      return false;
    }

    registerProvider(provider);
    Logger.debug(`Registered tool: ${toolName} (command: ${config.command})`);
    return true;
  } catch (error) {
    Logger.error(`Failed to register tool '${toolName}':`, error);
    return false;
  }
}

/**
 * Initialize tools from command-line arguments.
 *
 * Allows quick registration like:
 * npx agent-factory-mcp qwen gemini aider
 *
 * Each argument is treated as a CLI command to register.
 */
async function initializeFromCliArgs(): Promise<ToolRegistrationResult> {
  const cliArgs = process.argv.slice(2).filter(arg => !arg.startsWith("-"));

  if (cliArgs.length === 0) {
    return { registeredCount: 0, skippedCount: 0 };
  }

  Logger.debug(`Processing CLI arguments: ${cliArgs.join(", ")}`);

  let registeredCount = 0;
  let skippedCount = 0;

  for (const command of cliArgs) {
    const config = {
      command,
      enabled: true,
      providerType: "cli-auto" as const,
    };

    const success = await registerToolFromConfig(config, command);
    if (success) {
      registeredCount++;
    } else {
      skippedCount++;
    }
  }

  Logger.info(
    `CLI arguments processed: ${registeredCount} tools registered, ${skippedCount} skipped`
  );

  return { registeredCount, skippedCount };
}

/**
 * Initialize tools from configuration file and command-line arguments.
 *
 * This function:
 * 1. Processes CLI arguments for quick tool registration
 * 2. Searches for ai-tools.json or similar config files
 * 3. Loads and validates the configuration
 * 4. For each enabled tool, creates a GenericCliProvider
 * 5. Registers the provider with the tool registry
 */
async function initializeFromConfig(): Promise<void> {
  // Process command-line arguments first
  await initializeFromCliArgs();

  // Load configuration file
  let loadResult = ConfigLoader.load();

  if (!loadResult.configPath) {
    Logger.debug("No configuration file found, running auto-discovery...");
    const discoveryResult = await ConfigLoader.autoDiscoverAndAddTools();
    if (discoveryResult.success) {
      // Reload config after successful discovery
      loadResult = ConfigLoader.load();
    } else {
      Logger.error("Auto-discovery failed:", discoveryResult.error);
    }
  }

  if (loadResult.error) {
    Logger.error(`Failed to load config from ${loadResult.configPath || "config"}:`, loadResult.error);
    return;
  }

  if (!loadResult.config) {
    Logger.debug("No configuration found or loaded");
    return;
  }

  Logger.debug(`Loaded configuration from ${loadResult.configPath || "auto-discovery"}`);

  const config = loadResult.config;
  const tools = config.tools || [];

  if (tools.length === 0) {
    Logger.debug("No tools found in configuration or auto-discovery");
    return;
  }

  await registerToolsFromConfig(tools);
}

/**
 * Register multiple tools from resolved configuration.
 */
async function registerToolsFromConfig(tools: ToolConfig[]): Promise<void> {
  const resolved = await ConfigLoader.resolveTools(tools);

  let registeredCount = 0;
  let skippedCount = 0;

  for (const { config, toolName, isAvailable } of resolved) {
    if (!isAvailable) {
      Logger.warn(
        `Tool '${toolName}' (command: ${config.command}) is not available in PATH - skipping`
      );
      skippedCount++;
      continue;
    }

    const success = await registerToolFromConfig(config, toolName);
    if (success) {
      registeredCount++;
    } else {
      skippedCount++;
    }
  }

  Logger.info(`Configuration loaded: ${registeredCount} tools registered, ${skippedCount} skipped`);
}

// ============================================================================
// Server Startup
// ============================================================================

/**
 * Main entry point - initialize and start the MCP server.
 */
async function main(): Promise<void> {
  Logger.debug("init qwencode-mcp-server");

  await initializeFromConfig();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  Logger.debug("qwencode-mcp-server listening on stdio");
}

main().catch(error => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
