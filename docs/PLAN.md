# Refactoring Plan: Generic AI CLI Wrapper Framework

## Goal
Transform `qwencode-mcp-server` from a Qwen-specific tool into a generic framework capable of wrapping various AI CLI tools (e.g., OpenAI, Ollama, Anthropic). The core concept is to drive tool definitions and execution logic via **Metadata**, laying the groundwork for future automated generation from CLI `--help` outputs.

## Architecture

### 1. Metadata Schema (`src/types/cli-metadata.ts`)
Defines the capabilities of a CLI tool in a structured format, independent of the specific implementation.
- **Command Info**: Binary name (e.g., `qwen`), version.
- **Options/Flags**: Mapping of flags (e.g., `-m`, `--model`) to their types, descriptions, and validation rules.
- **Arguments**: Positional arguments definition.

### 2. Provider Abstraction (`src/providers/*`)
- **`AIProvider` Interface**: The common contract for all AI backends.
- **`BaseCliProvider`**: An abstract base class that implements common logic:
    - constructing shell commands based on Metadata and input arguments.
    - handling execution via `child_process`.
- **`QwenProvider`**: Concrete implementation for Qwen. Initially, this will return **static metadata** (hand-coded) that replicates the current `ask-qwen` functionality. This proves the metadata-driven approach works before implementing complex help parsers.

### 3. Dynamic Tool Factory (`src/tools/dynamic-tool-factory.ts`)
A factory module that converts `AIProvider` instances into MCP `UnifiedTool` definitions.
- **Metadata -> Zod**: Dynamically generates Zod schemas from the provider's metadata options.
- **Execution Binding**: Binds the tool's `execute` method to the provider's `execute` method.

### 4. Configuration & Registry
- Support for selecting active providers via configuration.
- The Registry will iterate through active providers and generate tools at runtime.

## Implementation Phases

### Phase 1: Foundation (Current Focus)
Focus on establishing the types and class structure.
- [ ] Create `src/types/cli-metadata.ts`
- [ ] Create `src/providers/base-cli.provider.ts`
- [ ] Create `src/tools/dynamic-tool-factory.ts`

### Phase 2: Qwen Migration
Port the existing Qwen logic to the new structure.
- [ ] Create `src/providers/qwen.provider.ts` with static metadata matching current features.
- [ ] Verify that the generated tool matches the behavior of the existing `ask-qwen` tool.

### Phase 3: Integration
Hook everything into the main application flow.
- [ ] Update `src/tools/registry.ts` to accept dynamic providers.
- [ ] Update `src/index.ts` to initialize providers.

### Phase 4: Future Automation
- [ ] Implement `HelpParser` to generate metadata from `--help` output automatically.

## Directory Structure Changes

```text
src/
├── types/
│   └── cli-metadata.ts       # [New] Metadata definitions
├── providers/
│   ├── base-cli.provider.ts  # [New] Abstract base class
│   └── qwen.provider.ts      # [New] Qwen implementation
├── tools/
│   ├── dynamic-tool.factory.ts # [New] Tool generator
│   └── registry.ts           # [Update] Support dynamic registration
└── ...
```
