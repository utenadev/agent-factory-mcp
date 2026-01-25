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

  /**
   * Get the metadata for this tool.
   * Adds sessionId option for session management (Gemini-compatible tools).
   */
  getMetadata(): CliToolMetadata {
    // Check if this tool supports session management (has --resume flag)
    const hasResumeFlag = this.#metadata.options.some(
      opt => opt.name === "resume" || opt.flag === "--resume" || opt.flag === "-r"
    );

    if (!hasResumeFlag) {
      return this.#metadata;
    }

    // Add sessionId option for session management
    return {
      ...this.#metadata,
      options: [
        ...this.#metadata.options,
        {
          name: "sessionId",
          flag: "--session-id",
          type: "string",
          description: "Session ID to resume. If not provided, starts a new session.",
          required: false,
        },
      ],
    };
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
   * Handles session management for tools that support --resume flag.
   */
  override async execute(
    args: Record<string, any>,
    onProgress?: (output: string) => void
  ): Promise<string> {
    const effectiveArgs = { ...this.#config.defaultArgs, ...args };

    // Extract sessionId from args (don't pass to CLI as-is)
    const sessionId = effectiveArgs.sessionId;
    delete effectiveArgs.sessionId;

    // Get metadata to check for resume flag
    const metadata = this.getMetadata();
    const hasResumeFlag = metadata.options.some(
      opt => opt.name === "resume" || opt.flag === "--resume" || opt.flag === "-r"
    );

    // Build arguments for the command
    const cmdArgs: string[] = [];
    const prompt = effectiveArgs.prompt;

    // Add --resume flag if sessionId is provided and tool supports it
    if (hasResumeFlag && sessionId) {
      cmdArgs.push("--resume", String(sessionId));
    }

    // Add prompt (as positional argument or via --prompt flag)
    if (prompt !== undefined) {
      // Check if tool uses --prompt flag or positional argument
      const hasPromptFlag = metadata.options.some(
        opt => opt.name === "prompt" || opt.flag === "--prompt" || opt.flag === "-p"
      );
      if (hasPromptFlag) {
        cmdArgs.push("--prompt", String(prompt));
      } else {
        cmdArgs.push(String(prompt));
      }
    }

    // Add other options
    for (const [key, value] of Object.entries(effectiveArgs)) {
      if (value === undefined || value === null || key === "prompt") continue;

      const option = metadata.options.find(opt => opt.name === key);
      if (option) {
        const flag = option.flag || `--${key}`;
        if (option.type === "boolean") {
          if (value === true) cmdArgs.push(flag);
        } else {
          cmdArgs.push(flag, String(value));
        }
      }
    }

    // Execute the command
    return this.executeRaw(metadata.command, cmdArgs, onProgress);
  }
}
