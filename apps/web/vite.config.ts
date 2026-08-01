import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/app": {
        target: "ws://127.0.0.1:8080",
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      "@cubism-framework": fileURLToPath(
        new URL("./vendor/live2d/CubismWebFramework/dist", import.meta.url),
      ),
    },
  },
});
