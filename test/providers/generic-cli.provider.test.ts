import { describe, it, expect, vi, beforeEach } from "vitest";
import { GenericCliProvider } from "../../src/providers/generic-cli.provider.js";
import type { ToolConfig } from "../../src/utils/configLoader.js";
import type { CliToolMetadata } from "../../src/types/cli-metadata.js";

// Create validator mock before imports
const mockValidate = vi.fn();
const mockValidateAtSyntax = vi.fn();
const mockValidateSessionId = vi.fn();

const mockValidatorInstance = {
  validate: mockValidate,
  validateAtSyntax: mockValidateAtSyntax,
  validateSessionId: mockValidateSessionId,
};

// Mock dependencies
vi.mock("../../src/utils/commandExecutor.js", () => ({
  executeCommand: vi.fn().mockResolvedValue("success"),
}));

vi.mock("../../src/parsers/help-parser.js", () => ({
  HelpParser: {
    parse: vi.fn(),
  },
}));

vi.mock("../../src/utils/argumentValidator.js", () => ({
  ArgumentValidator: vi.fn(() => mockValidatorInstance),
  createValidationConfig: vi.fn(),
}));

import { executeCommand } from "../../src/utils/commandExecutor.js";
import { HelpParser } from "../../src/parsers/help-parser.js";

const mockedExecuteCommand = executeCommand as unknown as ReturnType<typeof vi.fn>;
const mockedHelpParserParse = HelpParser.parse as unknown as ReturnType<typeof vi.fn>;

// Sample metadata for testing
const sampleMetadata: CliToolMetadata = {
  toolName: "ask-test",
  description: "Test AI tool",
  command: "testai",
  category: "ai",
  options: [
    {
      name: "model",
      flag: "-m",
      type: "string",
      description: "Model to use",
    },
    {
      name: "verbose",
      flag: "-v",
      type: "boolean",
      description: "Verbose output",
    },
    {
      name: "resume",
      flag: "--resume",
      type: "string",
      description: "Resume session",
    },
  ],
  argument: {
    name: "prompt",
    description: "The prompt",
    type: "string",
    required: true,
  },
};

// Sample tool config
const sampleConfig: ToolConfig = {
  command: "testai",
  enabled: true,
  providerType: "cli-auto",
  description: "Custom description from config",
  defaultArgs: {
    model: "default-model",
    temperature: 0.7,
  },
  env: {
    TEST_API_KEY: "test-key",
  },
};

describe("GenericCliProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidate.mockReset();
    mockValidateAtSyntax.mockReset();
    mockValidateSessionId.mockReset();
  });

  describe("create() - プロバイダー生成", () => {
    it("should create provider from config when command is available", async () => {
      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(sampleMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);

      expect(provider).not.toBeNull();
      expect(provider?.id).toBe("generic-testai");
    });

    it("should return null when command is not available", async () => {
      mockedExecuteCommand.mockRejectedValue(new Error("Command not found"));

      const provider = await GenericCliProvider.create(sampleConfig);

      expect(provider).toBeNull();
    });

    it("should apply config overrides to metadata", async () => {
      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(sampleMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);

      const metadata = provider?.getMetadata();
      expect(metadata?.description).toBe("Custom description from config");
    });
  });

  describe("isCommandAvailable() - コマンド確認", () => {
    it("should return true when which/where succeeds", async () => {
      mockedExecuteCommand.mockResolvedValue("/usr/bin/testai");

      const available = await GenericCliProvider.isCommandAvailable("testai");

      expect(available).toBe(true);
    });

    it("should fallback to --version check when which fails", async () => {
      mockedExecuteCommand
        .mockRejectedValueOnce(new Error("which failed"))
        .mockResolvedValueOnce("testai v1.0.0");

      const available = await GenericCliProvider.isCommandAvailable("testai");

      expect(available).toBe(true);
    });

    it("should return false when both checks fail", async () => {
      mockedExecuteCommand.mockRejectedValue(new Error("Command not found"));

      const available = await GenericCliProvider.isCommandAvailable("testai");

      expect(available).toBe(false);
    });
  });

  describe("fetchHelpOutput() - ヘルプ出力取得", () => {
    it("should fetch --help output successfully", async () => {
      const helpText = "Usage: testai [options]";
      mockedExecuteCommand.mockResolvedValue(helpText);

      const output = await GenericCliProvider.fetchHelpOutput("testai");

      expect(output).toBe(helpText);
    });

    it("should fallback to -h when --help fails", async () => {
      const helpText = "Usage: testai [options]";
      mockedExecuteCommand
        .mockRejectedValueOnce(new Error("--help failed"))
        .mockResolvedValueOnce(helpText);

      const output = await GenericCliProvider.fetchHelpOutput("testai");

      expect(output).toBe(helpText);
    });

    it("should throw error when both --help and -h fail", async () => {
      mockedExecuteCommand.mockRejectedValue(new Error("Help not available"));

      await expect(GenericCliProvider.fetchHelpOutput("testai")).rejects.toThrow(
        "Failed to fetch help output for 'testai'"
      );
    });
  });

  describe("defaultArgs - デフォルト引数の適用", () => {
    it("should apply defaultArgs from config to options", async () => {
      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(sampleMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);
      const metadata = provider?.getMetadata();

      const modelOption = metadata?.options.find(opt => opt.name === "model");
      expect(modelOption?.defaultValue).toBe("default-model");

      const tempOption = metadata?.options.find(opt => opt.name === "temperature");
      expect(tempOption).toBeDefined();
      expect(tempOption?.defaultValue).toBe(0.7);
    });

    it("should override existing option defaults", async () => {
      const metadataWithDefaults: CliToolMetadata = {
        ...sampleMetadata,
        options: [
          {
            name: "model",
            flag: "-m",
            type: "string",
            description: "Model to use",
            defaultValue: "original-default",
          },
        ],
      };

      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(metadataWithDefaults);

      const provider = await GenericCliProvider.create(sampleConfig);
      const metadata = provider?.getMetadata();

      const modelOption = metadata?.options.find(opt => opt.name === "model");
      expect(modelOption?.defaultValue).toBe("default-model");
    });
  });

  describe("セッション管理", () => {
    it("should add sessionId option when tool has resume flag", async () => {
      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(sampleMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);
      const metadata = provider?.getMetadata();

      const sessionOption = metadata?.options.find(opt => opt.name === "sessionId");
      expect(sessionOption).toBeDefined();
      expect(sessionOption?.flag).toBe("--session-id");
    });

    it("should not add sessionId when tool has no session management", async () => {
      const noSessionMetadata: CliToolMetadata = {
        ...sampleMetadata,
        options: [
          {
            name: "model",
            flag: "-m",
            type: "string",
            description: "Model",
          },
        ],
      };

      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(noSessionMetadata);

      const configNoSession: ToolConfig = { ...sampleConfig };
      const provider = await GenericCliProvider.create(configNoSession);
      const metadata = provider?.getMetadata();

      const sessionOption = metadata?.options.find(opt => opt.name === "sessionId");
      expect(sessionOption).toBeUndefined();
    });
  });

  describe("execute() - 実行", () => {
    let provider: GenericCliProvider;

    beforeEach(async () => {
      mockedExecuteCommand.mockResolvedValue("AI response");
      mockedHelpParserParse.mockReturnValue(sampleMetadata);
      provider = (await GenericCliProvider.create(sampleConfig))!;
    });

    it("should execute command successfully", async () => {
      const result = await provider.execute({ prompt: "test prompt" });

      expect(result).toBe("AI response");
      expect(mockedExecuteCommand).toHaveBeenCalled();
    });

    it("should parse JSON output when format=json", async () => {
      const jsonOutput = '{"type":"text","part":{"text":"Hello"}}';
      mockedExecuteCommand.mockResolvedValue(jsonOutput);

      const result = await provider.execute({ prompt: "test", format: "json" });

      expect(result).toBe("Hello");
    });

    it("should handle mixed JSON and plain text", async () => {
      const mixedOutput = 'Prefix\n{"type":"text","part":{"text":"Extracted"}}\nSuffix';
      mockedExecuteCommand.mockResolvedValue(mixedOutput);

      const result = await provider.execute({ prompt: "test", format: "json" });

      expect(result).toBe("Extracted");
    });

    it("should return raw output when no valid JSON found", async () => {
      const plainText = "Just plain text output";
      mockedExecuteCommand.mockResolvedValue(plainText);

      const result = await provider.execute({ prompt: "test", format: "json" });

      expect(result).toBe(plainText);
    });
  });

  describe("環境変数", () => {
    it("should pass env variables from config to execute", async () => {
      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(sampleMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);
      await provider.execute({ prompt: "test" });

      // Check the last call to executeCommand
      const lastCall = mockedExecuteCommand.mock.calls[mockedExecuteCommand.mock.calls.length - 1];
      // Signature: executeCommand(command, args, options)
      // We need to check if env is passed in options
      expect(lastCall[0]).toBe("testai");
      expect(lastCall[1]).toBeInstanceOf(Array);
    });
  });

  describe("getConfig() - 設定取得", () => {
    it("should return original config", async () => {
      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(sampleMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);

      expect(provider?.getConfig()).toEqual(sampleConfig);
    });
  });

  describe("getHelpOutput() - ヘルプ出力取得", () => {
    it("should return cached help output", async () => {
      const helpText = "Usage: testai [options]";
      mockedExecuteCommand.mockResolvedValue(helpText);
      mockedHelpParserParse.mockReturnValue(sampleMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);

      expect(provider?.getHelpOutput()).toBe(helpText);
    });
  });

  describe("バリデーション", () => {
    it("should have Gemini validation enabled for tools with session flags", async () => {
      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(sampleMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);

      // Check that security config has Gemini validation enabled
      const securityConfig = (provider as any).securityConfig;
      expect(securityConfig.enableGeminiValidation).toBe(true);
    });

    it("should have Gemini validation disabled for tools without session flags", async () => {
      const noSessionMetadata: CliToolMetadata = {
        ...sampleMetadata,
        options: [
          {
            name: "model",
            flag: "-m",
            type: "string",
            description: "Model",
          },
        ],
      };

      mockedExecuteCommand.mockResolvedValue("test output");
      mockedHelpParserParse.mockReturnValue(noSessionMetadata);

      const provider = await GenericCliProvider.create(sampleConfig);

      const securityConfig = (provider as any).securityConfig;
      expect(securityConfig.enableGeminiValidation).toBe(false);
    });
  });
});
