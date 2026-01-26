import { describe, it, expect } from "vitest";
// import assert from "node:assert"; // Using expect from vitest instead
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("systemPrompt support", async () => {
  let ConfigLoader;
  const testDir = tmpdir();

  function cleanupTestFiles() {
    const testFiles = [
      join(testDir, "ai-tools.json"),
    ];
    for (const file of testFiles) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    }
  }

  it("should load config with systemPrompt", async () => {
    const module = await import("../dist/utils/configLoader.js");
    ConfigLoader = module.ConfigLoader;

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

    try {
      const result = ConfigLoader.load(testDir);

      expect(result.config).toBeDefined();
      expect(result.error).toBe(null);
      expect(result.config.tools.length).toBe(1);
      expect(result.config.tools[0].systemPrompt).toBe("You are a senior code reviewer. Focus on security and performance.");
    } finally {
      cleanupTestFiles();
    }
  });

  it("should apply systemPrompt to metadata", async () => {
    const { GenericCliProvider } = await import("../dist/providers/generic-cli.provider.js");

    const config = {
      command: "qwen",
      enabled: true,
      systemPrompt: "You are a helpful coding assistant.",
    };

    const provider = await GenericCliProvider.create(config);
    expect(provider).toBeDefined();

    const metadata = provider.getMetadata();
    expect(metadata.systemPrompt).toBe("You are a helpful coding assistant.");
  });
});
