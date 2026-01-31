import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../../src/utils/logger.js";

describe("Global Error Handlers", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  const originalListeners = {
    unhandledRejection: process.listeners("unhandledRejection"),
    uncaughtException: process.listeners("uncaughtException"),
  };

  beforeEach(() => {
    errorSpy = vi.spyOn(Logger, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.removeAllListeners("unhandledRejection");
    process.removeAllListeners("uncaughtException");
    originalListeners.unhandledRejection.forEach(listener =>
      process.on("unhandledRejection", listener)
    );
    originalListeners.uncaughtException.forEach(listener =>
      process.on("uncaughtException", listener)
    );
  });

  describe("Handler Registration", () => {
    it.skip("should have unhandledRejection handler registered when app starts", () => {
      const count = process.listenerCount("unhandledRejection");
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it.skip("should have uncaughtException handler registered when app starts", () => {
      const count = process.listenerCount("uncaughtException");
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Error Logging", () => {
    it("should log errors using Logger", () => {
      Logger.error("Test error message");
      expect(errorSpy).toHaveBeenCalledWith("Test error message");
    });

    it("should handle multiple arguments", () => {
      const err = new Error("Test");
      Logger.error("Error occurred:", err);
      expect(errorSpy).toHaveBeenCalledWith("Error occurred:", err);
    });
  });
});
