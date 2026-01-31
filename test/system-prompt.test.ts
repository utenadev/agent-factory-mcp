import { describe, it, expect, vi, afterEach } from "vitest";
import { writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigLoader } from "../src/utils/configLoader.js";
import { GenericCliProvider } from "../src/providers/generic-cli.provider.js";

describe("systemPrompt support", () => {
  let testDir: string;

  afterEach(() => {
    vi.restoreAllMocks();
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should load config with systemPrompt", () => {
    testDir = join(tmpdir(), `system-prompt-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    const testConfig = {
      version: "1.0",
      tools: [
        {
          command: "qwen",
          enabled: true,
          alias: "code-reviewer",
          description: "Code review expert",
          systemPrompt: "You are a senior code reviewer. Focus on security and performance.",
        },
      ],
    };

    const configPath = join(testDir, "ai-tools.json");
    writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

    const result = ConfigLoader.load(testDir);

    expect(result.config).toBeDefined();
    expect(result.error).toBe(null);
    expect(result.config?.tools.length).toBe(1);
    expect(result.config?.tools[0].systemPrompt).toBe("You are a senior code reviewer. Focus on security and performance.");
  });

  it("should apply systemPrompt to metadata", async () => {
    // Mock isCommandAvailable to always return true
    vi.spyOn(GenericCliProvider as any, "isCommandAvailable").mockResolvedValue(true);

    const config = {
      command: "qwen",
      enabled: true,
      systemPrompt: "You are a helpful coding assistant.",
    };

    const provider = await GenericCliProvider.create(config);
    expect(provider).toBeDefined();

    if (provider) {
       const metadata = provider.getMetadata();
       expect(metadata.systemPrompt).toBe("You are a helpful coding assistant.");
    }
  });
});