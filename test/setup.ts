// test/setup.ts
// Enable TypeScript support for Bun test runner
import { plugin } from "bun";
import * as ts from "typescript";

// Register TypeScript compiler
plugin(ts);
