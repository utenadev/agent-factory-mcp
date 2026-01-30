import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ProgressData, ProgressManager } from "../../src/utils/progressManager.js";

describe("ProgressManager", () => {
  let mockServer: Server;
  let notificationSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    notificationSpy = vi.fn().mockResolvedValue(undefined);
    mockServer = {
      notification: notificationSpy,
    } as unknown as Server;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("sendNotification", () => {
    it("should send notification with progress token", async () => {
      await ProgressManager.sendNotification(mockServer, "token-123", 50, 100, "test message");

      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(notificationSpy).toHaveBeenCalledWith({
        method: "notifications/progress",
        params: {
          progressToken: "token-123",
          progress: 50,
          total: 100,
          message: "test message",
        },
      });
    });

    it("should skip notification when no progress token", async () => {
      await ProgressManager.sendNotification(mockServer, undefined, 50);

      expect(notificationSpy).not.toHaveBeenCalled();
    });

    it("should handle numeric progress token", async () => {
      await ProgressManager.sendNotification(mockServer, 42, 25);

      expect(notificationSpy).toHaveBeenCalledWith({
        method: "notifications/progress",
        params: {
          progressToken: 42,
          progress: 25,
        },
      });
    });
  });

  describe("updateOutput", () => {
    it("should store output for progress messages", () => {
      ProgressManager.updateOutput("test output");

      const progressData = ProgressManager.startUpdates(mockServer, "test-op", "token");

      vi.advanceTimersByTime(25000);

      ProgressManager.stopUpdates(mockServer, progressData, true);

      const lastCall = notificationSpy.mock.calls[notificationSpy.mock.calls.length - 1];
      expect(lastCall[0].params.message).toContain("test-op");

      clearInterval(progressData.interval);
    });
  });

  describe("startUpdates", () => {
    it("should return progress data with interval", () => {
      const progressData = ProgressManager.startUpdates(mockServer, "my-operation", "token-1");

      expect(progressData).toHaveProperty("interval");
      expect(progressData.progressToken).toBe("token-1");

      clearInterval(progressData.interval);
    });

    it("should send initial notification", () => {
      ProgressManager.startUpdates(mockServer, "my-operation", "token-1");

      expect(notificationSpy).toHaveBeenCalledTimes(1);
      expect(notificationSpy.mock.calls[0][0].params.message).toContain("Starting my-operation");

      clearInterval((notificationSpy.mock.calls[0] as unknown as ProgressData).interval);
    });

    it("should work without progress token", () => {
      const progressData = ProgressManager.startUpdates(mockServer, "my-operation");

      expect(progressData.progressToken).toBeUndefined();

      vi.advanceTimersByTime(25000);

      expect(notificationSpy).not.toHaveBeenCalled();

      clearInterval(progressData.interval);
    });
  });

  describe("stopUpdates", () => {
    it("should clear interval and send completion", () => {
      const progressData = ProgressManager.startUpdates(mockServer, "my-operation", "token-1");

      const clearIntervalSpy = vi.spyOn(global, "clearInterval");

      ProgressManager.stopUpdates(mockServer, progressData, true);

      expect(clearIntervalSpy).toHaveBeenCalledWith(progressData.interval);
      expect(notificationSpy).toHaveBeenLastCalledWith({
        method: "notifications/progress",
        params: {
          progressToken: "token-1",
          progress: 100,
          total: 100,
          message: "✅ my-operation completed successfully",
        },
      });
    });

    it("should send failure message on unsuccessful completion", () => {
      const progressData = ProgressManager.startUpdates(mockServer, "my-operation", "token-1");

      ProgressManager.stopUpdates(mockServer, progressData, false);

      const lastCall = notificationSpy.mock.calls[notificationSpy.mock.calls.length - 1];
      expect(lastCall[0].params.message).toContain("❌");
      expect(lastCall[0].params.message).toContain("failed");
    });
  });

  describe("progress message rotation", () => {
    it("should rotate through progress messages over time", () => {
      ProgressManager.startUpdates(mockServer, "test-op", "token-1");

      const initialCalls = notificationSpy.mock.calls.length;

      vi.advanceTimersByTime(75000);

      expect(notificationSpy.mock.calls.length).toBeGreaterThan(initialCalls);

      const messages = notificationSpy.mock.calls.map(call => call[0].params.message);
      const hasDifferentMessages = messages.some((msg, i) => i > 0 && msg !== messages[0]);
      expect(hasDifferentMessages || messages.length > 2).toBe(true);
    });
  });
});
