import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, writeFileSync, unlinkSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Mock inquirer before importing the module
const mockPrompt = vi.fn();

vi.mock("inquirer", () => ({
  default: {
    prompt: mockPrompt,
  },
}));

// Mock autoDiscovery
const mockDiscoveredTools = [
  {
    toolName: "ask-claude",
    command: "claude",
    description: "Claude AI CLI tool",
    version: "1.0.0",
    options: [],
    toolType: "simple" as const,
  },
  {
    toolName: "ask-gemini",
    command: "gemini",
    description: "Gemini AI CLI tool",
    version: "2.0.0",
    options: [],
    toolType: "simple" as const,
  },
];

let mockDiscoverFn = vi.fn();

vi.mock("../../src/utils/autoDiscovery.js", () => ({
  discoverCompatibleTools: () => mockDiscoverFn(),
}));

import { SetupWizard, runSetupWizard } from "../../src/utils/setupWizard.js";
import { ConfigLoader } from "../../src/utils/configLoader.js";

describe("SetupWizard", () => {
  const testConfigPath = resolve(process.cwd(), "ai-tools.json");

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrompt.mockReset();
    mockDiscoverFn = vi.fn().mockResolvedValue(mockDiscoveredTools);
    // Clean up test config file if it exists
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  afterEach(() => {
    // Clean up test config file after each test
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
  });

  describe("基本機能", () => {
    it("should import SetupWizard module", () => {
      expect(SetupWizard).toBeDefined();
      expect(typeof SetupWizard).toBe("function");
    });

    it("should have run method", () => {
      const wizard = new SetupWizard();
      expect(typeof wizard.run).toBe("function");
    });
  });

  describe("ツール検出", () => {
    it("should discover compatible tools", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude", "gemini"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: false,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      expect(mockPrompt).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it("should handle no tools found scenario", async () => {
      // Mock empty discovery
      mockDiscoverFn.mockResolvedValueOnce([]);

      const wizard = new SetupWizard();
      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      // Should not prompt for tool selection when no tools found
      expect(mockPrompt).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe("ツール選択", () => {
    it("should allow user to select tools", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: false,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      const firstCall = mockPrompt.mock.calls[0];
      expect(firstCall[0][0].name).toBe("tools");
      expect(firstCall[0][0].type).toBe("checkbox");

      consoleLogSpy.mockRestore();
    });

    it("should exit when no tools selected", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: [],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: false,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      expect(mockPrompt).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe("詳細設定", () => {
    it("should skip detailed configuration if user declines", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude", "gemini"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: false,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      expect(mockPrompt).toHaveBeenCalledTimes(3);

      consoleLogSpy.mockRestore();
    });

    it("should prompt for detailed configuration if user accepts", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: true,
        })
        .mockResolvedValueOnce({
          alias: "ask-claude-custom",
          description: "Custom Claude description",
          systemPrompt: "You are a helpful assistant.",
        })
        .mockResolvedValueOnce({
          saveConfig: false,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      expect(mockPrompt).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe("設定の保存", () => {
    it("should save configuration when confirmed", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: true,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      expect(existsSync(testConfigPath)).toBe(true);

      const content = readFileSync(testConfigPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.version).toBe("1.0");
      expect(config.tools).toBeDefined();
      expect(config.tools.length).toBe(1);
      expect(config.tools[0].command).toBe("claude");

      consoleLogSpy.mockRestore();
    });

    it("should not save configuration when cancelled", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: false,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      expect(existsSync(testConfigPath)).toBe(false);

      consoleLogSpy.mockRestore();
    });

    it("should include custom details in saved config", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: true,
        })
        .mockResolvedValueOnce({
          alias: "my-claude",
          description: "My custom Claude tool",
          systemPrompt: "Custom system prompt",
        })
        .mockResolvedValueOnce({
          saveConfig: true,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      const content = readFileSync(testConfigPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools[0].alias).toBe("my-claude");
      expect(config.tools[0].description).toBe("My custom Claude tool");
      expect(config.tools[0].systemPrompt).toBe("Custom system prompt");

      consoleLogSpy.mockRestore();
    });
  });

  describe("設定の構造", () => {
    it("should build correct config structure", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude", "gemini"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: true,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      const content = readFileSync(testConfigPath, "utf-8");
      const config = JSON.parse(content);

      expect(config).toHaveProperty("version");
      expect(config).toHaveProperty("tools");
      expect(Array.isArray(config.tools)).toBe(true);

      config.tools.forEach((tool: any) => {
        expect(tool).toHaveProperty("command");
        expect(tool).toHaveProperty("enabled");
        expect(tool).toHaveProperty("providerType");
        expect(tool.enabled).toBe(true);
        expect(tool.providerType).toBe("cli-auto");
      });

      consoleLogSpy.mockRestore();
    });

    it("should include version info from discovery", async () => {
      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: true,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      const content = readFileSync(testConfigPath, "utf-8");
      const config = JSON.parse(content);

      expect(config.tools[0].version).toBe("1.0.0");

      consoleLogSpy.mockRestore();
    });
  });

  describe("エラーハンドリング", () => {
    it("should handle save failure gracefully", async () => {
      const saveSpy = vi.spyOn(ConfigLoader, "save").mockResolvedValueOnce({
        success: false,
        error: "Permission denied",
      });

      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: true,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(wizard.run()).rejects.toThrow();

      saveSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("runSetupWizard 便利関数", () => {
    it("should export runSetupWizard convenience function", () => {
      expect(runSetupWizard).toBeDefined();
      expect(typeof runSetupWizard).toBe("function");
    });

    it("should run wizard via convenience function", async () => {
      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: false,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await runSetupWizard();

      expect(mockPrompt).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe("上書き確認", () => {
    it("should prompt for confirmation when config exists", async () => {
      const existingConfig = {
        version: "1.0",
        tools: [{ command: "old-tool", enabled: true }],
      };
      writeFileSync(testConfigPath, JSON.stringify(existingConfig, null, 2));

      const wizard = new SetupWizard();

      mockPrompt
        .mockResolvedValueOnce({
          tools: ["claude"],
        })
        .mockResolvedValueOnce({
          configureDetails: false,
        })
        .mockResolvedValueOnce({
          saveConfig: false,
        });

      const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      await wizard.run();

      const lastPromptCall = mockPrompt.mock.calls[2][0][0];
      expect(lastPromptCall.message).toContain("overwrite");

      consoleLogSpy.mockRestore();
    });
  });
});
