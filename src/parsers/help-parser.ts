import type {
  CliToolMetadata,
  CliOption,
  CliArgument,
  OptionType,
  SubcommandDefinition,
  ToolType,
} from "../types/cli-metadata.js";

/**
 * Parser strategy for different CLI help output formats.
 */
export type ParserStrategy = "gnu" | "go" | "custom";

/**
 * Parser options for customizing help output parsing.
 */
export interface ParserOptions {
  /** Parser strategy to use (default: "gnu") */
  strategy?: ParserStrategy;
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
  subcommands: SubcommandInfo[];
}

/**
 * Information about a detected subcommand.
 */
interface SubcommandInfo {
  name: string;
  description: string;
}

/**
 * HelpParser - Parses CLI help output into structured CliToolMetadata.
 *
 * Supports multiple help output formats:
 * - GNU style (commander.js): -m, --model value
 * - Go style: -flag value (single dash only)
 * - Custom: User-defined regex patterns
 *
 * Features:
 * - Type hints: [boolean], [string], [number], [array]
 * - Choices: [choices: "a", "b", "c"]
 * - Defaults: [default: false]
 * - Deprecated: [deprecated: ...]
 * - Subcommands: Detects and parses Commands sections
 */
export class HelpParser {
  /**
   * Default regex for GNU style options (commander.js).
   * Matches: -d, --debug     Run in debug mode?  [boolean] [default: false]
   * Also matches indented options with 6 spaces (commander.js default format)
   */
  private static readonly GNU_OPTION_REGEX =
    /^\s*(?:(-[a-zA-Z]),\s+)?(--[a-zA-Z0-9-]+)\s+(.*)$/;

  /**
   * Default regex for Go style options.
   * Matches: -flag value or -flag
   * Uses non-capturing group for shortFlag to maintain compatibility with GNU regex structure.
   */
  private static readonly GO_OPTION_REGEX =
    /^\s*(-[a-zA-Z0-9-]+)\s+(.*)$/;

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

    // Determine tool type
    const toolType: ToolType = result.hasSubcommands
      ? "with-subcommands"
      : "simple";

    // Convert subcommands to the expected format
    const subcommands: SubcommandDefinition[] = result.subcommands.map(
      (sc) => ({
        name: sc.name,
        description: sc.description,
        hasArguments: true, // Assume subcommands take arguments
      })
    );

    const baseMetadata: CliToolMetadata = {
      toolName: `ask-${command}`,
      description: result.description,
      command: command,
      toolType,
      options: result.options.map((opt) => this.parsedOptionToCliOption(opt)),
    };

    // Add subcommands if present
    if (subcommands.length > 0) {
      baseMetadata.subcommands = subcommands;
    }

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
  private static parseHelpOutput(helpOutput: string, options: ParserOptions): ParseResult {
    const lines = helpOutput.split("\n");
    const result: ParseResult = {
      description: "",
      positionals: [],
      options: [],
      hasSubcommands: false,
      subcommands: [],
    };

    // Determine option regex based on strategy
    const strategy = options.strategy ?? "gnu";
    const optionRegex = options.optionRegex ?? this.getOptionRegexForStrategy(strategy);

    let currentSection: "description" | "positionals" | "options" | "commands" = "description";
    const descriptionBuffer: string[] = [];

    for (const line of lines) {
      const sectionChange = this.detectSectionChange(line);
      if (sectionChange) {
        currentSection = sectionChange;
        if (sectionChange === "commands") {
          result.hasSubcommands = true;
        }
        continue;
      }

      if (this.shouldSkipLine(line)) {
        continue;
      }

      this.processLineBySection(line, currentSection, { ...options, optionRegex }, result, descriptionBuffer);
    }

    result.description = this.buildDescription(descriptionBuffer);
    return result;
  }

  /**
   * Get the appropriate option regex for a given strategy.
   */
  private static getOptionRegexForStrategy(strategy: ParserStrategy): RegExp {
    switch (strategy) {
      case "go":
        return this.GO_OPTION_REGEX;
      case "gnu":
      default:
        return this.GNU_OPTION_REGEX;
    }
  }

  /**
   * Detect if a line indicates a section change.
   */
  private static detectSectionChange(line: string): "description" | "positionals" | "options" | "commands" | null {
    if (/^(?:Commands|Available Commands):$/.test(line)) {
      return "commands";
    }
    if (/^Positionals:$/.test(line)) {
      return "positionals";
    }
    if (/^Options:$/.test(line)) {
      return "options";
    }
    return null;
  }

  /**
   * Check if a line should be skipped (empty or divider).
   */
  private static shouldSkipLine(line: string): boolean {
    return line.trim() === "" || /^---+$/.test(line);
  }

  /**
   * Process a line based on the current section.
   */
  private static processLineBySection(
    line: string,
    currentSection: "description" | "positionals" | "options" | "commands",
    options: ParserOptions,
    result: ParseResult,
    descriptionBuffer: string[]
  ): void {
    switch (currentSection) {
      case "description":
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
        const subcommand = this.parseSubcommand(line);
        if (subcommand) {
          result.subcommands.push(subcommand);
        }
        break;
    }
  }

  /**
   * Build final description from buffer.
   */
  private static buildDescription(buffer: string[]): string {
    return buffer
      .filter((line) => !line.startsWith("Usage:"))
      .join(" ")
      .trim()
      .replace(/\s+/g, " ");
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
   * Parse a subcommand line from the Commands section.
   * Format can be:
   * - "command   Description" (simple)
   * - "command sub   Description" (commander.js style with base command repeated)
   * - "subcommand   Description" (when base command is implied)
   */
  private static parseSubcommand(line: string): SubcommandInfo | null {
    const trimmed = line.trim();

    // Filter out invalid lines
    if (!this.isValidSubcommandLine(trimmed)) {
      return null;
    }

    // Split on 2+ spaces to separate command from description
    const parts = trimmed.split(/\s{2,}/);
    if (parts.length < 2) {
      return null;
    }

    const firstPart = parts[0]?.trim();
    const description = parts[1]?.trim();

    if (!firstPart || !description) {
      return null;
    }

    const subcommandName = this.extractSubcommandName(firstPart);
    if (!subcommandName || this.isInvalidSubcommandName(subcommandName)) {
      return null;
    }

    return {
      name: subcommandName,
      description,
    };
  }

  /**
   * Check if a line is a valid subcommand line.
   */
  private static isValidSubcommandLine(line: string): boolean {
    if (!line || line.startsWith("---")) {
      return false;
    }

    // Filter out section headers
    if (/^Commands|Options|Arguments|Positionals:/.test(line)) {
      return false;
    }

    // Skip lines that look like usage patterns with brackets
    return !/^\w+\s+\[.*?\]\s*$/.test(line);
  }

  /**
   * Extract subcommand name from command part.
   * Handles both "subcommand" and "base_command subcommand" formats.
   */
  private static extractSubcommandName(commandPart: string): string | undefined {
    const words = commandPart.split(/\s+/);

    if (words.length === 0) {
      return undefined;
    }

    // Simple case: just the subcommand name
    if (words.length === 1) {
      return words[0];
    }

    // "base_command subcommand" format - use the second word
    return words[1];
  }

  /**
   * Check if a subcommand name is invalid (file extension or technical term).
   */
  private static isInvalidSubcommandName(name: string): boolean {
    return /^\.[a-z]+$/.test(name) || /^[<>[\]]+$/.test(name);
  }

  /**
   * Parse an option line.
   */
  private static parseOption(
    line: string,
    customRegex?: RegExp
  ): ParsedOption | null {
    const regex = customRegex || this.GNU_OPTION_REGEX;
    const match = line.match(regex);

    if (!match) {
      return null;
    }

    // Determine if this is GNU style (has long flag with --) or Go style (single -flag)
    // GNU regex captures: [full, shortFlag?, longFlag, rest]
    // Go regex captures: [full, longFlag, rest]
    const isGnuStyle = regex === this.GNU_OPTION_REGEX && match.length >= 4;

    let shortFlag: string | undefined;
    let longFlag: string;
    let rest: string;

    if (isGnuStyle) {
      // GNU style: [, shortFlag?, longFlag, rest]
      shortFlag = match[1] || undefined;
      longFlag = match[2]!;
      rest = match[3]!;
    } else {
      // Go style or custom: [, longFlag, rest]
      longFlag = match[1]!;
      rest = match[2]!;
    }

    if (!longFlag || !rest) {
      return null;
    }

    const cleanedDescription = this.extractOptionDescription(rest);
    if (!cleanedDescription) {
      return null;
    }

    return {
      shortFlag,
      longFlag,
      description: cleanedDescription,
      type: this.parseOptionType(rest, cleanedDescription, longFlag),
      defaultValue: this.extractDefaultValue(rest, cleanedDescription),
      choices: this.extractChoices(rest),
      deprecated: this.DEPRECATED_REGEX.test(rest),
    };
  }

  /**
   * Extract clean description from option line by removing metadata.
   */
  private static extractOptionDescription(rest: string): string {
    return rest
      .replace(this.TYPE_REGEX, "")
      .replace(this.CHOICES_REGEX, "")
      .replace(this.DEFAULT_REGEX, "")
      .replace(this.DEPRECATED_REGEX, "")
      .trim();
  }

  /**
   * Parse option type from type hints or infer from description.
   */
  private static parseOptionType(rest: string, description: string, longFlag: string): OptionType {
    const typeMatch = rest.match(this.TYPE_REGEX);

    if (typeMatch) {
      return this.getTypeFromString(typeMatch[0]);
    }

    // Heuristic: if no type hint, infer from description
    return this.inferTypeFromDescription(description, longFlag);
  }

  /**
   * Convert type hint string to OptionType.
   */
  private static getTypeFromString(typeStr: string): OptionType {
    if (typeStr === "[boolean]") {
      return "boolean";
    }
    if (typeStr === "[number]") {
      return "number";
    }
    // Arrays are treated as comma-separated strings
    return "string";
  }

  /**
   * Extract choices array from option line.
   */
  private static extractChoices(rest: string): (string | number)[] | undefined {
    const choicesMatch = rest.match(this.CHOICES_REGEX);
    if (!choicesMatch || !choicesMatch[1]) {
      return undefined;
    }

    return choicesMatch[1]
      .split(",")
      .map((c) => c.trim().replace(/['"]/g, ""))
      .filter((c) => c !== "");
  }

  /**
   * Extract default value from option line.
   */
  private static extractDefaultValue(rest: string, description: string): string | number | boolean | undefined {
    const defaultMatch = rest.match(this.DEFAULT_REGEX);
    if (!defaultMatch || !defaultMatch[1]) {
      return undefined;
    }

    // Determine type for parsing
    const typeMatch = rest.match(this.TYPE_REGEX);
    const type = typeMatch ? this.getTypeFromString(typeMatch[0]) : "string";

    return this.parseDefaultValue(defaultMatch[1], type);
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
  private static inferTypeFromDescription(description: string, flag: string): OptionType {
    const lowerDesc = description.toLowerCase();
    const lowerFlag = flag.toLowerCase();

    // Check for boolean type patterns
    if (this.matchesBooleanPattern(lowerDesc, description)) {
      return "boolean";
    }

    // Check for number type patterns
    if (this.matchesNumberPattern(flag, lowerFlag)) {
      return "number";
    }

    // Check for file type patterns
    if (this.matchesFilePattern(lowerFlag, lowerDesc, description)) {
      return "file";
    }

    return "string";
  }

  /**
   * Check if description matches boolean type patterns.
   */
  private static matchesBooleanPattern(lowerDesc: string, originalDesc: string): boolean {
    const booleanPrefixes = /^(enable|disable|show|hide|print|verbose|quiet|debug|trace)/;
    const booleanVerbs = /^(?:is|are|has|have)/;
    const hasQuestionMark = /\?$/.test(originalDesc.trim());

    return booleanPrefixes.test(lowerDesc) || booleanVerbs.test(lowerDesc) || hasQuestionMark;
  }

  /**
   * Check if flag matches number type patterns.
   */
  private static matchesNumberPattern(flag: string, lowerFlag: string): boolean {
    const hasDigits = /\d+/.test(flag);
    const numberKeywords = /port|count|num|timeout|limit/;

    return hasDigits || numberKeywords.test(lowerFlag);
  }

  /**
   * Check if flag or description matches file type patterns.
   */
  private static matchesFilePattern(lowerFlag: string, lowerDesc: string, originalDesc: string): boolean {
    const fileKeywords = /file|path|dir|directory|config|output|input/i;
    const fileDescKeywords = /file|path|directory|folder/i;
    const fileExtensions = /\.(json|yaml|yml|txt|md|toml|conf|cfg)$/;

    return fileKeywords.test(lowerFlag) ||
           fileDescKeywords.test(lowerDesc) ||
           fileExtensions.test(originalDesc);
  }

  /**
   * Parse default value string to appropriate type.
   */
  private static parseDefaultValue(valueStr: string, type: OptionType): string | number | boolean {
    const trimmed = this.stripQuotes(valueStr.trim());

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

  /**
   * Remove surrounding quotes from a string.
   */
  private static stripQuotes(value: string): string {
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  }
}
