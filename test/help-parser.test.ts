import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import path from "node:path";
import { HelpParser } from "../src/parsers/help-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("HelpParser", () => {
  let qwenHelpOutput: string;

  it("should import HelpParser module", () => {
    expect(HelpParser).toBeDefined();
  });

  it("should load qwen help fixture", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/qwen-help.txt");
    qwenHelpOutput = readFileSync(fixturePath, "utf-8");
    expect(qwenHelpOutput).toBeDefined();
    expect(qwenHelpOutput).toContain("Usage: qwen");
  });

  it("should parse qwen help output", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // Verify basic structure
    expect(metadata.toolName).toBe("ask-qwen");
    expect(metadata.command).toBe("qwen");
    expect(metadata.description).toBeDefined();
    expect(metadata.options).toBeDefined();
    expect(Array.isArray(metadata.options)).toBe(true);
  });

  it("should parse model option correctly", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    const modelOption = metadata.options.find((opt) => opt.name === "model");
    expect(modelOption, "model option should be parsed").toBeDefined();
    expect(modelOption?.flag).toBe("--model");
    expect(modelOption?.type).toBe("string");
    expect(modelOption?.description).toBeDefined();
  });

  it("should parse boolean options correctly", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // debug should be boolean with default false
    const debugOption = metadata.options.find((opt) => opt.name === "debug");
    expect(debugOption, "debug option should be parsed").toBeDefined();
    expect(debugOption?.type).toBe("boolean");
    expect(debugOption?.defaultValue).toBe(false);
  });

  it("should parse options with choices", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // telemetry-target should have choices
    const telemetryTarget = metadata.options.find(
      (opt) => opt.name === "telemetry-target"
    );
    expect(telemetryTarget, "telemetry-target option should be parsed").toBeDefined();
    expect(telemetryTarget?.choices).toBeDefined();
    expect(telemetryTarget?.choices).toContain("local");
    expect(telemetryTarget?.choices).toContain("gcp");
  });

  it("should parse options with default values", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // input-format should have default "text"
    const inputFormat = metadata.options.find(
      (opt) => opt.name === "input-format"
    );
    expect(inputFormat, "input-format option should be parsed").toBeDefined();
    expect(inputFormat?.defaultValue).toBe("text");
  });

  it("should parse positional arguments", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    expect(metadata.argument, "should have a positional argument").toBeDefined();
    expect(metadata.argument?.name).toBe("query");
    expect(metadata.argument?.type).toBe("string");
  });

  it("should parse description correctly", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // Description should contain key information
    expect(metadata.description).toBeDefined();
    expect(
      metadata.description?.includes("Qwen Code") ||
        metadata.description?.includes("interactive CLI")
    ).toBeTruthy();
  });

  it("should filter out deprecated options or mark them", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // proxy option is deprecated
    const proxyOption = metadata.options.find((opt) => opt.name === "proxy");
    expect(proxyOption, "proxy option should be parsed even if deprecated").toBeDefined();
  });

  it("should handle options with both short and long flags", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // -m, --model
    const modelOption = metadata.options.find((opt) => opt.name === "model");
    expect(modelOption, "model option should be parsed").toBeDefined();
    expect(modelOption?.flag).toBe("--model");
  });

  it("should handle options with only long flags", () => {
    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // --auth-type (no short flag)
    const authTypeOption = metadata.options.find(
      (opt) => opt.name === "auth-type"
    );
    expect(authTypeOption, "auth-type option should be parsed").toBeDefined();
    expect(authTypeOption?.flag).toBe("--auth-type");
  });

  // ========================================================================
  // Extended Tests for Coverage Improvement
  // ========================================================================

  describe("型推論とエッジケース", () => {
    it("should infer boolean type from description patterns", () => {
      const booleanHelp = `
A test CLI tool

Options:
  -v, --verbose     Enable verbose output
  -d, --debug        Run in debug mode
      --show-stats     Display statistics
`;

      const metadata = HelpParser.parse("test", booleanHelp);

      expect(metadata.options.length).toBeGreaterThan(0);

      const verboseOption = metadata.options.find((opt) => opt.name === "verbose");
      expect(verboseOption?.type).toBeDefined();

      const debugOption = metadata.options.find((opt) => opt.name === "debug");
      expect(debugOption?.type).toBeDefined();
    });

    it("should infer number type from flag patterns", () => {
      const numberHelp = `
Test tool

Options:
      --timeout     Request timeout in seconds
      --count       Number of iterations
`;

      const metadata = HelpParser.parse("test", numberHelp);

      const timeoutOption = metadata.options.find((opt) => opt.name === "timeout");
      expect(timeoutOption?.type).toBe("number");

      const countOption = metadata.options.find((opt) => opt.name === "count");
      expect(countOption?.type).toBe("number");
    });

    it("should infer file type from file-related keywords", () => {
      const fileHelp = `
File processor

Options:
      --config      Path to config file
      --output       Output directory
`;

      const metadata = HelpParser.parse("test", fileHelp);

      const configOption = metadata.options.find((opt) => opt.name === "config");
      expect(configOption?.type).toBe("file");

      const outputOption = metadata.options.find((opt) => opt.name === "output");
      expect(outputOption?.type).toBe("file");
    });

    it("should parse number type from type hint", () => {
      const numberHelp = `
Tool with number options

Options:
      --port   Server port [number]
`;

      const metadata = HelpParser.parse("test", numberHelp);

      const portOption = metadata.options.find((opt) => opt.name === "port");
      expect(portOption?.type).toBe("number");
    });

    it("should handle array type hint", () => {
      const arrayHelp = `
Tool with array option

Options:
      --tags   List of tags [array]
`;

      const metadata = HelpParser.parse("test", arrayHelp);

      const tagsOption = metadata.options.find((opt) => opt.name === "tags");
      expect(tagsOption?.type).toBe("string");
    });

    it("should handle default value parsing for different types", () => {
      const defaultHelp = `
Tool with defaults

Options:
      --enabled    Enable feature [boolean] [default: true]
      --count      Item count [number] [default: 10]
      --name       Tool name [string] [default: "my-tool"]
`;

      const metadata = HelpParser.parse("test", defaultHelp);

      const enabledOption = metadata.options.find((opt) => opt.name === "enabled");
      expect(enabledOption?.defaultValue).toBe(true);

      const countOption = metadata.options.find((opt) => opt.name === "count");
      expect(countOption?.defaultValue).toBe(10);

      const nameOption = metadata.options.find((opt) => opt.name === "name");
      expect(nameOption?.defaultValue).toBe("my-tool");
    });

    it("should handle quoted default values", () => {
      const quotedHelp = `
Tool with quoted defaults

Options:
      --message   Custom message [default: "hello world"]
      --pattern   Regex pattern [default: '^test.*']
`;

      const metadata = HelpParser.parse("test", quotedHelp);

      const messageOption = metadata.options.find((opt) => opt.name === "message");
      expect(messageOption?.defaultValue).toBe("hello world");

      const patternOption = metadata.options.find((opt) => opt.name === "pattern");
      expect(patternOption?.defaultValue).toBe("^test.*");
    });

    it("should handle choices with numbers", () => {
      const choicesHelp = `
Tool with numeric choices

Options:
      --level   Log level [choices: "1", "5", "10"]
`;

      const metadata = HelpParser.parse("test", choicesHelp);

      const levelOption = metadata.options.find((opt) => opt.name === "level");
      expect(levelOption?.choices).toEqual(["1", "5", "10"]);
    });
  });

  describe("多様な CLI 形式への対応", () => {
    it("should parse Go style single-dash options", () => {
      const goStyleHelp = `
Go-style CLI tool

Options:
  -flag     Some flag
  -verbose  Verbose output
`;

      const metadata = HelpParser.parse("gotool", goStyleHelp, { strategy: "go" });

      expect(metadata.toolName).toBe("ask-gotool");
      expect(metadata.options).toBeDefined();
    });

    it("should handle custom regex patterns", () => {
      const customHelp = `
Custom format tool

FLAGS:
  --custom-flag=VALUE  Description here
`;

      const metadata = HelpParser.parse("custom", customHelp);

      expect(metadata.toolName).toBe("ask-custom");
      expect(metadata).toBeDefined();
    });

    it("should handle tools without options", () => {
      const noOptionsHelp = `
Simple tool

Simple tool with no options, just takes a prompt.
`;

      const metadata = HelpParser.parse("simple", noOptionsHelp);

      expect(metadata.options).toEqual([]);
      expect(metadata.description).toBeDefined();
    });

    it("should handle tools without positional arguments", () => {
      const noArgHelp = `
Tool without argument

Options:
  -v, --verbose   Verbose output
`;

      const metadata = HelpParser.parse("noarg", noArgHelp);

      expect(metadata.argument).toBeUndefined();
    });
  });

  describe("サブコマンド", () => {
    it("should detect and parse subcommands", () => {
      const subcommandHelp = `
CLI with subcommands

Commands:
  build     Build the project
  test      Run tests
  deploy    Deploy to production
`;

      const metadata = HelpParser.parse("cli", subcommandHelp);

      expect(metadata.toolType).toBe("with-subcommands");
      expect(metadata.subcommands).toBeDefined();
      expect(metadata.subcommands?.length).toBe(3);

      const buildCmd = metadata.subcommands?.find((sc) => sc.name === "build");
      expect(buildCmd?.description).toBe("Build the project");
    });

    it("should handle hierarchical subcommand display", () => {
      const hierarchicalHelp = `
Multi-level CLI

Commands:
  docker build   Build Docker image
  docker run     Run Docker container
  docker ps      List containers
`;

      const metadata = HelpParser.parse("docker", hierarchicalHelp);

      expect(metadata.subcommands).toBeDefined();
      expect(metadata.subcommands?.length).toBeGreaterThan(0);

      const buildCmd = metadata.subcommands?.find((sc) => sc.name === "build");
      expect(buildCmd).toBeDefined();
    });

    it("should filter out invalid subcommand lines", () => {
      const invalidSubcommandsHelp = `
CLI with invalid lines

Commands:
  [options]        Invalid - looks like usage pattern
  .js               Invalid - file extension
  <command>         Invalid - technical marker
  valid             Valid subcommand
`;

      const metadata = HelpParser.parse("cli", invalidSubcommandsHelp);

      expect(metadata.subcommands).toBeDefined();
      expect(metadata.subcommands?.length).toBeGreaterThan(0);

      const validCmd = metadata.subcommands?.find((sc) => sc.name === "valid");
      expect(validCmd).toBeDefined();
    });
  });

  describe("エッジケースとエラーハンドリング", () => {
    it("should handle empty help text", () => {
      const metadata = HelpParser.parse("empty", "");

      expect(metadata.toolName).toBe("ask-empty");
      expect(metadata.options).toEqual([]);
      expect(metadata.argument).toBeUndefined();
    });

    it("should handle malformed option lines gracefully", () => {
      const malformedHelp = `
Tool with malformed lines

Options:
  --option-without-description
  Some line without flag
`;

      const metadata = HelpParser.parse("malformed", malformedHelp);

      expect(metadata).toBeDefined();
      expect(metadata.toolName).toBe("ask-malformed");
    });

    it("should handle section detection correctly", () => {
      const sectionedHelp = `
Tool description here
More description

Positionals:
  query    The search query

Options:
  -v, --verbose   Verbose output
`;

      const metadata = HelpParser.parse("search", sectionedHelp);

      expect(metadata.argument?.name).toBe("query");
      expect(metadata.options.length).toBeGreaterThan(0);
    });

    it("should skip divider lines", () => {
      const dividerHelp = `
Tool with dividers

Options:
  -v, --verbose   Verbose output
---
  -q, --quiet      Quiet output
`;

      const metadata = HelpParser.parse("tool", dividerHelp);

      expect(metadata.options.length).toBe(2);
    });
  });

  describe("完全なメタデータ生成", () => {
    it("should generate complete CliToolMetadata", () => {
      const metadata = HelpParser.parse("qwen", qwenHelpOutput);

      expect(metadata.toolName).toMatch(/^ask-/);
      expect(metadata.command).toBe("qwen");
      expect(metadata.description).toBeDefined();
      expect(metadata.toolType).toBeDefined();

      expect(Array.isArray(metadata.options)).toBe(true);
      metadata.options.forEach((opt) => {
        expect(opt.name).toBeDefined();
        expect(opt.flag).toBeDefined();
        expect(opt.type).toBeDefined();
        expect(opt.description).toBeDefined();
      });

      if (metadata.argument) {
        expect(metadata.argument.name).toBeDefined();
        expect(metadata.argument.type).toBeDefined();
      }
    });

    it("should set toolType based on subcommands presence", () => {
      const metadata = HelpParser.parse("qwen", qwenHelpOutput);

      expect(metadata.toolType).toBeDefined();
      expect(metadata.toolType).toMatch(/^(simple|with-subcommands)$/);
    });
  });
});