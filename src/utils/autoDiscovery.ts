import { execSync } from "child_process";
import { HelpParser } from "../parsers/help-parser.js";
import type { CliToolMetadata } from "../types/cli-metadata.js";
import { Logger } from "./logger.js";

// AI Agentツールのホワイトリスト
const AI_TOOL_WHITELIST = new Set([
  "qwen",
  "aider",
  "gemini",
  "opencode",
  "crush",
  "vibe",
]);

/**
 * Scans the user's PATH for executable CLI tools.
 * @returns List of executable file paths.
 */
export async function scanPathForExecutables(): Promise<string[]> {
  try {
    const pathEnv = process.env.PATH || "";
    const pathDirs = pathEnv.split(process.platform === "win32" ? ";" : ":");

    const executables: string[] = [];

    for (const dir of pathDirs) {
      try {
        const filesInDir =
          process.platform === "win32"
            ? execSync(`dir "${dir}" /b /a-d 2> nul || echo ""`)
                .toString()
                .split("\n")
                .map(file => file.trim())
            : execSync(`ls "${dir}" 2> /dev/null || echo ""`)
                .toString()
                .split("\n")
                .map(file => file.trim());

        for (const file of filesInDir) {
          if (!file) continue;

          const filePath = `${dir}/${file}`;
          if (process.platform !== "win32") {
            try {
              execSync(`test -x "${filePath}" && echo "executable"`);
              executables.push(filePath);
            } catch {}
          } else if (file.match(/\.(exe|cmd|bat)$/i)) {
            executables.push(filePath);
          }
        }
      } catch {}
    }

    return [...new Set(executables)];
  } catch (error) {
    Logger.error(`Failed to scan PATH: ${error}`);
    return [];
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
    const commandName = executablePath.split("/").pop() || executablePath;
    if (!AI_TOOL_WHITELIST.has(commandName)) {
      return null;
    }

    const helpOutput = execSync(`"${executablePath}" --help 2> /dev/null || echo ""`, {
      timeout: 5000,
    }).toString();
    const metadata = HelpParser.parse(commandName, helpOutput);

    if (!metadata || !metadata.toolName || !metadata.command) {
      return null;
    }

    return metadata;
  } catch (error) {
    Logger.debug(`Tool ${executablePath} is not compatible: ${error}`);
    return null;
  }
}

/**
 * Discovers compatible CLI tools from PATH and returns their metadata.
 * @returns List of compatible CliToolMetadata.
 */
export async function discoverCompatibleTools(): Promise<CliToolMetadata[]> {
  const executables = await scanPathForExecutables();
  const compatibleTools: CliToolMetadata[] = [];

  for (const executable of executables) {
    const metadata = await checkToolCompatibility(executable);
    if (metadata) {
      compatibleTools.push(metadata);
    }
  }

  return compatibleTools;
}
