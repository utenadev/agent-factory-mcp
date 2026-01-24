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
  readonly id: string;
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
   * @param config - Tool configuration
   * @returns Provider instance or null if command is not available
   */
  static async create(config: ToolConfig): Promise<GenericCliProvider | null> {
    const { command } = config;

    if (!await this.isCommandAvailable(command)) {
      return null;
    }

    const helpOutput = await this.fetchHelpOutput(command);
    const metadata = this.applyConfigOverrides(
      HelpParser.parse(command, helpOutput),
      config
    );

    return new GenericCliProvider(command, metadata, config, helpOutput);
  }

  /**
   * Check if a command is available in the system PATH.
   */
  static async isCommandAvailable(command: string): Promise<boolean> {
    return (
      await this.tryWhichCheck(command) ||
      await this.tryVersionCheck(command)
    );
  }

  /**
   * Check command availability using which/where.
   */
  private static async tryWhichCheck(command: string): Promise<boolean> {
    try {
      const checkCommand = process.platform === "win32" ? "where" : "which";
      await executeCommand(checkCommand, [command], undefined, 5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check command availability by executing with --version flag.
   */
  private static async tryVersionCheck(command: string): Promise<boolean> {
    try {
      await executeCommand(command, ["--version"], undefined, 3000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch the --help output from a command, with fallback to -h.
   */
  static async fetchHelpOutput(command: string): Promise<string> {
    try {
      return await executeCommand(command, ["--help"], undefined, 10000);
    } catch (error) {
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
    return {
      ...metadata,
      ...this.getStringOverrides(config),
      options: this.applyDefaultArgs(metadata.options, config.defaultArgs),
    };
  }

  /**
   * Extract string-based overrides from config.
   */
  private static getStringOverrides(config: ToolConfig): Partial<CliToolMetadata> {
    const overrides: Partial<CliToolMetadata> = {};
    if (config.alias) overrides.toolName = config.alias;
    if (config.description) overrides.description = config.description;
    if (config.systemPrompt) overrides.systemPrompt = config.systemPrompt;
    return overrides;
  }

  /**
   * Apply default args to options.
   */
  private static applyDefaultArgs(
    options: CliToolMetadata["options"],
    defaultArgs: Record<string, any> | undefined
  ): CliToolMetadata["options"] {
    if (!defaultArgs) return options;

    return options.map((opt) =>
      defaultArgs[opt.name] !== undefined
        ? { ...opt, defaultValue: defaultArgs[opt.name] }
        : opt
    );
  }

  /** Get the metadata for this tool. */
  getMetadata(): CliToolMetadata {
    return this.#metadata;
  }

  /** Get the original configuration. */
  getConfig(): ToolConfig {
    return this.#config;
  }

  /** Get the cached help output (useful for debugging). */
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
    const effectiveArgs = { ...this.#config.defaultArgs, ...args };
    return super.execute(effectiveArgs, onProgress);
  }
}
