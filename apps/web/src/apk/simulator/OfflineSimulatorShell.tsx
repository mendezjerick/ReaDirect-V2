import { useMemo, useRef, useState } from "react";

import { OfflineApkApp } from "../OfflineApkApp";
import { OfflineLearnerRepository } from "../storage/offlineLearnerRepository";
import { OfflineSimulatorPanel } from "./OfflineSimulatorPanel";
import { BrowserOfflineLearnerStore } from "./simulatorPersistence";
import {
  applySimulatorProgressPreset,
  createSimulatorRuntime,
  getSimulatorCapabilitySelection,
} from "./simulatorRuntime";
import {
  loadSimulatorSettings,
  saveSimulatorSettings,
} from "./simulatorSettings";
import "./simulator.css";

import type { SimulatorProgressPreset } from "./simulatorRuntime";
import type { SimulatorSettings } from "./simulatorSettings";

export function OfflineSimulatorShell() {
  const persistence = useMemo(
    () => new BrowserOfflineLearnerStore(window.localStorage),
    [],
  );
  const repository = useMemo(
    () => new OfflineLearnerRepository(persistence),
    [persistence],
  );
  const [settings, setSettings] = useState(() =>
    loadSimulatorSettings(window.localStorage),
  );
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const runtime = useMemo(
    () =>
      createSimulatorRuntime({
        getSettings: () => settingsRef.current,
        repository,
      }),
    [repository],
  );
  const [appKey, setAppKey] = useState(0);
  const [busy, setBusy] = useState(false);

  const updateSettings = (
    change: Partial<SimulatorSettings>,
    restartApp = false,
  ) => {
    setSettings((current) => {
      const next = saveSimulatorSettings(window.localStorage, {
        ...current,
        ...change,
      });
      settingsRef.current = next;
      return next;
    });
    if (restartApp) setAppKey((current) => current + 1);
  };

  const applyPreset = async (preset: SimulatorProgressPreset) => {
    if (busy) return;
    setBusy(true);
    try {
      await applySimulatorProgressPreset(
        repository,
        preset,
        getSimulatorCapabilitySelection(settingsRef.current),
      );
      setAppKey((current) => current + 1);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (busy) return;
    persistence.clear();
    setAppKey((current) => current + 1);
  };

  return (
    <div
      className="offline-simulator"
      data-simulator-profile={settings.deviceProfile}
    >
      <OfflineApkApp key={appKey} runtime={runtime} />
      <OfflineSimulatorPanel
        settings={settings}
        busy={busy}
        onSettingsChange={updateSettings}
        onApplyPreset={(preset) => void applyPreset(preset)}
        onReset={reset}
      />
    </div>
  );
}
