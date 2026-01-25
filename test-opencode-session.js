import { ConfigLoader } from "./dist/utils/configLoader.js";
import { GenericCliProvider } from "./dist/providers/generic-cli.provider.js";

async function testOpencodeJoJo() {
  console.log("=== JoJo Question Test (OpenCode) ===\n");

  // Manually define config to ensure it's correct for this test
  const opencodeConfig = {
    command: "opencode",
    enabled: true,
    description: "OpenCode AI",
    alias: "ask-opencode",
    defaultArgs: {
      format: "json",
      model: "google/gemini-2.5-flash"
    }
  };

  const provider = await GenericCliProvider.create(opencodeConfig);
  if (!provider) {
    console.error("Failed to create OpenCode provider");
    return;
  }

  // Q1
  console.log("--- Q1: ジョジョの何部が好き？ ---");
  const result1 = await provider.execute({
    prompt: "ジョジョの何部が好き？短く答えて"
  });
  console.log("OpenCode:", result1);

  // Q2 - continue the conversation using "latest" which maps to --continue
  console.log("\n--- Q2: その部で一番好きなスタンドを教えて ---");
  const result2 = await provider.execute({
    sessionId: "latest",
    prompt: "その部で一番好きなスタンドを教えて"
  });
  console.log("OpenCode:", result2);

  console.log("\n✓ Test Completed!");
}

testOpencodeJoJo().catch(err => {
  console.error("Error:", err);
});
