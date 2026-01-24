import { describe, it } from 'node:test';
import assert from 'node:assert';
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
    assert.ok(Array.isArray(toolRegistry));
    assert.strictEqual(typeof toolExists, 'function');
    assert.strictEqual(typeof getToolDefinitions, 'function');
    assert.strictEqual(typeof executeTool, 'function');
  });

  it('should have registered tools', async () => {
    if (!toolRegistry) {
      const module = await import(distPath);
      toolRegistry = module.toolRegistry;
    }
    assert.ok(toolRegistry.length > 0);
  });

  it('should find ping tool', async () => {
    if (!toolExists) {
      const module = await import(distPath);
      toolExists = module.toolExists;
    }
    assert.strictEqual(toolExists('Ping'), true);
  });

  it('should not find non-existent tool', async () => {
    if (!toolExists) {
      const module = await import(distPath);
      toolExists = module.toolExists;
    }
    assert.strictEqual(toolExists('NonExistentTool'), false);
  });

  it('should get tool definitions', async () => {
    if (!getToolDefinitions) {
      const module = await import(distPath);
      getToolDefinitions = module.getToolDefinitions;
    }
    const definitions = getToolDefinitions();
    assert.ok(Array.isArray(definitions));
    assert.ok(definitions.length > 0);
    assert.ok(definitions[0].name);
    assert.ok(definitions[0].description);
    assert.ok(definitions[0].inputSchema);
  });

  it('should execute ping tool successfully', async () => {
    if (!executeTool) {
      const module = await import(distPath);
      executeTool = module.executeTool;
    }
    const result = await executeTool('Ping', { message: 'hello' });
    assert.strictEqual(result, 'Ping response: hello');
  });

  it('should throw error for non-existent tool', async () => {
    if (!executeTool) {
      const module = await import(distPath);
      executeTool = module.executeTool;
    }
    await assert.rejects(
      async () => await executeTool('NonExistentTool', {}),
      { message: /Unknown tool/ }
    );
  });

  it('should validate tool arguments', async () => {
    if (!executeTool) {
      const module = await import(distPath);
      executeTool = module.executeTool;
    }
    // Pass invalid argument type (message should be string, not number)
    await assert.rejects(
      async () => await executeTool('Ping', { message: 123 }),
      { message: /Invalid arguments/ }
    );
  });
});
