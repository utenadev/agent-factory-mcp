import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditLogger } from "../../src/utils/auditLogger.js";

describe("AuditLogger - PII Masking", () => {
  let logger: AuditLogger;
  let tempDir: string;
  let logFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-test-"));
    logFile = path.join(tempDir, "audit.log");
    logger = new AuditLogger({
      logPath: logFile,
      createDirectory: false,
      suppressErrors: false,
      maxPromptLogLength: 200,
    });
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  describe("API Key Masking", () => {
    it("should mask --api-key value", () => {
      const result = logger.sanitizeArgument("--api-key=sk-1234567890abcdef");
      expect(result).toBe("--api-key=[REDACTED]");
    });

    it("should mask --token value", () => {
      const result = logger.sanitizeArgument("--token=ghp_abcdefghijklmnop");
      expect(result).toBe("--token=[REDACTED]");
    });

    it("should mask -k short flag value", () => {
      const result = logger.sanitizeArgument("-k=secret-api-key-value");
      expect(result).toBe("-k=[REDACTED]");
    });

    it("should mask --password value", () => {
      const result = logger.sanitizeArgument("--password=mySecret123");
      expect(result).toBe("--password=[REDACTED]");
    });

    it("should mask --secret value", () => {
      const result = logger.sanitizeArgument("--secret=super-secret-value");
      expect(result).toBe("--secret=[REDACTED]");
    });

    it("should mask --auth-key value", () => {
      const result = logger.sanitizeArgument("--auth-key=auth123456789");
      expect(result).toBe("--auth-key=[REDACTED]");
    });
  });

  describe("Token Masking", () => {
    it("should mask bearer token", () => {
      const result = logger.sanitizeArgument(
        "Authorization: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
      );
      expect(result).toBe("[REDACTED]");
    });

    it("should mask OpenAI API key", () => {
      const result = logger.sanitizeArgument(
        "sk-abcdefghijklmnopqrstuvwxyz1234567890123456789012345678"
      );
      expect(result).toBe("[REDACTED]");
    });

    it("should mask Google API key", () => {
      const result = logger.sanitizeArgument("AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI");
      expect(result).toBe("[REDACTED]");
    });

    it("should mask GitHub personal access token", () => {
      const result = logger.sanitizeArgument("ghp_1234567890abcdefghijklmnopqrstuvwxyz12");
      expect(result).toBe("[REDACTED]");
    });

    it("should mask Slack bot token", () => {
      const result = logger.sanitizeArgument(
        "xoxb-DUMMYTEST-1234567890123-4567890123456-XXXXXXXXXXXXXXXXXXXXXX"
      );
      expect(result).toBe("[REDACTED]");
    });
  });

  describe("Path Masking", () => {
    it("should mask @ syntax paths", () => {
      const result = logger.sanitizeArgument("@/home/user/sensitive/file.txt");
      expect(result).toBe("@[REDACTED PATH]");
    });

    it("should not mask @ without path separator", () => {
      const result = logger.sanitizeArgument("@username");
      expect(result).toBe("@username");
    });
  });

  describe("Argument Truncation", () => {
    it("should truncate long arguments", () => {
      const longArg = "a".repeat(500);
      const result = logger.sanitizeArgument(longArg);
      expect(result).toContain("[TRUNCATED");
      expect(result.length).toBeLessThan(250);
    });

    it("should not truncate short arguments", () => {
      const shortArg = "short argument";
      const result = logger.sanitizeArgument(shortArg);
      expect(result).toBe(shortArg);
    });
  });

  describe("SanitizeArgs Array", () => {
    it("should sanitize multiple arguments", () => {
      const args = [
        "--api-key=secret123",
        "--model=gpt-4",
        "--token=ghp_1234567890abcdefghijklmnopqrstuvwxyz12",
        "prompt text",
      ];
      const result = logger.sanitizeArgs(args);
      expect(result[0]).toBe("--api-key=[REDACTED]");
      expect(result[1]).toBe("--model=gpt-4");
      expect(result[2]).toBe("--token=[REDACTED]");
      expect(result[3]).toBe("prompt text");
    });

    it("should handle empty array", () => {
      const result = logger.sanitizeArgs([]);
      expect(result).toEqual([]);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string", () => {
      const result = logger.sanitizeArgument("");
      expect(result).toBe("");
    });

    it("should handle already masked data", () => {
      const result = logger.sanitizeArgument("[REDACTED]");
      expect(result).toBe("[REDACTED]");
    });

    it("should handle arguments without sensitive data", () => {
      const result = logger.sanitizeArgument("--verbose --output=json");
      expect(result).toBe("--verbose --output=json");
    });

    it("should handle mixed case patterns", () => {
      const result = logger.sanitizeArgument("--API-KEY=secret");
      expect(result).toBe("--API-KEY=[REDACTED]");
    });

    it("should handle arguments with special characters", () => {
      const result = logger.sanitizeArgument('--config={"key": "value"}');
      expect(result).toBe('--config={"key": "value"}');
    });
  });
});
