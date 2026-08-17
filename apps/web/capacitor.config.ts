import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.readirect.offline",
  appName: "ReaDirect Offline",
  webDir: "dist-apk",
  loggingBehavior: "none",
  server: {
    androidScheme: "https",
  },
  android: {
    path: "android-apk",
    allowMixedContent: false,
  },
};

export default config;
