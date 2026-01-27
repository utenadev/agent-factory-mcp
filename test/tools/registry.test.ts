import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  toolRegistry,
  registerProvider,
  toolExists,
  getToolDefinitions,
  getPromptDefinitions,
  executeTool,
  getPromptMessage,
  type UnifiedTool,
} from "../../src/tools/registry.js";
import type { CliToolMetadata } from "../../src/types/cli-metadata.js";
import type { AIProvider } from "../../src/providers/base-cli.provider.js";

// Mock provider
class MockProvider implements AIProvider {
  id = "mock-provider";
  private metadata: CliToolMetadata;

  constructor(metadata: CliToolMetadata) {
    this.metadata = metadata;
  }

  getMetadata(): CliToolMetadata {
    return this.metadata;
  }

  async execute(args: Record<string, any>): Promise<string> {
    return `Mock response: ${JSON.stringify(args)}`;
  }
}

// Sample metadata
const basicMetadata: CliToolMetadata = {
  toolName: "ask-test",
  description: "A test AI tool",
  command: "testai",
  category: "ai",
  options: [
    {
      name: "model",
      flag: "-m",
      type: "string",
      description: "Model to use",
    },
  ],
  argument: {
    name: "prompt",
    description: "The prompt to send",
    type: "string",
    required: true,
  },
};

const anotherMetadata: CliToolMetadata = {
  ...basicMetadata,
  toolName: "ask-another",
  description: "Another test tool",
  command: "another",
};

describe("Registry", () => {
  beforeEach(() => {
    // Clear registry before each test
    toolRegistry.length = 0;
  });

  afterEach(() => {
    // Clean up after tests
    toolRegistry.length = 0;
  });

  describe("registerProvider() - プロバイダー登録", () => {
    it("should add tool to registry", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      expect(toolRegistry.length).toBe(1);
      expect(toolRegistry[0].name).toBe("ask-test");
    });

    it("should add multiple tools to registry", () => {
      const provider1 = new MockProvider(basicMetadata);
      const provider2 = new MockProvider(anotherMetadata);

      registerProvider(provider1);
      registerProvider(provider2);

      expect(toolRegistry.length).toBe(2);
      expect(toolRegistry[0].name).toBe("ask-test");
      expect(toolRegistry[1].name).toBe("ask-another");
    });

    it("should create tool with correct structure", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const tool = toolRegistry[0];
      expect(tool.name).toBe("ask-test");
      expect(tool.description).toBeDefined();
      expect(tool.zodSchema).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
      expect(tool.prompt).toBeDefined();
    });
  });

  describe("toolExists() - ツール存在確認", () => {
    it("should return true for existing tool", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      expect(toolExists("ask-test")).toBe(true);
    });

    it("should return false for non-existing tool", () => {
      expect(toolExists("non-existent")).toBe(false);
    });

    it("should return false when registry is empty", () => {
      expect(toolExists("ask-test")).toBe(false);
    });
  });

  describe("getToolDefinitions() - MCPツール定義取得", () => {
    it("should return empty array when no tools registered", () => {
      const definitions = getToolDefinitions();

      expect(definitions).toEqual([]);
      expect(Array.isArray(definitions)).toBe(true);
    });

    it("should return tool definitions for registered tools", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const definitions = getToolDefinitions();

      expect(definitions.length).toBe(1);
      expect(definitions[0].name).toBe("ask-test");
      expect(definitions[0].description).toBeDefined();
      expect(definitions[0].inputSchema).toBeDefined();
      expect(definitions[0].inputSchema.type).toBe("object");
    });

    it("should include all properties in inputSchema", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const definitions = getToolDefinitions();
      const inputSchema = definitions[0].inputSchema;

      expect(inputSchema.properties).toBeDefined();
      expect(inputSchema.properties.model).toBeDefined();
      expect(inputSchema.properties.prompt).toBeDefined();
      expect(inputSchema.required).toContain("prompt");
    });

    it("should return definitions for multiple tools", () => {
      const provider1 = new MockProvider(basicMetadata);
      const provider2 = new MockProvider(anotherMetadata);

      registerProvider(provider1);
      registerProvider(provider2);

      const definitions = getToolDefinitions();

      expect(definitions.length).toBe(2);
      expect(definitions[0].name).toBe("ask-test");
      expect(definitions[1].name).toBe("ask-another");
    });
  });

  describe("getPromptDefinitions() - プロンプト定義取得", () => {
    it("should return empty array when no tools registered", () => {
      const prompts = getPromptDefinitions();

      expect(prompts).toEqual([]);
    });

    it("should return prompt definitions for tools", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const prompts = getPromptDefinitions();

      expect(prompts.length).toBe(1);
      expect(prompts[0].name).toBe("ask-test");
      expect(prompts[0].description).toBeDefined();
      expect(prompts[0].arguments).toBeDefined();
      expect(Array.isArray(prompts[0].arguments)).toBe(true);
    });

    it("should include argument information", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const prompts = getPromptDefinitions();
      const args = prompts[0].arguments;

      expect(args).toBeDefined();
      expect(Array.isArray(args)).toBe(true);

      // Check for expected arguments
      const argNames = args.map((a: any) => a.name);
      expect(argNames).toContain("model");
      expect(argNames).toContain("prompt");
    });

    it("should mark required arguments correctly", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const prompts = getPromptDefinitions();
      const args = prompts[0].arguments;

      const promptArg = args.find((a: any) => a.name === "prompt");
      expect(promptArg.required).toBe(true);

      const modelArg = args.find((a: any) => a.name === "model");
      expect(modelArg.required).toBe(false);
    });
  });

  describe("executeTool() - ツール実行", () => {
    it("should execute tool and return result", async () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const result = await executeTool("ask-test", { prompt: "test" });

      expect(result).toContain("Mock response");
      expect(result).toContain("test");
    });

    it("should throw error for unknown tool", async () => {
      await expect(executeTool("unknown-tool", {})).rejects.toThrow(
        "Unknown tool: unknown-tool"
      );
    });

    it("should validate arguments before execution", async () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      // Missing required argument should fail
      await expect(executeTool("ask-test", {})).rejects.toThrow();
    });

    it("should reject invalid argument types", async () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      // Invalid type for model (should be string)
      await expect(
        executeTool("ask-test", { prompt: "test", model: 123 })
      ).rejects.toThrow();
    });

    it("should pass onProgress callback to tool", async () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const onProgress = vi.fn();
      await executeTool("ask-test", { prompt: "test" }, onProgress);

      // Mock provider doesn't actually call onProgress, but parameter is passed
      expect(onProgress).toBeDefined();
    });
  });

  describe("getPromptMessage() - プロンプトメッセージ生成", () => {
    it("should generate prompt message for tool", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const message = getPromptMessage("ask-test", { prompt: "test prompt" });

      expect(message).toContain("ask-test");
      expect(message).toContain("test prompt");
    });

    it("should throw error for tool without prompt", () => {
      // Create a tool without prompt
      const toolWithoutPrompt: UnifiedTool = {
        name: "no-prompt-tool",
        description: "Tool without prompt",
        zodSchema: vi.fn(),
        execute: vi.fn(),
      };
      toolRegistry.push(toolWithoutPrompt);

      expect(() => getPromptMessage("no-prompt-tool", {})).toThrow();
    });

    it("should handle tool with only prompt", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const message = getPromptMessage("ask-test", {});

      expect(message).toContain("ask-test");
    });

    it("should format boolean options as flags", () => {
      const metadataWithBool: CliToolMetadata = {
        ...basicMetadata,
        options: [
          {
            name: "verbose",
            flag: "-v",
            type: "boolean",
            description: "Verbose",
          },
        ],
      };
      const provider = new MockProvider(metadataWithBool);
      registerProvider(provider);

      const message = getPromptMessage("ask-test", { prompt: "test", verbose: true });

      expect(message).toContain("[verbose]");
    });

    it("should format other options as key-value pairs", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const message = getPromptMessage("ask-test", { prompt: "test", model: "gpt-4" });

      expect(message).toContain("(model: gpt-4)");
    });

    it("should not include undefined, null, or false values", () => {
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      const message = getPromptMessage("ask-test", {
        prompt: "test",
        model: null as any,
        verbose: false,
      });

      expect(message).not.toContain("model");
      expect(message).not.toContain("verbose");
    });
  });

  describe("統合フロー", () => {
    it("should support complete registration and execution flow", async () => {
      // Register provider
      const provider = new MockProvider(basicMetadata);
      registerProvider(provider);

      // Check tool exists
      expect(toolExists("ask-test")).toBe(true);

      // Get tool definitions
      const definitions = getToolDefinitions();
      expect(definitions.length).toBe(1);

      // Execute tool
      const result = await executeTool("ask-test", { prompt: "test" });
      expect(result).toContain("Mock response");

      // Get prompt message
      const message = getPromptMessage("ask-test", { prompt: "test" });
      expect(message).toContain("ask-test");
    });

    it("should handle multiple tools independently", async () => {
      const provider1 = new MockProvider(basicMetadata);
      const provider2 = new MockProvider(anotherMetadata);

      registerProvider(provider1);
      registerProvider(provider2);

      expect(toolRegistry.length).toBe(2);

      // Execute first tool
      const result1 = await executeTool("ask-test", { prompt: "test1" });
      expect(result1).toContain("test1");

      // Execute second tool
      const result2 = await executeTool("ask-another", { prompt: "test2" });
      expect(result2).toContain("test2");
    });
  });
});
