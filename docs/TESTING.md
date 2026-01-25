# Testing Strategy

This document outlines the testing strategy for `agent-factory-mcp`, including the types of tests, how to run them, and the rationale behind specific testing decisions (like AutoDiscovery).

## Overview

We employ a **Hybrid Testing Strategy** that balances speed/reliability (Unit Tests) with real-world verification (E2E Tests).

| Test Type | Scope | Dependencies | Speed | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Unit Tests** | Logic correctness (Parsers, Config, Registry) | None (Mocked fixtures) | Fast (Seconds) | Verify code logic, regressions, and edge cases. |
| **E2E Tests** | Full system integration (AutoDiscovery -> Execution) | Actual AI CLI Tools | Slow (10s+) | Verify that the system actually works with real external binaries. |

## Test Commands (via Task)

We use [Task](https://taskfile.dev/) to manage test execution.

| Command | Description | Recommended Usage |
| :--- | :--- | :--- |
| `task test-unit` | Runs all tests **except** E2E. Uses static fixtures. | **Primary**. Run frequently during development. |
| `task test-e2e` | Runs **only** E2E tests. Calls real CLI binaries. | Run before release or when debugging integration issues. |
| `task check` | Runs Type Check -> Lint -> Unit Tests. | **CI/Pre-commit**. Ensures code quality without external dependencies. |
| `task test` | Runs ALL tests (Unit + E2E). | Run for full verification (requires AI tools). |

## Strategic Decisions

### AutoDiscovery & The "Hybrid" Approach

The **AutoDiscovery** feature presents a unique challenge: it relies heavily on the user's local environment (which tools are installed in `PATH` and what versions they are).

1.  **Why not mock everything?**
    *   Mocking the file system and `exec` calls for AutoDiscovery resulted in fragile tests that passed even when the real integration was broken.
    *   It failed to catch issues like "the tool's output format changed in a new version" or "permission issues."

2.  **Why not test everything E2E?**
    *   Calling external binaries is slow and non-deterministic.
    *   It requires specific tools (`claude`, `gemini`) to be installed, making it unsuitable for standard CI environments.

**Solution:**
We split the concern into two layers:

*   **Layer 1: Deterministic Parsing (Unit Tests)**
    *   Target: `src/parsers/help-parser.ts`
    *   Method: We capture the output of real tools (`--help`) into static files (`test/fixtures/*.txt`).
    *   Test: We verify that our parser correctly extracts metadata from these text files. This is fast and runs everywhere.

*   **Layer 2: Real-World connectivity (E2E Tests)**
    *   Target: `src/utils/autoDiscovery.ts`, `src/providers/*`
    *   Method: We actually call `discoverCompatibleTools()` and try to execute the found tools (using harmless flags like `--version`).
    *   Test: This proves that the entire pipeline works in the current environment.

## CI/CD Workflow

Our GitHub Actions workflow uses `task check` (which runs `test:unit`).
This ensures that:
1.  **CI never fails** just because an AI tool isn't installed in the runner.
2.  **Code logic is always verified** before merge.
3.  **E2E tests are reserved** for local verification or specialized runners with pre-installed tools.
