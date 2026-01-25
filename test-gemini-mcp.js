import { ConfigLoader } from "./dist/utils/configLoader.js";
import { GenericCliProvider } from "./dist/providers/generic-cli.provider.js";

async function testGeminiMCP() {
  const loadResult = ConfigLoader.load();
  if (!loadResult.config) {
    console.error("Failed to load config");
    return;
  }

  console.log("Testing MCP tool execution for ask-gemini...\n");
  
  const geminiConfig = loadResult.config.tools.find(t => t.command === "gemini");
  if (!geminiConfig) {
    console.error("Gemini tool not found in config");
    return;
  }

  console.log("Gemini tool config found:");
  console.log("  Alias:", geminiConfig.alias);
  console.log("  Command:", geminiConfig.command);
  console.log("  Version:", geminiConfig.version);
  console.log("  Enabled:", geminiConfig.enabled);
  
  // Create provider using static factory method
  const provider = await GenericCliProvider.create(geminiConfig);
  
  if (!provider) {
    console.error("Failed to create Gemini provider");
    return;
  }

  const metadata = provider.getMetadata();
  
  console.log("\nGemini tool metadata:");
  console.log("  Tool name:", metadata.toolName);
  console.log("  Description:", metadata.description.substring(0, 80) + "...");
  console.log("  Options count:", metadata.options.length);
  console.log("\n✓ MCP tool setup successful!");
}

testGeminiMCP().catch(err => {
  console.error("Error:", err);
});
