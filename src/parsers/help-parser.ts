import type { CliToolMetadata, CliOption, CliArgument, OptionType } from "../types/cli-metadata.js";

/**
 * Parser options for customizing help output parsing.
 */
export interface ParserOptions {
  /** Custom regex pattern for matching option lines */
  optionRegex?: RegExp;
  /** Custom regex pattern for matching usage lines */
  usageRegex?: RegExp;
  /** Custom regex pattern for matching positional argument lines */
  positionalRegex?: RegExp;
}

/**
 * Parsed option data before conversion to CliOption.
 */
interface ParsedOption {
  shortFlag: string | undefined;
  longFlag: string;
  description: string | undefined;
  type: OptionType;
  defaultValue: string | number | boolean | undefined;
  choices: (string | number)[] | undefined;
  deprecated: boolean | undefined;
}

/**
 * Result of parsing help output.
 */
interface ParseResult {
  description: string;
  positionals: CliArgument[];
  options: ParsedOption[];
  hasSubcommands: boolean;
}

/**
 * HelpParser - Parses CLI help output into structured CliToolMetadata.
 *
 * Supports commander.js style help output format:
 * - Short flags: -m, --model
 * - Type hints: [boolean], [string], [number], [array]
 * - Choices: [choices: "a", "b", "c"]
 * - Defaults: [default: false]
 * - Deprecated: [deprecated: ...]
 */
export class HelpParser {
  /**
   * Default regex for commander.js style options.
   * Matches: -d, --debug     Run in debug mode?  [boolean] [default: false]
   * Also matches indented options with 6 spaces (commander.js default format)
   */
  private static readonly DEFAULT_OPTION_REGEX =
    /^\s*(?:(-[a-zA-Z]),\s+)?(--[a-zA-Z0-9-]+)\s+(.*)$/;

  /**
   * Regex for extracting type hints from descriptions.
   * Matches: [boolean], [string], [number], [array]
   */
  private static readonly TYPE_REGEX = /\[boolean\]|\[string\]|\[number\]|\[array\]/g;

  /**
   * Regex for extracting choices from descriptions.
   * Matches: [choices: "a", "b", "c"]
   */
  private static readonly CHOICES_REGEX = /\[choices:\s*([^\]]+)\]/;

  /**
   * Regex for extracting default values from descriptions.
   * Matches: [default: value]
   */
  private static readonly DEFAULT_REGEX = /\[default:\s*([^\]]+)\]/;

  /**
   * Regex for detecting deprecated flags.
   * Matches: [deprecated: ...]
   */
  private static readonly DEPRECATED_REGEX = /\[deprecated:/;

  /**
   * Regex for matching positional argument lines.
   * Matches: query  Positional prompt. Defaults to one-shot...
   */
  private static readonly DEFAULT_POSITIONAL_REGEX =
    /^\s{2}([a-zA-Z0-9-]+)\s+(.*)$/;

  /**
   * Regex for detecting subcommands section.
   */
  private static readonly SUBCOMMANDS_REGEX = /^(?:Commands|Available Commands):$/m;

  /**
   * Parse CLI help output into CliToolMetadata.
   *
   * @param command - The CLI command name (e.g., "qwen")
   * @param helpOutput - Raw help output text
   * @param options - Optional parser configuration
   * @returns Parsed CliToolMetadata
   */
  static parse(
    command: string,
    helpOutput: string,
    options: ParserOptions = {}
  ): CliToolMetadata {
    const result = this.parseHelpOutput(helpOutput, options);

    // Convert to CliToolMetadata format
    // For tools with subcommands, we'll use a generic metadata structure
    // that can be extended in Phase 3

    const baseMetadata: CliToolMetadata = {
      toolName: `ask-${command}`,
      description: result.description,
      command: command,
      options: result.options.map((opt) => this.parsedOptionToCliOption(opt)),
    };

    // Add positional argument if found
    if (result.positionals.length > 0) {
      // Use the first positional argument as the main argument
      const firstArgument = result.positionals[0]!;
      return { ...baseMetadata, argument: firstArgument };
    }

    return baseMetadata;
  }

  /**
   * Parse help output into intermediate result structure.
   */
  private static parseHelpOutput(
    helpOutput: string,
    options: ParserOptions
  ): ParseResult {
    const lines = helpOutput.split("\n");
    const result: ParseResult = {
      description: "",
      positionals: [],
      options: [],
      hasSubcommands: false,
    };

    let currentSection: "description" | "positionals" | "options" | "commands" =
      "description";
    let descriptionBuffer: string[] = [];

    for (const line of lines) {
      // Detect section transitions
      if (/^(?:Commands|Available Commands):$/.test(line)) {
        currentSection = "commands";
        result.hasSubcommands = true;
        continue;
      }
      if (/^Positionals:$/.test(line)) {
        currentSection = "positionals";
        continue;
      }
      if (/^Options:$/.test(line)) {
        currentSection = "options";
        continue;
      }

      // Skip empty lines and section dividers
      if (line.trim() === "" || /^---+$/.test(line)) {
        continue;
      }

      // Process based on current section
      switch (currentSection) {
        case "description":
          // Collect description lines until we hit a section header
          if (!line.startsWith(" ") && !line.startsWith("\t") && line.trim() !== "") {
            descriptionBuffer.push(line.trim());
          }
          break;

        case "positionals":
          const positional = this.parsePositional(line, options.positionalRegex);
          if (positional) {
            result.positionals.push(positional);
          }
          break;

        case "options":
          const option = this.parseOption(line, options.optionRegex);
          if (option) {
            result.options.push(option);
          }
          break;

        case "commands":
          // Subcommands handling is deferred to Phase 3
          break;
      }
    }

    // Use collected description lines (skip usage line if present)
    result.description = descriptionBuffer
      .filter((line) => !line.startsWith("Usage:"))
      .join(" ")
      .trim()
      // Remove duplicate spaces
      .replace(/\s+/g, " ");

    return result;
  }

  /**
   * Parse a positional argument line.
   */
  private static parsePositional(
    line: string,
    customRegex?: RegExp
  ): CliArgument | null {
    const regex = customRegex || this.DEFAULT_POSITIONAL_REGEX;
    const match = line.match(regex);

    if (!match) {
      return null;
    }

    const [, name, description] = match;
    if (!name || !description) {
      return null;
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      return null;
    }

    return {
      name,
      description: trimmedDescription,
      type: "string",
      required: false, // Commander.js positionals are typically optional
    };
  }

  /**
   * Parse an option line.
   */
  private static parseOption(
    line: string,
    customRegex?: RegExp
  ): ParsedOption | null {
    const regex = customRegex || this.DEFAULT_OPTION_REGEX;
    const match = line.match(regex);

    if (!match) {
      return null;
    }

    const [, shortFlag, longFlag, rest] = match;
    if (!longFlag || !rest) {
      return null;
    }

    // Extract the description and metadata
    const cleanedDescription = rest
      .replace(this.TYPE_REGEX, "") // Remove type hints
      .replace(this.CHOICES_REGEX, "") // Remove choices
      .replace(this.DEFAULT_REGEX, "") // Remove default
      .replace(this.DEPRECATED_REGEX, "") // Remove deprecated note
      .trim();

    if (!cleanedDescription) {
      return null;
    }

    // Infer type from type hints
    const typeMatch = rest.match(this.TYPE_REGEX);
    let type: OptionType = "string";
    if (typeMatch) {
      const typeStr = typeMatch[0];
      if (typeStr === "[boolean]") {
        type = "boolean";
      } else if (typeStr === "[number]") {
        type = "number";
      } else if (typeStr === "[array]") {
        type = "string"; // Arrays are treated as comma-separated strings
      }
    } else {
      // Heuristic: if no type hint, infer from description
      type = this.inferTypeFromDescription(cleanedDescription, longFlag);
    }

    // Extract choices
    const choicesMatch = rest.match(this.CHOICES_REGEX);
    let choices: (string | number)[] | undefined;
    if (choicesMatch && choicesMatch[1]) {
      const choicesStr = choicesMatch[1];
      choices = choicesStr
        .split(",")
        .map((c) => c.trim().replace(/['"]/g, ""))
        .filter((c) => c !== "");
    }

    // Extract default value
    const defaultMatch = rest.match(this.DEFAULT_REGEX);
    let defaultValue: string | number | boolean | undefined;
    if (defaultMatch && defaultMatch[1]) {
      defaultValue = this.parseDefaultValue(defaultMatch[1], type);
    }

    // Check if deprecated
    const isDeprecated = this.DEPRECATED_REGEX.test(rest);

    const parsedOption: ParsedOption = {
      shortFlag,
      longFlag,
      description: cleanedDescription,
      type,
      defaultValue,
      choices,
      deprecated: isDeprecated,
    };

    return parsedOption;
  }

  /**
   * Convert ParsedOption to CliOption.
   */
  private static parsedOptionToCliOption(parsed: ParsedOption): CliOption {
    // Use long flag name (without --) as the option name
    const name = parsed.longFlag.replace(/^--/, "");

    const cliOption: CliOption = {
      name,
      flag: parsed.longFlag,
      type: parsed.type,
      description: parsed.description ?? "",
    };

    // Only add optional properties if they have values
    if (parsed.choices && parsed.choices.length > 0) {
      cliOption.choices = parsed.choices;
    }

    if (parsed.defaultValue !== undefined) {
      cliOption.defaultValue = parsed.defaultValue;
    }

    return cliOption;
  }

  /**
   * Infer option type from description and flag name.
   */
  private static inferTypeFromDescription(
    description: string,
    flag: string
  ): OptionType {
    const lowerDesc = description.toLowerCase();

    // Boolean indicators
    if (
      /^(enable|disable|show|hide|print|verbose|quiet|debug|trace)/.test(
        lowerDesc
      ) ||
      /^(?:is|are|has|have)/.test(lowerDesc) ||
      /\?$/.test(description.trim())
    ) {
      return "boolean";
    }

    // Number indicators
    if (/\d+/.test(flag) || /port|count|num|timeout|limit/.test(flag)) {
      return "number";
    }

    // Default to string
    return "string";
  }

  /**
   * Parse default value string to appropriate type.
   */
  private static parseDefaultValue(
    valueStr: string,
    type: OptionType
  ): string | number | boolean {
    let trimmed = valueStr.trim();

    // Remove quotes from string values
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      trimmed = trimmed.slice(1, -1);
    }

    switch (type) {
      case "boolean":
        return trimmed === "true";
      case "number":
        const num = Number.parseFloat(trimmed);
        return Number.isNaN(num) ? trimmed : num;
      default:
        return trimmed;
    }
  }
}
