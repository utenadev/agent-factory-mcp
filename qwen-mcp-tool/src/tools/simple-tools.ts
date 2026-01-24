import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { STATUS_MESSAGES } from '../constants.js';

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
  category: 'simple',
  execute: async (args) => {
    const message = args.message || "pong";
    return `Ping response: ${message}`;
  }
};

const helpArgsSchema = z.object({
  // No arguments needed for help
});

export const helpTool: UnifiedTool = {
  name: "Help",
  description: "Shows the Qwen CLI help text",
  zodSchema: helpArgsSchema,
  prompt: {
    description: "Display help information for Qwen CLI",
  },
  category: 'simple',
  execute: async () => {
    return `Qwen MCP Tool Help:
    
Available tools:
- ask-qwen: Execute Qwen AI to get responses. Supports model selection.
- Ping: A simple test tool that echoes back a message
- Help: Shows this help text

Usage examples:
- ask-qwen: Ask Qwen AI a question or analyze files
- Ping: Test the connection to the server
- Help: Show this help information`;
  }
};