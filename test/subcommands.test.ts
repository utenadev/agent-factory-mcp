import { describe, it, expect } from "vitest";
// import assert from "node:assert"; // Using expect from vitest instead
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
    expect(HelpParser).toBeDefined();
  });

  it("should load ollama help fixture", async () => {
    const fixturePath = path.resolve(__dirname, "fixtures/ollama-help.txt");
    ollamaHelpOutput = readFileSync(fixturePath, "utf-8");
    expect(ollamaHelpOutput).toBeDefined();
    expect(ollamaHelpOutput).toContain("Commands:");
  });

  it("should detect subcommands in help output", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    expect(metadata.toolType).toBe("with-subcommands");
    expect(metadata.subcommands).toBeDefined();
    expect(metadata.subcommands.length > 0).toBeDefined();
  });

  it("should parse subcommand names and descriptions", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    const serveSub = metadata.subcommands?.find(sc => sc.name === "serve");
    expect(serveSub, "serve subcommand should be parsed").toBeDefined();
    expect(serveSub.name).toBe("serve");
    expect(serveSub.description).toBeDefined();

    const runSub = metadata.subcommands?.find(sc => sc.name === "run");
    expect(runSub, "run subcommand should be parsed").toBeDefined();
    expect(runSub.name).toBe("run");
  });

  it("should parse all expected subcommands", async () => {
    if (!HelpParser) {
      const module = await import("../dist/parsers/help-parser.js");
      HelpParser = module.HelpParser;
    }

    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    const subcommandNames = metadata.subcommands?.map(sc => sc.name).sort();
    const expected = ["cp", "help", "list", "rm", "run", "serve", "show"];
    
    expect(subcommandNames).toEqual(expected);
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
    expect(metadata.toolType).toBe("with-subcommands");
    expect(metadata.subcommands).toBeDefined();
    expect(metadata.subcommands.length).toBeGreaterThan(0);

    // Check for expected qwen subcommands
    const subcommandNames = metadata.subcommands?.map(sc => sc.name);
    expect(subcommandNames).toContain("mcp");
  });
});
