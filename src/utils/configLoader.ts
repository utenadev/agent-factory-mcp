import { readFileSync, existsSync } from "node:fs";
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
}

// Re-export types inferred from Zod schema for consistency
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type ToolsConfig = z.infer<typeof ToolsConfigSchema>;
