import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
      exclude: [
        "src/main.ts",
        "src/index.ts",
        "src/db/client.ts",
        "src/config/index.ts",
        "src/constants/index.ts",
        "src/types/**/*.ts",
        "src/dtos/**/*.dto.ts",
        "src/errors/api-error.ts",
        "src/errors/error-types.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
