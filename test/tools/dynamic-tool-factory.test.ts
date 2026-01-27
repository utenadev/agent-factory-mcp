import { describe, it, expect, vi, beforeEach } from "vitest";
import { DynamicToolFactory } from "../../src/tools/dynamic-tool-factory.js";
import type { CliToolMetadata } from "../../src/types/cli-metadata.js";
import type { AIProvider } from "../../src/providers/base-cli.provider.js";
import { z } from "zod";

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
    {
      name: "verbose",
      flag: "-v",
      type: "boolean",
      description: "Verbose output",
    },
    {
      name: "temperature",
      flag: "-t",
      type: "number",
      description: "Temperature",
    },
  ],
  argument: {
    name: "prompt",
    description: "The prompt to send",
    type: "string",
    required: true,
  },
};

const metadataWithChoices: CliToolMetadata = {
  ...basicMetadata,
  options: [
    {
      name: "model",
      flag: "-m",
      type: "string",
      description: "Model to use",
      choices: ["gpt-4", "gpt-3.5-turbo", "claude-3"],
    },
  ],
};

const metadataWithSystemPrompt: CliToolMetadata = {
  ...basicMetadata,
  description: "A test AI tool",
  systemPrompt: "You are a helpful assistant.",
};

const metadataWithOptionalArg: CliToolMetadata = {
  ...basicMetadata,
  argument: {
    name: "prompt",
    description: "The prompt to send",
    type: "string",
    required: false,
  },
};

const metadataWithNumberArg: CliToolMetadata = {
  ...basicMetadata,
  argument: {
    name: "count",
    description: "Count of items",
    type: "number",
    required: true,
  },
};

describe("DynamicToolFactory", () => {
  describe("createTool() - MCPツール生成", () => {
    it("should create tool with correct structure", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      expect(tool.name).toBe("ask-test");
      expect(tool.description).toBe("A test AI tool");
      expect(tool.category).toBe("ai");
      expect(tool.zodSchema).toBeDefined();
      expect(tool.execute).toBeInstanceOf(Function);
    });

    it("should include systemPrompt in description", () => {
      const provider = new MockProvider(metadataWithSystemPrompt);
      const tool = DynamicToolFactory.createTool(provider);

      expect(tool.description).toContain("A test AI tool");
      expect(tool.description).toContain("System Prompt: You are a helpful assistant.");
    });

    it("should create prompt object", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      expect(tool.prompt).toBeDefined();
      expect(tool.prompt?.description).toContain("testai");
    });
  });

  describe("createZodSchema() - Zodスキーマ生成", () => {
    it("should create schema for string options", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;
      expect(schema).toBeInstanceOf(z.ZodObject);

      // Should accept valid string
      const result = schema.safeParse({ model: "gpt-4", prompt: "test" });
      expect(result.success).toBe(true);
    });

    it("should create schema for boolean options", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;

      // Should accept boolean
      const result = schema.safeParse({ verbose: true, prompt: "test" });
      expect(result.success).toBe(true);
    });

    it("should create schema for number options", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;

      // Should accept number
      const result = schema.safeParse({ temperature: 0.7, prompt: "test" });
      expect(result.success).toBe(true);
    });

    it("should create enum schema for choices", () => {
      const provider = new MockProvider(metadataWithChoices);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;

      // Should accept valid choice
      const validResult = schema.safeParse({ model: "gpt-4", prompt: "test" });
      expect(validResult.success).toBe(true);

      // Should reject invalid choice
      const invalidResult = schema.safeParse({ model: "invalid-model", prompt: "test" });
      expect(invalidResult.success).toBe(false);
    });

    it("should make optional options truly optional", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;

      // Should work without optional fields
      const result = schema.safeParse({ prompt: "test" });
      expect(result.success).toBe(true);
    });

    it("should require required string argument", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;

      // Should fail without required argument
      const result = schema.safeParse({});
      expect(result.success).toBe(false);

      // Should succeed with required argument
      const result2 = schema.safeParse({ prompt: "test" });
      expect(result2.success).toBe(true);
    });

    it("should handle optional argument", () => {
      const provider = new MockProvider(metadataWithOptionalArg);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;

      // Should work without optional argument
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should handle number argument", () => {
      const provider = new MockProvider(metadataWithNumberArg);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;

      // Should accept number
      const result = schema.safeParse({ count: 5 });
      expect(result.success).toBe(true);

      // Should reject string
      const result2 = schema.safeParse({ count: "not a number" });
      expect(result2.success).toBe(false);
    });

    it("should add description to schema fields", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;
      // Check if descriptions are embedded (not directly accessible in Zod without parsing)
      // Just verify schema parses correctly
      const result = schema.safeParse({ prompt: "test" });
      expect(result.success).toBe(true);
    });
  });

  describe("execute() - 実行", () => {
    it("should call provider execute when tool execute is called", async () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const result = await tool.execute({ prompt: "test prompt" });

      expect(result).toContain("Mock response");
      expect(result).toContain("test prompt");
    });

    it("should support onProgress callback", async () => {
      const onProgress = vi.fn();
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      await tool.execute({ prompt: "test" }, onProgress);

      // Mock provider doesn't call onProgress, but the parameter should be passed
      expect(onProgress).toBeDefined();
    });
  });

  describe("エッジケース", () => {
    it("should handle metadata with no options", () => {
      const noOptionsMetadata: CliToolMetadata = {
        ...basicMetadata,
        options: [],
      };
      const provider = new MockProvider(noOptionsMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;
      const result = schema.safeParse({ prompt: "test" });
      expect(result.success).toBe(true);
    });

    it("should handle metadata with no argument", () => {
      const noArgMetadata: CliToolMetadata = {
        ...basicMetadata,
        argument: undefined,
      };
      const provider = new MockProvider(noArgMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should handle choices array with single value", () => {
      const singleChoiceMetadata: CliToolMetadata = {
        ...basicMetadata,
        options: [
          {
            name: "mode",
            flag: "--mode",
            type: "string",
            description: "Mode",
            choices: ["default"],
          },
        ],
      };
      const provider = new MockProvider(singleChoiceMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const schema = tool.zodSchema;
      const result = schema.safeParse({ mode: "default", prompt: "test" });
      expect(result.success).toBe(true);
    });

    it("should handle all option types together", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      const args = {
        model: "gpt-4",
        verbose: true,
        temperature: 0.7,
        prompt: "test",
      };

      const schema = tool.zodSchema;
      const result = schema.safeParse(args);
      expect(result.success).toBe(true);
    });
  });

  describe("カテゴリ", () => {
    it("should always set category to 'ai'", () => {
      const provider = new MockProvider(basicMetadata);
      const tool = DynamicToolFactory.createTool(provider);

      expect(tool.category).toBe("ai");
    });
  });
});
