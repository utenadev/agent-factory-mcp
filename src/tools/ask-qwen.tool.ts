import { z } from "zod";
import type { UnifiedTool } from "./registry.js";
import { executeQwenCLI } from "../utils/qwenExecutor.js";
import { ERROR_MESSAGES, STATUS_MESSAGES } from "../constants.js";

const askQwenArgsSchema = z.object({
  prompt: z
    .string()
    .min(1)
    .describe(
      "Analysis request. Use @ syntax to include files (e.g., '@largefile.js explain what this does') or ask general questions"
    ),
  model: z
    .string()
    .optional()
    .describe(
      "Optional model to use (e.g., 'qwen-max', 'qwen-long'). If not specified, uses the default model."
    ),
});

export const askQwenTool: UnifiedTool = {
  name: "ask-qwen",
  description: "Execute Qwen AI to get responses. Supports model selection.",
  zodSchema: askQwenArgsSchema,
  prompt: {
    description: "Execute 'qwen -p <prompt>' to get Qwen AI's response.",
  },
  category: "ai",
  execute: async (args, onProgress) => {
    const { prompt, model } = args;
    if (!prompt?.trim()) {
      throw new Error(ERROR_MESSAGES.NO_PROMPT_PROVIDED);
    }

    const result = await executeQwenCLI(prompt as string, model as string | undefined, onProgress);

    return `${STATUS_MESSAGES.QWEN_RESPONSE}\n${result}`;
  },
};
