import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { SecurityError, SecurityErrors } from "../../src/utils/errors.js";
import {
  ArgumentValidator,
  ValidationContext,
  validateArguments,
  validateWithGeminiRequirements,
} from "../../src/utils/argumentValidator.js";
import { AuditLogger } from "../../src/utils/auditLogger.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("SecurityError", () => {
  it("should create a SecurityError with correct name", () => {
    const error = new SecurityError("Test error");
    expect(error.name).toBe("SecurityError");
    expect(error.message).toBe("Test error");
    expect(error.violationType).toBe("generic");
  });

  it("should create a SecurityError with specific violation type", () => {
    const error = new SecurityError("Test", "command_injection");
    expect(error.violationType).toBe("command_injection");
  });

  it("should have factory methods for common violations", () => {
    expect(SecurityErrors.commandInjection(";")).toBeInstanceOf(SecurityError);
    expect(SecurityErrors.pathTraversal("../")).toBeInstanceOf(SecurityError);
    expect(SecurityErrors.atSyntaxTraversal("@../../")).toBeInstanceOf(SecurityError);
    expect(SecurityErrors.invalidSessionId("a.b")).toBeInstanceOf(SecurityError);
    expect(SecurityErrors.argumentTooLong(10001, 10000)).toBeInstanceOf(SecurityError);
    expect(SecurityErrors.nullByte()).toBeInstanceOf(SecurityError);
  });
});

describe("ArgumentValidator - Command Injection Prevention", () => {
  const validator = new ArgumentValidator();

  it("should block shell special characters in command arguments", () => {
    const maliciousArgs = ["; rm -rf /", "| ls", "& whoami", "$(pwd)", "`id`"];

    for (const arg of maliciousArgs) {
      expect(() => {
        validator.validate([arg], { argumentType: "command" });
      }).toThrow(SecurityError);
    }
  });

  it("should allow safe command arguments", () => {
    expect(() => {
      validator.validate(["--help", "--version"], { argumentType: "command" });
    }).not.toThrow();
  });
});

describe("ArgumentValidator - Path Traversal Prevention", () => {
  const validator = new ArgumentValidator();

  it("should block path traversal patterns", () => {
    const traversalArgs = ["../../../etc/passwd", "..\\..\\windows\\system32"];

    for (const arg of traversalArgs) {
      expect(() => {
        validator.validate([arg], { argumentType: "generic" });
      }).toThrow(SecurityError);
    }
  });

  it("should allow relative paths when explicitly allowed", () => {
    expect(() => {
      validator.validate(["../../data/input.json"], {
        argumentType: "filePath",
        allowRelativePaths: true,
      });
    }).not.toThrow();
  });
});

describe("ArgumentValidator - @ Syntax Validation", () => {
  const validator = new ArgumentValidator();

  it("should block @ syntax with path traversal", () => {
    const maliciousArgs = ["@../../etc/passwd", "@/../../../test"];

    for (const arg of maliciousArgs) {
      expect(() => {
        validator.validateAtSyntax(arg);
      }).toThrow(SecurityError);
    }
  });

  it("should allow safe @ syntax", () => {
    expect(() => {
      validator.validateAtSyntax("@/home/user/file.txt");
      validator.validateAtSyntax("@file.txt");
    }).not.toThrow();
  });

  it("should allow non-@ arguments", () => {
    expect(() => {
      validator.validateAtSyntax("regular-argument");
      validator.validateAtSyntax("--option=value");
    }).not.toThrow();
  });
});

describe("ArgumentValidator - Session ID Validation", () => {
  const validator = new ArgumentValidator();

  it("should allow valid session IDs", () => {
    const validIds = ["session-123", "abc_def-456", "SESSION123", "a-b_c-d-e"];

    for (const id of validIds) {
      expect(() => {
        validator.validateSessionId(id);
      }).not.toThrow();
    }
  });

  it("should block invalid session IDs", () => {
    const invalidIds = ["session.123", "a b c", "session@test", "a/b\\c"];

    for (const id of invalidIds) {
      expect(() => {
        validator.validateSessionId(id);
      }).toThrow(SecurityError);
    }
  });

  it("should block overly long session IDs", () => {
    const longId = "a".repeat(257);
    expect(() => {
      validator.validateSessionId(longId);
    }).toThrow(SecurityError);
  });
});

describe("ArgumentValidator - Gemini Requirements", () => {
  const validator = new ArgumentValidator();

  it("should validate @ syntax and session IDs together", () => {
    expect(() => {
      validator.validateWithGeminiRequirements(
        ["@/home/user/file.txt", "--session=abc-123", "Hello world"],
        { argumentType: "prompt" }
      );
    }).not.toThrow();
  });

  it("should block @ syntax with traversal in Gemini mode", () => {
    expect(() => {
      validator.validateWithGeminiRequirements(
        ["@../../etc/passwd"],
        { argumentType: "prompt" }
      );
    }).toThrow(SecurityError);
  });

  it("should block invalid session IDs in Gemini mode", () => {
    expect(() => {
      validator.validateWithGeminiRequirements(
        ["--session=invalid.id"],
        { argumentType: "prompt" }
      );
    }).toThrow(SecurityError);
  });
});

describe("ArgumentValidator - Regression Tests", () => {
  const validator = new ArgumentValidator();

  it("should allow valid relative paths when allowed", () => {
    expect(() => {
      validator.validate(["../../data/input.json"], {
        argumentType: "filePath",
        allowRelativePaths: true,
      });
    }).not.toThrow();
  });

  it("should allow multiline prompts", () => {
    const multiline = "Line 1\nLine 2\nLine 3";
    expect(() => {
      validator.validate([multiline], { argumentType: "prompt" });
    }).not.toThrow();
  });

  it("should allow Unicode characters", () => {
    expect(() => {
      validator.validate(["こんにちは 世界 🌍"], { argumentType: "prompt" });
    }).not.toThrow();
  });
});

describe("ArgumentValidator - Edge Cases", () => {
  const validator = new ArgumentValidator();

  it("should handle empty strings gracefully", () => {
    expect(() => {
      validator.validate([""], { argumentType: "generic" });
    }).not.toThrow();
  });

  it("should block overly long arguments", () => {
    const longArg = "a".repeat(10001);
    expect(() => {
      validator.validate([longArg], { argumentType: "generic" });
    }).toThrow(SecurityError);
  });

  it("should block null bytes", () => {
    expect(() => {
      validator.validate(["test\0file"], { argumentType: "generic" });
    }).toThrow(SecurityError);
  });
});

describe("AuditLogger - PII Protection", () => {
  let logger: AuditLogger;
  let logPath: string;
  let tempDir: string;

  beforeAll(() => {
    // Create a temporary directory for test logs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-test-"));
    logPath = path.join(tempDir, "test-audit.log");
    logger = new AuditLogger({
      logPath,
      createDirectory: false,
      suppressErrors: false,
    });
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should mask API keys", () => {
    const args = ["--api-key=sk-proj-1234567890abcdef1234567890abcdef12345678"];
    const sanitized = logger.sanitizeArgs(args);

    expect(sanitized).toEqual(["--api-key=[REDACTED]"]);
  });

  it("should mask tokens", () => {
    const args = ["--token=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz"];
    const sanitized = logger.sanitizeArgs(args);

    expect(sanitized).toEqual(["--token=[REDACTED]"]);
  });

  it("should truncate long arguments", () => {
    const longArg = "a".repeat(1000);
    const sanitized = logger.sanitizeArgs([longArg]);

    expect(sanitized[0].length).toBeLessThan(300);
    expect(sanitized[0]).toContain("[TRUNCATED");
  });

  it("should mask @ syntax paths", () => {
    const args = ["@/home/user/sensitive.txt"];
    const sanitized = logger.sanitizeArgs(args);

    expect(sanitized).toEqual(["@[REDACTED PATH]"]);
  });

  it("should write log entries to file", () => {
    logger.logSuccess("test-command", ["--arg", "value"]);

    expect(fs.existsSync(logPath)).toBe(true);

    const logContent = fs.readFileSync(logPath, "utf-8");
    const logEntry = JSON.parse(logContent.trim());

    expect(logEntry.command).toBe("test-command");
    expect(logEntry.status).toBe("success");
    expect(logEntry.timestamp).toBeDefined();
  });

  it("should handle all log entry types", () => {
    logger.logAttempt("test-cmd", ["arg1"]);
    logger.logBlocked("test-cmd", ["; rm -rf /"], "Command injection detected");
    logger.logFailed("test-cmd", ["--invalid"], 1, "Invalid argument");

    const logContent = fs.readFileSync(logPath, "utf-8");
    const lines = logContent.trim().split("\n");

    expect(lines.length).toBeGreaterThan(3);

    // Find entries by status instead of position
    const entries = lines.map((line) => JSON.parse(line));
    const blockedEntry = entries.find((e) => e.status === "blocked");
    const failedEntry = entries.find((e) => e.status === "failed");

    expect(blockedEntry).toBeDefined();
    expect(blockedEntry?.error).toBeDefined();
    expect(failedEntry).toBeDefined();
    expect(failedEntry?.exitCode).toBeDefined();
  });
});

describe("Convenience Functions", () => {
  it("should export validateArguments function", () => {
    expect(() => {
      validateArguments(["--help"], { argumentType: "command" });
    }).not.toThrow();
  });

  it("should export validateWithGeminiRequirements function", () => {
    expect(() => {
      validateWithGeminiRequirements(["@/file.txt"], { argumentType: "prompt" });
    }).not.toThrow();
  });
});

describe("AuditLogger - Log Rotation", () => {
  let logger: AuditLogger;
  let logPath: string;
  let tempDir: string;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-rotation-"));
    logPath = path.join(tempDir, "test-audit.log");
    logger = new AuditLogger({
      logPath,
      createDirectory: false,
      suppressErrors: false,
      maxLogSize: 1024, // 1KB for testing
      maxRotatedLogs: 3,
      enableRotation: true,
    });
  });

  afterAll(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("should rotate logs when file size exceeds max", () => {
    // Write enough logs to trigger rotation
    const largeArg = "a".repeat(500);
    for (let i = 0; i < 10; i++) {
      logger.logSuccess("test-command", [largeArg, largeArg]);
    }

    // Check that rotation occurred
    expect(fs.existsSync(logPath)).toBe(true);

    const logDir = path.dirname(logPath);
    const rotatedLog1 = path.join(logDir, "test-audit.log.1");

    // Should have at least one rotated log
    expect(fs.existsSync(rotatedLog1)).toBe(true);
  });

  it("should keep only the specified number of rotated logs", () => {
    const logDir = path.dirname(logPath);

    // Check that we don't exceed maxRotatedLogs
    for (let i = 1; i <= 10; i++) {
      const rotatedLog = path.join(logDir, `test-audit.log.${i}`);
      if (i > 3) {
        // Logs beyond maxRotatedLogs (3) should not exist
        expect(fs.existsSync(rotatedLog)).toBe(false);
      }
    }
  });

  it("should continue logging after rotation", () => {
    logger.logSuccess("another-command", ["--arg", "value"]);

    const logContent = fs.readFileSync(logPath, "utf-8");
    const lines = logContent.trim().split("\n");

    // Should have the new entry
    expect(lines.length).toBeGreaterThan(0);

    const lastEntry = JSON.parse(lines[lines.length - 1]);
    expect(lastEntry.command).toBe("another-command");
  });

  it("should not rotate when rotation is disabled", () => {
    const noRotationLogPath = path.join(tempDir, "no-rotation.log");
    const noRotationLogger = new AuditLogger({
      logPath: noRotationLogPath,
      createDirectory: false,
      suppressErrors: false,
      maxLogSize: 100, // Very small
      enableRotation: false, // Disabled
    });

    // Write a large entry
    const largeArg = "a".repeat(200);
    noRotationLogger.logSuccess("test", [largeArg]);

    // File should exist but no rotation
    expect(fs.existsSync(noRotationLogPath)).toBe(true);
    expect(fs.existsSync(noRotationLogPath + ".1")).toBe(false);

    // Clean up
    fs.unlinkSync(noRotationLogPath);
  });
});
