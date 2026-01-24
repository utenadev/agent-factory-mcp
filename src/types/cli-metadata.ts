import { z } from 'zod';

/**
 * Defines the type of value an option accepts.
 */
export type OptionType = 'string' | 'number' | 'boolean';

/**
 * Defines a single CLI option (flag).
 */
export interface CliOption {
  name: string;           // The property name for the tool argument (e.g., "model")
  flag: string;           // The actual CLI flag (e.g., "-m" or "--model")
  type: OptionType;
  description: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  choices?: (string | number)[]; // Enum-like constraints
}

/**
 * Defines the positional arguments for the CLI.
 * For most AI tools, this is the prompt itself.
 */
export interface CliArgument {
  name: string;
  description: string;
  required?: boolean;
  type: OptionType;
}

/**
 * Metadata describing a CLI tool's capabilities.
 * This is the blueprint for generating the MCP tool.
 */
export interface CliToolMetadata {
  toolName: string;       // Name of the MCP tool (e.g., "ask-qwen")
  description: string;    // Description for the MCP tool
  command: string;        // The base CLI command (e.g., "qwen")
  
  // Positional argument (usually just one for the prompt)
  argument?: CliArgument;
  
  // Key-value options
  options: CliOption[];
}
