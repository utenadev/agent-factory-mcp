import { describe, it, expect } from "vitest";
// import assert from "node:assert"; // Using expect from vitest instead
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("HelpParser", async () => {
  let HelpParser;
  let qwenHelpOutput;

  it("should import HelpParser module", async () => {
    const module = await import("../dist/parsers/help-parser.js");
    HelpParser = module.HelpParser;
    expect(HelpParser).toBeDefined();
  });

  it("should load qwen help fixture", async () => {
    const fixturePath = path.resolve(__dirname, "fixtures/qwen-help.txt");
    qwenHelpOutput = readFileSync(fixturePath, "utf-8");
    expect(qwenHelpOutput).toBeDefined();
    expect(qwenHelpOutput).toContain("Usage: qwen");
  });

  it("should parse qwen help output", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // Verify basic structure
    expect(metadata.toolName).toBe("ask-qwen");
    expect(metadata.command).toBe("qwen");
    expect(metadata.description).toBeDefined();
    expect(metadata.options).toBeDefined();
    expect(Array.isArray(metadata.options)).toBe(true);
  });

  it("should parse model option correctly", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    const modelOption = metadata.options.find((opt) => opt.name === "model");
    expect(modelOption, "model option should be parsed").toBeDefined();
    expect(modelOption.flag).toBe("--model");
    expect(modelOption.type).toBe("string");
    expect(modelOption.description).toBeDefined();
  });

  it("should parse boolean options correctly", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // debug should be boolean with default false
    const debugOption = metadata.options.find((opt) => opt.name === "debug");
    expect(debugOption, "debug option should be parsed").toBeDefined();
    expect(debugOption.type).toBe("boolean");
    expect(debugOption.defaultValue).toBe(false);
  });

  it("should parse options with choices", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // telemetry-target should have choices
    const telemetryTarget = metadata.options.find(
      (opt) => opt.name === "telemetry-target"
    );
    expect(telemetryTarget, "telemetry-target option should be parsed").toBeDefined();
    expect(telemetryTarget.choices).toBeDefined();
    expect(telemetryTarget.choices).toContain("local");
    expect(telemetryTarget.choices).toContain("gcp");
  });

  it("should parse options with default values", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // input-format should have default "text"
    const inputFormat = metadata.options.find(
      (opt) => opt.name === "input-format"
    );
    expect(inputFormat, "input-format option should be parsed").toBeDefined();
    expect(inputFormat.defaultValue).toBe("text");
  });

  it("should parse positional arguments", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    expect(metadata.argument, "should have a positional argument").toBeDefined();
    expect(metadata.argument.name).toBe("query");
    expect(metadata.argument.type).toBe("string");
  });

  it("should parse description correctly", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // Description should contain key information
    expect(metadata.description).toBeDefined();
    expect(
      metadata.description.includes("Qwen Code") ||
        metadata.description.includes("interactive CLI")
    ).toBeTruthy();
  });

  it("should filter out deprecated options or mark them", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // proxy option is deprecated
    const proxyOption = metadata.options.find((opt) => opt.name === "proxy");
    expect(proxyOption, "proxy option should be parsed even if deprecated").toBeDefined();
  });

  it("should handle options with both short and long flags", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // -m, --model
    const modelOption = metadata.options.find((opt) => opt.name === "model");
    expect(modelOption, "model option should be parsed").toBeDefined();
    expect(modelOption.flag).toBe("--model");
  });

  it("should handle options with only long flags", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // --auth-type (no short flag)
    const authTypeOption = metadata.options.find(
      (opt) => opt.name === "auth-type"
    );
    expect(authTypeOption, "auth-type option should be parsed").toBeDefined();
    expect(authTypeOption.flag).toBe("--auth-type");
  });
});
