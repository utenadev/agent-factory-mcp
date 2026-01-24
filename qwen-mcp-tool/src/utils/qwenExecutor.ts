import { executeCommand } from './commandExecutor.js';
import { Logger } from './logger.js';
import {
  ERROR_MESSAGES,
  STATUS_MESSAGES,
  MODELS,
  CLI
} from '../constants.js';

export async function executeQwenCLI(
  prompt: string,
  model?: string,
  onProgress?: (newOutput: string) => void
): Promise<string> {
  const args = [];
  
  // Add model flag if specified
  if (model) { 
    args.push(CLI.FLAGS.MODEL, model); 
  }

  // Ensure @ symbols work cross-platform by wrapping in quotes if needed
  const finalPrompt = prompt.includes('@') && !prompt.startsWith('"')
    ? `"${prompt}"`
    : prompt;

  args.push(finalPrompt);

  try {
    return await executeCommand(CLI.COMMANDS.QWEN, args, onProgress);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Qwen CLI execution failed: ${errorMessage}`);
  }
}