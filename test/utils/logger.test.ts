import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../../src/utils/logger.js";

describe("Logger", () => {
  const originalEnv = process.env;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DEBUG;
    delete process.env.NO_COLOR;
    delete process.env.TERM;

    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("Basic logging methods", () => {
    it("info() should log with blue color", () => {
      Logger.info("test message");
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain("test message");
    });

    it("warn() should log with yellow color", () => {
      Logger.warn("warning message");
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.mock.calls[0][0]).toContain("warning message");
    });

    it("error() should log with red color", () => {
      Logger.error("error message");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain("error message");
    });

    it("success() should log with green color", () => {
      Logger.success("success message");
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain("success message");
    });

    it("should handle multiple arguments", () => {
      Logger.info("arg1", "arg2", 123);
      expect(logSpy).toHaveBeenCalledTimes(1);
      const callArg = logSpy.mock.calls[0][0];
      expect(callArg).toContain("arg1");
    });
  });

  describe("Debug logging", () => {
    it("debug() should not log when DEBUG is not set", () => {
      Logger.debug("debug message");
      expect(logSpy).not.toHaveBeenCalled();
    });

    it("debug() should log when DEBUG is set", () => {
      process.env.DEBUG = "true";
      Logger.debug("debug message");
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain("debug message");
    });

    it("debug() should log with gray color", () => {
      process.env.DEBUG = "1";
      Logger.debug("debug message");
      expect(logSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("Tool invocation logging", () => {
    it("toolInvocation() should log tool name and arguments", () => {
      const toolName = "test-tool";
      const args = { prompt: "test", model: "gpt-4" };

      Logger.toolInvocation(toolName, args);

      expect(logSpy).toHaveBeenCalledTimes(1);
      const callArg = logSpy.mock.calls[0][0];
      expect(callArg).toContain("[TOOL]");
      expect(callArg).toContain(toolName);
      expect(callArg).toContain("test");
    });

    it("toolInvocation() should format JSON arguments", () => {
      const args = { key: "value", nested: { prop: 123 } };
      Logger.toolInvocation("my-tool", args);

      expect(logSpy).toHaveBeenCalledTimes(1);
      const callArg = logSpy.mock.calls[0][0];
      expect(callArg).toContain('"key": "value"');
    });
  });

  describe("Log prefix", () => {
    it("should include LOG_PREFIX in all log outputs", () => {
      Logger.info("message");
      expect(logSpy.mock.calls[0][0]).toMatch(/\[QWENCMP\]/);
    });
  });
});
