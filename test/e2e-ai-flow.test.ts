import { describe, it, expect } from "bun:test";
import { discoverCompatibleTools } from "../src/utils/autoDiscovery.js";
import { GenericCliProvider } from "../src/providers/generic-cli.provider.js";
import type { ToolConfig } from "../src/utils/configLoader.js";

describe("E2E AI Agent Integration", () => {
  // This test validates the entire chain: 
  // AutoDiscovery -> Metadata Parsing -> Provider Creation -> CLI Execution
  
  it("should auto-discover tools", async () => {
    const tools = await discoverCompatibleTools();
    expect(Array.isArray(tools)).toBe(true);
  }, 10000);

  const testTool = async (toolMeta: any) => {
    console.log(`Testing execution for: ${toolMeta.command}`);
    
    const config: ToolConfig = {
      command: toolMeta.command,
      enabled: true,
    };

    // 1. Create Provider
    const provider = await GenericCliProvider.create(config);
    expect(provider).not.toBeNull();
    
    if (provider) {
      // 2. Execute Tool (using --version to avoid API costs)
      const hasVersion = provider.getMetadata().options.some(o => o.name === 'version');
      
      if (hasVersion) {
        const output = await provider.execute({ version: true });
        console.log(`[${toolMeta.command}] Output: ${output.trim().split('\n')[0]}...`);
        expect(output).toBeDefined();
        expect(output.length).toBeGreaterThan(0);
        expect(output).toMatch(/\d/); 
      }
    }
  };

  // Run tests for each discovered tool if available
  // We discover them again inside because top-level await in describe can be tricky with some runners
  it("should execute discovered tools successfully", async () => {
    const tools = await discoverCompatibleTools();
    if (tools.length === 0) return;

    for (const tool of tools) {
      await testTool(tool);
    }
  }, 30000); // 30 seconds timeout for full E2E cycle
});
