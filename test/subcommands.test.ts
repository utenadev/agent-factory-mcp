import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "url";
import path from "node:path";
import { HelpParser } from "../src/parsers/help-parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Subcommand Parsing", () => {
  let ollamaHelpOutput: string;

  it("should import HelpParser module", () => {
    expect(HelpParser).toBeDefined();
  });

  it("should load ollama help fixture", () => {
    const fixturePath = path.resolve(__dirname, "fixtures/ollama-help.txt");
    ollamaHelpOutput = readFileSync(fixturePath, "utf-8");
    expect(ollamaHelpOutput).toBeDefined();
    expect(ollamaHelpOutput).toContain("Commands:");
  });

  it("should detect subcommands in help output", () => {
    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    expect(metadata.toolType).toBe("with-subcommands");
    expect(metadata.subcommands).toBeDefined();
    expect(metadata.subcommands?.length).toBeGreaterThan(0);
  });

  it("should parse subcommand names and descriptions", () => {
    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    const serveSub = metadata.subcommands?.find(sc => sc.name === "serve");
    expect(serveSub, "serve subcommand should be parsed").toBeDefined();
    expect(serveSub?.name).toBe("serve");
    expect(serveSub?.description).toBeDefined();

    const runSub = metadata.subcommands?.find(sc => sc.name === "run");
    expect(runSub, "run subcommand should be parsed").toBeDefined();
    expect(runSub?.name).toBe("run");
  });

  it("should parse all expected subcommands", () => {
    const metadata = HelpParser.parse("ollama", ollamaHelpOutput);

    const subcommandNames = metadata.subcommands?.map(sc => sc.name).sort();
    const expected = ["cp", "help", "list", "rm", "run", "serve", "show"];
    
    expect(subcommandNames).toEqual(expected);
  });

  it("should handle tools with subcommands correctly", () => {
    // Use qwen help which has subcommands (mcp, extensions)
    const qwenHelp = readFileSync(path.resolve(__dirname, "fixtures/qwen-help.txt"), "utf-8");
    const metadata = HelpParser.parse("qwen", qwenHelp);

    // qwen has subcommands, so it should be detected as "with-subcommands"
    expect(metadata.toolType).toBe("with-subcommands");
    expect(metadata.subcommands).toBeDefined();
    expect(metadata.subcommands?.length).toBeGreaterThan(0);

    // Check for expected qwen subcommands
    const subcommandNames = metadata.subcommands?.map(sc => sc.name);
    expect(subcommandNames).toContain("mcp");
  });
});