import type { CliToolMetadata } from "../types/cli-metadata.js";
import { executeCommand } from "../utils/commandExecutor.js";

/**
 * Interface for any AI provider.
 */
export interface AIProvider {
  id: string;
  getMetadata(): CliToolMetadata;
  execute(args: Record<string, any>, onProgress?: (output: string) => void): Promise<string>;
}

/**
 * Abstract base class for CLI-based AI providers.
 * Handles the mapping of tool arguments to CLI commands.
 */
export abstract class BaseCliProvider implements AIProvider {
  abstract id: string;

  /**
   * Returns the metadata defining this tool's capabilities.
   * In Phase 1/2, this is manually defined. In later phases, it could be generated.
   */
  abstract getMetadata(): CliToolMetadata;

  /**
   * Executes the CLI command based on the provided arguments.
   * @param args Dictionary of arguments passed from the MCP tool
   * @param onProgress Callback for streaming output
   */
  async execute(args: Record<string, any>, onProgress?: (output: string) => void): Promise<string> {
    const metadata = this.getMetadata();
    const cmdArgs: string[] = [];

    // 1. Handle Options (flags)
    for (const option of metadata.options) {
      const value = args[option.name];

      // If value is provided or there is a default
      if (value !== undefined || option.defaultValue !== undefined) {
        const finalValue = value !== undefined ? value : option.defaultValue;

        // Boolean flags (e.g. --verbose) usually don't take a value
        if (option.type === "boolean") {
          if (finalValue === true) {
            cmdArgs.push(option.flag);
          }
        } else {
          // Key-Value flags (e.g. -m qwen-max)
          cmdArgs.push(option.flag);
          cmdArgs.push(String(finalValue));
        }
      }
    }

    // 2. Handle Positional Argument (e.g. prompt)
    if (metadata.argument) {
      const argValue = args[metadata.argument.name];
      if (argValue) {
        // Handle @file syntax specific logic if necessary here,
        // or assume the CLI handles it (or the tool wrapper handles quoting).
        // For now, we apply basic quoting if it contains spaces or specific chars,
        // though executeCommand/spawn usually handles distinct args safely.

        // Note: The previous Qwen implementation manually checked for '@' and wrapped in quotes.
        // We might want to abstract that "pre-processing" logic if it's common,
        // but spawn usually handles arguments correctly without manual quoting unless shell=true.
        // However, looking at qwenExecutor.ts, it was doing manual quoting.
        // We will pass it as a raw string to spawn, which is safer.
        cmdArgs.push(String(argValue));
      } else if (metadata.argument.required) {
        throw new Error(`Missing required argument: ${metadata.argument.name}`);
      }
    }

    return this.executeRaw(metadata.command, cmdArgs, onProgress);
  }

  /**
   * Protected method to actually run the command.
   * Can be overridden if custom execution logic is needed.
   */
  protected async executeRaw(
    command: string,
    args: string[],
    onProgress?: (output: string) => void,
    env?: Record<string, string>
  ): Promise<string> {
    return executeCommand(command, args, onProgress, undefined, env);
  }
}
