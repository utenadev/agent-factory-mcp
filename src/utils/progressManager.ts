import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { PROTOCOL } from "../constants.js";
import { Logger } from "./logger.js";

// Progress notification parameters type
export interface ProgressNotificationParams {
  progressToken: string | number;
  progress: number;
  total?: number;
  message?: string;
  [key: string]: unknown;
}

// Progress data returned from startProgressUpdates
export interface ProgressData {
  interval: NodeJS.Timeout;
  progressToken?: string | number;
}

// Progress manager state
let isProcessing = false;
let currentOperationName = "";
let latestOutput = "";

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
      const params: ProgressNotificationParams = {
        progressToken,
        progress
      };

      if (total !== undefined) params.total = total;
      if (message) params.message = message;

      await server.notification({
        method: PROTOCOL.NOTIFICATIONS.PROGRESS,
        params
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
    isProcessing = true;
    currentOperationName = operationName;
    latestOutput = "";

    const progressMessages = [
      `🧠 ${operationName} - Qwen is analyzing your request...`,
      `📊 ${operationName} - Processing files and generating insights...`,
      `✨ ${operationName} - Creating structured response for your review...`,
      `⏱️ ${operationName} - Large analysis in progress (this is normal for big requests)...`,
      `🔍 ${operationName} - Still working... Qwen takes time for quality results...`,
    ];

    let messageIndex = 0;
    let progress = 0;

    // Send immediate acknowledgment
    if (progressToken) {
      this.sendNotification(
        server,
        progressToken,
        0,
        undefined,
        `🔍 Starting ${operationName}`
      );
    }

    // Keep client alive with periodic updates
    const progressInterval = setInterval(async () => {
      if (isProcessing && progressToken) {
        progress += 1;

        const baseMessage = progressMessages[messageIndex % progressMessages.length];
        const outputPreview = latestOutput.slice(-150).trim();
        const message = outputPreview
          ? `${baseMessage}\n📝 Output: ...${outputPreview}`
          : baseMessage;

        await this.sendNotification(
          server,
          progressToken,
          progress,
          undefined,
          message
        );
        messageIndex++;
      } else if (!isProcessing) {
        clearInterval(progressInterval);
      }
    }, PROTOCOL.KEEPALIVE_INTERVAL);

    const result: ProgressData = { interval: progressInterval };
    if (progressToken !== undefined) {
      result.progressToken = progressToken;
    }
    return result;
  },

  /**
   * Stop progress updates for an operation
   */
  stopUpdates(
    server: Server,
    progressData: ProgressData,
    success: boolean = true
  ): void {
    const operationName = currentOperationName;
    isProcessing = false;
    currentOperationName = "";
    clearInterval(progressData.interval);

    if (progressData.progressToken) {
      this.sendNotification(
        server,
        progressData.progressToken,
        100,
        100,
        success ? `✅ ${operationName} completed successfully` : `❌ ${operationName} failed`
      );
    }
  },
};
