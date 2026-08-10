import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.readirect.app",
  appName: "ReaDirect",
  webDir: "dist",
  loggingBehavior: "debug",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
