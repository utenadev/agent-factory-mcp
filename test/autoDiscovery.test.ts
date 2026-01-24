import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { HelpParser } from "../src/parsers/help-parser.js";
import {
  checkToolCompatibility,
  discoverCompatibleTools,
  scanPathForExecutables,
} from "../src/utils/autoDiscovery.js";

const originalExecSync = require("child_process").execSync;
const mockExecSync = (command: string) => {
  if (command.includes("test -x")) {
    return command.includes("valid-tool") ? "executable" : "";
  }
  if (command.includes("ls") || command.includes("dir")) {
    return "valid-tool\ninvalid-tool\n";
  }
  if (command.includes("--help")) {
    return command.includes("valid-tool")
      ? 'Usage: valid-tool [options]\n\nOptions:\n  -m, --model <model>  Model to use [choices: "qwen-turbo", "qwen-plus"] [default: "qwen-turbo"]\n  -h, --help           display help for command'
      : "";
  }
  return originalExecSync(command);
};

const originalHelpParserParse = HelpParser.parse;
HelpParser.parse = (command: string, helpOutput: string) => {
  if (command === "valid-tool") {
    return {
      toolName: "ask-valid-tool",
      description: "Test tool",
      command: "valid-tool",
      toolType: "simple",
      options: [
        {
          name: "model",
          flag: "--model",
          type: "string",
          description: "Model to use",
          choices: ["qwen-turbo", "qwen-plus"],
          defaultValue: "qwen-turbo",
        },
      ],
    };
  }
  return originalHelpParserParse(command, helpOutput);
};

require("child_process").execSync = mockExecSync;

describe("AutoDiscovery", () => {
  describe("scanPathForExecutables", () => {
    it("should return a list of executable files", async () => {
      const executables = await scanPathForExecutables();
      assert.ok(Array.isArray(executables));
      assert.ok(executables.length > 0);
    });
  });

  describe("checkToolCompatibility", () => {
    it("should return metadata for compatible tools", async () => {
      const metadata = await checkToolCompatibility("valid-tool");
      assert.ok(metadata);
      assert.equal(metadata?.toolName, "ask-valid-tool");
    });

    it("should return null for incompatible tools", async () => {
      const metadata = await checkToolCompatibility("invalid-tool");
      assert.equal(metadata, null);
    });
  });

  describe("discoverCompatibleTools", () => {
    it("should return a list of compatible tools", async () => {
      const tools = await discoverCompatibleTools();
      assert.ok(Array.isArray(tools));
      assert.ok(tools.length > 0);
      assert.equal(tools[0].toolName, "ask-valid-tool");
    });
  });
});

process.on("exit", () => {
  require("child_process").execSync = originalExecSync;
  HelpParser.parse = originalHelpParserParse;
});
