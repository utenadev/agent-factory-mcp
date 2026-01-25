import { spawn } from "child_process";
import { Logger } from "./logger.js";

// Default timeout: 10 minutes (600000ms)
const DEFAULT_COMMAND_TIMEOUT = 600000;

export async function executeCommand(
  command: string,
  args: string[],
  onProgress?: (newOutput: string) => void,
  timeoutMs: number = DEFAULT_COMMAND_TIMEOUT
): Promise<string> {
  return new Promise((resolve, reject) => {
    Logger.debug(`Executing command: ${command} ${args.join(" ")}`);

    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    child.stdin.end();
    let output = "";
    let errorOutput = "";

    // Set up timeout
    const timeoutId = setTimeout(() => {
      Logger.error(`Command timeout after ${timeoutMs}ms, killing process`);
      child.kill("SIGTERM");
      reject(new Error(`Command execution timeout (${timeoutMs}ms)`));
    }, timeoutMs);

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
        resolve(output.trim());
      } else {
        const errorMsg = errorOutput || `Command exited with code ${code}`;
        Logger.error(`Command failed with code ${code}: ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    });

    child.on("error", error => {
      clearTimeout(timeoutId);
      Logger.error("Command execution error:", error);
      reject(error);
    });
  });
}
