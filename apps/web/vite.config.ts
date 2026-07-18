import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@cubism-framework": fileURLToPath(
        new URL("./vendor/live2d/CubismWebFramework/dist", import.meta.url),
      ),
    },
  },
});
