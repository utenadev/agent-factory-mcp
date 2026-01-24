/**
 * Defines the type of value an option accepts.
 */
export type OptionType = "string" | "number" | "boolean" | "file";

/**
 * Defines a single CLI option (flag).
 */
export interface CliOption {
  name: string; // The property name for the tool argument (e.g., "model")
  flag: string; // The actual CLI flag (e.g., "-m" or "--model")
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
 * Defines a subcommand of a CLI tool.
 * For example, "run" in "ollama run" or "commit" in "git commit".
 */
export interface SubcommandDefinition {
  /** The subcommand name (e.g., "run", "commit") */
  name: string;

  /** Description of what this subcommand does */
  description: string;

  /** Whether this subcommand takes additional arguments */
  hasArguments?: boolean;
}

/**
 * Tool type classification.
 */
export type ToolType = "simple" | "with-subcommands";

/**
 * Metadata describing a CLI tool's capabilities.
 * This is the blueprint for generating the MCP tool.
 */
export interface CliToolMetadata {
  /** Name of the MCP tool (e.g., "ask-qwen") */
  toolName: string;

  /** Description for the MCP tool */
  description: string;

  /** The base CLI command (e.g., "qwen", "ollama") */
  command: string;

  /** Tool type classification */
  toolType: ToolType;

  /** For subcommand tools: the list of available subcommands */
  subcommands?: SubcommandDefinition[];

  /** Positional argument (usually just one for the prompt) */
  argument?: CliArgument;

  /** Key-value options */
  options: CliOption[];

  /** For subcommand tools: the subcommand this metadata represents (if any) */
  subcommand?: string;
}
