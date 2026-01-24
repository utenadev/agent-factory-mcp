import { BaseCliProvider } from "./base-cli.provider.js";
import { HelpParser } from "../parsers/help-parser.js";
import { executeCommand } from "../utils/commandExecutor.js";
import type { CliToolMetadata } from "../types/cli-metadata.js";
import type { ToolConfig } from "../utils/configLoader.js";

/**
 * Generic CLI provider that uses HelpParser to automatically generate
 * metadata from a command's --help output.
 *
 * This enables zero-code registration of CLI tools as MCP tools.
 */
export class GenericCliProvider extends BaseCliProvider {
  id: string;
  #metadata: CliToolMetadata;
  #config: ToolConfig;
  #helpOutput: string | null = null;

  private constructor(
    command: string,
    metadata: CliToolMetadata,
    config: ToolConfig,
    helpOutput: string | null = null
  ) {
    super();
    this.id = `generic-${command}`;
    this.#metadata = metadata;
    this.#config = config;
    this.#helpOutput = helpOutput;
  }

  /**
   * Create a GenericCliProvider by parsing the command's --help output.
   *
   * @param config - Tool configuration
   * @returns Provider instance or null if command is not available
   */
  static async create(config: ToolConfig): Promise<GenericCliProvider | null> {
    const { command } = config;

    // Check if command is available
    const isAvailable = await GenericCliProvider.isCommandAvailable(command);
    if (!isAvailable) {
      return null;
    }

    // Fetch --help output
    const helpOutput = await GenericCliProvider.fetchHelpOutput(command);

    // Parse help output into metadata
    const metadata = HelpParser.parse(command, helpOutput);

    // Apply configuration overrides
    const overriddenMetadata = GenericCliProvider.applyConfigOverrides(
      metadata,
      config
    );

    return new GenericCliProvider(
      command,
      overriddenMetadata,
      config,
      helpOutput
    );
  }

  /**
   * Check if a command is available in the system PATH.
   */
  static async isCommandAvailable(command: string): Promise<boolean> {
    try {
      // Use command -v on Unix/Linux/macOS or where on Windows
      const checkCommand = process.platform === "win32" ? "where" : "command";
      await executeCommand(checkCommand, ["-v", command], undefined, 5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch the --help output from a command.
   */
  static async fetchHelpOutput(command: string): Promise<string> {
    try {
      return await executeCommand(command, ["--help"], undefined, 10000);
    } catch (error) {
      // If --help fails, try -h
      try {
        return await executeCommand(command, ["-h"], undefined, 10000);
      } catch {
        throw new Error(
          `Failed to fetch help output for '${command}': ${error}`
        );
      }
    }
  }

  /**
   * Apply configuration overrides to parsed metadata.
   */
  private static applyConfigOverrides(
    metadata: CliToolMetadata,
    config: ToolConfig
  ): CliToolMetadata {
    const overridden: CliToolMetadata = { ...metadata };

    // Override tool name with alias
    if (config.alias) {
      overridden.toolName = config.alias;
    }

    // Override description
    if (config.description) {
      overridden.description = config.description;
    }

    // Apply default args as option defaults
    if (config.defaultArgs) {
      overridden.options = overridden.options.map((opt) => {
        const defaultValue = config.defaultArgs![opt.name];
        if (defaultValue !== undefined) {
          return { ...opt, defaultValue };
        }
        return opt;
      });
    }

    return overridden;
  }

  /**
   * Get the metadata for this tool.
   */
  getMetadata(): CliToolMetadata {
    return this.#metadata;
  }

  /**
   * Get the original configuration.
   */
  getConfig(): ToolConfig {
    return this.#config;
  }

  /**
   * Get the cached help output (useful for debugging).
   */
  getHelpOutput(): string | null {
    return this.#helpOutput;
  }

  /**
   * Execute the CLI command with environment variables from config.
   */
  override async execute(
    args: Record<string, any>,
    onProgress?: (output: string) => void
  ): Promise<string> {
    // Apply default args from config
    const effectiveArgs = { ...this.#config.defaultArgs, ...args };

    // For now, we use the base execute method
    // In the future, we could inject environment variables here
    return super.execute(effectiveArgs, onProgress);
  }
}
