import { describe, it } from "node:test";
import assert from "node:assert";
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

      assert.ok(result.config);
      assert.strictEqual(result.error, null);
      assert.strictEqual(result.config.tools.length, 1);
      assert.strictEqual(result.config.tools[0].systemPrompt, "You are a senior code reviewer. Focus on security and performance.");
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
    assert.ok(provider);

    const metadata = provider.getMetadata();
    assert.strictEqual(metadata.systemPrompt, "You are a helpful coding assistant.");
  });
});
