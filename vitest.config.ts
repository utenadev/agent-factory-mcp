import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test environment
    environment: "node",

    // Global setup/teardown files (if needed in future)
    // setupFiles: [],
    // teardownFiles: [],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "test/",
        "*.config.ts",
        "src/types/cli-metadata.ts", // Generated types
      ],
    },

    // Test file patterns
    include: ["test/**/*.test.{ts,js}"],
    exclude: ["**/node_modules/**", "**/dist/**"],

    // Test timeout
    testTimeout: 30000,

    // Globally mock console methods if needed
    // restoreMocks: true,
  },
});
