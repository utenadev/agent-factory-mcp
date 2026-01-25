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
   * Apply default args to options, injecting missing ones from config.
   */
  private static applyDefaultArgs(
    options: CliToolMetadata["options"],
    defaultArgs: Record<string, any> | undefined
  ): CliToolMetadata["options"] {
    if (!defaultArgs) return options;

    // Update existing options with default values
    const updatedOptions = options.map((opt) =>
      defaultArgs[opt.name] !== undefined
        ? { ...opt, defaultValue: defaultArgs[opt.name] }
        : opt
    );

    // Inject missing options from defaultArgs
    const existingNames = new Set(updatedOptions.map((o) => o.name));
    for (const [key, value] of Object.entries(defaultArgs)) {
      if (!existingNames.has(key)) {
        updatedOptions.push({
          name: key,
          flag: key.length === 1 ? `-${key}` : `--${key}`,
          type: typeof value === "boolean" ? "boolean" : typeof value === "number" ? "number" : "string",
          description: `Option injected from config (default: ${value})`,
          defaultValue: value,
          required: false,
        });
      }
    }

    return updatedOptions;
  }

  /**
   * Get the metadata for this tool.
   * Adds sessionId option for session management (Gemini/OpenCode-compatible tools).
   */
  getMetadata(): CliToolMetadata {
    if (!this.#hasSessionManagement()) {
      return this.#metadata;
    }

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
   * Handles session management for tools that support --resume or --session flag.
   */
  override async execute(
    args: Record<string, any>,
    onProgress?: (output: string) => void
  ): Promise<string> {
    const effectiveArgs = { ...this.#config.defaultArgs, ...args };
    const metadata = this.getMetadata();
    const cmdArgs = this.#buildCommandArgs(metadata, effectiveArgs);

    const rawOutput = await this.executeRaw(metadata.command, cmdArgs, onProgress);

    return effectiveArgs.format === "json"
      ? this.parseJsonOutput(rawOutput)
      : rawOutput;
  }

  /**
   * Check if this tool supports session management.
   */
  #hasSessionManagement(): boolean {
    return this.#metadata.options.some(opt =>
      opt.name === "resume" || opt.flag === "--resume" || opt.flag === "-r" ||
      opt.name === "session" || opt.flag === "--session" || opt.flag === "-s"
    );
  }

  /**
   * Build command arguments from metadata and effective args.
   * Handles tool-specific subcommands and session management.
   */
  #buildCommandArgs(
    metadata: CliToolMetadata,
    effectiveArgs: Record<string, any>
  ): string[] {
    const cmdArgs: string[] = [];
    const { sessionId, prompt, ...otherArgs } = effectiveArgs;

    // Add tool-specific subcommand (e.g., opencode needs 'run')
    if (metadata.command === "opencode") {
      cmdArgs.push("run");
    }

    // Add session management flag
    this.#addSessionFlag(cmdArgs, metadata, sessionId);

    // Add prompt
    this.#addPrompt(cmdArgs, metadata, prompt);

    // Add other options
    for (const [key, value] of Object.entries(otherArgs)) {
      if (value == null) continue;

      const option = metadata.options.find(opt => opt.name === key);
      if (!option) continue;

      const flag = option.flag || `--${key}`;
      if (option.type === "boolean") {
        if (value === true) cmdArgs.push(flag);
      } else {
        cmdArgs.push(flag, String(value));
      }
    }

    return cmdArgs;
  }

  /**
   * Add session management flag to command args.
   */
  #addSessionFlag(
    cmdArgs: string[],
    metadata: CliToolMetadata,
    sessionId: string | undefined
  ): void {
    if (!sessionId) return;

    // Special case: "latest" maps to --continue for tools that support it
    if (sessionId === "latest" && this.#hasFlag(metadata, "continue")) {
      cmdArgs.push("--continue");
      return;
    }

    // Use --session flag (opencode)
    if (this.#hasFlag(metadata, "session")) {
      cmdArgs.push("--session", sessionId);
      return;
    }

    // Use --resume flag (gemini)
    if (this.#hasFlag(metadata, "resume")) {
      cmdArgs.push("--resume", sessionId);
    }
  }

  /**
   * Add prompt to command args.
   * Uses --prompt flag if available, otherwise positional argument.
   */
  #addPrompt(
    cmdArgs: string[],
    metadata: CliToolMetadata,
    prompt: string | undefined
  ): void {
    if (prompt === undefined) return;

    const hasPromptFlag = this.#hasFlag(metadata, "prompt");
    const isOpenCode = metadata.command === "opencode";

    if (hasPromptFlag && !isOpenCode) {
      cmdArgs.push("--prompt", prompt);
    } else {
      cmdArgs.push(prompt);
    }
  }

  /**
   * Check if metadata has a specific flag by name or flag property.
   */
  #hasFlag(metadata: CliToolMetadata, flagName: string): boolean {
    return metadata.options.some(opt =>
      opt.name === flagName ||
      opt.flag === `--${flagName}` ||
      opt.flag === `-${flagName}`
    );
  }

  /**
   * Parse JSON output from tools like opencode.
   * Extracts text content from JSON events.
   */
  private parseJsonOutput(rawOutput: string): string {
    const lines = rawOutput.split("\n").filter(line => line.trim().length > 0);
    const textParts: string[] = [];

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === "text" && event.part?.text) {
          textParts.push(event.part.text);
        }
      } catch {
        // Skip non-JSON lines
      }
    }

    return textParts.length > 0 ? textParts.join("\n") : rawOutput;
  }
}
