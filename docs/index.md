# Documentation Index

This directory contains the architecture, API documentation, and completed roadmap for **Agent Factory MCP**.

## Quick Start
- **[../README.md](../README.md)** - User-facing documentation with installation and usage examples
- **[../README.ja.md](../README.ja.md)** - Japanese version of the user documentation

## Architecture
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**
    - **Status:** Complete
    - **Description:** Detailed system architecture including component diagrams, data flow, and design patterns. Covers the provider framework, dynamic tool generation, and configuration system.

## API Reference
- **[API.md](./API.md)**
    - **Status:** Complete
    - **Description:** Complete API documentation for MCP tools, configuration schema, and extensibility points.

## Implementation History
- **[ROADMAP.md](./ROADMAP.md)**
    - **Status:** ✅ Complete
    - **Description:** Historical roadmap showing the 4-phase implementation that achieved full CLI auto-discovery. All phases are now complete.

## Design Specifications (Reference)
- **[design/config-schema.md](./design/config-schema.md)**
    - **Status:** Implemented
    - **Description:** JSON schema design for the `ai-tools.json` configuration file.

- **[design/help-parser-spec.md](./design/help-parser-spec.md)**
    - **Status:** Implemented
    - **Description:** Technical specification for the `HelpParser` module that extracts structured metadata from CLI help text.

## Historical Notes
- **[WorkingLog.md](./WorkingLog.md)** - Development log and notes from the qwencode-mcp-server era.

## Project Status

✅ **Core Features Complete:**
- Generic AI Provider Framework
- CLI Auto-Discovery via HelpParser
- Configuration-driven tool registration
- Runtime tool registration via MCP
- Persona support via systemPrompt
- Multi-provider support

🚀 **Current Focus:**
- Documentation improvements
- Additional CLI tool compatibility testing
