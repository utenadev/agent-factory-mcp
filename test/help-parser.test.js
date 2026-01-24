import { describe, it } from "node:test";
import assert from "node:assert";
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
    assert.ok(HelpParser);
  });

  it("should load qwen help fixture", async () => {
    const fixturePath = path.resolve(__dirname, "fixtures/qwen-help.txt");
    qwenHelpOutput = readFileSync(fixturePath, "utf-8");
    assert.ok(qwenHelpOutput);
    assert.ok(qwenHelpOutput.includes("Usage: qwen"));
  });

  it("should parse qwen help output", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // Verify basic structure
    assert.strictEqual(metadata.toolName, "ask-qwen");
    assert.strictEqual(metadata.command, "qwen");
    assert.ok(metadata.description);
    assert.ok(metadata.options);
    assert.ok(Array.isArray(metadata.options));
  });

  it("should parse model option correctly", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    const modelOption = metadata.options.find((opt) => opt.name === "model");
    assert.ok(modelOption, "model option should be parsed");
    assert.strictEqual(modelOption.flag, "--model");
    assert.strictEqual(modelOption.type, "string");
    assert.ok(modelOption.description);
  });

  it("should parse boolean options correctly", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // debug should be boolean with default false
    const debugOption = metadata.options.find((opt) => opt.name === "debug");
    assert.ok(debugOption, "debug option should be parsed");
    assert.strictEqual(debugOption.type, "boolean");
    assert.strictEqual(debugOption.defaultValue, false);
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
    assert.ok(telemetryTarget, "telemetry-target option should be parsed");
    assert.ok(telemetryTarget.choices);
    assert.ok(telemetryTarget.choices.includes("local"));
    assert.ok(telemetryTarget.choices.includes("gcp"));
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
    assert.ok(inputFormat, "input-format option should be parsed");
    assert.strictEqual(inputFormat.defaultValue, "text");
  });

  it("should parse positional arguments", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    assert.ok(metadata.argument, "should have a positional argument");
    assert.strictEqual(metadata.argument.name, "query");
    assert.strictEqual(metadata.argument.type, "string");
  });

  it("should parse description correctly", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // Description should contain key information
    assert.ok(metadata.description);
    assert.ok(
      metadata.description.includes("Qwen Code") ||
        metadata.description.includes("interactive CLI")
    );
  });

  it("should filter out deprecated options or mark them", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // proxy option is deprecated
    const proxyOption = metadata.options.find((opt) => opt.name === "proxy");
    assert.ok(proxyOption, "proxy option should be parsed even if deprecated");
  });

  it("should handle options with both short and long flags", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("qwen", qwenHelpOutput);

    // -m, --model
    const modelOption = metadata.options.find((opt) => opt.name === "model");
    assert.ok(modelOption, "model option should be parsed");
    assert.strictEqual(modelOption.flag, "--model");
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
    assert.ok(authTypeOption, "auth-type option should be parsed");
    assert.strictEqual(authTypeOption.flag, "--auth-type");
  });
});
