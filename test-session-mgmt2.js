import { ConfigLoader } from "./dist/utils/configLoader.js";
import { GenericCliProvider } from "./dist/providers/generic-cli.provider.js";

async function testSessionManagement() {
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

  const metadata = provider.getMetadata();

  console.log("=== Session Management Test ===\n");
  console.log("Tool:", metadata.toolName);
  console.log("Options:", metadata.options.length);

  // Check sessionId option
  const sessionOption = metadata.options.find(opt => opt.name === "sessionId");
  if (sessionOption) {
    console.log("\n✓ sessionId option added successfully");
    console.log("  Flag:", sessionOption.flag);
    console.log("  Description:", sessionOption.description);
  } else {
    console.log("\n✗ sessionId option not found");
    return;
  }

  // Test 1: New session
  console.log("\n--- Test 1: New session ---");
  const result1 = await provider.execute({ 
    prompt: "Remember: my favorite color is blue." 
  });
  console.log("Response:", result1.split("\n")[0]);

  // Test 2: With sessionId (using a known format)
  console.log("\n--- Test 2: With sessionId ---");
  const result2 = await provider.execute({ 
    sessionId: "latest",  // Gemini supports "latest" as well
    prompt: "What is my favorite color?" 
  });
  console.log("Response:", result2);

  console.log("\n✓ Test completed!");
}

testSessionManagement().catch(err => {
  console.error("Error:", err);
});
