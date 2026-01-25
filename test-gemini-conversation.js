import { ConfigLoader } from "./dist/utils/configLoader.js";
import { GenericCliProvider } from "./dist/providers/generic-cli.provider.js";

async function testGeminiConversation() {
  const loadResult = ConfigLoader.load();
  if (!loadResult.config) {
    console.error("Failed to load config");
    return;
  }

  const geminiConfig = loadResult.config.tools.find(t => t.command === "gemini");
  if (!geminiConfig) {
    console.error("Gemini tool not found in config");
    return;
  }

  const provider = await GenericCliProvider.create(geminiConfig);
  if (!provider) {
    console.error("Failed to create Gemini provider");
    return;
  }

  console.log("=== Testing Gemini Conversation ===\n");
  console.log("User: Hello, Gemini! Can you count to 5?\n");
  
  // Execute the tool with a simple prompt
  const result = await provider.execute({
    prompt: "Hello! Can you count to 5 for me?"
  });

  console.log("\nGemini:", result);
  console.log("\n✓ Conversation test completed!");
}

testGeminiConversation().catch(err => {
  console.error("Error:", err);
});
