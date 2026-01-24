# Design Specification: CLI Help Parser

## Overview
The `HelpParser` module is responsible for transforming raw text output from a CLI's `--help` command into structured `CliToolMetadata`. This allows the system to understand available flags and arguments dynamically.

## Input / Output

**Input:** 
- `commandName` (string): The name of the binary (e.g., "qwen").
- `helpOutput` (string): The raw stdout captured from running `command --help`.

**Output:**
- `CliToolMetadata` object (as defined in `src/types/cli-metadata.ts`).

## Parsing Logic

### 1. Description Extraction
- **Strategy:** Read the first few lines of the output before the "Options:" or "Usage:" sections.
- **Goal:** Capture a brief summary of what the tool does.

### 2. Usage Pattern Analysis
- **Target:** Lines starting with `Usage:` or similar.
- **Goal:** Identify positional arguments.
    - Example: `Usage: qwen [options] <prompt>`
    - Inferred Argument: Name="prompt", Required=true.

### 3. Options Parsing (The Core)
- **Target:** The section typically labeled `Options:`, `Flags:`, or `Commands:`.
- **Regex Strategy:**
  Look for lines matching patterns like:
  ```regex
  ^\s*(?:-(-[a-zA-Z0-9-]+),\s*)?(--[a-zA-Z0-9-]+)\s+(.*)$
  ```
  - Capture Group 1: Short flag (e.g., `-m`)
  - Capture Group 2: Long flag (e.g., `--model`)
  - Capture Group 3: Description

### 4. Type Inference Heuristics
Since `--help` rarely explicitly states types (like "string" or "number"), we must infer them from the description or flag syntax.

- **Boolean:**
    - If the flag has no placeholder value in usage (e.g., just `-v, --verbose`).
    - If description starts with "Enable", "Disable", "Show", "Print".
- **String/Number:**
    - If usage shows a placeholder (e.g., `--model <name>`, `-n <int>`).
    - If description implies a value ("Sets the model to use").

## Example Scenarios

### Scenario A: Qwen (Simple)
**Input:**
```text
Usage: qwen [options] [prompt]
Options:
  -m, --model <name>  Select the model (default: qwen-max)
  -h, --help          Display help
```
**Parsed Metadata:**
- Command: `qwen`
- Arguments: `prompt` (optional)
- Options:
    - `model`: flag=`--model`, type=`string`, default=`qwen-max` (extracted from parens)

### Scenario B: Ollama (Subcommands - Future Scope)
**Input:**
```text
Usage:
  ollama [flags]
  ollama [command]

Available Commands:
  serve       Start ollama
  run         Run a model
```
**Strategy:** Detect "Available Commands" section and signal that this tool requires subcommand parsing (Phase 3).

## Implementation Interface

```typescript
export interface ParserOptions {
  // Allow overriding regex patterns for weird CLIs
  optionRegex?: RegExp; 
  usageRegex?: RegExp;
}

export class HelpParser {
  static parse(command: string, output: string, options?: ParserOptions): CliToolMetadata;
}
```
