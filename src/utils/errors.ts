/**
 * Custom error class for security violations.
 * Thrown when an argument fails validation or a security rule is violated.
 */
export class SecurityError extends Error {
  /**
   * The type of security violation that occurred.
   */
  readonly violationType: SecurityViolationType;

  constructor(
    message: string,
    violationType: SecurityViolationType = "generic"
  ) {
    super(message);
    this.name = "SecurityError";
    this.violationType = violationType;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecurityError);
    }
  }
}

/**
 * Types of security violations that can occur.
 */
export type SecurityViolationType =
  | "generic"
  | "command_injection"
  | "path_traversal"
  | "at_syntax_traversal"
  | "invalid_session_id"
  | "argument_too_long"
  | "null_byte"
  | "invalid_characters";

/**
 * Convenience factory methods for creating specific security errors.
 */
export const SecurityErrors = {
  /**
   * Create an error for command injection attempts.
   */
  commandInjection(detected: string): SecurityError {
    return new SecurityError(
      `Command injection detected: ${detected}`,
      "command_injection"
    );
  },

  /**
   * Create an error for path traversal attempts.
   */
  pathTraversal(path: string): SecurityError {
    return new SecurityError(
      `Path traversal detected: ${path}`,
      "path_traversal"
    );
  },

  /**
   * Create an error for @ syntax path traversal attempts.
   */
  atSyntaxTraversal(arg: string): SecurityError {
    return new SecurityError(
      `Path traversal detected in @ syntax: ${arg}`,
      "at_syntax_traversal"
    );
  },

  /**
   * Create an error for invalid session ID format.
   */
  invalidSessionId(id: string): SecurityError {
    return new SecurityError(
      `Invalid session ID format: ${id}. Only alphanumeric, -, _ allowed`,
      "invalid_session_id"
    );
  },

  /**
   * Create an error for arguments that are too long.
   */
  argumentTooLong(length: number, max: number): SecurityError {
    return new SecurityError(
      `Argument too long: ${length} characters (max ${max})`,
      "argument_too_long"
    );
  },

  /**
   * Create an error for null byte detection.
   */
  nullByte(): SecurityError {
    return new SecurityError(
      "Null byte detected in argument",
      "null_byte"
    );
  },

  /**
   * Create an error for invalid characters.
   */
  invalidCharacters(characters: string): SecurityError {
    return new SecurityError(
      `Invalid characters detected: ${characters}`,
      "invalid_characters"
    );
  },
};
