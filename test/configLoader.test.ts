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

  // ============================================================
  // Additional Error Handling Tests
  // ============================================================

  describe("エラーハンドリングの拡張", () => {
    it("should handle various invalid JSON formats", () => {
      const invalidFormats = [
        "{invalid json}",
        "just plain text",
        "{trailing: comma,}",
        '["unclosed": array',
        "",
      ];

      invalidFormats.forEach((invalidContent, index) => {
        const configPath = join(testDir, `invalid-${index}.json`);
        writeFileSync(configPath, invalidContent);

        const result = ConfigLoader.load(testDir);

        expect(result.config).toBe(null);
        expect(result.error).toBeDefined();
        if (result.error) {
          expect(result.error).toContain("Failed to load config");
        }
      });
    });

    it("should return error for enabled field with wrong type", () => {
      const invalidConfig = {
        version: "1.0",
        tools: [
          {
            command: "testai",
            enabled: "true", // Should be boolean, not string
          },
        ],
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = ConfigLoader.load(testDir);

      expect(result.config).toBe(null);
      expect(result.error).toContain("Invalid configuration");
    });

    it("should return error for providerType with invalid value", () => {
      const invalidConfig = {
        version: "1.0",
        tools: [
          {
            command: "testai",
            providerType: "invalid-type", // Must be "cli-auto" or "custom"
          },
        ],
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = ConfigLoader.load(testDir);

      expect(result.config).toBe(null);
      expect(result.error).toContain("Invalid configuration");
    });

    it("should return error for defaultArgs with invalid types", () => {
      const invalidConfig = {
        version: "1.0",
        tools: [
          {
            command: "testai",
            defaultArgs: {
              model: { invalid: "object" }, // Should be string, number, or boolean
            },
          },
        ],
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = ConfigLoader.load(testDir);

      expect(result.config).toBe(null);
      expect(result.error).toContain("Invalid configuration");
    });

    it("should return error for invalid security config", () => {
      const invalidConfig = {
        version: "1.0",
        tools: [],
        security: {
          enableValidation: "yes", // Should be boolean
          maxArgumentLength: "100", // Should be number
        },
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = ConfigLoader.load(testDir);

      expect(result.config).toBe(null);
      expect(result.error).toContain("Invalid configuration");
    });

    it("should handle missing tools array", () => {
      const invalidConfig = {
        version: "1.0",
        // Missing 'tools' field
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = ConfigLoader.load(testDir);

      expect(result.config).toBe(null);
      expect(result.error).toContain("Invalid configuration");
    });

    it("should handle tools field with wrong type", () => {
      const invalidConfig = {
        version: "1.0",
        tools: "not-an-array", // Should be array
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = ConfigLoader.load(testDir);

      expect(result.config).toBe(null);
      expect(result.error).toContain("Invalid configuration");
    });

    it("should handle multiple schema violations", () => {
      const invalidConfig = {
        version: "1.0",
        tools: [
          {
            // Missing required 'command' field
            enabled: "yes", // Wrong type
            providerType: "bogus", // Invalid enum
          },
        ],
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(invalidConfig, null, 2));

      const result = ConfigLoader.load(testDir);

      expect(result.config).toBe(null);
      expect(result.error).toBeDefined();
      // Error message should contain information about the violations
      expect(result.error).toContain("Invalid configuration");
    });
  });

  describe("ファイル権限エラー", () => {
    it("should handle unreadable config file gracefully", () => {
      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify({ version: "1.0", tools: [] }));

      // Make the file unreadable (on Unix-like systems)
      try {
        const { chmodSync } = require("node:fs");
        chmodSync(configPath, 0o000);

        const result = ConfigLoader.load(testDir);

        expect(result.config).toBe(null);
        expect(result.error).toBeDefined();
        expect(result.error).toContain("Failed to load config");
      } finally {
        // Restore permissions for cleanup
        try {
          const { chmodSync } = require("node:fs");
          chmodSync(configPath, 0o644);
        } catch {
          // Ignore cleanup errors
        }
      }
    });

    it("should handle non-existent directory in search path", () => {
      const nonExistentDir = join(testDir, "does-not-exist");

      const result = ConfigLoader.load(nonExistentDir);

      expect(result.config).toBe(null);
      expect(result.configPath).toBe(null);
      expect(result.error).toBe(null);
    });
  });

  describe("デフォルト値の検証", () => {
    it("should use default values for optional fields", () => {
      const minimalConfig = {
        tools: [
          {
            command: "testai",
          },
        ],
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(minimalConfig, null, 2));

      const result = ConfigLoader.load(testDir);

      expect(result.config).toBeDefined();
      expect(result.config?.tools[0].enabled).toBe(true); // Default
      expect(result.config?.tools[0].providerType).toBe("cli-auto"); // Default
      expect(result.config?.version).toBe("1.0"); // Default
    });

    it("should use default security config when not specified", () => {
      const config = {
        tools: [{ command: "testai" }],
      };

      const configPath = join(testDir, "ai-tools.json");
      writeFileSync(configPath, JSON.stringify(config, null, 2));

      const securityConfig = ConfigLoader.getSecurityConfig(testDir);

      expect(securityConfig.enableValidation).toBe(true);
      expect(securityConfig.enableAuditLog).toBe(true);
      expect(securityConfig.maxArgumentLength).toBe(10000);
    });
  });
});
