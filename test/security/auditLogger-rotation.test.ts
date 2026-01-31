import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AuditLogger } from "../../src/utils/auditLogger.js";

describe("AuditLogger - Log Rotation", () => {
  let tempDir: string;
  let logFile: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-rotation-test-"));
    logFile = path.join(tempDir, "audit.log");
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  });

  it("should create log file on first write", () => {
    const logger = new AuditLogger({
      logPath: logFile,
      createDirectory: false,
      enableRotation: true,
    });

    logger.logAttempt("test-cmd", ["arg1"]);

    expect(fs.existsSync(logFile)).toBe(true);
  });

  it("should append to existing log file", () => {
    const logger = new AuditLogger({
      logPath: logFile,
      createDirectory: false,
      enableRotation: true,
    });

    logger.logAttempt("cmd1", ["arg1"]);
    logger.logAttempt("cmd2", ["arg2"]);

    const content = fs.readFileSync(logFile, "utf-8");
    const lines = content.trim().split("\n");
    expect(lines.length).toBe(2);
  });

  it("should create log directory when configured", () => {
    const nestedDir = path.join(tempDir, "nested", "logs");
    const nestedLogFile = path.join(nestedDir, "audit.log");

    new AuditLogger({
      logPath: nestedLogFile,
      createDirectory: true,
      enableRotation: true,
    });

    expect(fs.existsSync(nestedDir)).toBe(true);
  });

  it("should not create directory when createDirectory is false", () => {
    const nestedDir = path.join(tempDir, "nested", "logs");
    const nestedLogFile = path.join(nestedDir, "audit.log");

    expect(() => {
      const logger = new AuditLogger({
        logPath: nestedLogFile,
        createDirectory: false,
        suppressErrors: false,
        enableRotation: true,
      });
      logger.logAttempt("test", ["arg"]);
    }).toThrow();
  });

  it("should suppress errors when configured", () => {
    const nestedDir = path.join(tempDir, "nested", "logs");
    const nestedLogFile = path.join(nestedDir, "audit.log");

    const logger = new AuditLogger({
      logPath: nestedLogFile,
      createDirectory: false,
      suppressErrors: true,
      enableRotation: true,
    });

    expect(() => {
      logger.logAttempt("test", ["arg"]);
    }).not.toThrow();
  });

  it("should include all required fields in log entry", () => {
    const logger = new AuditLogger({
      logPath: logFile,
      createDirectory: false,
      enableRotation: true,
    });

    logger.logAttempt("test-command", ["--flag", "value"]);

    const content = fs.readFileSync(logFile, "utf-8");
    const entry = JSON.parse(content.trim());

    expect(entry).toHaveProperty("timestamp");
    expect(entry).toHaveProperty("command", "test-command");
    expect(entry).toHaveProperty("args");
    expect(entry).toHaveProperty("status", "attempted");
    expect(entry).toHaveProperty("cwd");
    expect(entry).toHaveProperty("user");
  });

  it("should log different statuses correctly", () => {
    const logger = new AuditLogger({
      logPath: logFile,
      createDirectory: false,
      enableRotation: true,
    });

    logger.logAttempt("cmd1", ["arg1"]);
    logger.logBlocked("cmd2", ["arg2"], "Security violation");
    logger.logSuccess("cmd3", ["arg3"], 0);
    logger.logFailed("cmd4", ["arg4"], 1, "Command failed");

    const content = fs.readFileSync(logFile, "utf-8");
    const lines = content.trim().split("\n");

    expect(lines.length).toBe(4);

    const entries = lines.map(line => JSON.parse(line));
    expect(entries[0].status).toBe("attempted");
    expect(entries[1].status).toBe("blocked");
    expect(entries[2].status).toBe("success");
    expect(entries[3].status).toBe("failed");
  });

  it("should include error details in blocked/failed logs", () => {
    const logger = new AuditLogger({
      logPath: logFile,
      createDirectory: false,
      enableRotation: true,
    });

    logger.logBlocked("cmd", ["arg"], "Path traversal detected");
    logger.logFailed("cmd2", ["arg2"], 127, "Command not found");

    const content = fs.readFileSync(logFile, "utf-8");
    const lines = content.trim().split("\n");
    const blockedEntry = JSON.parse(lines[0]);
    const failedEntry = JSON.parse(lines[1]);

    expect(blockedEntry.error).toBe("Path traversal detected");
    expect(failedEntry.error).toBe("Command not found");
    expect(failedEntry.exitCode).toBe(127);
  });
});
