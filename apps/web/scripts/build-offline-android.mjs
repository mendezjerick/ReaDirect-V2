import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const targets = {
  "direct-debug": ["assembleDebug"],
  "emulator-debug": ["-PreadirectValidationAbi=x86_64", "assembleDebug"],
  "direct-release": ["assembleRelease"],
  "play-release": ["-PreadirectPlayStore=true", "bundleRelease"],
};

const target = process.argv[2];
const gradleArguments = targets[target];
if (!gradleArguments) {
  throw new Error(
    `Offline Android target must be one of: ${Object.keys(targets).join(", ")}.`,
  );
}

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const androidRoot = path.join(webRoot, "android-apk");
const isWindows = process.platform === "win32";
const executable = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "./gradlew";
const spawnArguments = isWindows
  ? ["/d", "/s", "/c", "gradlew.bat", ...gradleArguments]
  : gradleArguments;
const environment = { ...process.env };

if (
  environment.JAVA_HOME &&
  path.basename(environment.JAVA_HOME).toLowerCase() === "bin" &&
  existsSync(path.join(environment.JAVA_HOME, isWindows ? "java.exe" : "java"))
) {
  environment.JAVA_HOME = path.dirname(environment.JAVA_HOME);
}

if (isWindows && !environment.ANDROID_HOME && environment.LOCALAPPDATA) {
  const conventionalSdk = path.join(environment.LOCALAPPDATA, "Android", "Sdk");
  if (existsSync(conventionalSdk)) {
    environment.ANDROID_HOME = conventionalSdk;
    environment.ANDROID_SDK_ROOT ??= conventionalSdk;
  }
}

const child = spawn(executable, spawnArguments, {
  cwd: androidRoot,
  env: environment,
  stdio: "inherit",
  shell: false,
});

child.on("error", (error) => {
  throw error;
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
