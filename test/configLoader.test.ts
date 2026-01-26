import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFileSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConfigLoader } from "../src/utils/configLoader";

describe("ConfigLoader", () => {
  let testDir: string;

  beforeEach(() => {
    // Create a unique temporary directory for each test
    testDir = join(tmpdir(), `config-loader-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup the temporary directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it("should import ConfigLoader module", () => {
    expect(ConfigLoader).toBeDefined();
  });

  it("should return null when no config file exists", () => {
    // Use the empty testDir
    const result = ConfigLoader.load(testDir);

    expect(result.config).toBe(null);
    expect(result.configPath).toBe(null);
    expect(result.error).toBe(null);
  });

  it("should load valid ai-tools.json", () => {
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

    const result = ConfigLoader.load(testDir);

    expect(result.config).toBeDefined();
    expect(result.configPath).toBeDefined();
    expect(result.error).toBe(null);
    expect(result.config?.tools.length).toBe(1);
    expect(result.config?.tools[0].command).toBe("qwen");
  });

  it("should load valid .qwencoderc.json", () => {
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

    const result = ConfigLoader.load(testDir);

    expect(result.config).toBeDefined();
    expect(result.configPath).toBeDefined();
    expect(result.configPath).toContain(".qwencoderc.json");
  });

  it("should prioritize ai-tools.json over other files", () => {
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

    const result = ConfigLoader.load(testDir);

    expect(result.config).toBeDefined();
    expect(result.config?.tools[0].command).toBe("qwen");
    expect(result.configPath).toContain("ai-tools.json");
  });

  it("should return error for invalid JSON", () => {
    const configPath = join(testDir, "ai-tools.json");
    writeFileSync(configPath, "{invalid json}");

    const result = ConfigLoader.load(testDir);

    expect(result.config).toBe(null);
    expect(result.configPath).toBeDefined();
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Failed to load config");
  });

  it("should validate schema and return error for missing command", () => {
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

    const result = ConfigLoader.load(testDir);

    expect(result.config).toBe(null);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Invalid configuration");
  });

  it("should generate JSON schema", () => {
    const schema = ConfigLoader.getJsonSchema();

    expect(schema).toBeDefined();
    expect(schema.properties).toBeDefined();
    expect(schema.properties.tools).toBeDefined();
  });
});
