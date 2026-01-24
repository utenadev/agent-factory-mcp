import { describe, it } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Subcommand Parsing", async () => {
  let HelpParser;
  let ollamaHelpOutput;

  it("should import HelpParser module", async () => {
    const module = await import("../dist/parsers/help-parser.js");
    HelpParser = module.HelpParser;
    assert.ok(HelpParser);
  });

  it("should load ollama help fixture", async () => {
    const fixturePath = path.resolve(__dirname, "fixtures/ollama-help.txt");
    ollamaHelpOutput = readFileSync(fixturePath, "utf-8");
    assert.ok(ollamaHelpOutput);
    assert.ok(ollamaHelpOutput.includes("Commands:"));
  });

  it("should detect subcommands in help output", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    assert.strictEqual(metadata.toolType, "with-subcommands");
    assert.ok(metadata.subcommands);
    assert.ok(metadata.subcommands.length > 0);
  });

  it("should parse subcommand names and descriptions", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    const serveSub = metadata.subcommands?.find(sc => sc.name === "serve");
    assert.ok(serveSub, "serve subcommand should be parsed");
    assert.strictEqual(serveSub.name, "serve");
    assert.ok(serveSub.description);

    const runSub = metadata.subcommands?.find(sc => sc.name === "run");
    assert.ok(runSub, "run subcommand should be parsed");
    assert.strictEqual(runSub.name, "run");
  });

  it("should parse all expected subcommands", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    const subcommandNames = metadata.subcommands?.map(sc => sc.name).sort();
    const expected = ["cp", "help", "list", "rm", "run", "serve", "show"];
    
    assert.deepStrictEqual(subcommandNames, expected);
  });

  it("should handle tools with subcommands correctly", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    // Use qwen help which has subcommands (mcp, extensions)
    const qwenHelp = readFileSync(path.resolve(__dirname, "fixtures/qwen-help.txt"), "utf-8");
    const metadata = HelpParser.parse("qwen", qwenHelp);

    // qwen has subcommands, so it should be detected as "with-subcommands"
    assert.strictEqual(metadata.toolType, "with-subcommands");
    assert.ok(metadata.subcommands);
    assert.ok(metadata.subcommands.length > 0);

    // Check for expected qwen subcommands
    const subcommandNames = metadata.subcommands?.map(sc => sc.name);
    assert.ok(subcommandNames?.includes("mcp") || subcommandNames?.includes("extensions"));
  });
});
