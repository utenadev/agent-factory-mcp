import { SecurityErrors } from "./errors.js";
import type { SecurityConfig } from "./configLoader.js";

/**
 * Validation context determines how strict the validation should be.
 */
export interface ValidationContext {
  /**
   * The type of argument being validated.
   */
  argumentType: ArgumentType;

  /**
   * Whether to allow relative paths (e.g., ../file.txt).
   * Only applicable when argumentType is 'filePath'.
   */
  allowRelativePaths?: boolean;

  /**
   * Whether to allow multiline content (e.g., \n).
   * Only applicable when argumentType is 'prompt'.
   */
  allowMultiline?: boolean;

  /**
   * Maximum allowed length for string arguments.
   */
  maxLength?: number;
}

/**
 * Types of arguments that can be validated.
 */
export type ArgumentType = "command" | "filePath" | "prompt" | "generic";

/**
 * Configuration for argument validation.
 */
interface ValidationConfig {
  /**
   * Maximum argument length (default: 10000).
   */
  maxArgumentLength: number;

  /**
   * Maximum prompt length for logging (default: 1000).
   */
  maxPromptLogLength: number;

  /**
   * Maximum session ID length (default: 256).
   */
  maxSessionIdLength: number;

  /**
   * Shell special characters that should be blocked.
   */
  shellSpecialChars: string[];

  /**
   * Path traversal patterns that should be blocked.
   */
  pathTraversalPatterns: string[];

  /**
   * Allowed characters for session IDs.
   */
  sessionIdPattern: RegExp;
}

/**
 * Default validation configuration.
 */
const DEFAULT_CONFIG: ValidationConfig = {
  maxArgumentLength: 10000,
  maxPromptLogLength: 1000,
  maxSessionIdLength: 256,
  shellSpecialChars: [";", "|", "&", "$", "`", "(", ")", "{", "}", "<", ">"],
  pathTraversalPatterns: ["../", "..\\"],
  sessionIdPattern: /^[a-zA-Z0-9\-_]+$/,
};

/**
 * Create validation config from SecurityConfig.
 */
export function createValidationConfig(securityConfig?: Partial<SecurityConfig>): ValidationConfig {
  return {
    maxArgumentLength: securityConfig?.maxArgumentLength ?? DEFAULT_CONFIG.maxArgumentLength,
    maxPromptLogLength: securityConfig?.maxPromptLogLength ?? DEFAULT_CONFIG.maxPromptLogLength,
    maxSessionIdLength: DEFAULT_CONFIG.maxSessionIdLength, // Not in SecurityConfig yet
    shellSpecialChars: securityConfig?.shellSpecialChars ?? DEFAULT_CONFIG.shellSpecialChars,
    pathTraversalPatterns: securityConfig?.pathTraversalPatterns ?? DEFAULT_CONFIG.pathTraversalPatterns,
    sessionIdPattern: DEFAULT_CONFIG.sessionIdPattern,
  };
}

/**
 * Argument validator for security hardening.
 * Detects and blocks potentially dangerous input patterns.
 */
export class ArgumentValidator {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig> | SecurityConfig) {
    // Handle both legacy ValidationConfig and new SecurityConfig
    if (config && "shellSpecialChars" in config && "pathTraversalPatterns" in config) {
      // Legacy ValidationConfig
      this.config = { ...DEFAULT_CONFIG, ...config };
    } else {
      // SecurityConfig or empty
      this.config = createValidationConfig(config as Partial<SecurityConfig>);
    }
  }

  /**
   * Validate an array of arguments based on the provided context.
   * @throws {SecurityError} If validation fails.
   */
  validate(args: string[], context: ValidationContext): void {
    const {
      argumentType,
      allowRelativePaths = false,
      allowMultiline = argumentType === "prompt",
      maxLength = this.config.maxArgumentLength,
    } = context;

    for (const arg of args) {
      // Check length first
      if (arg.length > maxLength) {
        throw SecurityErrors.argumentTooLong(arg.length, maxLength);
      }

      // Check for null bytes
      if (arg.includes("\0")) {
        throw SecurityErrors.nullByte();
      }

      // Type-specific validation
      switch (argumentType) {
        case "command":
          this.validateCommand(arg);
          break;
        case "filePath":
          this.validateFilePath(arg, allowRelativePaths);
          break;
        case "prompt":
          this.validatePrompt(arg, allowMultiline);
          break;
        case "generic":
          this.validateGeneric(arg);
          break;
      }
    }
  }

  /**
   * Validate @ syntax for file attachments (Gemini/OpenCode feature).
   * @throws {SecurityError} If @ syntax contains path traversal.
   */
  validateAtSyntax(arg: string): void {
    if (!arg.startsWith("@")) {
      return;
    }

    const filePath = arg.slice(1);

    // Check for path traversal
    for (const pattern of this.config.pathTraversalPatterns) {
      if (filePath.includes(pattern)) {
        throw SecurityErrors.atSyntaxTraversal(arg);
      }
    }

    // Check for absolute paths (optional - uncomment to restrict to CWD only)
    // if (filePath.startsWith("/") || filePath.match(/^[a-zA-Z]:\\/)) {
    //   throw new SecurityError(
    //     `Absolute paths not allowed in @ syntax: ${arg}`
    //   );
    // }
  }

  /**
   * Validate a session ID (for --resume, --session options).
   * @throws {SecurityError} If session ID format is invalid.
   */
  validateSessionId(id: string): void {
    // Check length
    if (id.length > this.config.maxSessionIdLength) {
      throw SecurityErrors.argumentTooLong(id.length, this.config.maxSessionIdLength);
    }

    // Check format (alphanumeric, -, _ only)
    if (!this.config.sessionIdPattern.test(id)) {
      throw SecurityErrors.invalidSessionId(id);
    }
  }

  /**
   * Validate arguments with Gemini-specific requirements.
   * This combines @ syntax validation and session ID validation.
   */
  validateWithGeminiRequirements(
    args: string[],
    context: ValidationContext = { argumentType: "generic" }
  ): void {
    for (const arg of args) {
      // Check @ syntax
      this.validateAtSyntax(arg);

      // Check session IDs (e.g., --resume=xxx, --session=xxx)
      if (arg.startsWith("--resume=") || arg.startsWith("--session=")) {
        const sessionId = arg.split("=")[1];
        if (sessionId) {
          this.validateSessionId(sessionId);
        }
      }
    }

    // Run standard validation
    this.validate(args, context);
  }

  /**
   * Validate a command argument (strictest validation).
   */
  private validateCommand(arg: string): void {
    // Commands should not contain shell special characters
    for (const char of this.config.shellSpecialChars) {
      if (arg.includes(char)) {
        throw SecurityErrors.commandInjection(char);
      }
    }

    // Commands should not have path traversal
    this.validateNoPathTraversal(arg);
  }

  /**
   * Validate a file path argument.
   */
  private validateFilePath(arg: string, allowRelativePaths: boolean): void {
    if (!allowRelativePaths) {
      this.validateNoPathTraversal(arg);
    }
  }

  /**
   * Validate a prompt argument.
   */
  private validatePrompt(arg: string, allowMultiline: boolean): void {
    // Prompts can contain most characters, but we should still check for
    // obvious shell injection attempts

    // Check for shell command substitution patterns
    const commandSubstitutionPatterns = ["$(", "`"];
    for (const pattern of commandSubstitutionPatterns) {
      if (arg.includes(pattern)) {
        throw SecurityErrors.commandInjection(pattern);
      }
    }
  }

  /**
   * Validate a generic argument.
   */
  private validateGeneric(arg: string): void {
    // Generic validation: block shell special characters and path traversal
    for (const char of this.config.shellSpecialChars) {
      if (arg.includes(char)) {
        throw SecurityErrors.commandInjection(char);
      }
    }

    this.validateNoPathTraversal(arg);
  }

  /**
   * Check for path traversal patterns.
   */
  private validateNoPathTraversal(arg: string): void {
    for (const pattern of this.config.pathTraversalPatterns) {
      if (arg.includes(pattern)) {
        throw SecurityErrors.pathTraversal(arg);
      }
    }
  }
}

/**
 * Default singleton instance of ArgumentValidator.
 */
export const argumentValidator = new ArgumentValidator();

/**
 * Convenience function to validate arguments using the default validator.
 */
export function validateArguments(
  args: string[],
  context: ValidationContext
): void {
  argumentValidator.validate(args, context);
}

/**
 * Convenience function to validate with Gemini requirements.
 */
export function validateWithGeminiRequirements(
  args: string[],
  context?: ValidationContext
): void {
  argumentValidator.validateWithGeminiRequirements(args, context);
}
