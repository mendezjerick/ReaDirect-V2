export const MOVEMENT_CONTROL_PREFERENCE_KEY = "readirect-rpg:movement-control:v1";

export type MovementControlMode = "dpad" | "joystick";

export function loadMovementControlPreference(storage: Storage = window.localStorage): MovementControlMode {
  try {
    const value = JSON.parse(storage.getItem(MOVEMENT_CONTROL_PREFERENCE_KEY) ?? "null") as {
      version?: number;
      mode?: unknown;
    } | null;
    return value?.version === 1 && (value.mode === "dpad" || value.mode === "joystick")
      ? value.mode
      : "dpad";
  } catch {
    return "dpad";
  }
}

export function saveMovementControlPreference(
  mode: MovementControlMode,
  storage: Storage = window.localStorage
) {
  try {
    storage.setItem(MOVEMENT_CONTROL_PREFERENCE_KEY, JSON.stringify({ version: 1, mode }));
  } catch {
    // The current selection still works when storage is unavailable.
  }
}
