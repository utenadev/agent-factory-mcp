import { describe, it, expect } from 'vitest';
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
    expect(pingTool).toBeDefined();
    expect(helpTool).toBeDefined();
  });

  it('pingTool should have correct structure', async () => {
    if (!pingTool) {
      const module = await import(distPath);
      pingTool = module.pingTool;
    }
    expect(pingTool.name).toBe('Ping');
    expect(pingTool.description).toBe('A simple test tool that echoes back a message');
    expect(pingTool.category).toBe('simple');
    expect(pingTool.execute).toBeDefined();
  });

  it('helpTool should have correct structure', async () => {
    if (!helpTool) {
      const module = await import(distPath);
      helpTool = module.helpTool;
    }
    expect(helpTool.name).toBe('Help');
    expect(helpTool.description).toBe('Shows the QwenCode help text');
    expect(helpTool.category).toBe('simple');
    expect(helpTool.execute).toBeDefined();
  });

  it('pingTool execute should return pong message', async () => {
    if (!pingTool) {
      const module = await import(distPath);
      pingTool = module.pingTool;
    }
    const result = await pingTool.execute({ message: 'test' });
    expect(result).toBe('Ping response: test');
  });

  it('pingTool execute should return default pong when no message', async () => {
    if (!pingTool) {
      const module = await import(distPath);
      pingTool = module.pingTool;
    }
    const result = await pingTool.execute({});
    expect(result).toBe('Ping response: pong');
  });

  it('helpTool execute should return help text', async () => {
    if (!helpTool) {
      const module = await import(distPath);
      helpTool = module.helpTool;
    }
    const result = await helpTool.execute({});
    expect(result).toContain('QwenCode MCP Tool Help');
    expect(result).toContain('ask-qwen');
    expect(result).toContain('Ping');
    expect(result).toContain('Help');
  });
});
