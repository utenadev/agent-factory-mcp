import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

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
 * Configuration file names to search for, in order of priority.
 */
const CONFIG_FILE_NAMES = [
  "ai-tools.json",
  ".qwencoderc.json",
  "qwencode.config.json",
];

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
  env: z.record(z.string()).optional(),
});

/**
 * Zod schema for validating ToolsConfig.
 */
const ToolsConfigSchema = z.object({
  version: z.string().default("1.0"),
  tools: z.array(ToolConfigSchema),
});

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
 * Configuration loader for AI tools registration.
 *
 * Searches for configuration files in the project root and
 * validates them against the schema.
 */
export class ConfigLoader {
  /**
   * Search for and load the configuration file.
   *
   * @param searchDir - Directory to search from (default: process.cwd())
   * @returns Load result with config, path, and error
   */
  static load(searchDir: string = process.cwd()): ConfigLoadResult {
    const configPath = this.findConfigFile(searchDir);

    if (!configPath) {
      return {
        config: null,
        configPath: null,
        error: null,
      };
    }

    try {
      const rawContent = readFileSync(configPath, "utf-8");
      const parsedJson = JSON.parse(rawContent);

      // Validate against schema
      const validationResult = ToolsConfigSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        const errors = validationResult.error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", ");
        return {
          config: null,
          configPath,
          error: `Invalid configuration: ${errors}`,
        };
      }

      return {
        config: validationResult.data,
        configPath,
        error: null,
      };
    } catch (error) {
      return {
        config: null,
        configPath,
        error: `Failed to load config: ${error}`,
      };
    }
  }

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
   * Get the JSON schema for the configuration file.
   * Useful for IDE autocomplete and validation.
   */
  static getJsonSchema(): object {
    return zodToJsonSchema(ToolsConfigSchema, {
      definitionPath: "tools",
    });
  }

  /**
   * Resolve tool configurations to check availability.
   *
   * @param configs - Tool configurations to resolve
   * @returns Resolved configurations with availability status
   */
  static async resolveTools(
    configs: ToolConfig[]
  ): Promise<ResolvedToolConfig[]> {
    const { GenericCliProvider } = await import(
      "../providers/generic-cli.provider.js"
    );

    const resolved: ResolvedToolConfig[] = [];

    for (const config of configs) {
      // Skip disabled tools
      if (config.enabled === false) {
        continue;
      }

      // Check availability
      const isAvailable =
        await GenericCliProvider.isCommandAvailable(config.command);

      // Determine tool name
      const toolName = config.alias || `ask-${config.command}`;

      resolved.push({
        config,
        toolName,
        isAvailable,
      });
    }

    return resolved;
  }

  /**
   * Save configuration to a JSON file.
   *
   * @param config - The configuration to save
   * @param configPath - Path where to save the config (default: ai-tools.json in cwd)
   * @returns Success status and error message if any
   */
  static save(
    config: ToolsConfig,
    configPath: string = ""
  ): { success: boolean; error: string | null } {
    const targetPath =
      configPath || resolve(process.cwd(), "ai-tools.json");

    try {
      // Ensure directory exists
      const dir = resolve(targetPath, "..");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Write config with pretty formatting
      const content = JSON.stringify(config, null, 2);
      writeFileSync(targetPath, content, "utf-8");

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
  static addTool(
    toolConfig: ToolConfig,
    configPath: string = ""
  ): { success: boolean; error: string | null } {
    const targetPath =
      configPath || this.findConfigFile(process.cwd()) ||
      resolve(process.cwd(), "ai-tools.json");

    try {
      // Load existing config or create new one
      let existingConfig: ToolsConfig;

      if (existsSync(targetPath)) {
        const content = readFileSync(targetPath, "utf-8");
        const parsed = JSON.parse(content);
        existingConfig = ToolsConfigSchema.parse(parsed);
      } else {
        existingConfig = {
          version: "1.0",
          tools: [],
        };
      }

      // Check if tool already exists
      const existingIndex = existingConfig.tools.findIndex(
        (t) => t.command === toolConfig.command
      );

      if (existingIndex >= 0) {
        // Update existing tool
        existingConfig.tools[existingIndex] = toolConfig;
      } else {
        // Add new tool
        existingConfig.tools.push(toolConfig);
      }

      // Save updated config
      return this.save(existingConfig, targetPath);
    } catch (error) {
      return {
        success: false,
        error: `Failed to add tool: ${error}`,
      };
    }
  }
}

// Re-export types inferred from Zod schema for consistency
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type ToolsConfig = z.infer<typeof ToolsConfigSchema>;
