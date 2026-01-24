// Tool Registry Index - Registers all tools
import { toolRegistry, registerProvider } from "./registry.js";
// import { askQwenTool } from './ask-qwen.tool.js';
import { pingTool, helpTool } from "./simple-tools.js";
import { QwenProvider } from "../providers/qwen.provider.js";

// Register Static Tools
toolRegistry.push(
  // askQwenTool, // Replaced by QwenProvider
  pingTool,
  helpTool
);

// Register Dynamic Providers
// This generates the 'ask-qwen' tool from the QwenProvider metadata
registerProvider(new QwenProvider());

export * from "./registry.js";
