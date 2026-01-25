# Contributing to Agent Factory MCP

Thank you for your interest in contributing to Agent Factory MCP! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)

## Code of Conduct

This project adheres to a code of conduct that all contributors are expected to follow:

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## Development Setup

### Prerequisites

- **Bun** >= 1.0.0
- **Node.js** >= 20.0.0 (for some tools)
- **Git**
- **go-task** (optional, for task runner)

### Installation

```bash
# Clone the repository
git clone https://github.com/utenadev/agent-factory-mcp.git
cd agent-factory-mcp

# Install dependencies
bun install

# Run build
bun run build

# Run tests
bun test
```

### Using go-task (Optional)

```bash
# Install go-task
curl -fsSL https://taskfile.dev/install.sh | sh

# List available tasks
task --list

# Run tasks
task build
task test
task lint
task format
```

## Project Structure

```
agent-factory-mcp/
├── src/
│   ├── index.ts                 # Server entry point
│   ├── constants.ts             # Constants
│   ├── providers/               # Provider implementations
│   │   ├── base-cli.provider.ts
│   │   ├── generic-cli.provider.ts
│   │   └── qwen.provider.ts
│   ├── tools/                   # Tool registry and factory
│   │   ├── registry.ts
│   │   ├── dynamic-tool-factory.ts
│   │   └── simple-tools.ts
│   ├── parsers/                 # CLI help parser
│   │   └── help-parser.ts
│   ├── types/                   # TypeScript types
│   │   └── cli-metadata.ts
│   └── utils/                   # Utilities
│       ├── configLoader.ts
│       ├── commandExecutor.ts
│       ├── logger.ts
│       └── progressManager.ts
├── test/                        # Test files
├── docs/                        # Documentation
├── dist/                       # Compiled output (generated)
└── package.json
```

## Making Changes

### Branch Strategy

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and test them.

3. Commit your changes with clear messages:
   ```bash
   git commit -m "feat: add new feature"
   ```

### Commit Message Format

We follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Maintenance tasks

Examples:
```
feat: add support for custom parser strategies

fix: resolve issue with command availability checking

docs: update README with new configuration examples

refactor: simplify help-parser.ts with better code organization
```

### Coding Standards

#### TypeScript

- Use strict TypeScript mode
- Prefer `const` over `let` when possible
- Use template literals for string interpolation
- Use async/await over promises
- Prefer functional programming patterns

#### Code Style

We use **Biome** for linting and formatting:

```bash
# Check linting
bun run lint

# Auto-fix linting issues
bun run lint:fix

# Format code
bun run format

# Check formatting
bun run format:check
```

#### Documentation

- Add JSDoc comments for public APIs
- Keep comments clear and concise
- Document complex logic
- Update relevant documentation when making changes

#### Testing

- Write tests for new features
- Maintain test coverage above 80%
- Follow the Arrange-Act-Assert (AAA) pattern
- Use descriptive test names

## Testing

### Run Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/help-parser.test.js

# Run with coverage (if configured)
bun test --coverage
```

### Test Structure

Tests are located in the `test/` directory:

```
test/
├── help-parser.test.js     # HelpParser tests
├── configLoader.test.js     # ConfigLoader tests
├── registry.test.js         # Tool registry tests
├── subcommands.test.js      # Subcommand parsing tests
├── system-prompt.test.js    # SystemPrompt feature tests
└── tools.test.js            # General tool tests
```

### Writing Tests

```typescript
import { describe, it } from "node:test";
import assert from "node:assert";

describe("FeatureName", async () => {
  it("should do something specific", async () => {
    // Arrange
    const input = { /* test data */ };

    // Act
    const result = await functionToTest(input);

    // Assert
    assert.strictEqual(result.expected, "actual value");
  });
});
```

## Submitting Changes

### Pull Request Process

1. Fork the repository
2. Create your feature branch
3. Make your changes following the standards above
4. Ensure all tests pass
5. Commit your changes with clear messages
6. Push to your fork
7. Create a pull request

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] Code follows the project's coding standards
- [ ] Documentation is updated
- [ ] Commit messages follow conventional commits
- [ ] PR description clearly describes the changes

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
```

## Getting Help

If you need help:

- Read the [documentation](./docs/)
- Check [existing issues](https://github.com/utenadev/agent-factory-mcp/issues)
- Join discussions in [GitHub Discussions](https://github.com/utenadev/agent-factory-mcp/discussions)
- Ask a question in an issue with the `question` label

## Recognition

Contributors who make significant improvements will be recognized in the project's contributors section.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
