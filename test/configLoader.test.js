import { describe, it } from "node:test";
import assert from "node:assert";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("ConfigLoader", async () => {
  let ConfigLoader;
  const testDir = tmpdir();

  function cleanupTestFiles() {
    const testFiles = [
      join(testDir, "ai-tools.json"),
      join(testDir, ".qwencoderc.json"),
      join(testDir, "qwencode.config.json"),
    ];
    for (const file of testFiles) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    }
  }

  it("should import ConfigLoader module", async () => {
    const module = await import("../dist/utils/configLoader.js");
    ConfigLoader = module.ConfigLoader;
    assert.ok(ConfigLoader);
  });

  it("should return null when no config file exists", async () => {
    if (!ConfigLoader) {
      const module = await import("../dist/utils/configLoader.js");
      ConfigLoader = module.ConfigLoader;
    }

    // Use /tmp which likely won't have our config files
    const result = ConfigLoader.load("/tmp");

    assert.strictEqual(result.config, null);
    assert.strictEqual(result.configPath, null);
    assert.strictEqual(result.error, null);
  });

  it("should load valid ai-tools.json", async () => {
    if (!ConfigLoader) {
      const module = await import("../dist/utils/configLoader.js");
      ConfigLoader = module.ConfigLoader;
    }

    const testConfig = {
      version: "1.0",
      tools: [
        {
          command: "qwen",
          enabled: true,
          alias: "ask-qwen",
        },
      ],
    };

    const configPath = join(testDir, "ai-tools.json");
    writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

    try {
      const result = ConfigLoader.load(testDir);

      assert.ok(result.config);
      assert.ok(result.configPath);
      assert.strictEqual(result.error, null);
      assert.strictEqual(result.config.tools.length, 1);
      assert.strictEqual(result.config.tools[0].command, "qwen");
    } finally {
      cleanupTestFiles();
    }
  });

  it("should load valid .qwencoderc.json", async () => {
    if (!ConfigLoader) {
      const module = await import("../dist/utils/configLoader.js");
      ConfigLoader = module.ConfigLoader;
    }

    const testConfig = {
      version: "1.0",
      tools: [
        {
          command: "ollama",
        },
      ],
    };

    const configPath = join(testDir, ".qwencoderc.json");
    writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

    try {
      const result = ConfigLoader.load(testDir);

      assert.ok(result.config);
      assert.ok(result.configPath);
      assert.ok(result.configPath.includes(".qwencoderc.json"));
    } finally {
      cleanupTestFiles();
    }
  });

  it("should prioritize ai-tools.json over other files", async () => {
    if (!ConfigLoader) {
      const module = await import("../dist/utils/configLoader.js");
      ConfigLoader = module.ConfigLoader;
    }

    const config1 = {
      version: "1.0",
      tools: [{ command: "qwen" }],
    };
    const config2 = {
      version: "1.0",
      tools: [{ command: "ollama" }],
    };

    writeFileSync(join(testDir, "ai-tools.json"), JSON.stringify(config1));
    writeFileSync(join(testDir, ".qwencoderc.json"), JSON.stringify(config2));

    try {
      const result = ConfigLoader.load(testDir);

      assert.ok(result.config);
      assert.strictEqual(result.config.tools[0].command, "qwen");
      assert.ok(result.configPath.includes("ai-tools.json"));
    } finally {
      cleanupTestFiles();
    }
  });

  it("should return error for invalid JSON", async () => {
    if (!ConfigLoader) {
      const module = await import("../dist/utils/configLoader.js");
      ConfigLoader = module.ConfigLoader;
    }

    const configPath = join(testDir, "ai-tools.json");
    writeFileSync(configPath, "{invalid json}");

    try {
      const result = ConfigLoader.load(testDir);

      assert.strictEqual(result.config, null);
      assert.ok(result.configPath);
      assert.ok(result.error);
      assert.ok(result.error.includes("Failed to load config"));
    } finally {
      cleanupTestFiles();
    }
  });

  it("should validate schema and return error for missing command", async () => {
    if (!ConfigLoader) {
      const module = await import("../dist/utils/configLoader.js");
      ConfigLoader = module.ConfigLoader;
    }

    const testConfig = {
      version: "1.0",
      tools: [
        {
          enabled: true,
          // Missing required 'command' field
        },
      ],
    };

    const configPath = join(testDir, "ai-tools.json");
    writeFileSync(configPath, JSON.stringify(testConfig, null, 2));

    try {
      const result = ConfigLoader.load(testDir);

      assert.strictEqual(result.config, null);
      assert.ok(result.error);
      assert.ok(result.error.includes("Invalid configuration"));
    } finally {
      cleanupTestFiles();
    }
  });

  it("should generate JSON schema", async () => {
    if (!ConfigLoader) {
      const module = await import("../dist/utils/configLoader.js");
      ConfigLoader = module.ConfigLoader;
    }

    const schema = ConfigLoader.getJsonSchema();

    assert.ok(schema);
    assert.ok(schema.properties);
    assert.ok(schema.properties.tools);
  });
});
