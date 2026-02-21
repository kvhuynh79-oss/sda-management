import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "convex/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/security/**/*.test.ts",
    ],
    exclude: [
      "node_modules",
      ".next",
      "tests/*.spec.ts", // Playwright E2E tests - handled by Playwright
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      include: [
        "src/utils/**/*.ts",
        "convex/lib/**/*.ts",
      ],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
        "node_modules/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
