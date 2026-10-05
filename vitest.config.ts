import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    teardownTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["server.ts", "core/**/*.ts", "plugins/**/*.ts", "src/lib/**/*.ts"],
      // Components are intentionally excluded: the suite is Node-side and has
      // no browser/DOM harness yet (see F-QUAL-001 / T-024).
      exclude: ["tests/**", "scripts/**", "**/*.tsx", "**/*.d.ts"],
    },
  },
});
