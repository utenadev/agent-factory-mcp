import { ConfigLoader } from "./dist/utils/configLoader.js";
import { GenericCliProvider } from "./dist/providers/generic-cli.provider.js";

async function testSimplifiedCode() {
  const loadResult = ConfigLoader.load();
  if (!loadResult.config) {
    console.error("Failed to load config");
    return;
  }

  const geminiConfig = loadResult.config.tools.find(t => t.command === "gemini");
  if (!geminiConfig) {
    console.error("Gemini tool not found");
    return;
  }

  const provider = await GenericCliProvider.create(geminiConfig);
  if (!provider) {
    console.error("Failed to create provider");
    return;
  }

  console.log("=== Simplified Code Test ===\n");
  
  // Test 1: New session
  console.log("Test 1: New session");
  const result1 = await provider.execute({ 
    prompt: "1+1は？" 
  });
  console.log("Result:", result1);

  // Test 2: Session continuation
  console.log("\nTest 2: Session continuation");
  const result2 = await provider.execute({ 
    sessionId: "latest",
    prompt: "同じ問題を英語で答えて" 
  });
  console.log("Result:", result2);

  console.log("\n✓ All tests passed!");
}

testSimplifiedCode().catch(err => {
  console.error("Error:", err);
});
