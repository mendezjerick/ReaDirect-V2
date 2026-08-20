import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: ["tests/end-to-end/**", "node_modules/**", "dist/**"],
    setupFiles: "./tests/setup.ts",
    server: {
      deps: {
        inline: ["@pixi/react"],
      },
    },
  },
});
