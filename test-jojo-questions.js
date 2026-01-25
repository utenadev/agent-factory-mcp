import { ConfigLoader } from "./dist/utils/configLoader.js";
import { GenericCliProvider } from "./dist/providers/generic-cli.provider.js";

async function testJoJoQuestions() {
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

  console.log("=== ジョジョ質問テスト (Gemini) ===\n");

  // Q1
  console.log("--- Q1: ジョジョの何部が好き？ ---");
  const result1 = await provider.execute({ 
    prompt: "ジョジョの何部が好き？短く答えて" 
  });
  console.log("Gemini:", result1);

  // Q2 - continue the conversation
  console.log("\n--- Q2: その部で一番好きなスタンドを教えて ---");
  const result2 = await provider.execute({ 
    sessionId: "latest",
    prompt: "その部で一番好きなスタンドを教えて" 
  });
  console.log("Gemini:", result2);

  console.log("\n✓ テスト完了!");
}

testJoJoQuestions().catch(err => {
  console.error("Error:", err);
});
