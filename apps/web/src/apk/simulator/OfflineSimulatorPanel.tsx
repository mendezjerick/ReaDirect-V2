import type { SimulatorProgressPreset } from "./simulatorRuntime";
import type {
  SimulatorAsrOutcome,
  SimulatorDeviceProfile,
  SimulatorSettings,
  SimulatorTtsOutcome,
} from "./simulatorSettings";

type SettingsChange = Partial<SimulatorSettings>;

export function OfflineSimulatorPanel({
  settings,
  busy,
  onSettingsChange,
  onApplyPreset,
  onReset,
}: {
  settings: SimulatorSettings;
  busy: boolean;
  onSettingsChange: (change: SettingsChange, restartApp?: boolean) => void;
  onApplyPreset: (preset: SimulatorProgressPreset) => void;
  onReset: () => void;
}) {
  if (!settings.panelOpen) {
    return (
      <button
        className="offline-simulator__launcher"
        type="button"
        aria-label="Open APK Simulator"
        onClick={() => onSettingsChange({ panelOpen: true })}
      >
        Simulator
      </button>
    );
  }

  return (
    <aside className="offline-simulator__panel" aria-label="APK Simulator">
      <header className="offline-simulator__header">
        <div>
          <strong>APK Simulator</strong>
          <span>Browser-only controls</span>
        </div>
        <button
          type="button"
          aria-label="Collapse simulator"
          onClick={() => onSettingsChange({ panelOpen: false })}
        >
          Minimize
        </button>
      </header>

      <div className="offline-simulator__grid">
        <label>
          Device profile
          <select
            value={settings.deviceProfile}
            disabled={busy}
            onChange={(event) => {
              const deviceProfile = event.target
                .value as SimulatorDeviceProfile;
              onSettingsChange(
                {
                  deviceProfile,
                  claraMode: deviceProfile === "low" ? "static" : "dynamic",
                },
                true,
              );
            }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>

        <label>
          Clara mode
          <select
            value={settings.claraMode}
            disabled={busy}
            onChange={(event) =>
              onSettingsChange(
                { claraMode: event.target.value as "static" | "dynamic" },
                true,
              )
            }
          >
            <option value="static">Static</option>
            <option value="dynamic">Dynamic</option>
          </select>
        </label>

        <label>
          Recorder outcome
          <select
            value={settings.asrOutcome}
            disabled={busy}
            onChange={(event) =>
              onSettingsChange({
                asrOutcome: event.target.value as SimulatorAsrOutcome,
              })
            }
          >
            <option value="correct">Correct answer</option>
            <option value="incorrect">Incorrect answer</option>
            <option value="permission-error">Permission failure</option>
            <option value="asr-error">ASR failure</option>
          </select>
        </label>

        <label>
          TTS outcome
          <select
            value={settings.ttsOutcome}
            disabled={busy}
            onChange={(event) =>
              onSettingsChange({
                ttsOutcome: event.target.value as SimulatorTtsOutcome,
              })
            }
          >
            <option value="success">Playback succeeds</option>
            <option value="error">Playback fails</option>
          </select>
        </label>

        <label>
          Operation delay (ms)
          <input
            type="number"
            min={0}
            max={3000}
            step={20}
            value={settings.operationDelayMs}
            disabled={busy}
            onChange={(event) =>
              onSettingsChange({
                operationDelayMs: Number(event.target.value),
              })
            }
          />
        </label>
      </div>

      <fieldset className="offline-simulator__presets" disabled={busy}>
        <legend>Open app at</legend>
        <button type="button" onClick={() => onApplyPreset("fresh")}>
          Fresh install
        </button>
        <button type="button" onClick={() => onApplyPreset("intro")}>
          Intro ready
        </button>
        <button type="button" onClick={() => onApplyPreset("dashboard")}>
          Dashboard ready
        </button>
        <button type="button" onClick={() => onApplyPreset("unlocked")}>
          Lessons unlocked
        </button>
        <button type="button" onClick={() => onApplyPreset("mid-lesson")}>
          Mid-lesson
        </button>
        <button type="button" onClick={() => onApplyPreset("complete")}>
          Journey complete
        </button>
      </fieldset>

      <footer className="offline-simulator__footer">
        <span aria-live="polite">
          {busy ? "Applying simulator state…" : "Ready"}
        </span>
        <button type="button" disabled={busy} onClick={onReset}>
          Reset simulated app
        </button>
      </footer>
    </aside>
  );
}
