import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { CliToolMetadata } from "../types/cli-metadata.js";
import { Logger } from "./logger.js";

const CACHE_DIR = path.join(os.homedir(), ".agent-factory-mcp");
const CACHE_FILE = path.join(CACHE_DIR, "tools-cache.json");
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheData {
  lastUpdated: number;
  tools: CliToolMetadata[];
}

export class CacheManager {
  /**
   * Loads discovered tools from cache if valid.
   */
  static load(): CliToolMetadata[] | null {
    try {
      if (!fs.existsSync(CACHE_FILE)) {
        return null;
      }

      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      const data: CacheData = JSON.parse(raw);

      if (Date.now() - data.lastUpdated > CACHE_TTL_MS) {
        Logger.debug("Cache expired");
        return null;
      }

      Logger.debug(`Loaded ${data.tools.length} tools from cache`);
      return data.tools;
    } catch (error) {
      Logger.debug(`Failed to load cache: ${error}`);
      return null;
    }
  }

  /**
   * Saves discovered tools to cache.
   */
  static save(tools: CliToolMetadata[]): void {
    try {
      if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
      }

      const data: CacheData = {
        lastUpdated: Date.now(),
        tools,
      };

      fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
      Logger.debug(`Saved ${tools.length} tools to cache`);
    } catch (error) {
      Logger.error(`Failed to save cache: ${error}`);
    }
  }

  /**
   * Clears the cache.
   */
  static clear(): void {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
        Logger.debug("Cache cleared");
      }
    } catch (error) {
      Logger.error(`Failed to clear cache: ${error}`);
    }
  }
}
