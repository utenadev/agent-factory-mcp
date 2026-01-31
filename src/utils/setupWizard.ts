import type { Answers } from "inquirer";
import inquirer from "inquirer";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { discoverCompatibleTools } from "./autoDiscovery.js";
import { ConfigLoader } from "./configLoader.js";
import type { CliToolMetadata } from "../types/cli-metadata.js";
import type { ToolConfig, ToolsConfig } from "./configLoader.js";

// ============================================================================
// Types
// ============================================================================

interface WizardAnswers extends Answers {
  tools: string[];
  configureDetails: boolean;
  saveConfig: boolean;
}

interface ToolConfigDetails {
  alias?: string;
  description?: string;
  systemPrompt?: string;
}

// ============================================================================
// Constants
// ============================================================================

const WELCOME_MESSAGE = `
╔════════════════════════════════════════════════════════════════╗
║  Agent Factory MCP - Setup Wizard                              ║
╚════════════════════════════════════════════════════════════════╝

This wizard will help you configure AI tools for MCP integration.
`;

// ============================================================================
// Setup Wizard
// ============================================================================

/**
 * Interactive setup wizard for ai-tools.json configuration.
 */
export class SetupWizard {
  private discoveredTools: CliToolMetadata[] = [];
  private selectedToolDetails: Map<string, ToolConfigDetails> = new Map();

  /**
   * Run the interactive setup wizard.
   */
  async run(): Promise<void> {
    console.log(WELCOME_MESSAGE);

    // Step 1: Discover available tools
    await this.discoverTools();

    if (this.discoveredTools.length === 0) {
      console.log("\n⚠️  No compatible AI tools found in PATH.");
      console.log("Please install at least one AI CLI tool (e.g., claude, gemini) and try again.");
      return;
    }

    // Step 2: Tool selection
    const selectedTools = await this.selectTools();

    if (selectedTools.length === 0) {
      console.log("\n⚠️  No tools selected. Exiting setup.");
      return;
    }

    // Step 3: Optional detailed configuration
    await this.configureDetails(selectedTools);

    // Step 4: Preview and confirmation
    const config = this.buildConfig(selectedTools);
    const confirmed = await this.previewAndConfirm(config);

    // Step 5: Save configuration
    if (confirmed) {
      await this.saveConfiguration(config);
    } else {
      console.log("\n❌ Setup cancelled. No changes were made.");
    }
  }

  /**
   * Discover available AI tools.
   */
  private async discoverTools(): Promise<void> {
    console.log("\n🔍 Scanning for compatible AI tools...");
    this.discoveredTools = await discoverCompatibleTools(true);

    if (this.discoveredTools.length > 0) {
      console.log(`\n✅ Found ${this.discoveredTools.length} compatible tool(s):`);
      for (const tool of this.discoveredTools) {
        const version = tool.version ? ` (v${tool.version})` : "";
        console.log(`   • ${tool.command}${version}`);
        if (tool.description) {
          console.log(`     ${tool.description.substring(0, 60)}${tool.description.length > 60 ? "..." : ""}`);
        }
      }
    }
  }

  /**
   * Present tool selection interface.
   */
  private async selectTools(): Promise<CliToolMetadata[]> {
    const choices = this.discoveredTools.map((tool) => ({
      name: `${tool.command} - ${tool.description || "No description"}`,
      value: tool.command,
      checked: true,
    }));

    const answers = await inquirer.prompt<WizardAnswers>([
      {
        type: "checkbox",
        name: "tools",
        message: "Select the tools you want to enable:",
        choices,
        validate: (input: string[]) => {
          if (input.length === 0) {
            return "Please select at least one tool.";
          }
          return true;
        },
      },
    ]);

    return this.discoveredTools.filter((tool) => answers.tools.includes(tool.command));
  }

  /**
   * Optionally configure detailed settings for selected tools.
   */
  private async configureDetails(tools: CliToolMetadata[]): Promise<void> {
    const { configureDetails } = await inquirer.prompt<WizardAnswers>([
      {
        type: "confirm",
        name: "configureDetails",
        message: "Would you like to configure detailed settings for the selected tools?",
        default: false,
      },
    ]);

    if (!configureDetails) {
      return;
    }

    for (const tool of tools) {
      console.log(`\n📝 Configuring: ${tool.command}`);
      const details = await this.configureToolDetails(tool);
      this.selectedToolDetails.set(tool.command, details);
    }
  }

  /**
   * Configure details for a single tool.
   */
  private async configureToolDetails(tool: CliToolMetadata): Promise<ToolConfigDetails> {
    const answers = await inquirer.prompt<WizardAnswers & ToolConfigDetails>([
      {
        type: "input",
        name: "alias",
        message: `Custom tool name (default: ${tool.toolName}):`,
        default: tool.toolName,
      },
      {
        type: "input",
        name: "description",
        message: "Custom description:",
        default: tool.description,
      },
      {
        type: "input",
        name: "systemPrompt",
        message: "System prompt (optional):",
        default: "",
      },
    ]);

    // Remove empty values
    const details: ToolConfigDetails = {};
    if (answers.alias && answers.alias !== tool.toolName) {
      details.alias = answers.alias;
    }
    if (answers.description && answers.description !== tool.description) {
      details.description = answers.description;
    }
    if (answers.systemPrompt) {
      details.systemPrompt = answers.systemPrompt;
    }

    return details;
  }

  /**
   * Build the configuration object from selections.
   */
  private buildConfig(selectedTools: CliToolMetadata[]): ToolsConfig {
    const tools: ToolConfig[] = selectedTools.map((tool) => {
      const details = this.selectedToolDetails.get(tool.command);
      const config: ToolConfig = {
        command: tool.command,
        enabled: true,
        providerType: "cli-auto",
        ...(details?.alias && { alias: details.alias }),
        ...(details?.description && { description: details.description }),
        ...(details?.systemPrompt && { systemPrompt: details.systemPrompt }),
        ...(tool.version && { version: tool.version }),
      };

      // Use original description if not overridden
      if (!config.description && tool.description) {
        config.description = tool.description;
      }

      return config;
    });

    return {
      version: "1.0",
      tools,
    };
  }

  /**
   * Preview configuration and request confirmation.
   */
  private async previewAndConfirm(config: ToolsConfig): Promise<boolean> {
    console.log("\n📋 Configuration Preview:");
    console.log(JSON.stringify(config, null, 2));

    const configPath = resolve(process.cwd(), "ai-tools.json");
    const exists = existsSync(configPath);

    const message = exists
      ? `This will overwrite existing ${configPath}. Continue?`
      : `Save configuration to ${configPath}?`;

    const { saveConfig } = await inquirer.prompt<WizardAnswers>([
      {
        type: "confirm",
        name: "saveConfig",
        message,
        default: true,
      },
    ]);

    return saveConfig;
  }

  /**
   * Save the configuration file.
   */
  private async saveConfiguration(config: ToolsConfig): Promise<void> {
    const result = ConfigLoader.save(config);

    if (result.success) {
      const configPath = resolve(process.cwd(), "ai-tools.json");
      console.log(`\n✅ Configuration saved successfully to: ${configPath}`);
      console.log("\n🚀 You can now start the MCP server with:");
      console.log("   npm start");
      console.log("\n   or");
      console.log("   npx agent-factory-mcp");
    } else {
      console.log(`\n❌ Failed to save configuration: ${result.error}`);
      throw new Error(result.error || "Failed to save configuration");
    }
  }
}

// ============================================================================
// Convenience Function
// ============================================================================

/**
 * Run the setup wizard.
 */
export async function runSetupWizard(): Promise<void> {
  const wizard = new SetupWizard();
  await wizard.run();
}
