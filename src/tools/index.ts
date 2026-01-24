// Tool Registry Index - Registers all tools
import { toolRegistry } from './registry.js';
import { askQwenTool } from './ask-qwen.tool.js';
import { pingTool, helpTool } from './simple-tools.js';

toolRegistry.push(
  askQwenTool,
  pingTool,
  helpTool
);

export * from './registry.js';