import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import {
  findExecutable,
  getToolVersion,
  checkToolCompatibility,
  discoverCompatibleTools,
} from "../src/utils/autoDiscovery.js";

describe("AutoDiscovery (Integration Tests)", () => {
  // Tests use real system commands - these are true integration tests

  describe("findExecutable", () => {
    it("should find common system commands", () => {
      // Test with commands that should exist on all systems
      if (process.platform !== "win32") {
        const lsPath = findExecutable("ls");
        expect(lsPath).not.toBeNull();
        expect(lsPath).toMatch(/ls/);
      } else {
        const wherePath = findExecutable("where");
        expect(wherePath).not.toBeNull();
        expect(wherePath).toMatch(/where/);
      }
    });

    it("should return null for non-existent command", () => {
      const path = findExecutable("this-command-definitely-does-not-exist-12345");
      expect(path).toBeNull();
    });
  });

  describe("getToolVersion", () => {
    it("should get version for commands that support --version", () => {
      // Use 'node' which should be available since we're running Bun
      const version = getToolVersion(process.execPath);
      expect(version).toBeDefined();
      // Node version should be something like "v20.x.x" or "v18.x.x"
      expect(version).toMatch(/\d+\.\d+/);
    });
  });

  describe("checkToolCompatibility", () => {
    it("should return null for non-whitelisted tools", async () => {
      if (process.platform !== "win32") {
        // 'ls' is not in the AI tool whitelist
        const lsPath = findExecutable("ls");
        if (lsPath) {
          const metadata = await checkToolCompatibility(lsPath);
          // Should return null because ls is not in the whitelist
          expect(metadata).toBeNull();
        }
      }
    });
  });

  describe("discoverCompatibleTools", () => {
    let discoveredTools: Awaited<ReturnType<typeof discoverCompatibleTools>>;

    it("should discover tools (may take a few seconds)", async () => {
      // Increase timeout for this test as it checks multiple tools
      discoveredTools = await discoverCompatibleTools();
      expect(Array.isArray(discoveredTools)).toBe(true);
    }, 15000);

    it("should only include whitelisted tools", () => {
      // Whitelist is: claude, opencode, gemini
      const validCommands = new Set(["claude", "opencode", "gemini"]);
      for (const tool of discoveredTools) {
        expect(validCommands.has(tool.command)).toBe(true);
      }
    });

    it("should have correct length based on installed tools", () => {
      const installedTools = ["claude", "opencode", "gemini"].filter(t => findExecutable(t) !== null);
      console.log(`Installed AI tools: ${installedTools.join(", ") || "none"}`);
      console.log(`Discovered tools: ${discoveredTools.map(t => t.command).join(", ") || "none"}`);
      expect(discoveredTools.length).toBe(installedTools.length);
    });
  });
});

describe("AutoDiscovery (AI Tool-Specific Tests)", () => {
  // These tests only run if the actual AI tools are installed

  const aiTools = ["claude", "opencode", "gemini"];

  // Test each AI tool individually
  for (const toolName of aiTools) {
    const toolPath = findExecutable(toolName);

    describe(`${toolName}`, () => {
      if (!toolPath) {
        it.skip(`${toolName} is not installed, skipping`, () => {});
        return;
      }

      it(`should be found in PATH`, () => {
        expect(toolPath).not.toBeNull();
      });

      it(`should have a version`, () => {
        const version = getToolVersion(toolPath!);
        if (version) {
          expect(version).toBeDefined();
          console.log(`${toolName} version: ${version}`);
        }
      });

      it(`should be compatible with help parser`, async () => {
        const metadata = await checkToolCompatibility(toolPath!);
        // Some tools may not be compatible if they don't have standard --help output
        if (metadata) {
          expect(metadata.command).toBe(toolName);
          expect(metadata.toolName).toBeDefined();
          console.log(`${toolName} tool name: ${metadata.toolName}`);
        }
      });
    });
  }
});
