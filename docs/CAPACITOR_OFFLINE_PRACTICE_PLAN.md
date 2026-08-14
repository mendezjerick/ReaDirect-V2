# ReaDirect Capacitor Offline Practice Plan

Status: architecture and implementation plan only. This document does not authorize or implement offline assessment, scoring, progression, or academic synchronization.

## 1. Executive summary

ReaDirect should add a deliberately limited **Offline Practice Mode** to the existing Capacitor Android application. A learner downloads an approved practice pack while authenticated and online, then opens that pack without waiting for Laravel, Cloudflare, ASR, dynamic TTS, or another network service. The downloaded experience provides reading prompts, optional approved fixed Clara audio, local record-and-playback, and selected practice-only comprehension activities.

Offline Practice is not an offline copy of the current Reading Journey. It is a separate product boundary with separate routes, data contracts, local records, and labels. It must never create or imitate canonical lesson runs, assessment attempts, scores, mastery, achievements, progression, Mu/Nu decisions, or completion records.

The recommended V1 architecture is:

```text
Approved lesson source rows + explicit offline allowlist
                         |
                         v
Authenticated read-only pack API
                         |
                  HTTPS download
                         |
                         v
Capacitor File Transfer -> app-private staging -> hash validation
                         |
                         v
Atomic activation in Capacitor Filesystem Directory.Data
                         |
                         v
Local practice renderer + local Clara assets + in-memory recorder
```

V1 should add the official Capacitor Filesystem, File Transfer, and Network plugins on the same major version as the installed Capacitor runtime. It should not add SQLite, an IndexedDB abstraction, a ZIP library, a native recorder, or a cryptography dependency. Pack integrity can use the browser Web Crypto SHA-256 implementation already available to the WebView.

No server database migration is required for V1. The server-side pack catalog can be version-controlled, and pack delivery can be stateless and authenticated. Local practice state is written only to app-private files and is never uploaded.

## 2. Existing mobile architecture

The current mobile application is a Capacitor wrapper around the production Vite bundle:

- `apps/web/capacitor.config.ts` uses `appId: "com.readirect.app"`, `appName: "ReaDirect"`, and `webDir: "dist"`.
- No production `server.url` is configured; the Android app renders bundled frontend assets.
- The existing API-origin adapter in `apps/web/src/lib/apiUrl.ts` supports relative browser requests and a configured remote origin for native builds.
- `LearnerExperienceProvider.tsx` detects a native platform and can initialize the lightweight/static presentation without blocking on a settings API call.
- `NativeAppLifecycleProvider.tsx` and `nativeLifecycle.ts` already coordinate pause, resume, and Android Back behavior.
- `useAudioRecorder.ts` already supports browser/WebView `getUserMedia`, `MediaRecorder`, Blob playback, retry, cleanup, and pause interruption.
- `claraSpeech.ts` already owns browser audio playback and the shared Clara speaking lifecycle, but its current audio acquisition path is online.
- Learner authentication is represented in the browser session by `learnerApi.ts`; the token is stored in `sessionStorage`, not durable native storage.
- Laravel learner endpoints are protected by `learner.auth`, and learner sessions are server-expiring and revocable.

Current canonical learning data is server-owned:

- lesson starts create `lesson_runs` with content snapshots;
- responses, completion, achievements, and target exposure are persisted by lesson services;
- assessment services own scoring and completion;
- learner progression is derived from server records;
- Mu/Nu and `SpeechEquivalenceResolver` participate in evaluated speech behavior.

Those systems are not suitable as an offline cache. Their calls have academic side effects, and their models carry canonical meaning. Offline Practice therefore needs a clean boundary rather than wrappers around current lesson and assessment endpoints.

The native shell should initialize in this order:

```text
Bundled React application
  -> local appearance and native lifecycle
  -> local offline-pack repository
  -> render an immediately usable shell
  -> asynchronously inspect network status
  -> asynchronously probe API reachability
  -> enable online-only actions when both session and API are valid
```

No startup path should wait indefinitely for the API.

## 3. Offline V1 scope

V1 includes only the following capabilities:

1. An authenticated learner can list approved offline practice packs while online.
2. The learner can download, validate, update, and delete packs.
3. A previously committed pack can open without network access or a live API process.
4. Packs can contain approved practice projections for letters, words, phrases, sentences, passages, and selected comprehension practice.
5. Static Clara guidance is shown as text.
6. Approved fixed Clara audio may be bundled in a pack when a matching published speech line exists.
7. Missing fixed audio falls back to text and the static mascot without blocking the practice item.
8. The learner can record locally, stop, replay, and retry using the existing recorder capability.
9. Recording audio remains in memory and is discarded after retry, navigation, pause, or route exit.
10. Local practice position and non-academic interaction state can be resumed on the device.
11. The interface clearly labels every offline activity as practice that does not affect Reading Journey progress.
12. Online Learning remains available when the API and learner session are valid.

The first release should prefer a small number of curated packs over a generalized content mirroring system. A suggested initial set is:

- Letter and sound practice;
- Word and phrase reading practice;
- Sentence and short passage practice;
- a small, explicitly curated comprehension-practice pack.

## 4. Explicit non-goals

Offline V1 must not implement or modify:

- diagnostic, formative, or final assessments;
- assessment item download or caching;
- assessment attempts, scores, correctness records, or answer uploads;
- lesson completion or Reading Journey progression;
- mastery, achievements, streaks, exposure balancing, or recommendations;
- canonical `lesson_runs`, `lesson_responses`, or content snapshots;
- Mu/Nu inference, certification, or fallback behavior;
- `SpeechEquivalenceResolver` or evaluated pronunciation matching;
- ASR, pronunciation scoring, speech confidence, or transcript validation;
- dynamic VoxCPM2 generation while offline;
- background synchronization or an outbox for academic events;
- automatic upload of recordings;
- peer-to-peer pack transfer;
- offline staff/admin functionality;
- release signing, Play Store delivery, iOS, or desktop packaging;
- full offline login or a claim that a cached identity is authenticated;
- cloud-independent server hosting;
- redesign of existing assessment, lesson, or recorder screens.

Offline practice completion must never unlock a lesson or be presented as a grade.

## 5. User experience

The native learner entry should expose two clear choices without duplicating the existing Reading Journey:

- **Online Learning** opens the current server-backed learner experience.
- **Practice Offline** opens locally committed packs.

When the device or API is unavailable, Online Learning should remain visible but explain the problem immediately, for example: “Online Learning needs an internet connection. You can keep practicing with a downloaded pack.” It should not lead to an indefinite spinner.

Practice Offline should show:

- downloaded pack name and language availability;
- size and last-updated/version information in an adult-facing details view;
- Continue or Start Practice;
- a persistent “Practice only — does not change lesson progress” label;
- Update Available when a newer pack is known;
- Delete Download with confirmation;
- a friendly empty state when no pack has been downloaded.

During a practice item:

- preserve ReaDirect's current child-friendly visual system;
- show the content prompt and Clara instruction;
- play fixed Clara audio if available;
- permit local record, stop, playback, and retry;
- offer Continue or Try Again without scoring language;
- for curated comprehension, use immediate practice feedback such as “Let’s look at that together,” not “Incorrect,” a numeric score, or mastery language.

When reconnecting, the learner may update packs or return to Online Learning. The app must not imply that local practice will be submitted later.

## 6. Offline pack architecture

An offline pack is an immutable, versioned, server-produced manifest plus sanitized content and assets. Its purpose is to provide display and practice behavior only.

Suggested logical package:

```text
pack manifest
  - schema version
  - stable pack ID
  - immutable pack version
  - module key and title
  - supported interface/speech languages
  - content descriptor and hash
  - asset descriptors and hashes
  - size limits and compatibility metadata

content document
  - ordered practice modules/items
  - display text
  - child-safe instruction/dialogue references
  - asset IDs
  - local interaction mode

assets
  - approved images
  - approved published fixed Clara audio
```

Packs should be assembled from two inputs:

1. Existing approved lesson-source rows from `content/lessons/v1/`.
2. A new explicit offline-practice allowlist that selects safe source IDs and defines their practice presentation.

The allowlist is essential. The pack builder must not export an entire lesson catalog or discover assessment content by convention. It must not call `LessonContentCatalog` snapshot methods because those methods select/shuffle content and write exposure records.

A new read-only content projection should resolve only allowlisted active rows and return a sanitized DTO. The projection strips:

- learner IDs and learner metadata;
- academic run, response, score, and progression fields;
- internal filesystem paths;
- ASR model configuration and server-only target metadata;
- unpublished TTS records;
- assessment content and answer keys;
- administrative approval notes.

Each item should use an opaque stable practice item ID. It may reference a source content ID for server assembly, but the client must not interpret that reference as an academic lesson item.

## 7. Server API architecture

Add a narrow authenticated API namespace, separate from lesson and assessment routes. A concrete contract is:

```text
GET /api/learners/offline-practice/packs
GET /api/learners/offline-practice/packs/{packId}/manifest
GET /api/learners/offline-practice/packs/{packId}/versions/{version}/content
GET /api/learners/offline-practice/packs/{packId}/versions/{version}/assets/{assetId}
```

All endpoints should use the existing `learner.auth` middleware and appropriate learner download throttles. They are read-only and must not call academic completion, exposure, scoring, or progression services.

Example list response:

```json
{
  "schema_version": 1,
  "packs": [
    {
      "pack_id": "letters-foundations-v1",
      "version": "2026.08.1",
      "module_key": "letters",
      "title": "Letter Practice",
      "languages": ["en", "fil"],
      "size_bytes": 12500000,
      "manifest_sha256": "hex-sha256",
      "updated_at": "2026-08-10T00:00:00Z",
      "status": "available",
      "manifest_path": "/api/learners/offline-practice/packs/letters-foundations-v1/manifest"
    }
  ]
}
```

The manifest should include:

- `schema_version`;
- `pack_id`, `version`, `module_key`, and display title;
- minimum supported application version;
- academic content language and available Clara speech languages;
- immutable relative download paths;
- content MIME type, byte count, and SHA-256;
- each asset's opaque ID, kind, language, speech key where relevant, dialogue text, MIME type, byte count, and SHA-256;
- publication time and optional `usable_until` policy;
- a pack-level integrity hash.

The manifest must not provide arbitrary absolute download URLs. The client should combine allowlisted relative API paths with the configured API origin. Every path parameter must be validated against known pack and asset IDs.

Asset responses should set exact `Content-Type` and `Content-Length`, support stable immutable caching for versioned content, and provide `ETag` where practical. An asset endpoint must verify that the requested asset belongs to the requested published pack version.

The server should reject:

- unknown or retired pack IDs;
- versions not published for download;
- assets not present in the manifest;
- unsafe path segments;
- manifests that exceed configured item/asset/byte limits.

Do not add a “submit offline results” endpoint in V1.

## 8. Local storage architecture

Use Capacitor Filesystem with application-private `Directory.Data` as the source of truth. Do not use external/shared storage and do not request broad storage permissions.

Recommended tree:

```text
Directory.Data/
  offline-practice/
    repository-v1.json
    install.json
    packs/
      .staging/
        {downloadId}/
          manifest.json.partial
          content.json.partial
          assets/
      {packId}/
        {version}/
          manifest.json
          content.json
          assets/
            {assetId}.{safeExtension}
          COMMITTED
    profiles/
      {localProfileId}/
        profile.json
        sessions/
          {localSessionId}.json
```

Storage rules:

- A staging download is never playable.
- Validate the manifest schema before downloading subordinate resources.
- Write resources to staging and verify exact byte count, MIME allowlist, and SHA-256.
- Write `COMMITTED` only after every required resource validates.
- Activate a version by atomically replacing the repository index after the committed directory exists.
- Keep the previous active version until the new version is fully committed.
- Treat the index as rebuildable by scanning committed manifests.
- Serialize repository writes through one frontend service queue to avoid concurrent updates.
- Clean abandoned staging directories on startup and after failed downloads.

`localStorage` and `sessionStorage` are not pack stores. Existing `sessionStorage` token behavior should remain unchanged. IndexedDB should not be the authoritative V1 store because the Capacitor storage guidance describes browser storage as potentially transient and platform-dependent.

The implementation should encapsulate all file paths in `OfflinePracticeRepository`; React components should operate on typed records rather than raw URIs.

## 9. Local data model

Use runtime-validated TypeScript schemas. Suggested records follow.

```ts
type OfflinePackRecord = {
  schemaVersion: 1;
  packId: string;
  version: string;
  moduleKey: string;
  title: string;
  status: "committed" | "corrupt";
  installedAt: string;
  lastValidatedAt: string;
  manifestSha256: string;
  totalBytes: number;
};

type OfflinePracticeSession = {
  schemaVersion: 1;
  localSessionId: string;
  localProfileId: string;
  packId: string;
  packVersion: string;
  moduleKey: string;
  currentItemIndex: number;
  itemState: Array<{
    practiceItemId: string;
    visited: boolean;
    selectedChoiceId?: string;
    acknowledgedFeedback?: boolean;
  }>;
  startedAt: string;
  updatedAt: string;
  completedLocally: boolean;
  classification: "practice-only";
};
```

Prohibited local fields include:

- score, percentage, grade, mastery, pass/fail;
- canonical lesson run or assessment attempt IDs;
- pending-upload or synchronization status;
- ASR transcript, pronunciation verdict, Mu/Nu result, or equivalence result;
- achievement or progression change;
- full learner profile, learner code, school, or class;
- persisted recording path in V1.

Local completion means only “the learner reached the end of this local pack.” It must not be reused by Online Learning.

## 10. Content/versioning strategy

Use a stable pack ID and immutable published versions. Re-publishing changed bytes under the same version is forbidden.

Suggested version policy:

- `schema_version` changes only when the manifest contract changes.
- `version` changes for content or asset changes.
- `minimum_app_version` prevents an old app from opening unsupported content.
- a content revision may reference existing lesson-source IDs, but its client-facing practice item IDs remain stable when semantics do not change.

Update sequence:

```text
discover version N+1
  -> keep active version N playable
  -> download N+1 to staging
  -> validate schema, size, MIME, and hashes
  -> commit N+1
  -> atomically point active record to N+1
  -> remove N only after activation succeeds
```

Normal stale versions may remain usable with an “Update available” notice. A hard revoke should be reserved for safety, legal, or materially incorrect content. Because a permanently offline device cannot receive revocation information, downloaded packs must never contain sensitive or high-risk content.

The pack assembler should fail closed if an allowlisted source row is inactive, unapproved, missing, or incompatible. It should never silently substitute assessment material.

## 11. Clara offline strategy

Clara's offline behavior has two levels:

1. Required: mascot state plus authoritative dialogue text stored in the pack.
2. Optional enhancement: approved published fixed audio stored as a pack asset.

Dynamic TTS is not available offline. The pack builder may include fixed audio only when:

- the `TtsSpeechLine` is published;
- its voice version matches the manifest language;
- its dialogue text/reference matches the pack's authoritative line;
- the server verifies the stored audio SHA-256;
- the speech key is explicitly allowed for offline practice;
- the line is not an assessment-only prompt.

The local Clara adapter should resolve one `OfflineDialogue` value containing text, language, optional speech key, and optional local audio asset ID. Both the speech bubble and playback consume that value. This prevents duplicate strings and avoids a bubble saying something different from the audio.

Playback should reuse the existing Clara speaking lifecycle and AudioContext behavior where possible. The acquisition layer changes from API fetch to local file URI/Blob; animation and cancellation remain shared. Missing or corrupt audio produces text-only Clara guidance and must not block the item.

On language switch:

- switch text and audio as one atomic dialogue selection;
- never play English while showing Filipino, or the reverse;
- if the selected-language audio is unavailable, show the selected-language text and remain silent;
- do not fall back to another spoken language without clearly changing the selected language.

## 12. Language strategy

Separate three concepts:

- interface language;
- Clara speech/dialogue language;
- academic content language.

The pack manifest declares each explicitly. The application must not infer academic content language from the learner's Clara voice preference.

English and Filipino Clara lines should use one stable dialogue key with language variants. Pack validation should ensure every required instruction has at least text in each advertised language. Audio remains optional per language.

Language selection is stored in the local practice profile only as a preference. It does not modify the server learner profile while offline. When online, the existing server preference remains authoritative for Online Learning; Offline Practice may initialize from it after a successful login but must not silently upload local changes.

Tests must cover switching language before playback, during playback, after cancellation, and after process restart.

## 13. Local recording strategy

Reuse the current `useAudioRecorder.ts` WebView MediaRecorder capability. Do not add a native recording plugin in V1 and do not change upload or assessed-recorder behavior.

Offline practice recording flow:

```text
request microphone permission
  -> record to MediaRecorder chunks
  -> create in-memory Blob and object URL
  -> local playback
  -> retry or continue
  -> revoke URL and release Blob
```

Recordings are not pack or session data. They are never uploaded, scored, transcribed, or persisted to disk. Cleanup occurs on:

- retry;
- continue to next item;
- leaving Offline Practice;
- app pause;
- recorder interruption;
- component unmount;
- language or pack change.

If the Android process dies, the recording is lost and the item remains available to retry. This is acceptable and safer for child privacy.

The UI should state “Listen to your recording” rather than implying pronunciation validation. No ASR endpoint should be called from an offline route.

## 14. Comprehension-practice strategy

Comprehension in V1 must be a separately curated practice projection, not cached assessment content.

Permitted behavior:

- display an approved passage and a small set of practice questions;
- include local answer choices and an answer needed for immediate instructional feedback;
- explain the answer in child-friendly language;
- allow retry or continue;
- record only local selected choice and feedback acknowledgement.

Prohibited behavior:

- importing diagnostic/final assessment questions;
- creating a percentage or passing threshold;
- mapping local answers to server lesson completion;
- uploading answers on reconnect;
- presenting local completion as mastery.

The server pack assembler should source comprehension only from an explicit offline allowlist. Even when a source row originated in lesson content, the exported DTO must use the offline-practice schema and labels.

## 15. Connectivity strategy

Add a central connectivity state for native use:

```ts
type ConnectivityState = {
  device: "unknown" | "online" | "offline";
  api: "unknown" | "checking" | "reachable" | "unreachable" | "unauthorized";
  lastCheckedAt?: string;
};
```

Use the official Capacitor Network plugin for device network signals, but do not treat “connected” as proof that Laravel is reachable. Perform a short, abortable API probe against the existing health endpoint or a dedicated narrow authenticated readiness endpoint.

Rules:

- render the app shell and local packs before a probe completes;
- set finite connect/read timeouts;
- debounce checks after network changes and resume;
- abort stale probes;
- distinguish `401/403` from network failure;
- avoid repeated modal alerts;
- do not poll continuously while the application is backgrounded;
- use API reachability, not Cloudflare tunnel presence, as the online product signal.

The official Capacitor Network API provides `getStatus()` and `networkStatusChange`; it should be treated as a hint in this two-signal model: [Capacitor Network documentation](https://capacitorjs.com/docs/apis/network).

## 16. Reconnection behavior

On reconnection:

1. Debounce and verify API reachability.
2. If no valid learner session exists, enable login but do not perform pack requests.
3. If the session is valid, request pack metadata only.
4. Compare stable pack IDs and immutable versions.
5. Show update availability without interrupting active local practice.
6. Download only after user confirmation or a clearly configured Wi-Fi-only policy.
7. Never upload local practice sessions or recordings.

If the API returns unauthorized, the app should classify the session as expired/revoked and require online login for downloads and Online Learning. Already committed generic practice packs remain available because they contain no sensitive learner data and are explicitly non-canonical.

No conflict-resolution engine is needed in V1 because server academic state and local practice state never merge.

## 17. Authentication/offline identity

An offline device cannot verify current server authentication. The UI must not claim otherwise.

Recommended V1 identity model:

- require a successful online learner login before allowing a pack download;
- keep bearer tokens in the existing session mechanism and never write them into pack files;
- store generic pack bytes once per app installation;
- namespace local practice sessions by an opaque `localProfileId`;
- derive a learner binding only after online login using SHA-256 of an app-install salt plus the server learner ID;
- do not store the raw learner ID, learner code, full name, school, grade, section, progress, or achievements in offline files;
- treat the binding as local separation, not cryptographic authentication.

On account switch, select a different namespace. On logout, delete the active learner's local practice sessions by default while retaining generic pack bytes; provide an explicit adult-facing “Delete downloaded practice” action. A product decision may permit keeping local position, but that must be opt-in and clearly described for shared devices.

When no live session exists, the entry should say “Practice on this device,” not “Signed in offline.”

## 18. Privacy/security

Threat boundaries:

```text
Laravel + approved content catalog
  | authenticated HTTPS, strict DTOs, hashes
  v
Capacitor download service
  | untrusted until fully validated
  v
app-private staging
  | schema + path + size + MIME + hash validation
  v
committed pack repository
  | local renderer accepts only typed allowlisted content
  v
child-facing practice UI
```

Required controls:

- HTTPS-only production API origins;
- authenticated pack listing/download endpoints;
- server-side pack and asset membership authorization;
- no secrets or signing keys in Vite environment variables;
- runtime schema validation for list, manifest, content, and local records;
- allowlisted IDs and generated filenames; never concatenate server-provided paths directly;
- MIME allowlists for JSON, supported audio, and supported images;
- maximum manifest size, pack size, item count, asset count, and per-asset size;
- exact byte-count and SHA-256 validation before activation;
- atomic staging and activation;
- no HTML execution from content; render text as text, not `dangerouslySetInnerHTML`;
- no learner identity or token in analytics, filenames, logs, or error reports;
- memory-only recordings with deterministic cleanup;
- app-private storage and no broad Android storage permissions;
- deletion that removes profile sessions, staging files, and packs selected by the user.

The current Android application has `android:allowBackup="true"`. Before V1 ships, explicitly review Android backup and data-extraction behavior. Prefer backup rules that exclude offline-practice profile state, WebView authentication/session data, temporary recordings, and staging files. If safe exclusions cannot be demonstrated across supported Android versions, set `allowBackup="false"` after product review.

Security tests should cover tampered manifests, modified assets, path traversal, oversized inputs, invalid MIME, partial downloads, stale indices, cross-profile access, backup exclusions, and token leakage.

## 19. Storage management

The downloads screen should display installed packs and approximate size. It must allow deletion per pack and deletion of all offline-practice data.

Before download:

- use manifest total bytes plus a safety margin;
- warn before large cellular downloads;
- permit a Wi-Fi-only preference;
- avoid concurrent downloads of the same pack;
- report storage exhaustion distinctly from network failure.

During update, budget for both current and new versions. If there is insufficient space, keep the current version and remove staging.

Retention policy:

- one active version per pack;
- one previous version only during an in-progress update;
- abandoned staging removed on next startup;
- corrupt packs quarantined from use and deleted after reporting;
- local session state removed when its pack is deleted;
- no recording retention.

The official Capacitor Filesystem API should store pack files in `Directory.Data`. The deprecated Filesystem `downloadFile` method should not be used; use the official File Transfer plugin for downloads: [Filesystem documentation](https://capacitorjs.com/docs/apis/filesystem), [File Transfer documentation](https://capacitorjs.com/docs/apis/file-transfer).

## 20. Failure recovery

Every failure must preserve the last committed playable state.

| Failure | Expected recovery |
|---|---|
| Network drops during download | Mark staging incomplete; retain current pack; allow retry. |
| App pauses during download | Cancel or mark partial; validate/clean staging on resume/start. |
| Android kills the process | Ignore uncommitted staging on next launch. |
| Hash mismatch | Reject the resource, remove staging, report a corrupted download. |
| Invalid manifest/schema | Do not download assets or activate the pack. |
| New version fails | Continue using the previous committed version. |
| Repository index is corrupt | Rebuild it from valid `COMMITTED` pack directories. |
| Required asset is missing | Refuse activation; optional Clara audio may use text fallback if marked optional. |
| Active asset becomes corrupt | Quarantine the pack and offer redownload; do not partly render it. |
| Low storage | Remove staging, retain committed versions, show a clear action. |
| Microphone denied | Keep text/audio practice available and explain how to enable permission. |
| Recording interrupted | Discard temporary audio and return to Record state. |
| API unauthorized | Require login for online/download actions; keep generic local packs available. |
| Language asset unavailable | Show matching selected-language text without speech. |

Recovery code must not call assessment or lesson completion APIs.

## 21. Capacitor lifecycle

Integrate with the existing `NativeAppLifecycleProvider` rather than introducing parallel global listeners.

On pause/background:

- stop Clara audio and clear speaking UI;
- stop or cancel the active recorder;
- revoke object URLs and discard recording Blobs;
- persist only stable local item position/state;
- stop reachability polling;
- mark active pack downloads as resumable only if the chosen plugin behavior has been verified; otherwise cancel and retain staging for cleanup.

On resume:

- restore the local route and committed pack state without network dependency;
- validate that the active pack still exists;
- refresh Capacitor Network status;
- perform one debounced API probe;
- do not auto-play Clara until the user-facing lifecycle policy permits it;
- never auto-submit or synchronize practice data.

Android Back should follow the existing native back architecture: close a local modal, leave the current practice item, return to the Offline Practice home, and only then allow app exit. Orientation change should not duplicate downloads, audio, or recorder instances.

## 22. Files to add/modify

The following is a proposed implementation map, not a requirement to use every filename verbatim.

Add frontend files:

```text
apps/web/src/features/offline-practice/
  offlinePracticeSchemas.ts
  offlinePracticeApi.ts
  offlinePracticeRepository.ts
  offlinePracticeDownloadService.ts
  offlinePracticeIdentity.ts
  offlinePracticeDialogue.ts
  OfflinePracticeProvider.tsx
  OfflinePracticeHomePage.tsx
  OfflinePracticeModulePage.tsx
  OfflineDownloadsPage.tsx
  offline-practice.css

apps/web/src/features/connectivity/
  ConnectivityProvider.tsx
  connectivityProbe.ts
```

Add frontend tests:

```text
apps/web/tests/offline-practice/
  offlinePracticeRepository.test.ts
  offlinePracticeDownloadService.test.ts
  offlinePracticeIdentity.test.ts
  offlinePracticeDialogue.test.ts
  OfflinePracticeHomePage.test.tsx
  OfflinePracticeModulePage.test.tsx
  ConnectivityProvider.test.tsx
```

Modify frontend files:

- `apps/web/src/App.tsx` for separate offline routes;
- `apps/web/src/app/AppProviders.tsx` for connectivity/offline providers;
- the native learner entry/dashboard component to expose Online Learning and Practice Offline;
- `apps/web/src/features/clara-audio/claraSpeech.ts` only if needed to extract reusable local playback acquisition while preserving shared lifecycle;
- `apps/web/src/features/assessment/useAudioRecorder.ts` only if a behavior-preserving reusable cleanup interface is required; otherwise consume it unchanged;
- `apps/web/package.json` and `pnpm-lock.yaml` for approved Capacitor plugins;
- Android backup/data-extraction configuration after privacy review;
- documentation for development setup and pack publication.

Add backend files:

```text
apps/api/app/Http/Controllers/Api/OfflinePracticePackController.php
apps/api/app/Services/OfflinePractice/OfflinePracticePackCatalog.php
apps/api/app/Services/OfflinePractice/OfflinePracticePackAssembler.php
apps/api/app/Services/OfflinePractice/OfflinePracticeAssetResolver.php
apps/api/tests/Feature/OfflinePracticePackApiTest.php
apps/api/tests/Unit/OfflinePracticePackAssemblerTest.php
content/offline-practice/v1/packs.php
```

Modify backend files:

- `apps/api/routes/api.php` to add read-only authenticated endpoints;
- configuration only if a dedicated read-only asset root is needed;
- TTS read access only through a dedicated resolver that accepts published allowlisted fixed lines.

No V1 database migration is planned.

## 23. Files to avoid

Do not modify or route V1 offline behavior through:

- assessment pages, APIs, controllers, services, models, or migrations;
- final/diagnostic assessment content;
- `LearnerAssessmentCompletionService`;
- `LearnerLessonCompletionService`;
- learner progression/reading-path services;
- canonical `lesson_runs`, `lesson_responses`, achievement, or exposure persistence;
- `SpeechEquivalenceResolver`;
- Mu/Nu service code, contracts, or model files;
- ASR services or upload endpoints;
- dynamic TTS generation/runtime behavior;
- existing lesson-start snapshot methods that mutate exposure/run state;
- backend database academic tables;
- `start.ps1`, `stop.ps1`, or `scripts/precache-tts.ps1`;
- `package-lock.json` or `.corepack` artifacts.

Existing assessed recorder behavior must remain unchanged.

## 24. Implementation phases

### Phase A — contracts and safety tests

- Define manifest, content, local repository, and session schemas.
- Add fixtures for valid and malicious packs.
- Add a source-code guard test ensuring offline modules do not import assessment, progression, Mu/Nu, or equivalence modules.
- Establish configured byte/count/MIME/path limits.

Exit: contracts and forbidden-boundary tests pass without UI or native storage.

### Phase B — read-only server pack delivery

- Add the explicit version-controlled allowlist.
- Implement a read-only source-row resolver that has no exposure/run side effects.
- Implement sanitized pack assembly.
- Resolve only published allowlisted fixed Clara assets.
- Add authenticated list, manifest, content, and asset endpoints.
- Add throttling, path validation, exact headers, and API tests.

Exit: a pack can be fetched with a valid learner session, contains no prohibited fields, and creates no database writes.

### Phase C — dependencies and native repository

- Audit lockfile and select same-major official Capacitor plugin versions.
- Add Filesystem, File Transfer, and Network plugins.
- Run `cap sync android`.
- Implement staged download, hashing, commit marker, activation, update, deletion, and startup recovery.
- Add Android backup exclusions.

Exit: packs survive process restart, corrupt/partial packs never activate, and no broad storage permission appears.

### Phase D — connectivity and native entry

- Add non-blocking device/API status provider.
- Add Online Learning and Practice Offline entry choices.
- Add empty, offline, unauthorized, and update states.
- Preserve normal browser behavior.

Exit: the app launches and opens committed packs with API and Wi-Fi disabled.

### Phase E — local practice experience

- Build practice-only module renderer.
- Add local dialogue/audio resolution through shared Clara lifecycle.
- Reuse local record/playback without upload or scoring.
- Add curated comprehension practice.
- Add persistent practice-only labeling.

Exit: all modules work offline and no network request occurs during a local session.

### Phase F — hardening and physical-device verification

- Execute security, storage, lifecycle, accessibility, responsive, and account-switch tests.
- Verify low-storage and process-death recovery.
- Inspect Android permissions and backup artifacts.
- Verify no academic database mutation before, during, or after offline practice.

Exit: the Definition of Done below is met on supported Android devices.

## 25. Test matrix

| Area | Scenario | Expected result |
|---|---|---|
| First launch | Native app, API unavailable, no packs | Shell renders; Practice Offline shows download-needed state; no endless spinner. |
| Download | Valid authenticated pack | Staged, hashed, committed, and listed. |
| Download | Network loss at each file boundary | No partial activation; retry is available. |
| Download | Invalid hash/size/MIME/schema | Pack rejected and staging cleaned. |
| Download | Concurrent request for same pack | One controlled job; no duplicate/corrupt files. |
| Storage | App restart after successful download | Pack remains available. |
| Storage | Process killed during download | Previous pack works; staging is recovered/removed. |
| Storage | Corrupt repository index | Index rebuilt from committed directories. |
| Storage | Low/zero space | Clear error; previous committed pack retained. |
| Storage | Delete one/delete all | Files and dependent local sessions removed. |
| Update | N+1 succeeds | Atomic switch; N removed after activation. |
| Update | N+1 fails | N remains active and playable. |
| Offline | Airplane mode before app launch | Committed pack opens without API calls. |
| Offline | Cloudflare/API process stopped | Local pack works; Online Learning explains unavailability. |
| Connectivity | Network says online but API unreachable | API classified unreachable, not reachable. |
| Connectivity | API returns 401 | Session classified unauthorized, not offline. |
| Reconnect | API returns while local session active | No interruption or upload; update metadata can refresh. |
| Identity | Logout | Active profile practice state cleared per policy; generic pack remains. |
| Identity | Account A then account B | No local session visibility across profile namespaces. |
| Identity | Token expiry while offline | Local generic practice works; downloads require login. |
| Clara | English text/audio | Bubble and spoken line match exactly. |
| Clara | Filipino text/audio | Bubble and spoken line match exactly. |
| Clara | Missing selected-language audio | Correct text displays; no wrong-language fallback. |
| Clara | Language switch during speech | Old playback cancels; new text/audio state is synchronized. |
| Clara | Pause/back/process interruption | Playback stops and speaking UI clears. |
| Recorder | Permission granted | Record, stop, replay, retry all local. |
| Recorder | Permission denied | Friendly recovery; other practice remains usable. |
| Recorder | Pause/route exit | Tracks stop, Blob and object URL are released. |
| Recorder | Network inspection | No upload, ASR, Mu/Nu, or scoring request occurs. |
| Comprehension | Select answer | Practice feedback only; no score/progression. |
| Academic safety | Compare DB before/after all V1 flows | No lesson, assessment, response, achievement, exposure, or progression writes. |
| Security | `../`, encoded path traversal, unknown IDs | Request and local import rejected. |
| Security | Oversized count/asset/pack | Rejected before unsafe allocation/download. |
| Security | Modified local asset | Pack quarantined; no partial render. |
| Privacy | Inspect files/logcat/network | No token, learner code, full identity, transcript, or recording persists. |
| Android | Backup/restore inspection | Excluded profile/session/auth/staging data is not restored. |
| Lifecycle | Rotation and repeated resume | No duplicate listener, download, audio, or recorder. |
| Web regression | Browser learner flows | Existing online browser experience remains functional. |
| Native regression | Existing online Android flows | Existing router, login, recorder, Clara, and Back behavior remain functional. |

Automated coverage should include frontend unit/component tests, Laravel feature/unit tests, and a boundary test that searches the offline feature for prohibited imports/endpoints. Physical-device testing remains necessary for Android file URIs, permissions, pause/resume, process death, and storage pressure.

## 26. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Offline mode accidentally gains academic meaning | Invalid scores/progression and trust loss | Separate routes/schemas/services; no sync endpoint; DB no-write tests. |
| Pack assembler invokes lesson snapshot logic | Exposure/run mutation | Dedicated read-only resolver; transaction/database-write assertions. |
| Assessment content leaks into packs | Academic integrity issue | Explicit allowlist; source-kind validation; fixture and review checks. |
| Child recordings persist | Privacy harm | Memory-only design; lifecycle cleanup; filesystem/log inspection tests. |
| Token or identity enters local files | Account/privacy exposure | Strict schemas, log redaction, app-private storage, security tests. |
| WebView storage eviction | Offline content disappears | Capacitor Filesystem `Directory.Data` as source of truth. |
| Interrupted update destroys working pack | Loss of offline access | Staging, hashes, commit marker, atomic active pointer, retain old version. |
| “Connected” network cannot reach API | Endless loading | Device signal plus timeouted API probe and explicit UI states. |
| Wrong-language Clara output | Confusing instruction | One authoritative dialogue selection for text and audio. |
| Dynamic TTS unavailable | Silent Clara | Include approved fixed audio; guaranteed text fallback. |
| Large packs exhaust storage/data | Failed installation/cost | Curated small packs, manifest sizes, Wi-Fi preference, safety margin. |
| Shared-device local progress leaks | Privacy/confusion | Opaque profile namespaces, default clear on logout, account-switch tests. |
| Android backup copies sensitive state | Data leakage | Explicit backup/data-extraction exclusions or disable backup. |
| Added dependencies drift from Capacitor | Native build failure | Same-major official plugins, lockfile audit, Gradle and sync verification. |
| Future team treats V1 as a sync queue | Scope creep and conflicts | `practice-only` classification, no upload fields, documented Phase 2 gate. |

## 27. Definition of Done

Offline Practice V1 is complete only when all of the following are true:

- Android launches the bundled React application without waiting for the API.
- Online Learning and Practice Offline are clearly separate.
- A learner with a valid online session can list and download an approved pack.
- Pack endpoints are authenticated, read-only, throttled, and path-safe.
- Pack assembly uses an explicit allowlist and creates no academic database writes.
- A fully downloaded pack opens after Wi-Fi and the API are turned off.
- Partial, corrupt, oversized, or incompatible packs never activate.
- Pack update failure preserves the previous playable version.
- Downloaded content lives in app-private storage with no broad storage permission.
- Android backup rules protect local identity/session/auth/staging data.
- Clara text is always available and matches any played fixed audio.
- English/Filipino switching cannot mix visible and spoken dialogue.
- Record, stop, local replay, retry, and cleanup work without upload.
- No recording, transcript, ASR result, Mu/Nu result, or pronunciation verdict persists.
- Comprehension uses only curated practice material and returns non-scored feedback.
- No assessment, scoring, lesson completion, achievement, exposure, progression, Mu/Nu, or `SpeechEquivalenceResolver` code is changed or invoked.
- No local practice data is uploaded on reconnect.
- Logout/account switching does not expose another learner's local session.
- Pause, resume, Android Back, rotation, process death, and low storage recover safely.
- Existing web and online Android learner flows pass regression tests.
- Dependency, security, API, database, and final Git change reviews have no unresolved high-risk findings.

## 28. Future Phase 2: validated/synchronized offline academic work

Phase 2 is intentionally outside this plan's implementation scope. It would require a separate architecture and approval process because synchronized academic work changes ReaDirect's trust model.

Before any Phase 2 implementation, the team would need to define:

- cryptographically bound learner/device sessions and offline authorization windows;
- signed content snapshots and immutable assessment/lesson versions;
- a durable encrypted event outbox;
- idempotency keys and replay protection;
- server-side validation of event order, timestamps, content version, and device state;
- conflict resolution for simultaneous online/offline work;
- expiration, revocation, clock manipulation, and compromised-device handling;
- secure recording retention/upload and explicit child-data consent;
- auditable scoring rules and model/version binding for ASR, Mu/Nu, and equivalence;
- transactional progression updates only after server validation;
- teacher-visible provenance that distinguishes online from validated offline evidence;
- migration, observability, incident response, and data deletion procedures.

Phase 2 must not evolve by adding an upload flag to the V1 local session. It should begin with a new threat model, database design, API contract, research validation, and formal review of assessment integrity and child privacy.

