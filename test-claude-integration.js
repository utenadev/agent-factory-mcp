import { ConfigLoader } from "./dist/utils/configLoader.js";
import { GenericCliProvider } from "./dist/providers/generic-cli.provider.js";

async function testClaude() {
  // ConfigLoader will try to load ai-tools.json. 
  // If we rely on auto-discovery, we might need to trigger it or assume it's done.
  // For this test, we can manually create a config for claude if not found.
  
  let claudeConfig = null;
  const loadResult = ConfigLoader.load();
  
  if (loadResult.config) {
    claudeConfig = loadResult.config.tools.find(t => t.command === "claude");
  }

  if (!claudeConfig) {
    console.log("Claude not found in config, attempting to create manual config...");
    if (await GenericCliProvider.isCommandAvailable("claude")) {
       claudeConfig = {
         command: "claude",
         enabled: true,
         description: "Claude AI",
         alias: "ask-claude",
         defaultArgs: {
           print: true
         }
       };
    } else {
       console.error("Claude command not found in PATH.");
       return;
    }
  }

  const provider = await GenericCliProvider.create(claudeConfig);
  if (!provider) {
    console.error("Failed to create Claude provider");
    return;
  }

  console.log("=== Claude Integration Test ===\n");
  try {
    const result = await provider.execute({ prompt: "Hello, who are you?" });
    console.log("Claude Reply:", result);
  } catch (e) {
    console.error("Claude execution failed:", e);
  }
}

testClaude().catch(err => console.error(err));
