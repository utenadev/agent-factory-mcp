import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// ============================================================================
// Constants
// ============================================================================

/**
 * Configuration file names to search for, in order of priority.
 */
const CONFIG_FILE_NAMES = ["ai-tools.json", ".qwencoderc.json", "qwencode.config.json"] as const;

/**
 * Default configuration version.
 */
const DEFAULT_VERSION = "1.0";

/**
 * Default configuration filename.
 */
const DEFAULT_CONFIG_FILENAME = "ai-tools.json";

// ============================================================================
// Zod Schemas
// ============================================================================

/**
 * Zod schema for validating ToolConfig.
 */
const ToolConfigSchema = z.object({
  command: z.string(),
  enabled: z.boolean().optional().default(true),
  providerType: z.enum(["cli-auto", "custom"]).optional().default("cli-auto"),
  parserStrategy: z.enum(["gnu", "go", "custom"]).optional(),
  subcommands: z.array(z.string()).optional(),
  defaultArgs: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  alias: z.string().optional(),
  description: z.string().optional(),
  systemPrompt: z.string().optional(),
  version: z.string().optional(),
  env: z.record(z.string()).optional(),
});

/**
 * Zod schema for validating ToolsConfig.
 */
const ToolsConfigSchema = z.object({
  version: z.string().default(DEFAULT_VERSION),
  tools: z.array(ToolConfigSchema),
});

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Resolved tool configuration with availability status.
 */
export interface ResolvedToolConfig {
  /** Original configuration */
  config: ToolConfig;
  /** Resolved tool name (alias or ask-<command>) */
  toolName: string;
  /** Whether the command is available in PATH */
  isAvailable: boolean;
}

/**
 * Configuration loader result.
 */
export interface ConfigLoadResult {
  /** The loaded configuration */
  config: ToolsConfig | null;
  /** Path to the config file that was loaded */
  configPath: string | null;
  /** Error message if loading failed */
  error: string | null;
}

/**
 * Operation result with success status and optional error message.
 */
type OperationResult = { success: boolean; error: string | null };

// Re-export types inferred from Zod schema for consistency
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type ToolsConfig = z.infer<typeof ToolsConfigSchema>;

// ============================================================================
// ConfigLoader Class
// ============================================================================

/**
 * Configuration loader for AI tools registration.
 *
 * Searches for configuration files in the project root and
 * validates them against the schema.
 */
export class ConfigLoader {
  // ========================================================================
  // File Operation Helpers
  // ========================================================================

  /**
   * Read and parse a JSON file.
   */
  private static readJsonFile(filePath: string): unknown {
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  }

  /**
   * Write an object to a JSON file with pretty formatting.
   * Creates parent directories if they don't exist.
   */
  private static writeJsonFile(filePath: string, data: object): void {
    const dir = resolve(filePath, "..");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const content = JSON.stringify(data, null, 2);
    writeFileSync(filePath, content, "utf-8");
  }

  /**
   * Format Zod validation errors into a readable string.
   */
  private static formatValidationErrors(error: z.ZodError): string {
    return error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ");
  }

  /**
   * Create an empty configuration object.
   */
  private static createEmptyConfig(): ToolsConfig {
    return {
      version: DEFAULT_VERSION,
      tools: [],
    };
  }

  // ========================================================================
  // Configuration Discovery
  // ========================================================================

  /**
   * Find the first existing configuration file in the search directory.
   */
  static findConfigFile(searchDir: string = process.cwd()): string | null {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = resolve(searchDir, fileName);
      if (existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  /**
   * Resolve the target config path, using existing config or default.
   */
  private static resolveTargetPath(customPath: string): string {
    if (customPath) return customPath;
    return this.findConfigFile(process.cwd()) || resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);
  }

  // ========================================================================
  // Configuration Loading
  // ========================================================================

  /**
   * Search for and load the configuration file.
   *
   * @param searchDir - Directory to search from (default: process.cwd())
   * @returns Load result with config, path, and error
   */
  static load(searchDir: string = process.cwd()): ConfigLoadResult {
    const configPath = this.findConfigFile(searchDir);

    if (!configPath) {
      return { config: null, configPath: null, error: null };
    }

    try {
      const parsedJson = this.readJsonFile(configPath);
      const validationResult = ToolsConfigSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        return {
          config: null,
          configPath,
          error: `Invalid configuration: ${this.formatValidationErrors(validationResult.error)}`,
        };
      }

      return { config: validationResult.data, configPath, error: null };
    } catch (error) {
      return {
        config: null,
        configPath,
        error: `Failed to load config: ${error}`,
      };
    }
  }

  /**
   * Load configuration from a specific path with validation.
   * Returns the config or creates a new one if the file doesn't exist.
   */
  private static loadOrCreate(filePath: string): ToolsConfig {
    if (!existsSync(filePath)) {
      return this.createEmptyConfig();
    }

    const parsed = this.readJsonFile(filePath);
    return ToolsConfigSchema.parse(parsed);
  }

  // ========================================================================
  // Configuration Persistence
  // ========================================================================

  /**
   * Save configuration to a JSON file.
   *
   * @param config - The configuration to save
   * @param configPath - Path where to save the config (default: ai-tools.json in cwd)
   * @returns Success status and error message if any
   */
  static save(config: ToolsConfig, configPath = ""): OperationResult {
    const targetPath = configPath || resolve(process.cwd(), DEFAULT_CONFIG_FILENAME);

    try {
      this.writeJsonFile(targetPath, config);
      return { success: true, error: null };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save config: ${error}`,
      };
    }
  }

  /**
   * Add a tool configuration to an existing config file.
   *
   * @param toolConfig - The tool configuration to add
   * @param configPath - Path to the config file (default: ai-tools.json)
   * @returns Success status and error message if any
   */
  static addTool(toolConfig: ToolConfig, configPath = ""): OperationResult {
    const targetPath = this.resolveTargetPath(configPath);

    try {
      const existingConfig = this.loadOrCreate(targetPath);
      this.upsertTool(existingConfig, toolConfig);
      return this.save(existingConfig, targetPath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to add tool: ${error}`,
      };
    }
  }

  /**
   * Add or update a tool in the configuration.
   */
  private static upsertTool(config: ToolsConfig, toolConfig: ToolConfig): void {
    const existingIndex = config.tools.findIndex(t => t.command === toolConfig.command);

    if (existingIndex >= 0) {
      config.tools[existingIndex] = toolConfig;
    } else {
      config.tools.push(toolConfig);
    }
  }

  // ========================================================================
  // Tool Resolution
  // ========================================================================

  /**
   * Resolve tool configurations to check availability.
   *
   * @param configs - Tool configurations to resolve
   * @returns Resolved configurations with availability status
   */
  static async resolveTools(configs: ToolConfig[]): Promise<ResolvedToolConfig[]> {
    const { GenericCliProvider } = await import("../providers/generic-cli.provider.js");

    const resolved: ResolvedToolConfig[] = [];

    for (const config of configs) {
      if (config.enabled === false) continue;

      const isAvailable = await GenericCliProvider.isCommandAvailable(config.command);
      const toolName = config.alias || `ask-${config.command}`;

      resolved.push({ config, toolName, isAvailable });
    }

    return resolved;
  }

  /**
   * Auto-discover compatible CLI tools from PATH and add them to the configuration.
   *
   * @param configPath - Path to the config file (default: ai-tools.json)
   * @returns Success status and error message if any
   */
  static async autoDiscoverAndAddTools(configPath = ""): Promise<OperationResult> {
    const { discoverCompatibleTools } = await import("./autoDiscovery.js");
    const targetPath = this.resolveTargetPath(configPath);

    try {
      const existingConfig = this.loadOrCreate(targetPath);
      const discoveredTools = await discoverCompatibleTools();

      for (const metadata of discoveredTools) {
        const toolConfig: ToolConfig = {
          command: metadata.command,
          alias: metadata.toolName,
          description: metadata.description,
          providerType: "cli-auto",
          enabled: true,
        };
        if (metadata.version) {
          toolConfig.version = metadata.version;
        }
        this.upsertTool(existingConfig, toolConfig);
      }

      return this.save(existingConfig, targetPath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to auto-discover tools: ${error}`,
      };
    }
  }

  // ========================================================================
  // Schema Export
  // ========================================================================

  /**
   * Get the JSON schema for the configuration file.
   * Useful for IDE autocomplete and validation.
   */
  static getJsonSchema(): object {
    return zodToJsonSchema(ToolsConfigSchema, {
      definitionPath: "tools",
    } as any);
  }
}
