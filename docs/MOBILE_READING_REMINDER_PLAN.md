# Mobile Reading Reminder V1 Plan

Status: analysis and implementation planning only. No package, application,
Android, backend, database, deployment, or academic-behavior change is made by
this document.

Repository snapshot reviewed: 2026-08-23 on the current working tree.

## 1. Executive Summary

ReaDirect can implement Reading Reminder V1 as a bounded, fully client-side
Android feature. The learner explicitly enables one preferred reminder time and
chooses Daily, Weekdays, or Selected Days. Android then owns delivery through
native local notifications even when the WebView is not running. No Laravel
endpoint, database table, queue, Reverb connection, Firebase service, push
token, service worker, or academic event is required.

The current application does **not** have a local-notifications plugin or a
native preferences plugin. The recommended implementation adds the official
Capacitor 8 Local Notifications and Preferences plugins, introduces a small
adapter/service boundary, and places a mobile-only Reading Reminder utility card
on the learner dashboard. The existing `Capacitor.isNativePlatform()` convention
must gate both the entry point and all native operations.

Safe V1 decisions:

- disabled and unscheduled by default;
- suggested values of 6:00 PM and Weekdays, but inactive until explicitly
  enabled and saved;
- notification permission requested only during an explicit enabled Save;
- one deterministic recurring notification per selected weekday;
- inexact delivery, so no exact-alarm permission is requested;
- generic lock-screen-safe wording with no learner or academic data;
- locally learner-scoped ownership, canceled and cleared on logout or account
  change;
- notification taps only open/foreground ReaDirect and preserve its normal Tap
  to Continue startup;
- browser routes, browser notifications, and browser startup remain unchanged.

Implementation complexity is **MEDIUM**. The UI and data model are small, but
Android 13+ permission behavior, schedule reconciliation, reboot behavior,
account privacy, and real-device verification require careful handling.

## 2. Current Mobile Architecture

ReaDirect Mobile is the React/Vite application bundled into a Capacitor Android
shell, not a remote web page:

- `apps/web/capacitor.config.ts` defines `appId: "com.readirect.app"`,
  `appName: "ReaDirect"`, and `webDir: "dist"` with no production `server.url`.
- `apps/web/package.json` uses Capacitor Core and Android `8.5.0`, with the App,
  Browser, File Transfer, Filesystem, and Network plugins on compatible Capacitor
  8 releases.
- `apps/web/src/main.tsx` hydrates and validates the native secure learner
  session before rendering the application providers.
- `apps/web/src/App.tsx` renders `NativeLearnerEntryPage` at the root on native
  platforms. A normal browser keeps the existing intro/landing behavior.
- `apps/web/src/features/offline-practice/NativeLearnerEntryPage.tsx` owns the
  existing loading screen, Tap to Continue, and online/offline mode selection.
- `apps/web/src/app/NativeAppLifecycleProvider.tsx` and
  `apps/web/src/app/nativeLifecycle.ts` coordinate pause, resume, and Android
  Back behavior.
- `apps/web/src/app/nativeSecureSession.ts` and the custom Android
  `SecureSessionPlugin` persist authentication separately from ordinary display
  preferences.
- `LearnerDashboardPage.tsx` is the current learner hub and already has a
  native-only utility card for Offline Practice and a device-preference card for
  Clara appearance.

The notification feature must be initialized after the existing application
bootstrap. It must not delay native-session hydration, route rendering, the
loading screen, or Tap to Continue. Native schedule reconciliation can run
asynchronously after the React application is mounted.

## 3. Existing Notification Capability

Local-notification support is absent in the current repository:

- `@capacitor/local-notifications` is not in `apps/web/package.json` or
  `pnpm-lock.yaml`.
- `apps/web/android/app/src/main/assets/capacitor.plugins.json` registers App,
  Browser, File Transfer, Filesystem, and Network only.
- `apps/web/android/app/src/main/AndroidManifest.xml` has Internet, microphone,
  and audio permissions only. It has no notification, reboot, wake-lock, or
  exact-alarm permission declared directly.
- `apps/web/capacitor.config.ts` has no Local Notifications configuration.
- No repository service schedules, lists, cancels, or handles local
  notifications.

JavaScript `setTimeout` or `setInterval` is not a viable substitute: the WebView
can be suspended or destroyed and cannot guarantee delivery. Android must own
the schedule.

The official Capacitor Local Notifications plugin is appropriate. Its Android
library persists schedules, uses `AlarmManager`, provides permission, schedule,
pending-list, cancellation, channel, and action-listener APIs, and includes a
boot receiver that restores stored schedules. That avoids custom Java/Kotlin
alarm code and an application-side background loop.

## 4. Existing Platform Detection

The repository's reliable platform boundary is
`Capacitor.isNativePlatform()` from `@capacitor/core`. It is already used in:

- `apps/web/src/App.tsx` for native versus browser startup;
- `LearnerDashboardPage.tsx` for native-only utility UI;
- `NativeAppLifecycleProvider.tsx` and native orientation handling;
- native secure-session and connectivity behavior;
- Offline Practice repository/download behavior;
- staff/mobile redirects and learner presentation behavior.

V1 must reuse this convention. A `ReadingReminderPlatform` or notification
adapter may expose an `isSupported()` method for tests, but its production answer
must derive from `Capacitor.isNativePlatform()` and Android availability. The UI
entry is not rendered in a normal browser, and every service method must also
defensively reject native scheduling outside the supported environment.

Browser user-agent sniffing, viewport-width checks, the browser Notification
API, and service workers must not be used to identify or implement this feature.

## 5. Recommended Feature Location

The least confusing location is a **native-only utility card on the learner
dashboard** titled “Reading Reminder,” near the existing “Your device / Clara
appearance” area. Selecting the card opens a dedicated route:

`/learner/settings/reading-reminder`

This fits the current information architecture without inventing a large
settings subsystem. The card should use the existing clock `PixelIcon`,
`Surface`, `BigButton`, typography, border, shadow, spacing, and theme tokens.
The settings page should have a visible Back action that returns to
`/learner/dashboard`; the Android hardware Back mapping should do the same.

The card must not appear in Reading Journey, assessments, lessons, Learn with
Clara, games, or Offline Practice modules. It is a device convenience setting,
not a learning module or progress action.

## 6. Reading Reminder V1 Scope

V1 includes:

1. Actual Capacitor Android only.
2. One enabled/disabled reading reminder per active learner on a device.
3. One preferred device-local time.
4. Daily, Weekdays, and Selected Days repeat choices.
5. A minimum of one selected day when enabled.
6. Explicit Save and truthful success/failure feedback.
7. Android notification permission requested only after an enabled Save.
8. Native recurring schedules owned by Android.
9. Local durable preference storage.
10. Deterministic update, replacement, and cancellation.
11. Generic learner-friendly title and body text.
12. Notification tap that opens ReaDirect normally.
13. Cleanup on logout and account transition.
14. App-start/resume reconciliation for owner, stored data, pending schedules,
    and device-timezone changes.

Selected Days is practical with the current recommended plugin: one recurring
`schedule.on` notification can be created for each selected weekday.

## 7. Explicitly Out of Scope

V1 does not include:

- Laravel APIs, migrations, PostgreSQL reminder state, queues, cron jobs, or
  workers;
- Firebase Cloud Messaging, remote push notifications, push tokens, Reverb,
  WebSockets, or service workers;
- teacher/school/admin reminders or campaigns;
- synchronization across devices;
- notification analytics, an inbox, delivery receipts, or engagement tracking;
- progress-aware, missed-lesson, score, streak, mastery, or achievement logic;
- direct launch of a lesson, assessment, Clara activity, game, or staff page;
- academic completion, scoring, recommendation, exposure, or CRLA evidence;
- custom alarm sounds, persistent audio, DND override, high-priority alarm
  behavior, or exact alarms;
- multiple reminder times per learner;
- iOS implementation or ordinary browser notifications;
- redesign of the dashboard, native startup, authentication, or learner
  settings architecture.

## 8. Proposed User Flow

```text
Native learner dashboard
  -> Reading Reminder utility card
  -> settings page opens (no permission request)
  -> learner turns Reminders on
  -> chooses time and repeat days
  -> Save Reminder
  -> validate input
  -> check/request Android notification permission
       -> denied: schedule nothing; explain next step
       -> granted: create channel; replace reserved schedules
  -> verify expected pending IDs
  -> persist the confirmed settings
  -> announce “Reading reminder saved”

Android reaches a selected local time
  -> posts a normal Reading Reminders notification
  -> learner taps it
  -> ReaDirect is launched or foregrounded normally
  -> cold launch still follows loading screen and Tap to Continue
```

Turning the switch off and saving cancels every reserved Reading Reminder ID
before persisting the disabled state. The page must not claim success if native
cancellation or scheduling fails.

## 9. Settings UI

Recommended content:

```text
Reading Reminder
Get a gentle reminder to practice reading.

Reminders                         [ Off / On ]

Time
[ 6:00 PM ]

Repeat
( ) Daily   ( ) Weekdays   ( ) Selected days

[ Mon ] [ Tue ] [ Wed ] [ Thu ] [ Fri ] [ Sat ] [ Sun ]
  shown only when Selected days is active

[ Save Reminder ]
```

Defaults are `enabled: false`, `time: "18:00"`, repeat mode `weekdays`, and
Monday–Friday selected. These are suggestions only; opening the page does not
schedule anything. When the switch is off, time/repeat controls may remain
visible for predictability but should be disabled or clearly inactive until the
learner enables reminders.

Use existing ReaDirect visual primitives and semantic tokens. Do not add a new
palette. The page should use `Surface kind="panel"`, `BigButton`, and the clock
`PixelIcon`, with a small feature stylesheet for layout and native form-control
alignment only. The primary academic action on the dashboard must remain more
visually prominent than this utility setting.

The Save label should change to “Turn Off Reminder” when an enabled stored
reminder is being disabled only if that distinction remains clear in testing;
otherwise a stable “Save Reminder” label plus visible On/Off state is sufficient.

## 10. Permission Flow

Permission must be contextual and user initiated:

1. Opening the settings page calls no permission request.
2. Saving a disabled setting calls no permission request.
3. Saving an enabled setting calls `checkPermissions()`.
4. If already granted, continue without prompting.
5. If not granted, call `requestPermissions()` once as part of that explicit
   Save action.
6. If granted, schedule and persist.
7. If denied, schedule nothing, leave the stored feature disabled, and show a
   friendly inline error with a “Try again” action.

Recommended denied text:

> Notifications are off for ReaDirect. Allow notifications in Android Settings,
> then return here and try again.

The app must not request permission on install, launch, Tap to Continue, login,
dashboard load, route load, or app resume. It must not retry automatically after
denial. V1 can provide clear manual Android Settings instructions rather than
adding another plugin solely to deep-link into Settings. If a direct Settings
button is later required, it should be separately designed and tested against
the supported Android versions.

## 11. Android Version / Permission Requirements

Current Android values in `apps/web/android/variables.gradle` are:

- minimum SDK: 24;
- compile SDK: 36;
- target SDK: 36.

Because ReaDirect targets above API 33, Android 13+ requires the runtime
`POST_NOTIFICATIONS` permission before normal notifications can be posted. On
Android 12 and lower, the Local Notifications plugin reports notification
permission as granted without a runtime prompt, though the app/channel can still
be disabled by system settings.

The official plugin's Android manifest contributes
`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, and `WAKE_LOCK` through manifest
merging. A future implementation should verify the merged manifest after
`cap sync android`; it should not manually duplicate those declarations in the
application manifest unless a verified build issue requires it.

Do **not** add `SCHEDULE_EXACT_ALARM` or `USE_EXACT_ALARM`. V1 must explicitly
request inexact scheduling in every notification request.

## 12. Local Notification Technology

Add the official `@capacitor/local-notifications` plugin on the current
Capacitor 8 major. At planning time, the compatible reviewed version is `8.3.1`
with a peer requirement of Capacitor Core 8 or later. The implementation should
pin the exact reviewed 8.x version, consistent with the repository's exact
dependency pins, without broadly upgrading Capacitor.

Use these plugin capabilities behind one adapter:

- `checkPermissions()` and `requestPermissions()`;
- `createChannel()` on Android;
- `schedule({ notifications })`;
- `getPending()` to verify and reconcile reserved IDs;
- `cancel({ notifications: [{ id }, ...] })`;
- optionally `areEnabled()` for a clearer system-disabled diagnostic.

No special notification-action listener is required for V1. The Android plugin
builds a launcher intent for a normal notification tap, which is exactly the
required behavior. If a listener is added for diagnostic purposes, it must not
navigate to an academic route or record analytics.

Every schedule must set `isExactNotification: false`. The implementation should
not rely on the plugin's changing defaults.

After package installation in the future LUNA task, run the existing
`mobile:sync` workflow so Capacitor registers the native plugins and regenerates
the Android plugin metadata. SOL must not perform that step during planning.

## 13. Local Preference Storage

The current app uses `localStorage` for non-sensitive browser/device preferences
such as theme and Clara display mode. It does not currently include Capacitor
Preferences. Capacitor's official guidance warns that mobile operating systems
may clear WebView `localStorage`; a reminder preference controls an OS schedule
and must survive normal app restarts reliably. Therefore V1 should add the
official `@capacitor/preferences` plugin rather than reuse secure session storage
or introduce a database.

At planning time, the compatible reviewed release is
`@capacitor/preferences@8.0.1`. Pin the reviewed Capacitor 8 version without
upgrading the framework broadly.

Use one versioned key, for example:

`readirect.reading-reminder.v1`

Suggested validated shape:

```ts
type ReadingReminderPreferenceV1 = {
  schemaVersion: 1;
  enabled: boolean;
  time: string; // canonical local HH:mm
  repeat: "daily" | "weekdays" | "selected";
  days: Array<"SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT">;
  ownerKey: string | null;
  timezoneOffsetMinutes: number;
};
```

Validate reads with the already-installed Zod dependency. Never store a learner
name, code, token, score, or other academic value. A missing or invalid value
falls back to disabled defaults and triggers reserved-ID cleanup during native
reconciliation.

Preferences is not encrypted and does not need to be: the setting is not a
secret. It must not reuse `SecureSessionPlugin`, whose purpose and lifecycle are
authentication-specific.

## 14. Device vs Learner Ownership Decision

Choose **currently logged-in learner on this device**, not a permanent
device-wide reminder.

The OS schedule remains physically device-local, but its preference includes an
owner key derived only from the current local session identity. A suitable key
is a type prefix plus the existing learner numeric ID; Guest Reader may use its
existing stable guest identity. The value is used only for local equality checks
and must not contain the learner code, name, token, or academic data.

Why this is safer than pure device ownership:

- a shared phone cannot silently transfer Learner A's schedule to Learner B;
- logout has a clear privacy boundary;
- no backend storage or multi-device synchronization is introduced;
- reinstall and app-data clear naturally reset the feature;
- each learner or Guest Reader explicitly opts in on that device.

Reading Reminder can be available to authenticated learners and Guest Reader,
because both use the learner dashboard. Guest reminders are likewise canceled
when Guest Mode is exited.

## 15. Logout / Account-Switch Behavior

Reminders must **not** remain scheduled after logout, Exit Guest Mode, session
expiry, or account replacement.

Add a native-only coordinator that listens to the existing
`readirect:learner-session-changed` event and serializes reconciliation:

1. Load the current session owner key.
2. Load the stored reminder preference.
3. If there is no active learner, cancel IDs `48100`–`48106` and remove/reset the
   preference.
4. If the stored owner differs from the active learner, cancel the same IDs and
   reset to disabled defaults for the new learner.
5. If the owner matches, reconcile the stored settings with pending schedules.

The coordinator must also run once after app/session hydration so a stale
schedule cannot survive a prior interrupted logout. Native operations should be
queued to prevent a rapid logout/login sequence from racing cancellation and a
new Save.

The generic synchronous `clearLearnerSession()` should not import native
notification code, which would couple authentication to an optional Android
plugin and risk browser behavior. Cleanup belongs in the native reminder
coordinator/service responding to the existing session event. Tests must cover
explicit logout, Guest exit, session expiry event, and A-to-B account switch.

On reinstall or app-data clear, Android removes the application's preferences
and schedules; the next launch starts disabled. No restoration from the server
is expected.

## 16. Scheduling Model

Use one recurring native schedule per active weekday with the plugin's
`schedule.on` calendar fields:

- Daily: seven schedules, Sunday through Saturday;
- Weekdays: five schedules, Monday through Friday;
- Selected Days: one schedule for each chosen day.

Each notification uses the same validated `hour` and `minute`, its assigned
`weekday`, the dedicated channel ID, and `isExactNotification: false`. A maximum
of seven active notifications is small, bounded, and easy to reconcile.

Do not use a one-time notification followed by a JavaScript reschedule. Do not
create one schedule for every calendar date. Do not use random IDs. Do not rely
on the app remaining open.

The Local Notifications plugin persists schedules and its manifest-provided
boot receiver restores them after a normal phone restart. ReaDirect does not
need a custom boot receiver or background loop. This behavior still requires a
real-device reboot test because OEM power management varies.

Normal app close and process death should not remove the Android-owned alarm.
Android force-stop is a platform exception and may suppress alarms until the app
is opened again; this should be documented as a platform limitation, not worked
around with broader permissions.

## 17. Notification ID Strategy

Reserve exactly seven integer IDs for Reading Reminder V1:

| Day       |    ID |
| --------- | ----: |
| Sunday    | 48100 |
| Monday    | 48101 |
| Tuesday   | 48102 |
| Wednesday | 48103 |
| Thursday  | 48104 |
| Friday    | 48105 |
| Saturday  | 48106 |

Keep the mapping in one exported constant. All scheduling, pending verification,
logout cleanup, account transitions, corrupt-preference recovery, and disabling
must operate only on this reserved set. Do not use `cancelAll()`, because other
ReaDirect notification features may be added later.

Repeated Save replaces the same IDs and therefore cannot create unlimited
duplicates. A future Reading Reminder V2 should either preserve this contract or
reserve a separately documented range.

## 18. Rescheduling / Cancellation

All mutations should be serialized in `ReadingReminderService`.

Enabled Save algorithm:

1. Validate platform, owner, time, repeat mode, and selected days.
2. Check/request permission according to Section 10.
3. Ensure the `reading-reminders-v1` channel exists.
4. Snapshot the last valid preference.
5. Cancel all seven reserved IDs.
6. Schedule the desired weekday batch with deterministic IDs and inexact mode.
7. Call `getPending()` and verify that the reserved pending IDs exactly match the
   desired set.
8. Persist the new preference only after verification succeeds.
9. Report success to the UI.

If scheduling or verification fails, cancel any partially created reserved
schedules and attempt to restore the previous valid schedule from the snapshot.
Keep the old preference only if restoration succeeds. Otherwise persist a safe
disabled/reconciliation-needed state and show an error. Never claim that the new
reminder was saved when it was not.

Disabled Save algorithm:

1. Cancel all seven reserved IDs.
2. Confirm no reserved ID remains in `getPending()`.
3. Persist disabled settings or remove the preference.
4. Report “Reading reminder turned off.”

Startup/resume reconciliation should be conservative: remove stray reserved IDs
when settings are missing/disabled/mismatched, and recreate the expected set
when an enabled, matching-owner preference is valid but pending schedules differ.
Permission must not be requested during reconciliation; if permission is absent,
disable/cancel and ask the learner to re-enable from the settings page.

## 19. Time / Timezone Behavior

Use the device's local civil time. Store the chosen time as canonical 24-hour
`HH:mm`, while the native HTML `input[type="time"]` can display according to the
device/WebView locale and 12/24-hour preference.

The weekday values are local-device weekdays. No server timezone, UTC reminder
record, or learner-profile timezone is required.

Store the device's `new Date().getTimezoneOffset()` when scheduling. On app
resume, compare it with the stored value. If it changed, reschedule the same
local hour/minute and weekdays without requesting permission. This makes a
travel or daylight-saving change return to the learner's intended wall-clock
time when ReaDirect is next opened.

Android system-time adjustments and DST behavior must be verified on a test
device/emulator. Inexact alarms may be delivered later than the selected minute
because of Doze, battery optimization, and OEM scheduling. The UI should call
the time a preferred reminder time, not promise second-level precision.

## 20. Notification Content

Recommended lock-screen-safe content:

- Title: `Ready to read?`
- Body: `Open ReaDirect when you're ready for a few minutes of reading practice.`

This is encouraging, generic, and truthful. It includes no learner name, learner
code, school, teacher, score, assessment result, lesson state, speech data,
streak, or other educational information.

Do not use guilt, urgency, or unsupported progress claims such as “You missed
your lesson,” “Your score is falling,” or “You must practice now.” V1 does not
inspect progress and must not write notification delivery/tap events into
academic or analytics storage.

## 21. Notification Tap Behavior

Use the plugin's default Android launcher intent:

- if ReaDirect is closed, launch its existing main activity and normal root
  startup;
- if the activity already exists, foreground it according to the current
  `singleTask`/launcher behavior;
- do not attach a lesson, assessment, Clara, game, or staff deep link;
- do not bypass login, session validation, loading, or Tap to Continue;
- do not invent an `appUrlOpen` route for V1.

No notification action buttons are needed. A tap listener is unnecessary unless
future debugging proves that a specific OEM requires one; if introduced, it
must remain a no-navigation handler.

When the reminder arrives while the app is foregrounded, accept the plugin and
Android channel's normal behavior. Do not add an intrusive in-app modal or a
duplicate toast. Omit the plugin's Android `foreground: true` option so V1 does
not force alarm-like heads-up behavior.

## 22. Android Notification Channel

Create one versioned Android channel before scheduling:

- ID: `reading-reminders-v1`
- Name: `Reading Reminders`
- Description: `Gentle reminders to practice reading with ReaDirect.`
- Importance: Default, not High or Max
- Sound: normal system notification sound
- Vibration: normal channel/default behavior; no custom urgent pattern
- Lock-screen content: generic and private-safe
- DND bypass: false

Android channel behavior becomes user-controlled after creation and many channel
properties cannot be silently changed later. If semantics materially change,
create a new versioned channel rather than pretending to overwrite the user's
system settings.

A future implementation should add a proper monochrome Android status-bar icon
(`ic_stat_readirect`) and reference it from Local Notifications configuration or
the notification request. Do not use a full-color launcher bitmap as a status
icon.

## 23. Exact Alarm / Battery Considerations

Reading practice is not an alarm-clock or calendar-critical use case. Approximate
delivery is acceptable, so V1 must set `isExactNotification: false` and must not
request exact-alarm access.

This avoids Android 12+ exact-alarm special access and Android 14 restrictions.
It also avoids sending learners to a confusing “Alarms & reminders” settings
screen. Doze, battery saver, OEM background rules, and force-stop can delay an
inexact reminder. The product should describe it as a gentle reminder, not an
exact alarm.

The plugin's reboot receiver and wake-lock declaration are sufficient for its
normal scheduling implementation. ReaDirect should not add a foreground
service, battery-optimization exemption request, persistent process, or custom
broadcast receiver.

## 24. Accessibility

The future implementation must include:

- one descriptive `h1` and logical heading order;
- a visible Back button with an accessible name;
- a properly named switch with visible On/Off text, `role="switch"`, and
  `aria-checked`, following the existing Clara appearance control convention;
- an explicit `<label>` associated with `input[type="time"]`;
- a `<fieldset>` and `<legend>` for Daily/Weekdays/Selected radio choices;
- a second `<fieldset>`/legend for selected weekdays, with full-day accessible
  names even if the visual labels are abbreviated;
- at least 44 by 44 CSS-pixel touch targets;
- keyboard-operable controls for component/browser-development tests;
- visible focus indication using existing focus tokens;
- state communicated through text and semantics, not color alone;
- permission/scheduling errors announced with `role="alert"`;
- save/off confirmations announced with `role="status"` and polite live-region
  behavior;
- no icon-only unexplained control and no auto-dismissed critical error;
- sufficient text/background contrast across existing ReaDirect themes;
- reduced-motion compatibility through existing motion conventions.

Avoid announcing every intermediate toggle change. Announce the final result of
Save, denial, or cancellation so screen-reader output remains understandable.

## 25. Responsive Mobile UI

The page should be a normal scrollable learner-flow page, not a fixed-height
game canvas. Reuse existing safe-area padding and responsive content widths.

Required layout behavior:

- portrait: one-column panels and full-width primary action;
- day controls: a wrapping grid that keeps every control at least 44 pixels;
- landscape: a centered max-width panel with vertical scrolling and no clipped
  Save or Back action;
- no horizontal overflow at larger text sizes;
- no content hidden behind status/navigation bars or display cutouts;
- no orientation requirement or forced landscape mode.

Verify at least 390×844, 430×932, and 844×390 CSS pixels, plus the actual
supported Android device/emulator. Also inspect 200% text zoom or equivalent
Android font scaling because short weekday labels can otherwise appear to fit
while status and error text clips.

## 26. Mobile Startup Preservation

The existing mobile sequence remains:

```text
launch ReaDirect
  -> current loading screen
  -> Tap to Continue
  -> current mode/authenticated flow
```

Reading Reminder must not add a startup route, bypass Tap to Continue, navigate
from a notification callback, or block initial rendering while it reads
preferences. The native coordinator should reconcile asynchronously after
session hydration and app mount.

A cold notification tap launches the same root activity and follows the same
sequence. A warm tap only brings the existing activity forward. Existing
session validation and `NativeLearnerEntryPage` behavior remain authoritative.

## 27. Browser Isolation

Normal browser behavior must remain unchanged:

- no Reading Reminder card in the learner dashboard;
- no native schedule, channel, permission, or preference call;
- no browser Notification API;
- no service worker or PWA notification implementation;
- no browser permission prompt;
- no change to `/`, `/landing`, or browser login/startup behavior.

If a browser directly enters `/learner/settings/reading-reminder`, a small native
route guard should replace-navigate to `/learner/dashboard` when a learner
session exists, otherwise to the existing learner login/home boundary. It must
not render a partially functional browser settings page.

The native adapter should still fail closed outside native even if UI routing is
misconfigured. This defense makes accidental browser scheduling impossible.

## 28. Error Handling

Map internal errors to small, actionable learner messages:

| Condition                                | User-facing result                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Permission denied                        | “Notifications are off for ReaDirect. Allow them in Android Settings, then try again.” |
| Invalid/missing selected days            | “Choose at least one reminder day.”                                                    |
| Invalid time                             | “Choose a valid reminder time.”                                                        |
| Scheduling or pending verification fails | “We couldn't save your reminder. Please try again.”                                    |
| Cancellation fails                       | “We couldn't turn off the reminder yet. Please try again.”                             |
| Saved successfully                       | “Reading reminder saved.”                                                              |
| Disabled successfully                    | “Reading reminder turned off.”                                                         |
| Unsupported platform                     | Hide entry; direct route safely redirects.                                             |
| Corrupt local value                      | Reset disabled, cancel reserved IDs, and avoid raw-error UI.                           |

Log a sanitized developer error where the current repository permits local
diagnostics, but never render raw Java/Capacitor messages, stack traces, learner
identifiers, or tokens. Do not show success until pending schedules and the
persisted preference agree.

## 29. Proposed Architecture

```text
LearnerDashboardPage (native-only card)
  -> ReadingReminderSettingsPage
       -> ReadingReminderService (validation + transactional orchestration)
            -> ReadingReminderPreferences
            |    -> Capacitor Preferences
            -> LocalNotificationAdapter
                 -> Capacitor Local Notifications
                      -> Android AlarmManager/channel

ReadingReminderCoordinator
  -> current learner-session change event
  -> current native app resume lifecycle
  -> ReadingReminderService.reconcile(owner)
```

Responsibilities:

- `ReadingReminderSettingsPage`: render/edit form state and accessible feedback;
- `ReadingReminderService`: serialize mutations, enforce owner/platform rules,
  compute desired IDs, perform replace/restore/reconcile, and return typed
  outcomes;
- `ReadingReminderPreferences`: versioned validated read/write/remove only;
- `LocalNotificationAdapter`: the only module that imports and calls
  `@capacitor/local-notifications`;
- `ReadingReminderCoordinator`: run post-hydration, session-change, and resume
  reconciliation without blocking startup;
- pure schedule helpers: map repeat selection to weekday IDs and plugin DTOs,
  enabling deterministic unit tests without Android.

No UI component should call Capacitor notification APIs directly. No reminder
module should import lesson, assessment, achievement, game, ASR, TTS, or academic
API services.

## 30. Exact Files Expected to Change

Expected future LUNA implementation files, based on current repository
conventions:

### Add

- `apps/web/src/features/reading-reminder/ReadingReminderSettingsPage.tsx`
- `apps/web/src/features/reading-reminder/ReadingReminderCoordinator.tsx`
- `apps/web/src/features/reading-reminder/readingReminderService.ts`
- `apps/web/src/features/reading-reminder/readingReminderPreferences.ts`
- `apps/web/src/features/reading-reminder/localNotificationAdapter.ts`
- `apps/web/src/features/reading-reminder/readingReminderSchedule.ts`
- `apps/web/src/features/reading-reminder/reading-reminder.css`
- `apps/web/android/app/src/main/res/drawable/ic_stat_readirect.xml`
- `apps/web/tests/ReadingReminderSettingsPage.test.tsx`
- `apps/web/tests/ReadingReminderService.test.ts`
- `apps/web/tests/ReadingReminderPreferences.test.ts`
- `apps/web/tests/ReadingReminderCoordinator.test.tsx`
- `apps/web/tests/end-to-end/reading-reminder-browser-isolation.spec.ts`

### Modify intentionally

- `apps/web/package.json` — pin Local Notifications and Preferences plugins.
- `pnpm-lock.yaml` — dependency lock changes only.
- `apps/web/capacitor.config.ts` — register Local Notifications default
  status-icon configuration if the per-notification adapter does not own it.
- `apps/web/src/App.tsx` — lazy/native-guarded settings route and coordinator.
- `apps/web/src/features/learner-dashboard/LearnerDashboardPage.tsx` — native-only
  utility entry.
- `apps/web/src/features/learner-dashboard/learner-dashboard.css` — reuse the
  utility grid/layout without changing academic actions.
- `apps/web/src/app/nativeLifecycle.ts` — map Android Back from the reminder page
  to `/learner/dashboard`.
- `apps/web/tests/LearnerDashboardPage.test.tsx` — card visible native and absent
  in browser.
- `apps/web/tests/nativeLifecycle.test.ts` — deterministic Back hierarchy.
- `apps/web/tests/OfflinePracticeEntry.test.tsx` — focused regression assertion
  that startup/Tap to Continue remains unchanged if existing coverage needs an
  explicit reminder case.

### Regenerated by a future `cap sync android`

- `apps/web/android/app/capacitor.build.gradle`
- `apps/web/android/capacitor.settings.gradle`
- `apps/web/android/app/src/main/assets/capacitor.plugins.json`

These generated files must not be edited by hand. The implementation should
review their diff and the merged manifest.

### Not expected to change

- `apps/web/android/app/src/main/AndroidManifest.xml` — plugin manifest merging
  should supply required non-exact notification/reboot permissions; verify, do
  not duplicate.
- `apps/web/android/variables.gradle` — current SDK levels are sufficient.
- `apps/web/android/app/src/main/java/com/readirect/app/MainActivity.java` — no
  custom native plugin or tap routing is needed.
- any Laravel route/controller/model/migration, database schema, ASR/TTS code,
  lesson/assessment/achievement/game logic, production hostname, Render, or
  Cloudflare configuration.

The exact set may shrink if tests are sensibly co-located, but expanding into
backend or academic files is not part of this plan and requires separate review.

## 31. Dependency Changes Required

Two small official native dependencies are required:

1. `@capacitor/local-notifications@8.3.1` (or the exact reviewed compatible
   Capacitor 8 release at implementation time).
2. `@capacitor/preferences@8.0.1` (or the exact reviewed compatible Capacitor 8
   release at implementation time).

Version strategy:

- stay on major 8 to match `@capacitor/core@8.5.0` and
  `@capacitor/android@8.5.0`;
- verify peer requirements before installation;
- pin exact versions, matching the current package convention;
- do not upgrade Capacitor Core, Android, CLI, React, or unrelated packages;
- run `corepack pnpm mobile:sync` only during implementation after tests/build
  are ready;
- review generated Gradle/plugin metadata and the merged manifest.

No backend, Firebase, database, queue, service-worker, analytics, scheduling,
date/time, or UI dependency is needed. Zod and the ReaDirect design components
already exist.

## 32. Test Plan

Use Vitest/Testing Library with a fake `LocalNotificationAdapter` and fake
preference repository. Automated tests should never wait for real wall-clock
time.

### Feature availability

1. Native Android detection shows and enables the dashboard utility card.
2. Ordinary browser detection hides the card.
3. Direct browser route safely redirects and calls no native API.

### Permission

4. Opening the page does not call `requestPermissions()`.
5. Saving disabled does not call it.
6. Saving enabled checks permission and requests only when needed.
7. Granted permission schedules expected notifications.
8. Denied permission schedules/persists nothing enabled and shows an accessible
   explanation.
9. Page load/resume after denial does not re-prompt.

### Scheduling

10. Daily computes IDs `48100`–`48106` once each.
11. Weekdays computes Monday–Friday IDs only.
12. Selected Days computes exactly the chosen weekday IDs.
13. Every schedule contains the chosen local hour/minute, channel ID, generic
    content, and `isExactNotification: false`.
14. Changing time cancels/replaces the old set.
15. Changing repeat days removes obsolete IDs and creates the new set.
16. Disabling cancels all seven reserved IDs and verifies none remain.
17. Repeated Save produces the same deterministic IDs without duplicates.
18. A partial schedule failure cancels partial work and restores the previous
    valid schedule where possible.
19. Preference write occurs only after pending verification succeeds.
20. Service never calls `cancelAll()`.

### Local preferences and ownership

21. Valid preferences survive service/component reconstruction (app-restart
    simulation).
22. Missing/corrupt/wrong-schema data falls back disabled and requests cleanup.
23. Logout cancels reserved IDs and clears the owner preference.
24. Guest exit does the same.
25. Learner A to Learner B transition cancels A and starts B disabled.
26. Matching owner plus matching pending IDs is idempotent.
27. Timezone-offset change reschedules without requesting permission.
28. Rapid session events are serialized and cannot restore the wrong owner.

### Tap/startup/navigation/regression

29. Adapter notification payload contains no route/deep-link data.
30. Android Back from reminder settings returns to learner dashboard.
31. Existing Tap to Continue test remains unchanged and passing.
32. Browser root/landing tests remain unchanged and passing.
33. Learner dashboard academic primary action and navigation remain unchanged.
34. No reminder operation imports/calls academic APIs or changes academic local
    state.

### Accessibility and responsive structure

35. Switch, time input, repeat radios, day controls, Save, Back, status, and
    error are discoverable by semantic role/name.
36. Keyboard operation and focus-visible states work in component preview.
37. Selected Days requires at least one day and reports the error accessibly.
38. CSS/DOM contract does not introduce fixed-height or overflow traps.

Run focused tests first, then `typecheck`, the full web test suite, build, lint
as appropriate, and relevant Playwright browser-isolation/startup tests. Native
delivery remains a separate real-Android gate.

## 33. Real Android Verification Plan

Use at least one API 33+ Android device/emulator and, if practical, one API 32
or lower device/emulator. Build through the repository's normal Capacitor sync
and Android debug workflow.

Verification matrix:

1. Fresh install: launch still shows the existing loading screen and Tap to
   Continue; no notification prompt appears.
2. Open Reading Reminder: no prompt appears merely from navigation.
3. Enable and Save on API 33+: Android permission prompt appears from that
   action only.
4. Grant: pending schedule/channel exists and success text is accurate.
5. Deny: nothing schedules, enabled state is not persisted, message is clear,
   and reopening/resuming does not prompt automatically.
6. Set a near-future time on one selected day: close the app normally and verify
   notification delivery without the app process/UI running.
7. Tap the notification from a cold state: ReaDirect follows normal launch and
   Tap to Continue, with no academic deep link.
8. Tap from a warm/background state: ReaDirect foregrounds safely without a
   duplicate page/modal.
9. Save a changed time: only replacement IDs remain and the old time does not
   notify.
10. Change days: obsolete weekday IDs are absent.
11. Save the same setting repeatedly: one notification per selected day only.
12. Disable: no reserved schedule remains and no later notification fires.
13. Restart the app: setting and pending schedules reconcile.
14. Reboot the device, if practical: the recurring notification remains pending
    and later fires; no custom app background loop is running.
15. Change timezone/system time, reopen the app, and verify the preferred local
    time is reconciled.
16. Log out/Exit Guest Mode: pending reminder is canceled and preference cleared.
17. Log in as a second learner: reminders begin disabled and do not inherit the
    first learner's setting.
18. Inspect Android Settings > Apps > ReaDirect > Notifications: dedicated
    `Reading Reminders` channel, Default importance, normal sound, no DND bypass.
19. Test foreground arrival and confirm no extra in-app modal.
20. Inspect 390×844, 430×932, 844×390, large font/text scaling, safe areas,
    keyboard focus, TalkBack labels, and touch targets.
21. Test battery saver/Doze where practical and record expected inexact delay.

Unit tests alone cannot mark V1 complete. At least one actual API 33+ Android
grant, delivery while closed, tap, update, disable, and logout-cleanup run is
mandatory.

## 34. Risks

| Risk                                                    | Impact                                         | Mitigation                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Android permission denied or app notifications disabled | Reminder cannot be delivered                   | Contextual request, no false success, manual Settings guidance, retry only by user action  |
| Exact plugin defaults change                            | Unwanted special alarm access                  | Explicitly set `isExactNotification: false` on every schedule and test payloads            |
| Partial replace failure                                 | Stale/mixed schedule                           | Serialized transaction, reserved-ID cancellation, pending verification, rollback attempt   |
| Shared-device account transition                        | Another learner receives prior reminder        | Owner key, startup/session reconciliation, cancel/reset on logout/account change           |
| WebView local storage eviction                          | Preference and OS schedule disagree            | Use Capacitor Preferences and reconcile against `getPending()`                             |
| OEM battery management/Doze                             | Inexact notification delayed                   | Gentle wording, Default channel importance, device matrix, document limitation             |
| Force-stop                                              | Android suppresses scheduled work until reopen | Document platform behavior; do not request intrusive exemptions                            |
| Reboot restore differs by OEM/version                   | Reminder missing after restart                 | Use official plugin receiver and real reboot verification                                  |
| Channel settings are user controlled/immutable          | App cannot silently restore sound/importance   | Versioned channel and truthful system-settings guidance                                    |
| Notification icon is unsuitable                         | Poor/blank status-bar icon                     | Add and inspect a monochrome drawable on light/dark status bars                            |
| Coordinator races logout/login/save                     | Wrong owner schedule restored                  | Single serialized service queue and owner check immediately before preference write        |
| Startup regression                                      | Notification bypasses Tap to Continue          | No deep link/listener navigation; asynchronous post-mount reconciliation; regression tests |
| Browser bundle imports native plugin                    | Browser errors or visible feature              | Native route/UI guards plus adapter fail-closed tests                                      |

No evidence from the current repository requires server infrastructure. Adding
it would increase privacy, timezone, synchronization, and operational risks
without improving V1's single-device purpose.

## 35. Implementation Milestones

Treat implementation as one LUNA task with three internal milestones:

### R1 — Native adapter and local preferences

- add/pin the two official Capacitor 8 plugins;
- implement schedule mapping, deterministic IDs, preference validation, service
  transaction/rollback, channel creation, and coordinator reconciliation;
- add unit tests for permissions, schedules, persistence, failure, ownership,
  logout, and timezone behavior.

### R2 — Settings UI and integration

- add the native-only dashboard utility card and guarded settings route;
- build the accessible ReaDirect-styled form and truthful status/error states;
- add Android Back mapping and platform/browser isolation;
- complete component, navigation, startup, accessibility, and responsive tests.

### R3 — Android integration and verification

- add the monochrome status icon;
- run Capacitor sync and review generated files/merged manifest;
- run typecheck, tests, build, lint, and browser regression checks;
- install the debug build on Android and execute the Section 33 matrix;
- record any OEM/API limitations before release review.

Do not split this into backend, database, notification-server, or academic work.

## 36. Definition of Done

Future implementation is complete only when all of the following are true:

1. Reading Reminder is available only in a supported Capacitor Android
   environment.
2. It is disabled and unscheduled by default.
3. Opening the app/page/login/dashboard never requests notification permission.
4. Permission is requested only after an explicit enabled Save.
5. Granted permission creates the correct inexact Android schedules.
6. Denied permission creates no enabled preference/schedule and shows clear
   guidance without repeated automatic prompts.
7. One preferred local time and Daily, Weekdays, and Selected Days work.
8. Delivery works after normal app close/process death without a JavaScript
   timer.
9. Updating time/days does not create duplicates or leave obsolete schedules.
10. Disabling cancels every reserved Reading Reminder ID.
11. Preferences persist locally and invalid data fails safely.
12. Logout, Guest exit, expiry, and account switch cancel/reset the reminder so
    another learner cannot inherit it.
13. Notification content is generic and contains no sensitive/academic data.
14. Tapping safely opens/foregrounds ReaDirect without an academic deep link.
15. Existing mobile loading, session validation, and Tap to Continue are
    unchanged.
16. Existing browser startup/landing is unchanged and no browser notification
    implementation exists.
17. No Laravel API, migration, queue, cron, Reverb, WebSocket, Firebase, push
    token, server timezone, analytics, or academic behavior is added.
18. Accessibility and the 390×844, 430×932, and 844×390 responsive checks pass.
19. Automated tests, typecheck, build, lint/relevant browser tests pass.
20. At least one API 33+ real Android run verifies permission, closed-app
    delivery, tap, reschedule, disable, channel, and logout cleanup.

### Primary references consulted

- [Capacitor Local Notifications documentation](https://capacitorjs.com/docs/apis/local-notifications)
- [Capacitor Preferences documentation](https://capacitorjs.com/docs/apis/preferences)
- [Android notification runtime permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission)
- [Android alarm scheduling guidance](https://developer.android.com/develop/background-work/services/alarms)
- [Android 14 exact-alarm changes](https://developer.android.com/about/versions/14/changes/schedule-exact-alarms)
- [Capacitor Local Notifications Android manifest](https://github.com/ionic-team/capacitor-plugins/blob/main/local-notifications/android/src/main/AndroidManifest.xml)
- [Capacitor Local Notifications reboot receiver](https://github.com/ionic-team/capacitor-plugins/blob/main/local-notifications/android/src/main/java/com/capacitorjs/plugins/localnotifications/LocalNotificationRestoreReceiver.java)
