import { discoverCompatibleTools } from "./dist/utils/autoDiscovery.js";
import { Logger } from "./dist/utils/logger.js";

async function runDiscovery() {
  console.log("Starting Auto-Discovery...");
  console.log("Searching for: claude, opencode, gemini\n");

  const tools = await discoverCompatibleTools();

  if (tools.length === 0) {
    console.log("No compatible tools found in your PATH.");
  } else {
    console.log(`Found ${tools.length} compatible tool(s):`);
    tools.forEach(tool => {
      console.log(`- ${tool.toolName} (command: ${tool.command})`);
      console.log(`  Description: ${tool.description}`);
      if (tool.options && tool.options.length > 0) {
        console.log(`  Options: ${tool.options.length} detected`);
        tool.options.forEach(opt => {
          console.log(`    - ${opt.name}: ${opt.description}`);
        });
      }
      console.log("");
    });
  }
}

runDiscovery().catch(err => {
  console.error("Discovery failed:", err);
});
