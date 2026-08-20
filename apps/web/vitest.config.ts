import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["tests/end-to-end/**", "node_modules/**", "dist/**"],
    setupFiles: "./tests/setup.ts",
    // Component suites are intentionally integration-heavy and can exceed
    // Vitest's 5s default on the repository's Windows CI/dev environment.
    testTimeout: 15_000,
    hookTimeout: 15_000,
    maxWorkers: 2,
    minWorkers: 1,
    server: {
      deps: {
        // @pixi/react imports the React reconciler constants subpath without
        // an extension; Vite must transform the package instead of letting
        // Node's strict ESM resolver reject that import.
        inline: ["@pixi/react", "react-reconciler"],
      },
    },
  },
});
