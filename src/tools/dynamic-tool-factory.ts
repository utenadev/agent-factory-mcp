import { z } from 'zod';
import { UnifiedTool } from './registry.js';
import { AIProvider } from '../providers/base-cli.provider.js';
import { CliToolMetadata, CliOption } from '../types/cli-metadata.js';
import { STATUS_MESSAGES } from '../constants.js';

export class DynamicToolFactory {
  static createTool(provider: AIProvider): UnifiedTool {
    const metadata = provider.getMetadata();

    return {
      name: metadata.toolName,
      description: metadata.description,
      category: 'qwen', // To be generalized later to 'ai' or provider.id
      zodSchema: this.createZodSchema(metadata),
      prompt: {
        description: `Execute '${metadata.command}' to get AI response.`,
      },
      execute: async (args, onProgress) => {
        const result = await provider.execute(args, onProgress);
        // We might want to standardize the output format here
        return `${STATUS_MESSAGES.QWEN_RESPONSE}\n${result}`;
      }
    };
  }

  private static createZodSchema(metadata: CliToolMetadata): z.ZodTypeAny {
    const shape: Record<string, z.ZodTypeAny> = {};

    // 1. Add Options
    for (const option of metadata.options) {
      let schema: z.ZodTypeAny;

      // Type mapping
      if (option.type === 'boolean') {
        schema = z.boolean();
      } else if (option.type === 'number') {
        schema = z.number();
      } else {
        schema = z.string();
      }

      // Constraints
      if (option.choices && option.choices.length > 0) {
        // Zod enum requires at least one value
        // For simplicity, assuming string choices for now if type is string
        if (option.type === 'string') {
          const stringChoices = option.choices.map(String);
          if (stringChoices.length > 0) {
            schema = z.enum(stringChoices as [string, ...string[]]);
          }
        }
      }

      // Description
      schema = schema.describe(option.description);

      // Optional/Default
      if (!option.required) {
        schema = schema.optional();
      }

      shape[option.name] = schema;
    }

    // 2. Add Positional Argument
    if (metadata.argument) {
      let argSchema: z.ZodTypeAny = metadata.argument.type === 'number' ? z.number() : z.string();
      
      if (metadata.argument.required) {
        if (metadata.argument.type === 'string') {
             argSchema = (argSchema as z.ZodString).min(1); // minimal validation for required strings
        }
      } else {
        argSchema = argSchema.optional();
      }

      argSchema = argSchema.describe(metadata.argument.description);
      shape[metadata.argument.name] = argSchema;
    }

    return z.object(shape);
  }
}