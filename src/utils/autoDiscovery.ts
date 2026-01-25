import { execSync } from "child_process";
import { HelpParser } from "../parsers/help-parser.js";
import type { CliToolMetadata } from "../types/cli-metadata.js";
import { Logger } from "./logger.js";

// AI Agentツールのホワイトリスト
// 安全性とパフォーマンスのために、既知のAIツールのみを検出対象とします
const AI_TOOL_WHITELIST = new Set([
  "claude",
  "opencode",
  "gemini",
]);

/**
 * Checks if a specific command exists in the PATH.
 * @param command The command name to look for.
 * @returns The full path to the executable if found, null otherwise.
 */
export function findExecutable(command: string): string | null {
  try {
    const checkCommand = process.platform === "win32" ? "where" : "which";
    const result = execSync(`${checkCommand} "${command}" 2> /dev/null || echo ""`).toString().trim();
    
    if (!result) return null;

    // "where" command on Windows might return multiple paths, take the first one
    const paths = result.split(/\r?\n/);
    return paths[0] || null;
  } catch (error) {
    return null;
  }
}

/**
 * Attempts to get the version of a CLI tool.
 * @param executablePath Path to the executable.
 * @returns Version string if found, undefined otherwise.
 */
export function getToolVersion(executablePath: string): string | undefined {
  try {
    const versionOutput = execSync(`"${executablePath}" --version 2> /dev/null || "${executablePath}" -v 2> /dev/null || echo ""`, {
      timeout: 5000,
    }).toString().trim();
    
    if (!versionOutput) return undefined;

    // Simple regex to find something that looks like a version number (e.g., 1.2.3, v0.1.0, 0.25.2)
    const versionMatch = versionOutput.match(/(v?\d+\.\d+(\.\d+)?(-[\w\.]+)*)/i);
    const version = versionMatch ? versionMatch[0] : versionOutput.split('\n')[0]?.trim();
    
    if (version) {
      Logger.debug(`Detected version for ${executablePath}: ${version}`);
    }
    return version || undefined;
  } catch (error) {
    return undefined;
  }
}

/**
 * Checks if a CLI tool is compatible (has --help output that can be parsed).
 * @param executablePath Path to the executable.
 * @returns CliToolMetadata if compatible, null otherwise.
 */
export async function checkToolCompatibility(
  executablePath: string
): Promise<CliToolMetadata | null> {
  try {
    // Extract command name from path (e.g., /usr/bin/opencode -> opencode)
    const commandName = process.platform === "win32" 
      ? executablePath.split("\\").pop()?.split(".")[0] || executablePath
      : executablePath.split("/").pop() || executablePath;

    if (!AI_TOOL_WHITELIST.has(commandName)) {
        // Double check against whitelist just in case
        return null;
    }

    const helpOutput = execSync(`"${executablePath}" --help 2> /dev/null || echo ""`, {
      timeout: 10000,
    }).toString();
    const metadata = HelpParser.parse(commandName, helpOutput);

    if (!metadata || !metadata.toolName || !metadata.command) {
      return null;
    }

    // Attempt to get version
    metadata.version = getToolVersion(executablePath);

    return metadata;
  } catch (error) {
    Logger.debug(`Tool ${executablePath} is not compatible: ${error}`);
    return null;
  }
}

/**
 * Discovers compatible CLI tools based on the whitelist.
 * Efficiently checks for the existence of known tools instead of scanning the entire PATH.
 * @returns List of compatible CliToolMetadata.
 */
export async function discoverCompatibleTools(): Promise<CliToolMetadata[]> {
  const compatibleTools: CliToolMetadata[] = [];

  Logger.debug(`Starting discovery for tools: ${Array.from(AI_TOOL_WHITELIST).join(", ")}`);

  for (const toolName of AI_TOOL_WHITELIST) {
    const executablePath = findExecutable(toolName);
    
    if (executablePath) {
      Logger.debug(`Found executable for ${toolName}: ${executablePath}`);
      const metadata = await checkToolCompatibility(executablePath);
      if (metadata) {
        compatibleTools.push(metadata);
      }
    } else {
        Logger.debug(`Executable not found for: ${toolName}`);
    }
  }

  return compatibleTools;
}
