import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist/tools/simple-tools.js');

describe('Simple Tools', async () => {
  let pingTool, helpTool;

  it('should import tools', async () => {
    const module = await import(distPath);
    pingTool = module.pingTool;
    helpTool = module.helpTool;
    assert.ok(pingTool);
    assert.ok(helpTool);
  });

  it('pingTool should have correct structure', async () => {
    if (!pingTool) {
      const module = await import(distPath);
      pingTool = module.pingTool;
    }
    assert.strictEqual(pingTool.name, 'Ping');
    assert.strictEqual(pingTool.description, 'A simple test tool that echoes back a message');
    assert.strictEqual(pingTool.category, 'simple');
    assert.ok(pingTool.execute);
  });

  it('helpTool should have correct structure', async () => {
    if (!helpTool) {
      const module = await import(distPath);
      helpTool = module.helpTool;
    }
    assert.strictEqual(helpTool.name, 'Help');
    assert.strictEqual(helpTool.description, 'Shows the QwenCode help text');
    assert.strictEqual(helpTool.category, 'simple');
    assert.ok(helpTool.execute);
  });

  it('pingTool execute should return pong message', async () => {
    if (!pingTool) {
      const module = await import(distPath);
      pingTool = module.pingTool;
    }
    const result = await pingTool.execute({ message: 'test' });
    assert.strictEqual(result, 'Ping response: test');
  });

  it('pingTool execute should return default pong when no message', async () => {
    if (!pingTool) {
      const module = await import(distPath);
      pingTool = module.pingTool;
    }
    const result = await pingTool.execute({});
    assert.strictEqual(result, 'Ping response: pong');
  });

  it('helpTool execute should return help text', async () => {
    if (!helpTool) {
      const module = await import(distPath);
      helpTool = module.helpTool;
    }
    const result = await helpTool.execute({});
    assert.ok(result.includes('QwenCode MCP Tool Help'));
    assert.ok(result.includes('ask-qwen'));
    assert.ok(result.includes('Ping'));
    assert.ok(result.includes('Help'));
  });
});
