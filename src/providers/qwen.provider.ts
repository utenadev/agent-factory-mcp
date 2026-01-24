import { BaseCliProvider } from './base-cli.provider.js';
import { CliToolMetadata } from '../types/cli-metadata.js';
import { QWENCODE } from '../constants.js';

export class QwenProvider extends BaseCliProvider {
  id = 'qwen';

  getMetadata(): CliToolMetadata {
    return {
      toolName: 'ask-qwen',
      description: 'Execute Qwen AI to get responses. Supports model selection.',
      command: QWENCODE.COMMANDS.QWEN,
      argument: {
        name: 'prompt',
        description: "Analysis request. Use @ syntax to include files (e.g., '@largefile.js explain what this does') or ask general questions",
        type: 'string',
        required: true
      },
      options: [
        {
          name: 'model',
          flag: QWENCODE.FLAGS.MODEL,
          type: 'string',
          description: "Optional model to use (e.g., 'qwen-max', 'qwen-long'). If not specified, uses the default model.",
          choices: ['qwen-max', 'qwen-long', 'qwen-plus', 'qwen-turbo']
        }
      ]
    };
  }

  // Override to handle specific Qwen logic (e.g. quote wrapping for @ syntax)
  override async execute(args: Record<string, any>, onProgress?: (output: string) => void): Promise<string> {
    // Basic argument preprocessing if needed
    if (args.prompt && typeof args.prompt === 'string') {
      // Replicating original logic: ensure @ symbols work by wrapping in quotes if needed.
      // Note: Since we use spawn, arguments are passed safely, but if the underlying tool 
      // expects literal quotes in the string for its own parsing logic, we add them.
      if (args.prompt.includes('@') && !args.prompt.startsWith('"')) {
        args.prompt = `"${args.prompt}"`;
      }
    }
    
    return super.execute(args, onProgress);
  }
}
