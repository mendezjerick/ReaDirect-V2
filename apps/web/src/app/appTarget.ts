export type AppTarget = "web" | "offline-apk";

export function resolveAppTarget(value: unknown, mode?: string): AppTarget {
  if (
    (value === undefined || value === "") &&
    (mode === "offline-apk" || mode === "offline-apk-simulator")
  ) {
    return "offline-apk";
  }
  if (value === undefined || value === "" || value === "web") {
    return "web";
  }

  if (value === "offline-apk") {
    return "offline-apk";
  }

  throw new Error(`Unsupported ReaDirect application target: ${String(value)}`);
}

export const APP_TARGET = resolveAppTarget(
  import.meta.env.VITE_APP_TARGET,
  import.meta.env.MODE,
);
