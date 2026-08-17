# Offline APK Browser Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-only simulator that runs the real offline APK UI with controllable device, Clara, ASR, TTS, and progress states without rebuilding Android.

**Architecture:** Add dependency injection at the `OfflineApkApp` boundary, then mount it from a dedicated Vite simulator entry backed by localStorage and deterministic native-plugin substitutes. Keep the production entry native by default and prove simulator modules and identifiers are absent from `dist-apk`.

**Tech Stack:** React 19, TypeScript, Vite 8, Capacitor interfaces, Zod learner-state validation, Vitest, Testing Library, CSS, in-app Browser.

## Global Constraints

- The simulator is development-only and must never enter the signed APK or AAB.
- The simulator renders the real offline onboarding, intro, dashboard, Journey, lesson, assessment, Clara, and recorder components.
- Browser learner progress persists across refreshes and can be reset independently.
- Low, Medium, and High ASR plus Static and Dynamic Clara are controllable.
- Recorder outcomes include correct, incorrect, permission failure, and ASR failure.
- TTS simulation performs no network calls and uses no browser speech API.
- Android remains authoritative for real microphone, Whisper, TTS, storage, memory, and thermal behavior.
- Preserve unrelated working-tree changes and the private credentials file.

---

## File Structure

- `apps/web/src/apk/runtime/offlineAppRuntime.ts`: shared injectable runtime contract and native default composition.
- `apps/web/src/apk/simulator/simulatorPersistence.ts`: revision-aware localStorage implementation of the learner-store contract.
- `apps/web/src/apk/simulator/simulatorSettings.ts`: validated simulator settings, defaults, and device profiles.
- `apps/web/src/apk/simulator/simulatorRuntime.ts`: deterministic initialization, ASR, TTS, and progress-preset behavior.
- `apps/web/src/apk/simulator/OfflineSimulatorPanel.tsx`: accessible developer controls.
- `apps/web/src/apk/simulator/OfflineSimulatorShell.tsx`: owns settings, runtime, remounting, and panel/app composition.
- `apps/web/src/apk/simulator/main.tsx`: simulator-only React entry.
- `apps/web/src/apk/simulator/simulator.css`: overlay layout and narrow-screen collapse behavior.
- `apps/web/tests/OfflineSimulatorPersistence.test.ts`: persistence/revision/recovery tests.
- `apps/web/tests/OfflineSimulatorRuntime.test.ts`: tier, Clara, ASR, TTS, and preset tests.
- `apps/web/tests/OfflineSimulatorShell.test.tsx`: real-flow and panel integration tests.
- `apps/web/src/apk/OfflineApkApp.tsx`: consumes injected runtime while retaining native defaults.
- `apps/web/src/apk/activity/OfflineJourneyActivity.tsx`: supplies the current expected text to the injected ASR runtime.
- `apps/web/src/app/appTarget.ts`: treats simulator mode as the offline APK target.
- `apps/web/vite.config.ts`: swaps only the simulator mode to the simulator entry.
- `apps/web/package.json`: adds the simulator development command.
- `apps/web/offline-apk-boundary.json`: rejects simulator identifiers from release output.

### Task 1: Injectable APK Runtime

**Files:**
- Create: `apps/web/src/apk/runtime/offlineAppRuntime.ts`
- Modify: `apps/web/src/apk/OfflineApkApp.tsx`
- Modify: `apps/web/src/apk/activity/OfflineJourneyActivity.tsx`
- Test: `apps/web/tests/OfflineSimulatorShell.test.tsx`

**Interfaces:**
- Produces: `OfflineAppRuntime`, `OfflineActivityAsr`, and `nativeOfflineAppRuntime`.
- `OfflineAppRuntime` exposes `repository`, `initialize`, `asr`, and `tts`.
- `OfflineActivityAsr.startRecording(maxDurationMs?, context?: { expectedTranscript: string })` preserves the native call while giving the simulator explicit scoring context.

- [ ] **Step 1: Write the failing dependency-injection test**

Render `OfflineApkApp` with a complete injected runtime whose initialization
returns a fresh learner and High/Dynamic selections. Assert that the real
Speech Recognition onboarding dialog appears instead of the Android-only error.
The production change that makes this fail is ignoring the supplied runtime.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorShell.test.tsx
```

Expected: FAIL because `OfflineApkApp` has no `runtime` property.

- [ ] **Step 3: Implement the runtime contract and native default**

Define:

```ts
export type OfflineActivityAsr = {
  startRecording(
    maxDurationMs?: number,
    context?: { expectedTranscript: string },
  ): Promise<{ sampleRateHz: 16000; maxDurationMs: number }>;
  stopAndTranscribe(): Promise<OfflineAsrTranscription>;
  cancelRecording(): Promise<void>;
};

export type OfflineAppRuntime = {
  repository: Pick<OfflineLearnerRepository, "initialize" | "update">;
  initialize: typeof runOfflineInitialization;
  asr: OfflineActivityAsr;
  tts: Pick<typeof offlineTtsBridge, "play" | "stop">;
};
```

Default `OfflineApkApp` to `nativeOfflineAppRuntime`. Pass its repository to
onboarding, intro, dashboard/Journey mutations, and activity; pass its ASR/TTS
to activity. Call `startRecording` with the current item target as
`expectedTranscript`; the native bridge ignores the optional context.

- [ ] **Step 4: Run focused and existing activity/onboarding tests**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorShell.test.tsx tests/OfflineJourneyActivity.test.tsx tests/OfflineOnboarding.test.tsx
```

Expected: PASS.

### Task 2: Revision-Aware Browser Persistence

**Files:**
- Create: `apps/web/src/apk/simulator/simulatorPersistence.ts`
- Create: `apps/web/tests/OfflineSimulatorPersistence.test.ts`

**Interfaces:**
- Produces: `BrowserOfflineLearnerStore implements OfflineLearnerStoreNativePlugin`.
- Constructor: `new BrowserOfflineLearnerStore(storage: Storage, key?: string)`.
- Produces: `clear(): void`, used by the simulator control plane.

- [ ] **Step 1: Write failing persistence tests**

Use a real in-memory `Storage` test implementation. Assert literal snapshots for
an empty store, a successful revision `0 -> 1` save, preserved backup data after
`1 -> 2`, persistence through a second adapter instance, and rejection with
`error.code === "LOCAL_PROGRESS_STALE_WRITE"` when `expectedRevision` is stale.

- [ ] **Step 2: Run and verify RED**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorPersistence.test.ts
```

Expected: FAIL because the adapter module does not exist.

- [ ] **Step 3: Implement the minimal adapter**

Store one validated JSON envelope:

```ts
type BrowserStoreEnvelope = {
  revision: number;
  stateJson: string | null;
  backupRevision: number;
  backupStateJson: string | null;
};
```

On save, compare `expectedRevision`, move primary to backup, increment to
`expectedRevision + 1`, and persist. `clear()` removes only the configured key.

- [ ] **Step 4: Run persistence and repository tests**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorPersistence.test.ts tests/OfflineLearnerRepository.test.ts
```

Expected: PASS.

### Task 3: Deterministic Simulator Settings and Runtime

**Files:**
- Create: `apps/web/src/apk/simulator/simulatorSettings.ts`
- Create: `apps/web/src/apk/simulator/simulatorRuntime.ts`
- Create: `apps/web/tests/OfflineSimulatorRuntime.test.ts`

**Interfaces:**
- Produces: `SimulatorSettings`, `SimulatorDeviceProfile`, `SimulatorAsrOutcome`, and `SimulatorTtsOutcome`.
- Produces: `loadSimulatorSettings(storage)`, `saveSimulatorSettings(storage, settings)`, and `createSimulatorRuntime(options)`.
- Device profiles contain complete `NativeDeviceAsrCapabilities` literals whose production selector yields Low, Medium, or High.

- [ ] **Step 1: Write failing settings and device-profile tests**

Assert invalid stored JSON falls back to:

```ts
{
  deviceProfile: "high",
  claraMode: "dynamic",
  asrOutcome: "correct",
  ttsOutcome: "success",
  operationDelayMs: 120,
  panelOpen: true,
}
```

Assert the three capability literals select `low`, `medium`, and `high` through
the production `selectAsrModel` function.

- [ ] **Step 2: Run and verify RED**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorRuntime.test.ts
```

Expected: FAIL because settings/runtime modules do not exist.

- [ ] **Step 3: Implement settings validation and device literals**

Use an explicit parser rather than accepting arbitrary localStorage fields.
Clamp `operationDelayMs` to `0..3000`. Save settings under
`readirect.offline.simulator.settings.v1`.

- [ ] **Step 4: Add failing ASR and TTS behavior tests**

Assert:

- correct ASR returns the supplied expected transcript;
- incorrect ASR returns `"different simulated answer"`;
- permission failure rejects `startRecording` with code
  `MICROPHONE_PERMISSION_DENIED`;
- ASR failure rejects `stopAndTranscribe` with code
  `OFFLINE_ASR_INFERENCE_FAILED`;
- TTS success returns the requested key and `completed: true`;
- TTS failure rejects with code `OFFLINE_TTS_PLAYBACK_FAILED`;
- `stop()` cancels pending simulated playback.

- [ ] **Step 5: Run and verify the new tests fail for missing behavior**

Run the Task 3 Vitest command and confirm behavior assertions fail.

- [ ] **Step 6: Implement deterministic initialization, ASR, and TTS**

Build `OfflineInitializationDependencies` from the browser repository and active
settings. Return the real catalog summary shape, production model selection,
and an explicit Clara selection matching the chosen mode. Keep all delays
cancellable and make no network or media API calls.

- [ ] **Step 7: Run runtime and initialization tests**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorRuntime.test.ts tests/OfflineInitialization.test.ts tests/OfflineSpeechScoring.test.ts
```

Expected: PASS.

### Task 4: Progress Presets

**Files:**
- Modify: `apps/web/src/apk/simulator/simulatorRuntime.ts`
- Modify: `apps/web/tests/OfflineSimulatorRuntime.test.ts`

**Interfaces:**
- Produces: `SimulatorProgressPreset = "fresh" | "intro" | "dashboard" | "unlocked" | "mid-lesson" | "complete"`.
- Produces: `applySimulatorProgressPreset(repository, preset): Promise<OfflineLearnerState>`.

- [ ] **Step 1: Write failing literal preset-state tests**

For each preset, assert observable state: intro timestamp, onboarding timestamp,
diagnostic status, Lesson 3 in-progress state for `mid-lesson`, completed lesson
count, final-assessment status, and earned achievement count. Do not assert
private helper calls.

- [ ] **Step 2: Run and verify RED**

Run Task 3's focused test command. Expected: FAIL because preset behavior is
missing.

- [ ] **Step 3: Implement presets through production state functions**

Create fresh schema-valid state, then apply existing acknowledgement, intro,
diagnostic, lesson-progress/completion, final-assessment, and achievement state
transitions. Persist through the repository so revisions remain valid.

- [ ] **Step 4: Run runtime, repository, and content tests**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorRuntime.test.ts tests/OfflineLearnerRepository.test.ts tests/OfflineJourneyContent.test.ts
```

Expected: PASS.

### Task 5: Simulator Shell and Control Panel

**Files:**
- Create: `apps/web/src/apk/simulator/OfflineSimulatorPanel.tsx`
- Create: `apps/web/src/apk/simulator/OfflineSimulatorShell.tsx`
- Create: `apps/web/src/apk/simulator/simulator.css`
- Modify: `apps/web/tests/OfflineSimulatorShell.test.tsx`

**Interfaces:**
- `OfflineSimulatorPanel` receives settings, event callbacks, and preset/reset callbacks.
- `OfflineSimulatorShell` constructs one persistence adapter/repository, persists settings, and remounts `OfflineApkApp` when runtime-affecting controls change.

- [ ] **Step 1: Write failing real-component panel tests**

Assert the panel is labeled `APK Simulator`, device and Clara controls update
the real onboarding dialog after remount, recorder outcome controls remain
selected, Dashboard preset reaches the real `Open Journey` button, Reset returns
to the Speech Recognition onboarding dialog, and the panel can collapse.

- [ ] **Step 2: Run and verify RED**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorShell.test.tsx
```

Expected: FAIL because the shell and panel are missing.

- [ ] **Step 3: Implement the accessible panel and shell**

Use native `select`, `input[type=number]`, and `button` controls with labels.
Keep panel state under its settings key, learner progress under its persistence
key, and use an app `key` counter to remount after profile/preset changes.

- [ ] **Step 4: Implement responsive simulator-only CSS**

Position the expanded panel at the viewport edge above the app. Below `720px`,
collapse it by default to a floating `Simulator` button and constrain the open
panel to the safe viewport with independent scrolling.

- [ ] **Step 5: Run shell and all component tests**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/OfflineSimulatorShell.test.tsx tests/OfflineOnboarding.test.tsx tests/OfflineIntro.test.tsx tests/OfflineDashboard.test.tsx tests/OfflineJourneyMenu.test.tsx tests/OfflineJourneyActivity.test.tsx
```

Expected: PASS.

### Task 6: Dedicated Vite Entry and Release Isolation

**Files:**
- Create: `apps/web/src/apk/simulator/main.tsx`
- Modify: `apps/web/src/app/appTarget.ts`
- Modify: `apps/web/vite.config.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/offline-apk-boundary.json`
- Modify: `apps/web/tests/AppTarget.test.ts`
- Modify: `apps/web/tests/OfflineApkBoundary.test.ts`

**Interfaces:**
- Produces command: `corepack pnpm --dir apps/web dev:apk:simulator`.
- Simulator URL: `http://127.0.0.1:4173`.

- [ ] **Step 1: Write failing mode and build-entry tests**

Assert `resolveAppTarget(undefined, "offline-apk-simulator")` resolves to
`offline-apk`, while unsupported explicit targets still throw. Run a simulator
build in a temporary output directory and assert its HTML references the
simulator entry behavior. Add simulator identifiers to release-boundary
forbidden tokens and assert the actual `dist-apk` verifier reports zero matches.

- [ ] **Step 2: Run and verify RED**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/AppTarget.test.ts tests/OfflineApkBoundary.test.ts
```

Expected: FAIL because simulator mode/entry is not configured.

- [ ] **Step 3: Implement simulator mode and command**

Add a Vite HTML-transform plugin active only for `offline-apk-simulator` that
replaces `/src/main.tsx` with `/src/apk/simulator/main.tsx`. Keep `publicDir`
enabled for simulator development. Add:

```json
"dev:apk:simulator": "vite --mode offline-apk-simulator --host 127.0.0.1 --port 4173 --strictPort"
```

Render `OfflineSimulatorShell` under the existing `ThemeProvider` and main
styles.

- [ ] **Step 4: Prove simulator and release builds are separated**

```powershell
corepack pnpm --dir apps/web exec vitest run tests/AppTarget.test.ts tests/OfflineApkBoundary.test.ts
corepack pnpm --dir apps/web build:apk
```

Expected: tests PASS; release boundary reports `forbidden_tokens_found: 0`.

### Task 7: Full Verification and Visual Browser Debug Pass

**Files:**
- Modify only files required by defects reproduced during this pass.
- Update: `docs/OFFLINE_APK_DEVICE_VALIDATION.md`

- [ ] **Step 1: Run static and automated verification**

```powershell
corepack pnpm --dir apps/web exec tsc -b --pretty false
corepack pnpm --dir apps/web lint
corepack pnpm --dir apps/web exec vitest run tests/OfflineAndroidBoundary.test.ts tests/OfflineApkBoundary.test.ts tests/OfflineAsrBridge.test.ts tests/OfflineAsrModels.test.ts tests/OfflineClaraStage.test.tsx tests/OfflineDashboard.test.tsx tests/OfflineInitialization.test.ts tests/OfflineIntro.test.tsx tests/OfflineJourneyActivity.test.tsx tests/OfflineJourneyContent.test.ts tests/OfflineJourneyMenu.test.tsx tests/OfflineLearnerRepository.test.ts tests/OfflineOnboarding.test.tsx tests/OfflineSimulatorPersistence.test.ts tests/OfflineSimulatorRuntime.test.ts tests/OfflineSimulatorShell.test.tsx tests/OfflineSpeechScoring.test.ts tests/OfflineTtsBridge.test.ts tests/OfflineTtsCatalog.test.ts
corepack pnpm --dir apps/web build:apk
```

Expected: typecheck PASS, lint has zero errors, all offline tests PASS, and APK
boundary PASS.

- [ ] **Step 2: Start the simulator**

```powershell
corepack pnpm --dir apps/web dev:apk:simulator
```

Expected: Vite serves `http://127.0.0.1:4173` with fast refresh.

- [ ] **Step 3: Visually verify representative flows**

In the in-app Browser, verify Low/Static fresh onboarding, High/Dynamic intro,
theme switching, dashboard-to-Journey navigation, prominent Diagnostic skip,
all lessons unlocked, rectangular recorder, correct/incorrect results,
permission/ASR errors, progress persistence after reload, reset, and a narrow
mobile viewport. Record each reproducible defect before changing code.

- [ ] **Step 4: Fix each reproduced defect with a new failing test first**

For every defect, add the smallest test that reproduces the visible behavior,
run it to confirm RED, implement the minimal fix, and rerun it to confirm GREEN.

- [ ] **Step 5: Re-run full verification and document limits**

Repeat Step 1. Document that browser simulation does not validate native audio,
Whisper accuracy, thermal pressure, or memory behavior.

## Commit Discipline

The workspace already contains uncommitted APK 1.1-1.3 changes. Do not stage an
entire pre-existing modified file merely to satisfy a checkpoint. Commit only
new isolated simulator files when their task is green; leave overlapping edits
uncommitted and report them clearly. Never touch
`apps/api/storage/app/private/pilot-test-credentials.txt`.
