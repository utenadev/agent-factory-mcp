import { ConfigLoader } from "./dist/utils/configLoader.js";

async function listTools() {
  const loadResult = ConfigLoader.load();
  if (!loadResult.config) {
    console.error("Failed to load config");
    return;
  }

  console.log("Loaded config tools:");
  loadResult.config.tools.forEach(tool => {
    const version = tool.version || "unknown";
    console.log("  - " + tool.alias + " (command: " + tool.command + ", version: " + version + ")");
  });
}

listTools().catch(err => {
  console.error("Error:", err);
});
