import type { CliToolMetadata } from "../types/cli-metadata.js";
import { executeCommand, type ExecuteCommandOptions } from "../utils/commandExecutor.js";
import {
  ArgumentValidator,
  type ValidationContext,
  validateWithGeminiRequirements,
} from "../utils/argumentValidator.js";

/**
 * Interface for any AI provider.
 */
export interface AIProvider {
  id: string;
  getMetadata(): CliToolMetadata;
  execute(args: Record<string, any>, onProgress?: (output: string) => void): Promise<string>;
}

/**
 * Security configuration for CLI providers.
 */
export interface SecurityConfig {
  /** Whether to enable argument validation */
  enableValidation?: boolean;

  /** Whether to enable audit logging */
  enableAuditLog?: boolean;

  /** Whether to enable Gemini-specific validations (@ syntax, session IDs) */
  enableGeminiValidation?: boolean;

  /** Custom validation context */
  validationContext?: ValidationContext;
}

/**
 * Abstract base class for CLI-based AI providers.
 * Handles the mapping of tool arguments to CLI commands.
 */
export abstract class BaseCliProvider implements AIProvider {
  abstract id: string;

  /**
   * Security configuration for this provider.
   * Subclasses can override to customize security settings.
   */
  protected securityConfig: SecurityConfig = {
    enableValidation: true,
    enableAuditLog: true,
    enableGeminiValidation: false, // Opt-in for Gemini-compatible tools
  };

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

    // 1. Validate arguments if security is enabled
    if (this.securityConfig.enableValidation) {
      this.validateArguments(args, metadata);
    }

    // 2. Handle Options (flags)
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

    // 3. Handle Positional Argument (e.g. prompt)
    if (metadata.argument) {
      const argValue = args[metadata.argument.name];
      if (argValue) {
        cmdArgs.push(String(argValue));
      } else if (metadata.argument.required) {
        throw new Error(`Missing required argument: ${metadata.argument.name}`);
      }
    }

    return this.executeRaw(metadata.command, cmdArgs, onProgress);
  }

  /**
   * Validate arguments based on security configuration.
   * Subclasses can override for custom validation logic.
   */
  protected validateArguments(
    args: Record<string, any>,
    metadata: CliToolMetadata
  ): void {
    const validator = new ArgumentValidator();
    const context = this.securityConfig.validationContext || {
      argumentType: "generic",
    };

    // Convert args object to string array for validation
    const argStrings = this.argsToStringArray(args, metadata);

    // Use Gemini validation if enabled
    if (this.securityConfig.enableGeminiValidation) {
      validateWithGeminiRequirements(argStrings, context);
    } else {
      validator.validate(argStrings, context);
    }
  }

  /**
   * Convert arguments object to string array for validation.
   */
  protected argsToStringArray(
    args: Record<string, any>,
    metadata: CliToolMetadata
  ): string[] {
    const argStrings: string[] = [];

    // Add option values
    for (const option of metadata.options) {
      const value = args[option.name];
      if (value !== undefined && value !== null) {
        if (option.type === "boolean") {
          if (value === true) {
            argStrings.push(option.flag);
          }
        } else {
          argStrings.push(option.flag);
          argStrings.push(String(value));
        }
      }
    }

    // Add argument value
    if (metadata.argument) {
      const value = args[metadata.argument.name];
      if (value !== undefined && value !== null) {
        argStrings.push(String(value));
      }
    }

    return argStrings;
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
    const options: ExecuteCommandOptions = {};

    if (onProgress) {
      options.onProgress = onProgress;
    }
    if (env) {
      options.env = env;
    }
    if (this.securityConfig.validationContext) {
      options.validationContext = this.securityConfig.validationContext;
    }
    if (this.securityConfig.enableAuditLog !== undefined) {
      options.enableAuditLog = this.securityConfig.enableAuditLog;
    }
    options.enableValidation = false; // Already validated in execute()

    return executeCommand(command, args, options);
  }
}
