import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // The Cloudflare staging tunnel terminates at Vite before proxying `/api`
    // to Laravel. Capacitor's Android WebView uses https://localhost as its
    // origin and sends credentialed requests, so Vite must include the
    // credentials header on its own OPTIONS responses.
    cors: {
      origin: [
        "https://localhost",
        "http://localhost",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ],
      credentials: true,
    },
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
