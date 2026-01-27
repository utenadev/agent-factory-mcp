import { describe, it, expect } from "vitest";
import { pingTool, helpTool } from "../../src/tools/simple-tools.js";

describe("Simple Tools", () => {
  it("should have correct pingTool structure", () => {
    expect(pingTool.name).toBe("Ping");
    expect(pingTool.description).toBe("A simple test tool that echoes back a message");
    expect(pingTool.category).toBe("simple");
    expect(pingTool.execute).toBeDefined();
  });

  it("should have correct helpTool structure", () => {
    expect(helpTool.name).toBe("Help");
    expect(helpTool.description).toBe("Shows the QwenCode help text");
    expect(helpTool.category).toBe("simple");
    expect(helpTool.execute).toBeDefined();
  });

  it("pingTool execute should return pong message", async () => {
    const result = await pingTool.execute({ message: "test" });
    expect(result).toBe("Ping response: test");
  });

  it("pingTool execute should return default pong when no message", async () => {
    const result = await pingTool.execute({});
    expect(result).toBe("Ping response: pong");
  });

  it("helpTool execute should return help text", async () => {
    const result = await helpTool.execute({});
    expect(result).toContain("QwenCode MCP Tool Help");
    expect(result).toContain("ask-qwen");
    expect(result).toContain("Ping");
    expect(result).toContain("Help");
  });
});
