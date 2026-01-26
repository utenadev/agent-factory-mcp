import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import type { SecurityConfig } from "./configLoader.js";

// Type alias for the imported SecurityConfig to avoid naming conflicts
type ImportedSecurityConfig = SecurityConfig;

/**
 * Audit log entry status.
 */
export type AuditLogStatus = "attempted" | "success" | "blocked" | "failed";

/**
 * Audit log entry structure.
 */
export interface AuditLogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;

  /** The command that was executed */
  command: string;

  /** Arguments passed to the command (sanitized) */
  args: string[];

  /** Current working directory */
  cwd: string;

  /** OS username */
  user: string;

  /** Status of the execution attempt */
  status: AuditLogStatus;

  /** Error message if status is "blocked" or "failed" */
  error?: string;

  /** Exit code if status is "success" or "failed" */
  exitCode?: number;
}

/**
 * Configuration for audit logging.
 */
export interface AuditLoggerConfig {
  /** Log file path */
  logPath: string;

  /** Maximum prompt length for logging */
  maxPromptLogLength: number;

  /** Whether to create log directory if it doesn't exist */
  createDirectory: boolean;

  /** Whether to suppress errors when writing logs */
  suppressErrors: boolean;

  /** Maximum log file size before rotation (default: 10MB) */
  maxLogSize: number;

  /** Maximum number of rotated logs to keep (default: 5) */
  maxRotatedLogs: number;

  /** Whether to enable log rotation (default: true) */
  enableRotation: boolean;
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: AuditLoggerConfig = {
  logPath: path.join(os.homedir(), ".agent-factory-mcp", "audit.log"),
  maxPromptLogLength: 200, // Shorter for logs to keep them readable
  createDirectory: true,
  suppressErrors: true,
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxRotatedLogs: 5,
  enableRotation: true,
};

/**
 * Create AuditLoggerConfig from SecurityConfig.
 */
export function createAuditConfigFromSecurityConfig(
  securityConfig?: Partial<SecurityConfig>
): Partial<AuditLoggerConfig> {
  if (!securityConfig) return {};

  const result: Partial<AuditLoggerConfig> = {};

  if (securityConfig.maxPromptLogLength !== undefined) {
    result.maxPromptLogLength = securityConfig.maxPromptLogLength;
  }
  if (securityConfig.maxLogSize !== undefined) {
    result.maxLogSize = securityConfig.maxLogSize;
  }
  if (securityConfig.maxRotatedLogs !== undefined) {
    result.maxRotatedLogs = securityConfig.maxRotatedLogs;
  }
  if (securityConfig.enableRotation !== undefined) {
    result.enableRotation = securityConfig.enableRotation;
  }

  return result;
}

/**
 * Patterns for detecting sensitive information in arguments.
 */
const SENSITIVE_PATTERNS = [
  /(--api-key|--token|-k|--password|--secret|--auth-key)=/i,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/i,
  /sk-[a-zA-Z0-9]{48}/, // OpenAI API keys
  /AIza[a-zA-Z0-9\-_]{35}/, // Google API keys
  /ghp_[a-zA-Z0-9]{36}/, // GitHub personal access tokens
  /xoxb-[0-9]{13}-[0-9]{13}-[a-zA-Z0-9]{24}/, // Slack bot tokens
];

/**
 * Audit logger for security and compliance.
 * Records all command execution attempts in JSON Lines format.
 */
export class AuditLogger {
  private config: AuditLoggerConfig;

  constructor(config: Partial<AuditLoggerConfig> = {}) {
    // Type guard to check if this is SecurityConfig (has enableValidation property)
    const isSecurityConfig = (c: any): c is ImportedSecurityConfig =>
      c && "enableValidation" in c && "maxArgumentLength" in c;

    if (isSecurityConfig(config)) {
      // SecurityConfig
      const auditConfig = createAuditConfigFromSecurityConfig(config);
      this.config = { ...DEFAULT_CONFIG, ...auditConfig };
    } else {
      // AuditLoggerConfig
      this.config = { ...DEFAULT_CONFIG, ...config };
    }

    // Ensure log directory exists
    if (this.config.createDirectory) {
      this.ensureLogDirectory();
    }
  }

  /**
   * Log a command execution attempt or result.
   */
  log(entry: Omit<AuditLogEntry, "timestamp" | "cwd" | "user">): void {
    const fullEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      cwd: process.cwd(),
      user: os.userInfo().username,
      ...entry,
      args: this.sanitizeArgs(entry.args),
    };

    this.writeLog(fullEntry);
  }

  /**
   * Log a command execution attempt.
   */
  logAttempt(command: string, args: string[]): void {
    this.log({
      command,
      args,
      status: "attempted",
    });
  }

  /**
   * Log a blocked execution attempt.
   */
  logBlocked(command: string, args: string[], error: string): void {
    this.log({
      command,
      args,
      status: "blocked",
      error,
    });
  }

  /**
   * Log a successful execution.
   */
  logSuccess(command: string, args: string[], exitCode: number = 0): void {
    this.log({
      command,
      args,
      status: "success",
      exitCode,
    });
  }

  /**
   * Log a failed execution.
   */
  logFailed(command: string, args: string[], exitCode: number, error: string): void {
    this.log({
      command,
      args,
      status: "failed",
      exitCode,
      error,
    });
  }

  /**
   * Sanitize arguments to remove sensitive information.
   */
  sanitizeArgs(args: string[]): string[] {
    return args.map((arg) => this.sanitizeArgument(arg));
  }

  /**
   * Sanitize a single argument.
   */
  sanitizeArgument(arg: string): string {
    // Check for sensitive patterns first
    for (const pattern of SENSITIVE_PATTERNS) {
      const match = arg.match(pattern);
      if (match) {
        // For key=value patterns, mask the entire value after =
        const eqIndex = arg.indexOf("=");
        if (eqIndex !== -1) {
          const key = arg.slice(0, eqIndex + 1); // Include the =
          return `${key}[REDACTED]`;
        }
        // For standalone patterns (like bearer tokens), mask everything
        return "[REDACTED]";
      }
    }

    // Truncate long arguments
    if (arg.length > this.config.maxPromptLogLength) {
      return `${arg.slice(0, this.config.maxPromptLogLength)}...[TRUNCATED ${
        arg.length - this.config.maxPromptLogLength
      } chars]`;
    }

    // Mask @ syntax paths (for privacy)
    if (arg.startsWith("@/")) {
      return "@[REDACTED PATH]";
    }

    return arg;
  }

  /**
   * Ensure the log directory exists.
   */
  private ensureLogDirectory(): void {
    try {
      const logDir = path.dirname(this.config.logPath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
      }
    } catch (error) {
      // If we can't create the directory, we can't log
      // But we shouldn't crash the application
      if (!this.config.suppressErrors) {
        throw error;
      }
    }
  }

  /**
   * Rotate logs if the current log file exceeds the maximum size.
   */
  private rotateLogIfNeeded(): void {
    if (!this.config.enableRotation) {
      return;
    }

    try {
      // Check if log file exists and its size
      if (!fs.existsSync(this.config.logPath)) {
        return;
      }

      const stats = fs.statSync(this.config.logPath);
      if (stats.size < this.config.maxLogSize) {
        return;
      }

      // Perform rotation
      this.rotateLogs();
    } catch (error) {
      // Don't crash on rotation errors
      if (!this.config.suppressErrors) {
        throw error;
      }
    }
  }

  /**
   * Rotate log files.
   * audit.log -> audit.log.1
   * audit.log.1 -> audit.log.2
   * ...
   * audit.log.4 -> audit.log.5 (deleted if maxRotatedLogs is 5)
   */
  private rotateLogs(): void {
    const logDir = path.dirname(this.config.logPath);
    const logBase = path.basename(this.config.logPath);

    // Remove the oldest log if it exists
    const oldestLog = path.join(logDir, `${logBase}.${this.config.maxRotatedLogs}`);
    if (fs.existsSync(oldestLog)) {
      fs.unlinkSync(oldestLog);
    }

    // Rotate existing logs in reverse order
    for (let i = this.config.maxRotatedLogs - 1; i >= 1; i--) {
      const currentLog = path.join(logDir, `${logBase}.${i}`);
      const nextLog = path.join(logDir, `${logBase}.${i + 1}`);

      if (fs.existsSync(currentLog)) {
        fs.renameSync(currentLog, nextLog);
      }
    }

    // Rotate the current log
    const rotatedLog = path.join(logDir, `${logBase}.1`);
    fs.renameSync(this.config.logPath, rotatedLog);
  }

  /**
   * Write a log entry to the log file.
   */
  private writeLog(entry: AuditLogEntry): void {
    try {
      // Check if rotation is needed before writing
      this.rotateLogIfNeeded();

      const logLine = JSON.stringify(entry) + "\n";
      fs.appendFileSync(this.config.logPath, logLine, { mode: 0o600 });
    } catch (error) {
      // If we can't write the log, we shouldn't crash the application
      if (!this.config.suppressErrors) {
        throw error;
      }
    }
  }
}

/**
 * Default singleton instance of AuditLogger.
 */
export const auditLogger = new AuditLogger();

/**
 * Convenience function to log an attempt.
 */
export function logAttempt(command: string, args: string[]): void {
  auditLogger.logAttempt(command, args);
}

/**
 * Convenience function to log a blocked attempt.
 */
export function logBlocked(command: string, args: string[], error: string): void {
  auditLogger.logBlocked(command, args, error);
}

/**
 * Convenience function to log a success.
 */
export function logSuccess(command: string, args: string[], exitCode?: number): void {
  auditLogger.logSuccess(command, args, exitCode);
}

/**
 * Convenience function to log a failure.
 */
export function logFailed(
  command: string,
  args: string[],
  exitCode: number,
  error: string
): void {
  auditLogger.logFailed(command, args, exitCode, error);
}
