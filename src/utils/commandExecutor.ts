import { spawn } from "child_process";
import { Logger } from "./logger.js";
import { ArgumentValidator, type ValidationContext } from "./argumentValidator.js";
import { auditLogger } from "./auditLogger.js";
import { SecurityError } from "./errors.js";

// Default timeout: 10 minutes (600000ms)
const DEFAULT_COMMAND_TIMEOUT = 600000;

/**
 * Options for command execution with security features.
 */
export interface ExecuteCommandOptions {
  /** Progress callback for real-time output */
  onProgress?: (newOutput: string) => void;

  /** Timeout in milliseconds (default: 600000) */
  timeout?: number | undefined;

  /** Environment variables to merge with process.env */
  env?: Record<string, string> | undefined;

  /** Validation context for argument validation */
  validationContext?: ValidationContext | undefined;

  /** Whether to enable audit logging (default: true) */
  enableAuditLog?: boolean;

  /** Whether to enable argument validation (default: true) */
  enableValidation?: boolean;
}

/**
 * Execute a command with security features (validation and audit logging).
 *
 * @param command - The command to execute
 * @param args - Arguments to pass to the command
 * @param options - Execution options
 * @returns The command output
 * @throws {SecurityError} If argument validation fails
 * @throws {Error} If command execution fails
 */
export async function executeCommand(
  command: string,
  args: string[],
  options?: ExecuteCommandOptions
): Promise<string>;
/**
 * Legacy API for backward compatibility.
 * @deprecated Use the options parameter instead.
 */
export async function executeCommand(
  command: string,
  args: string[],
  onProgress?: (newOutput: string) => void,
  timeoutMs?: number,
  env?: Record<string, string>
): Promise<string>;

export async function executeCommand(
  command: string,
  args: string[],
  optionsOrOnProgress?: ExecuteCommandOptions | ((newOutput: string) => void),
  timeoutMs?: number,
  env?: Record<string, string>
): Promise<string> {
  // Handle both old and new API signatures
  let options: ExecuteCommandOptions = {};

  if (typeof optionsOrOnProgress === "function") {
    // Legacy API: executeCommand(command, args, onProgress, timeout, env)
    options = {
      onProgress: optionsOrOnProgress,
      timeout: timeoutMs,
      env,
    };
  } else if (typeof optionsOrOnProgress === "object") {
    // New API: executeCommand(command, args, options)
    options = optionsOrOnProgress;
  }

  // Default values
  const {
    onProgress,
    timeout = DEFAULT_COMMAND_TIMEOUT,
    env: customEnv,
    validationContext,
    enableAuditLog = true,
    enableValidation = true,
  } = options;

  // 1. Log the attempt
  if (enableAuditLog) {
    auditLogger.logAttempt(command, args);
  }

  // 2. Validate arguments if validation is enabled
  if (enableValidation && validationContext) {
    try {
      const validator = new ArgumentValidator();
      validator.validate(args, validationContext);
    } catch (error) {
      if (error instanceof SecurityError) {
        // Log the blocked attempt
        if (enableAuditLog) {
          auditLogger.logBlocked(command, args, error.message);
        }
        throw error;
      }
      throw error;
    }
  }

  return new Promise((resolve, reject) => {
    Logger.debug(`Executing command: ${command} ${args.join(" ")}`);

    // Merge environment variables with existing process.env
    const spawnEnv = customEnv ? { ...process.env, ...customEnv } : process.env;

    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: spawnEnv,
    });
    child.stdin.end();
    let output = "";
    let errorOutput = "";

    // Set up timeout
    const timeoutId = setTimeout(() => {
      Logger.error(`Command timeout after ${timeout}ms, killing process`);
      child.kill("SIGTERM");

      const errorMsg = `Command execution timeout (${timeout}ms)`;
      if (enableAuditLog) {
        auditLogger.logFailed(command, args, -1, errorMsg);
      }

      reject(new Error(errorMsg));
    }, timeout);

    child.stdout.on("data", data => {
      const chunk = data.toString();
      output += chunk;

      if (onProgress) {
        onProgress(output);
      }

      Logger.debug(`Command stdout: ${chunk.trim()}`);
    });

    child.stderr.on("data", data => {
      const chunk = data.toString();
      errorOutput += chunk;
      Logger.debug(`Command stderr: ${chunk.trim()}`);
    });

    child.on("close", code => {
      clearTimeout(timeoutId);

      if (code === 0) {
        Logger.debug("Command executed successfully");
        if (enableAuditLog) {
          auditLogger.logSuccess(command, args, code);
        }
        resolve(output.trim());
      } else {
        const errorMsg = errorOutput || `Command exited with code ${code}`;
        Logger.error(`Command failed with code ${code}: ${errorMsg}`);

        if (enableAuditLog) {
          auditLogger.logFailed(command, args, code ?? -1, errorMsg);
        }

        reject(new Error(errorMsg));
      }
    });

    child.on("error", error => {
      clearTimeout(timeoutId);
      Logger.error("Command execution error:", error);

      if (enableAuditLog) {
        auditLogger.logFailed(command, args, -1, error.message);
      }

      reject(error);
    });
  });
}
