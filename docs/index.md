# Documentation Index

This directory contains the design specifications, roadmap, and implementation plans for the `qwencode-mcp-server` evolution.

## Core Implementation Plan
- **[PLAN.md](./PLAN.md)**
    - **Status:** In Progress / Partially Implemented
    - **Description:** Outlines the architectural refactoring to transform the server from a single-purpose Qwen tool into a generic AI provider framework. It defines the core abstractions (`AIProvider`, `CliToolMetadata`) and the dynamic tool generation strategy.

## Future Roadmap & Auto-Discovery
- **[ROADMAP.md](./ROADMAP.md)**
    - **Status:** Planning
    - **Description:** Defines the long-term vision for the "Auto-Discovery" feature. It details the 4 phases required to achieve a system where any AI CLI tool can be automatically ingested and exposed as an MCP tool just by reading its `--help` output.

## Design Specifications
- **[design/help-parser-spec.md](./design/help-parser-spec.md)**
    - **Status:** Draft
    - **Description:** Technical specification for the `HelpParser` module. It details the regular expressions and heuristics required to extract structured metadata (flags, arguments, descriptions) from raw CLI help text.
    
- **[design/config-schema.md](./design/config-schema.md)**
    - **Status:** Draft
    - **Description:** Defines the JSON schema and environment variable formats for user configuration. This allows users to register tools declaratively (e.g., via `ai-tools.json`) without modifying source code.

## Historical / Reference
- **[implement_idea.md](./implement_idea.md)**
    - **Status:** Reference
    - **Description:** Original conceptual notes on dynamic AI agent support. (Used as a base for the current roadmap).
