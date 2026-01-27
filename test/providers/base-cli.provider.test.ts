import { describe, it, expect, vi, beforeEach } from "vitest";
import { BaseCliProvider, SecurityConfig } from "../../src/providers/base-cli.provider.js";
import type { CliToolMetadata } from "../../src/types/cli-metadata.js";

// Create validator mock before importing
const mockValidate = vi.fn();
const mockValidatorInstance = {
  validate: mockValidate,
};

// Mock dependencies
vi.mock("../../src/utils/commandExecutor.js", () => ({
  executeCommand: vi.fn().mockResolvedValue("success"),
}));

vi.mock("../../src/utils/argumentValidator.js", () => ({
  ArgumentValidator: vi.fn(() => mockValidatorInstance),
  validateWithGeminiRequirements: vi.fn(),
}));

vi.mock("../../src/utils/auditLogger.js", () => ({
  AuditLogger: vi.fn(),
}));

import { executeCommand } from "../../src/utils/commandExecutor.js";
import { validateWithGeminiRequirements } from "../../src/utils/argumentValidator.js";

const mockedExecuteCommand = executeCommand as unknown as ReturnType<typeof vi.fn>;
const mockedValidateWithGeminiRequirements = validateWithGeminiRequirements as unknown as ReturnType<typeof vi.fn>;

// Test implementation of BaseCliProvider
class TestProvider extends BaseCliProvider {
  id = "test-provider";

  private metadata: CliToolMetadata;

  constructor(metadata: CliToolMetadata, securityConfig?: SecurityConfig) {
    super();
    this.metadata = metadata;
    if (securityConfig) {
      this.securityConfig = { ...this.securityConfig, ...securityConfig };
    }
  }

  getMetadata(): CliToolMetadata {
    return this.metadata;
  }
}

// Sample metadata for testing
const sampleMetadata: CliToolMetadata = {
  toolName: "test-tool",
  description: "A test tool",
  command: "test-cmd",
  category: "test",
  options: [
    {
      name: "verbose",
      flag: "-v",
      type: "boolean",
      description: "Verbose output",
    },
    {
      name: "model",
      flag: "-m",
      type: "string",
      description: "Model to use",
      defaultValue: "default-model",
    },
    {
      name: "count",
      flag: "-c",
      type: "number",
      description: "Count",
      defaultValue: 1,
    },
  ],
  argument: {
    name: "prompt",
    description: "The prompt to send",
    type: "string",
    required: true,
  },
};

describe("BaseCliProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期化", () => {
    it("should initialize with default security config", () => {
      const provider = new TestProvider(sampleMetadata);
      expect(provider.id).toBe("test-provider");
      expect(provider.getMetadata()).toEqual(sampleMetadata);
    });

    it("should allow custom security config", () => {
      const customConfig: SecurityConfig = {
        enableValidation: false,
        enableAuditLog: false,
        enableGeminiValidation: true,
      };
      const provider = new TestProvider(sampleMetadata, customConfig);
      expect(provider.getMetadata()).toEqual(sampleMetadata);
    });
  });

  describe("execute() - 引数の変換", () => {
    it("should convert boolean options to flags when true", async () => {
      const provider = new TestProvider(sampleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ verbose: true, prompt: "test" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        ["-v", "-m", "default-model", "-c", "1", "test"],
        expect.any(Object)
      );
    });

    it("should not include boolean flags when false", async () => {
      const provider = new TestProvider(sampleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ verbose: false, prompt: "test" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        ["-m", "default-model", "-c", "1", "test"],
        expect.any(Object)
      );
    });

    it("should handle string options with values", async () => {
      const provider = new TestProvider(sampleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ model: "gpt-4", prompt: "test" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        ["-m", "gpt-4", "-c", "1", "test"],
        expect.any(Object)
      );
    });

    it("should use default value when option not provided", async () => {
      const provider = new TestProvider(sampleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ prompt: "test" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        ["-m", "default-model", "-c", "1", "test"],
        expect.any(Object)
      );
    });

    it("should handle number options", async () => {
      const provider = new TestProvider(sampleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ count: 5, prompt: "test" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        ["-m", "default-model", "-c", "5", "test"],
        expect.any(Object)
      );
    });
  });

  describe("execute() - 位置引数", () => {
    it("should add positional argument", async () => {
      const provider = new TestProvider(sampleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ prompt: "hello world" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        expect.arrayContaining(["hello world"]),
        expect.any(Object)
      );
    });

    it("should throw error when required argument is missing", async () => {
      const provider = new TestProvider(sampleMetadata);

      await expect(provider.execute({})).rejects.toThrow(
        "Missing required argument: prompt"
      );
    });
  });

  describe("execute() - バリデーション", () => {
    it("should call validator when enableValidation is true", async () => {
      mockValidate.mockClear();
      const provider = new TestProvider(sampleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ prompt: "test" });

      expect(mockValidate).toHaveBeenCalled();
    });

    it("should not call validator when enableValidation is false", async () => {
      mockValidate.mockClear();
      const provider = new TestProvider(sampleMetadata, {
        enableValidation: false,
      });
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ prompt: "test" });

      expect(mockValidate).not.toHaveBeenCalled();
    });

    it("should use Gemini validation when enabled", async () => {
      const provider = new TestProvider(sampleMetadata, {
        enableGeminiValidation: true,
      });
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ prompt: "test" });

      expect(mockedValidateWithGeminiRequirements).toHaveBeenCalled();
    });
  });

  describe("execute() - onProgress コールバック", () => {
    it("should pass onProgress callback to executeRaw", async () => {
      const provider = new TestProvider(sampleMetadata);
      const onProgress = vi.fn();
      mockedExecuteCommand.mockResolvedValue("result");

      await provider.execute({ prompt: "test" }, onProgress);

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        expect.any(Array),
        expect.objectContaining({
          onProgress,
        })
      );
    });
  });

  describe("execute() - オプションの組み合わせ", () => {
    it("should handle multiple options together", async () => {
      const provider = new TestProvider(sampleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({
        verbose: true,
        model: "custom-model",
        count: 10,
        prompt: "multi option test",
      });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        ["-v", "-m", "custom-model", "-c", "10", "multi option test"],
        expect.objectContaining({
          enableValidation: false,
          enableAuditLog: true,
        })
      );
    });

    it("should handle options with no default value when not provided", async () => {
      const metadataNoDefault: CliToolMetadata = {
        ...sampleMetadata,
        options: [
          {
            name: "optional",
            flag: "-o",
            type: "string",
            description: "Optional with no default",
          },
        ],
      };
      const provider = new TestProvider(metadataNoDefault);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ prompt: "test" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        ["test"],
        expect.any(Object)
      );
    });
  });

  describe("argsToStringArray()", () => {
    it("should convert args object to string array", () => {
      const provider = new TestProvider(sampleMetadata);
      const args = {
        verbose: true,
        model: "test-model",
        count: 3,
        prompt: "test prompt",
      };

      const result = (provider as any).argsToStringArray(args, sampleMetadata);

      expect(result).toEqual([
        "-v",
        "-m",
        "test-model",
        "-c",
        "3",
        "test prompt",
      ]);
    });

    it("should skip undefined and null values", () => {
      const provider = new TestProvider(sampleMetadata);
      const args = {
        verbose: false,
        model: undefined as string | undefined,
        count: null as number | null,
        prompt: "test",
      };

      const result = (provider as any).argsToStringArray(args, sampleMetadata);

      expect(result).toEqual(["test"]);
    });
  });

  describe("executeRaw() - セキュリティ設定の伝播", () => {
    it("should pass security config to executeCommand options", async () => {
      const customContext = { argumentType: "prompt" as const };
      const provider = new TestProvider(sampleMetadata, {
        enableValidation: true,
        enableAuditLog: false,
        validationContext: customContext,
      });
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ prompt: "test" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "test-cmd",
        expect.any(Array),
        expect.objectContaining({
          enableValidation: false, // Already validated
          enableAuditLog: false,
          validationContext: customContext,
        })
      );
    });
  });

  describe("metadata なしのケース", () => {
    it("should handle tool without options", async () => {
      const simpleMetadata: CliToolMetadata = {
        toolName: "simple-tool",
        description: "Simple tool",
        command: "simple",
        category: "test",
        options: [],
        argument: {
          name: "input",
          description: "Input",
          type: "string",
          required: true,
        },
      };
      const provider = new TestProvider(simpleMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ input: "test input" });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "simple",
        ["test input"],
        expect.any(Object)
      );
    });

    it("should handle tool without argument", async () => {
      const noArgMetadata: CliToolMetadata = {
        toolName: "no-arg-tool",
        description: "Tool without argument",
        command: "noarg",
        category: "test",
        options: [
          {
            name: "flag",
            flag: "-f",
            type: "boolean",
            description: "A flag",
          },
        ],
      };
      const provider = new TestProvider(noArgMetadata);
      mockedExecuteCommand.mockResolvedValue("success");

      await provider.execute({ flag: true });

      expect(mockedExecuteCommand).toHaveBeenCalledWith(
        "noarg",
        ["-f"],
        expect.any(Object)
      );
    });
  });
});
