import { defineConfig } from "@playwright/test";

const learnerViewports = [
  { name: "mobile-small", width: 360, height: 800 },
  { name: "mobile-primary", width: 390, height: 844 },
  { name: "mobile-large", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1366, height: 768 },
  { name: "desktop-large", width: 1920, height: 1080 },
] as const;

export default defineConfig({
  testDir: "./tests/end-to-end",
  fullyParallel: true,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "light",
  },
  projects: learnerViewports.map(({ name, width, height }) => ({
    name,
    use: {
      viewport: { width, height },
      hasTouch: width <= 768,
    },
  })),
  webServer: [
    {
      command: "corepack pnpm dev --host 127.0.0.1 --port 4173",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "php artisan serve --host 127.0.0.1 --port 8000",
      cwd: "../api",
      url: "http://127.0.0.1:8000/up",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
