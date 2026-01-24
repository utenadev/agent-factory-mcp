import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { PROTOCOL } from "../constants.js";
import { Logger } from "./logger.js";

// Types
export interface ProgressNotificationParams {
  progressToken: string | number;
  progress: number;
  total?: number;
  message?: string;
  [key: string]: unknown;
}

export interface ProgressData {
  interval: NodeJS.Timeout;
  progressToken?: string | number;
}

// Progress manager state
let isProcessing = false;
let currentOperationName = "";
let latestOutput = "";

// Constants
const OUTPUT_PREVIEW_LENGTH = 150;

// Helper functions

function buildProgressParams(
  progressToken: string | number,
  progress: number,
  total?: number,
  message?: string
): ProgressNotificationParams {
  const params: ProgressNotificationParams = { progressToken, progress };
  if (total !== undefined) params.total = total;
  if (message) params.message = message;
  return params;
}

function formatProgressMessage(baseMessage: string, output: string): string {
  if (!output) return baseMessage;
  const preview = output.slice(-OUTPUT_PREVIEW_LENGTH).trim();
  return `${baseMessage}\n📝 Output: ...${preview}`;
}

function createProgressMessages(operation: string): string[] {
  return [
    `🧠 ${operation} - Qwen is analyzing your request...`,
    `📊 ${operation} - Processing files and generating insights...`,
    `✨ ${operation} - Creating structured response for your review...`,
    `⏱️ ${operation} - Large analysis in progress (this is normal for big requests)...`,
    `🔍 ${operation} - Still working... Qwen takes time for quality results...`,
  ];
}

function getCompletionMessage(operationName: string, success: boolean): string {
  return success
    ? `✅ ${operationName} completed successfully`
    : `❌ ${operationName} failed`;
}

function createProgressData(interval: NodeJS.Timeout, progressToken?: string | number): ProgressData {
  return progressToken !== undefined
    ? { interval, progressToken }
    : { interval };
}

export const ProgressManager = {
  /**
   * Send a progress notification to the client
   */
  async sendNotification(
    server: Server,
    progressToken: string | number | undefined,
    progress: number,
    total?: number,
    message?: string
  ): Promise<void> {
    if (!progressToken) return;

    try {
      await server.notification({
        method: PROTOCOL.NOTIFICATIONS.PROGRESS,
        params: buildProgressParams(progressToken, progress, total, message),
      });
    } catch (error) {
      Logger.error("Failed to send progress notification:", error);
    }
  },

  /**
   * Update the latest output for progress tracking
   */
  updateOutput(output: string): void {
    latestOutput = output;
  },

  /**
   * Start progress updates for an operation
   */
  startUpdates(
    server: Server,
    operationName: string,
    progressToken?: string | number
  ): ProgressData {
    // Initialize state
    isProcessing = true;
    currentOperationName = operationName;
    latestOutput = "";

    const progressMessages = createProgressMessages(operationName);
    let messageIndex = 0;
    let progress = 0;

    // Send initial acknowledgment
    if (progressToken) {
      this.sendNotification(server, progressToken, 0, undefined, `🔍 Starting ${operationName}`);
    }

    // Setup periodic progress updates
    const progressInterval = setInterval(async () => {
      if (!isProcessing) {
        clearInterval(progressInterval);
        return;
      }

      if (!progressToken) return;

      progress += 1;
      const baseMessage = progressMessages[messageIndex % progressMessages.length]!;
      const message = formatProgressMessage(baseMessage, latestOutput);

      await this.sendNotification(server, progressToken, progress, undefined, message);
      messageIndex++;
    }, PROTOCOL.KEEPALIVE_INTERVAL);

    return createProgressData(progressInterval, progressToken);
  },

  /**
   * Stop progress updates for an operation
   */
  stopUpdates(server: Server, progressData: ProgressData, success = true): void {
    const operationName = currentOperationName || "Operation";

    // Reset state
    isProcessing = false;
    currentOperationName = "";
    clearInterval(progressData.interval);

    // Send completion notification
    if (progressData.progressToken) {
      this.sendNotification(
        server,
        progressData.progressToken,
        100,
        100,
        getCompletionMessage(operationName, success)
      );
    }
  },
};
