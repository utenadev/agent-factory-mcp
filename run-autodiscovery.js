import { ConfigLoader } from "./dist/utils/configLoader.js";

async function runAutoDiscovery() {
  console.log("Running auto-discovery with ConfigLoader...");
  
  const result = await ConfigLoader.autoDiscoverAndAddTools();
  
  if (result.success) {
    console.log("✓ Auto-discovery successful!");
    console.log("Config saved to: ai-tools.json");
  } else {
    console.error("✗ Auto-discovery failed:", result.error);
  }
}

runAutoDiscovery().catch(err => {
  console.error("Error:", err);
});
