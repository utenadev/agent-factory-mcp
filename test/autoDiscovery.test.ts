import { expect, describe, it, mock, beforeAll, afterAll } from "bun:test";
import { HelpParser } from "../src/parsers/help-parser.js";

// モックを先に定義
const mockExecSync = mock((command: string) => {
  if (command.includes("test -x")) {
    return command.includes("qwen") ? "executable" : "";
  }
  if (command.includes("ls") || command.includes("dir")) {
    return "qwen\ninvalid-tool\n";
  }
  if (command.includes("--help")) {
    return 'Usage: qwen [options]\n\nOptions:\n  -m, --model <model>  Model to use [choices: "qwen-turbo", "qwen-plus"] [default: "qwen-turbo"]\n  -h, --help           display help for command';
  }
  return "";
});

// child_process をモック
mock.module("child_process", () => ({
  execSync: mockExecSync
}));

// オリジナルの PATH を保存
const originalEnvPath = process.env.PATH;

// モック定義後にインポート
import {
  checkToolCompatibility,
  discoverCompatibleTools,
  scanPathForExecutables,
} from "../src/utils/autoDiscovery.js";

describe("AutoDiscovery", () => {
  beforeAll(() => {
    process.env.PATH = "/mock/bin";
  });

  afterAll(() => {
    process.env.PATH = originalEnvPath;
  });

  describe("scanPathForExecutables", () => {
    it("should return a list of executable files", async () => {
      const executables = await scanPathForExecutables();
      expect(Array.isArray(executables)).toBe(true);
      expect(executables.length).toBeGreaterThan(0);
      expect(executables.some(e => e.includes("qwen"))).toBe(true);
    });
  });

  describe("checkToolCompatibility", () => {
    it("should return metadata for compatible tools", async () => {
      const metadata = await checkToolCompatibility("/mock/bin/qwen");
      expect(metadata).not.toBeNull();
      expect(metadata?.toolName).toBe("ask-qwen");
    });

    it("should return null for incompatible tools", async () => {
      const metadata = await checkToolCompatibility("/mock/bin/invalid-tool");
      expect(metadata).toBeNull();
    });
  });

  describe("discoverCompatibleTools", () => {
    it("should return a list of compatible tools", async () => {
      const tools = await discoverCompatibleTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0].toolName).toBe("ask-qwen");
    });
  });
});
