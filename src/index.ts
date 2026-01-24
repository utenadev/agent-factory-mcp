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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  Logger.debug("qwencode-mcp-server listening on stdio");
}
main().catch(error => {
  Logger.error("Fatal error:", error);
  process.exit(1);
});
