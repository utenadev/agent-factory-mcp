import type { Tool, Prompt } from "@modelcontextprotocol/sdk/types.js";

import type { ToolArguments } from "../constants.js";
import { type ZodTypeAny, ZodError } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { AIProvider } from "../providers/base-cli.provider.js";
import { DynamicToolFactory } from "./dynamic-tool-factory.js";

export interface UnifiedTool {
  name: string;
  description: string;
  zodSchema: ZodTypeAny;

  prompt?: {
    description: string;
    arguments?: Array<{
      name: string;
      description: string;
      required: boolean;
    }>;
  };

  execute: (args: ToolArguments, onProgress?: (newOutput: string) => void) => Promise<string>;
  category?: "simple" | "ai" | "utility";
}

export const toolRegistry: UnifiedTool[] = [];

export function registerProvider(provider: AIProvider): void {
  const tool = DynamicToolFactory.createTool(provider);
  toolRegistry.push(tool);
}

export function toolExists(toolName: string): boolean {
  return toolRegistry.some(t => t.name === toolName);
}

function findTool(toolName: string): UnifiedTool {
  const tool = toolRegistry.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Unknown tool: ${toolName}`);
  }
  return tool;
}

function convertZodToJsonSchema(zodSchema: ZodTypeAny, toolName: string) {
  const raw = zodToJsonSchema(zodSchema, toolName) as any;
  const def = raw.definitions?.[toolName] ?? raw;
  return {
    properties: def.properties || {},
    required: def.required || [],
  };
}

export function getToolDefinitions(): Tool[] {
  return toolRegistry.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      ...convertZodToJsonSchema(tool.zodSchema, tool.name),
    },
  }));
}

function extractPromptArguments(
  zodSchema: ZodTypeAny
): Array<{ name: string; description: string; required: boolean }> {
  const jsonSchema = zodToJsonSchema(zodSchema) as any;
  const properties = jsonSchema.properties || {};
  const required = new Set(jsonSchema.required || []);

  return Object.entries(properties).map(([name, prop]: [string, any]) => ({
    name,
    description: prop.description || `${name} parameter`,
    required: required.has(name),
  }));
}

export function getPromptDefinitions(): Prompt[] {
  return toolRegistry
    .filter(tool => tool.prompt)
    .map(tool => ({
      name: tool.name,
      description: tool.prompt!.description,
      arguments: tool.prompt!.arguments || extractPromptArguments(tool.zodSchema),
    }));
}

function formatZodError(error: ZodError, toolName: string): string {
  const issues = error.issues
    .map(issue => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
  return `Invalid arguments for ${toolName}: ${issues}`;
}

export async function executeTool(
  toolName: string,
  args: ToolArguments,
  onProgress?: (newOutput: string) => void
): Promise<string> {
  const tool = findTool(toolName);

  try {
    const validatedArgs = tool.zodSchema.parse(args);
    return tool.execute(validatedArgs, onProgress);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(formatZodError(error, toolName));
    }
    throw error;
  }
}

function isValidValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== false;
}

function formatArgument(key: string, value: unknown): string | null {
  if (!isValidValue(value)) return null;

  if (typeof value === "boolean") {
    return `[${key}]`;
  }
  return `(${key}: ${value})`;
}

function buildParameterString(args: Record<string, any>): string {
  const params: string[] = [];

  if (args.prompt) {
    params.push(args.prompt);
  }

  Object.entries(args)
    .filter(([key]) => key !== "prompt")
    .map(([key, value]) => formatArgument(key, value))
    .filter((param): param is string => param !== null)
    .forEach(param => params.push(param));

  return params.join(" ");
}

export function getPromptMessage(toolName: string, args: Record<string, any>): string {
  const tool = findTool(toolName);

  if (!tool.prompt) {
    throw new Error(`No prompt defined for tool: ${toolName}`);
  }

  const paramStr = buildParameterString(args);
  return `Use the ${toolName} tool${paramStr ? ": " + paramStr : ""}`;
}
