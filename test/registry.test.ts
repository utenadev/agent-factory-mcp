import { describe, it, expect } from 'vitest';
// import assert from 'node:assert'; // Using expect from vitest instead
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import tools/index.js first to ensure tools are registered
const indexPath = path.resolve(__dirname, '../dist/tools/index.js');
await import(indexPath);

// Then import registry
const distPath = path.resolve(__dirname, '../dist/tools/registry.js');

describe('Tool Registry', async () => {
  let toolRegistry, toolExists, getToolDefinitions, executeTool;

  it('should import registry functions', async () => {
    const module = await import(distPath);
    toolRegistry = module.toolRegistry;
    toolExists = module.toolExists;
    getToolDefinitions = module.getToolDefinitions;
    executeTool = module.executeTool;
    expect(Array.isArray(toolRegistry)).toBe(true);
    expect(typeof toolExists).toBe('function');
    expect(typeof getToolDefinitions).toBe('function');
    expect(typeof executeTool).toBe('function');
  });

  it('should have registered tools', async () => {
    if (!toolRegistry) {
      const module = await import(distPath);
      toolRegistry = module.toolRegistry;
    }
    expect(toolRegistry.length).toBeGreaterThan(0);
  });

  it('should find ping tool', async () => {
    if (!toolExists) {
      const module = await import(distPath);
      toolExists = module.toolExists;
    }
    expect(toolExists('Ping')).toBe(true);
  });

  it('should not find non-existent tool', async () => {
    if (!toolExists) {
      const module = await import(distPath);
      toolExists = module.toolExists;
    }
    expect(toolExists('NonExistentTool')).toBe(false);
  });

  it('should get tool definitions', async () => {
    if (!getToolDefinitions) {
      const module = await import(distPath);
      getToolDefinitions = module.getToolDefinitions;
    }
    const definitions = getToolDefinitions();
    expect(Array.isArray(definitions)).toBeTruthy();
    expect(definitions.length).toBeGreaterThan(0);
    expect(definitions[0].name).toBeDefined();
    expect(definitions[0].description).toBeDefined();
    expect(definitions[0].inputSchema).toBeDefined();
  });

  it('should execute ping tool successfully', async () => {
    if (!executeTool) {
      const module = await import(distPath);
      executeTool = module.executeTool;
    }
    const result = await executeTool('Ping', { message: 'hello' });
    expect(result).toBe('Ping response: hello');
  });

  it('should throw error for non-existent tool', async () => {
    if (!executeTool) {
      const module = await import(distPath);
      executeTool = module.executeTool;
    }
    await expect(async () => await executeTool('NonExistentTool', {}))
      .rejects.toThrow(/Unknown tool/);
  });

  it('should validate tool arguments', async () => {
    if (!executeTool) {
      const module = await import(distPath);
      executeTool = module.executeTool;
    }
    // Pass invalid argument type (message should be string, not number)
    await expect(async () => await executeTool('Ping', { message: 123 }))
      .rejects.toThrow(/Invalid arguments/);
  });
});
