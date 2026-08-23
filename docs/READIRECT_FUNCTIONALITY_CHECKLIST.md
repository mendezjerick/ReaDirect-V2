# ReaDirect Functionality Checklist

Use this document as a manual QA checklist for the current ReaDirect system. Run the checks in both the browser and the Android APK where the capability is supported.

## How to use this checklist

- Mark an item `[x]` only after it passes in the target environment.
- Record the device, browser, Android version, build/version, account, date, and defect details for every failed item.
- A passing automated test does not replace a real-device check for microphone, notifications, Android navigation, downloads, or responsive layout.
- Do not treat a hidden or disabled UI control as proof that the underlying authorization rule is working; verify the API response and the visible result.

### Test environments

- Browser: desktop Chromium-based browser at a normal desktop viewport.
- Browser: narrow portrait viewport and narrow landscape viewport.
- Android: current debug APK installed with `adb install -r`.
- Android: one physical device with microphone permission, notification permission, network access, and network disabled during offline checks.
- Backend: API, ASR, and TTS services available for online speech and lesson checks.

### Test accounts and data

- Learner with no diagnostic completion.
- Learner with diagnostic completed and lessons available.
- Learner with partial lesson progress.
- Learner with completed lessons and final assessment available.
- Guest learner.
- Teacher account with assigned learners.
- School administrator account.
- System administrator account.
- At least one learner with recordings, scores, progress, and game activity.

## 1. Public pages and entry points

- [ ] `/` opens the correct role/entry page without a console error.
- [ ] `/landing` renders the landing page, navigation, background image, responsive layout, and calls to action.
- [ ] Landing page desktop and portrait layouts use the intended desktop/mobile visual treatment.
- [ ] `/docs` and `/docs/:docSlug` open public documentation pages and handle an unknown document slug safely.
- [ ] `/credits-licenses` opens the credits and licenses page.
- [ ] Returning from credits/licenses returns to the page that opened it rather than an unexpected loading screen or unrelated landing page.
- [ ] `/home` shows the correct role-aware entry state.
- [ ] `/learner/modes` shows the native learner mode selection on Android and does not expose Android-only offline behavior as a browser feature.
- [ ] Browser and Android links do not unexpectedly open the wrong platform flow.
- [ ] Unknown routes redirect safely to the public entry page.

## 2. Learner entry, authentication, and account state

- [ ] Learner login accepts valid credentials and opens the learner dashboard.
- [ ] Invalid credentials show a clear error without exposing sensitive details.
- [ ] Login failure caused by an unavailable API is distinguished from invalid credentials.
- [ ] Learner logout clears the current session and returns to the correct entry page.
- [ ] Browser refresh restores a valid learner session without exposing the credential to page scripts.
- [ ] Android relaunch restores a valid native learner session when the session is still valid.
- [ ] Expired or revoked sessions return to learner login and do not leave protected data visible.
- [ ] Multiple-device/session limits and revocation behavior match the account policy.
- [ ] Guest mode opens the guest dashboard and clearly distinguishes guest limitations from authenticated learner features.
- [ ] “Switch account” from Android stays inside the Android learner flow and does not unexpectedly open the browser version.
- [ ] Learner navigation icons, home buttons, and system Back return to the expected parent page.

## 3. Learner dashboard and progress

- [ ] Dashboard displays the correct learner/guest identity and current progress.
- [ ] Diagnostic, lesson, final assessment, Learn with Clara, games, settings, and available practice actions are visible according to progress and role.
- [ ] Locked actions explain the prerequisite instead of failing silently.
- [ ] Progress remains correct after refresh, logout/login, and Android relaunch.
- [ ] Progress is not unlocked by editing browser storage or local files.
- [ ] Dashboard loading, empty, unauthorized, and API-error states are readable and actionable.
- [ ] Dashboard layout remains usable at small portrait, small landscape, tablet, desktop, and zoomed/text-scaled viewports.

## 4. Diagnostic and final assessments

- [ ] Diagnostic assessment opens only when the learner is eligible.
- [ ] Final assessment opens only after its prerequisites are complete.
- [ ] Part One orientation and instructions render correctly.
- [ ] Letter activity records the response and displays the correct feedback.
- [ ] Rhyme selection records the selected answer and feedback.
- [ ] Word activity records the response and feedback.
- [ ] Part One branch behavior follows the configured score threshold.
- [ ] Part Two loads the expected passages/tasks and preserves the assessment type.
- [ ] Back, Home, Exit, Retry, Continue, and Submit controls have the expected behavior at every assessment step.
- [ ] Refresh/relaunch does not duplicate or corrupt an in-progress run.
- [ ] Completion persists the score, profile, responses, and completion state exactly once.
- [ ] Assessment completion routes to the correct result/next-step page.
- [ ] Network failure during recording or submission gives a recoverable message and does not falsely mark the task complete.
- [ ] Microphone denial provides a useful recovery path to Android/browser permission settings.

## 5. Lessons 1–6

- [ ] Lesson 1 opens with the correct content and prerequisites.
- [ ] Lesson 2 opens with the correct content and teaching state.
- [ ] Lesson 3 opens with the correct content and teaching state.
- [ ] Lesson 4 opens with the correct content and teaching state.
- [ ] Lesson 5 opens with the correct content and teaching state.
- [ ] Lesson 6 opens with the correct content and completion state.
- [ ] Lesson order/access rules match the current product policy; no client-only unlock is trusted.
- [ ] Lesson intro, practice, retry, skip/continue, and completion controls work at each stage.
- [ ] Clara instructions, animation, audio, and text remain synchronized enough to follow the task.
- [ ] Lesson responses and progress survive refresh, navigation, logout/login, and Android relaunch.
- [ ] A failed speech request can be retried without duplicating the lesson response.
- [ ] Completed lessons are reflected on the dashboard and in staff reports.

## 6. Learn with Clara

- [ ] `/learner/learn-with-clara` opens the Learn with Clara dashboard.
- [ ] Letters module opens and can complete its practice flow.
- [ ] Words module opens and can complete its practice flow.
- [ ] Phrases module opens and can complete its practice flow.
- [ ] Sentences module opens and can complete its practice flow.
- [ ] Comprehension module opens and can complete its practice flow.
- [ ] Clara practice feedback, scoring/progress display, audio, and retry controls work.
- [ ] From any Clara practice module, Back returns directly to the Learn with Clara dashboard.
- [ ] From the Learn with Clara dashboard, Back returns to the main learner dashboard.
- [ ] Back does not walk through previously visited Clara practice modules.
- [ ] Refreshing a Clara practice page does not lose the intended module state or create a broken route.
- [ ] Clara pages remain readable and usable in portrait and landscape mobile layouts.

## 7. Speech, microphone, ASR, equivalence, and TTS

- [ ] Browser microphone permission prompt appears only when recording is requested.
- [ ] Android microphone permission prompt appears and the app recovers after permission is granted.
- [ ] Recording starts, shows an active state, stops, and releases the microphone.
- [ ] Empty, too-short, unsupported, or poor-quality recordings produce a clear validation message.
- [ ] ASR readiness/loading state is shown while the speech service is waking up.
- [ ] ASR failure does not display a misleading “no internet” message when the device is online but the service is unavailable.
- [ ] Transcription result is displayed with the expected language/normalization behavior.
- [ ] Expected-aware letter/word equivalence decisions produce the correct instructional feedback.
- [ ] TTS playback starts, stops, and handles unavailable audio gracefully.
- [ ] Audio controls do not overlap text or become unreachable on small screens.
- [ ] Private audio cannot be downloaded or opened without the required authorization.
- [ ] Repeated retry attempts do not create duplicate scores, responses, or audio records.

## 8. Games

- [ ] Game lobby opens and displays only the games available to the current learner/profile.
- [ ] Game Alpha opens and renders correctly.
- [ ] Game One opens and renders correctly.
- [ ] Game Two opens and renders correctly.
- [ ] Legacy/inactive Game Zero is either intentionally unavailable or clearly identified as non-production.
- [ ] Game controls are usable in portrait and landscape layouts.
- [ ] Pause, resume, exit, and return-to-lobby controls work.
- [ ] Game progress/profile saves only for an authenticated learner and handles API failure gracefully.
- [ ] Returning from a game restores the correct learner page without a stale loading screen.
- [ ] Game audio and browser/Android viewport scaling do not prevent gameplay.

## 9. Offline Practice (Android-first)

- [ ] Offline Practice is visible in the Android learner flow and is not presented as a canonical browser feature.
- [ ] Online module catalog loads when authenticated and online.
- [ ] A practice pack can be downloaded with visible progress and completion feedback.
- [ ] Duplicate downloads are handled without corrupting the local pack.
- [ ] Downloaded packs open with the expected content while the device is offline.
- [ ] Offline practice can be resumed after app close/relaunch.
- [ ] Missing, invalid, expired, or partially downloaded packs show a recoverable error.
- [ ] Offline actions do not falsely write official lesson, assessment, score, or completion records.
- [ ] Removing local practice data removes only the intended pack/files.
- [ ] Reconnecting online restores catalog/status without losing valid local packs.
- [ ] Storage-full and file-permission failures are handled clearly.

## 10. Reading reminders and notifications (Android)

- [ ] Reading Reminder settings are reachable from the learner dashboard.
- [ ] Permission request explains why notifications are needed.
- [ ] Permission denied state explains how to enable notifications later.
- [ ] Disabled reminders remove/cancel previously scheduled reminder notifications.
- [ ] Daily schedule creates the expected number of weekday notifications.
- [ ] Specific-day schedule creates only the selected weekday notifications.
- [ ] Saved time is displayed correctly after refresh and Android relaunch.
- [ ] Each weekday notification uses its intended distinct title/body.
- [ ] Notifications remain local/native and do not require the API to be online at delivery time.
- [ ] Notifications use the reading-reminders channel and the expected app icon.
- [ ] Android idle/battery-saving behavior is tested on the target device; inexact delivery may still vary from the selected minute.
- [ ] Tapping a notification opens the correct learner reading destination.

## 11. Staff authentication and shared security

- [ ] `/staff/login` opens the intended staff authentication flow in the target environment.
- [ ] Teacher, school administrator, and system administrator credentials route to the correct portal.
- [ ] Invalid staff credentials show a safe error.
- [ ] Staff email verification/recovery flow works with the configured mail service.
- [ ] Remembered session behavior matches the configured lifetime.
- [ ] Staff logout, session expiry, revocation, and device verification work.
- [ ] A staff role cannot open another role’s protected routes.
- [ ] Direct URL access to unauthorized pages is denied or redirected.
- [ ] Staff security page is available to permitted staff roles only.
- [ ] Staff activity heartbeat/realtime status does not block normal navigation when realtime is unavailable.

## 12. Teacher portal

- [ ] Teacher dashboard loads assigned learners and summary metrics.
- [ ] Learner directory supports search/filter/open-detail behavior.
- [ ] Learner import validates input and reports row-level failures clearly.
- [ ] Credential sheets display/export only authorized learner credentials.
- [ ] Learner detail shows permitted progress, assessment, lesson, and evidence data.
- [ ] Teacher diagnostic and final assessment views load the correct learner/run.
- [ ] Teacher reports and analytics match the selected scope and filters.
- [ ] Empty classes, no learners, missing progress, and API failures are readable.
- [ ] Teacher cannot read or mutate data outside the teacher’s authorized scope.

## 13. School administrator portal

- [ ] School administrator dashboard loads school-level metrics.
- [ ] Initial school setup validates required fields and handles incomplete setup.
- [ ] School profile can be viewed/updated as permitted.
- [ ] Teacher accounts can be listed and managed within the school scope.
- [ ] Classes can be created, edited, listed, and assigned as permitted.
- [ ] Learners can be listed and opened in detail.
- [ ] Instructional insights and reports use the correct school scope.
- [ ] Teacher dashboards can be viewed only for the administrator’s school.
- [ ] Unauthorized cross-school access is rejected.

## 14. System administrator portal

- [ ] System administrator dashboard and overview metrics load.
- [ ] Demo center and page portals open safely.
- [ ] Schools, teachers, learners, and school administrators directories load and enforce filters.
- [ ] Learning content, assessments, lessons, rules, and thresholds can be viewed/managed as permitted.
- [ ] AI services, agent settings, and prompt templates show the intended configuration controls.
- [ ] Audit logs load and preserve actor/action/timestamp context.
- [ ] System monitoring shows service/readiness state and handles unavailable services.
- [ ] Speech tools, isolated-letter sandbox, true sandbox, equivalence book, and confusion matrix are restricted to the intended role.
- [ ] Games and players administration loads the expected data.
- [ ] Destructive or high-impact actions require confirmation and report success/failure.
- [ ] System administrator actions create the expected audit records.

## 15. Connectivity, loading, and error recovery

- [ ] Cold-start API wake-up state is understandable and does not claim the device has no internet when the API is merely starting.
- [ ] Online Learning unavailable/offline-mode messaging appears only in the relevant entry/mode context.
- [ ] API timeout, 401, 403, 404, 409, 422, and 5xx responses produce appropriate user-facing states.
- [ ] Retry controls retry the intended operation without duplicating mutations.
- [ ] Loading screens do not remain visible after returning from credits, licenses, games, or staff pages.
- [ ] Refresh during a request does not leave stale or contradictory UI state.
- [ ] Browser reconnect and Android reconnect restore the expected online state.
- [ ] Offline state does not erase authenticated session presentation until server/session rules require it.
- [ ] Console errors, unhandled promise rejections, and failed network requests are reviewed during the core flows.

## 16. Browser and Android compatibility matrix

| Capability | Browser | Android APK | Result/notes |
| --- | --- | --- | --- |
| Public landing and docs | [ ] | [ ] |  |
| Learner login/session | [ ] | [ ] | Different transport is expected. |
| Guest learner flow | [ ] | [ ] |  |
| Diagnostic/final assessments | [ ] | [ ] |  |
| Lessons 1–6 | [ ] | [ ] |  |
| Learn with Clara | [ ] | [ ] |  |
| Microphone recording | [ ] | [ ] | Verify browser and device permissions separately. |
| ASR/TTS | [ ] | [ ] | Requires speech services online. |
| Games | [ ] | [ ] |  |
| Offline Practice | N/A/limited | [ ] | Android-first feature. |
| Reading reminders | N/A | [ ] | Native local notifications. |
| Staff login and portals | [ ] | [ ] | Confirm intended platform support. |
| Credits/licenses return navigation | [ ] | [ ] | Verify opener-page return behavior. |

## 17. Responsive layout and accessibility

- [ ] Test 320–375 px portrait widths without horizontal scrolling.
- [ ] Test 360–430 px portrait widths with Android system bars visible.
- [ ] Test 640–915 px landscape/mobile widths.
- [ ] Test tablet and desktop widths, including ultrawide screens.
- [ ] Test browser zoom at 125%, 150%, and 200%.
- [ ] Test Android display/text scaling where available.
- [ ] Check that buttons, recording controls, Submit, Retry Recording, Skip, Back, and navigation controls remain inside their containers.
- [ ] Check that text remains readable over background images and has sufficient contrast.
- [ ] Check keyboard Tab order and visible focus in browser.
- [ ] Check screen-reader names for icon-only buttons and status messages.
- [ ] Check that dialogs and permission/error messages can be dismissed or recovered without a mouse.
- [ ] Check reduced-motion behavior where animation is used.

## 18. Data, authorization, and privacy checks

- [ ] Learner can read only their own protected learner data.
- [ ] Staff can read only data within their role and school/teacher scope.
- [ ] API rejects forged IDs, modified local state, and unauthorized direct requests.
- [ ] Assessment/lesson snapshots remain stable after source content changes.
- [ ] Scores and completion records are not duplicated by retries or refreshes.
- [ ] Private recordings/audio require authorization and are not exposed through public URLs.
- [ ] Logout clears browser/native session state and cached protected presentation data.
- [ ] Error messages do not expose tokens, passwords, private audio paths, or stack traces.
- [ ] Exports/reports contain only the requested scope and fields.
- [ ] Audit records identify the actor and action for staff changes.

## 19. Automated regression commands

Run these from the repository root or use the equivalent project script:

```powershell
# Web unit/component tests
corepack pnpm --filter @readirect/web test

# Web typecheck and lint
corepack pnpm --filter @readirect/web typecheck
corepack pnpm --filter @readirect/web lint

# Browser end-to-end tests
corepack pnpm --filter @readirect/web test:e2e

# Android sync/build
corepack pnpm --filter @readirect/web mobile:sync
cd apps/web/android
.\gradlew.bat assembleDebug
```

For a focused reminder regression run:

```powershell
corepack pnpm --filter @readirect/web exec vitest run tests/ReadingReminderSchedule.test.ts tests/ReadingReminderService.test.ts --pool=forks --maxWorkers=1 --no-file-parallelism
```

## 20. Defect record template

Copy this template for each failed check:

```text
ID:
Date/time:
Build/commit:
Environment/device:
Account/role:
Route/feature:
Steps to reproduce:
Expected result:
Actual result:
Screenshot/video/log:
Network/API response:
Severity:
Reproducible (yes/no):
Owner/status:
```

## Source map

This checklist was derived from the current implementation and tests, especially:

- `apps/web/src/App.tsx` — client route graph and role boundaries.
- `apps/web/src/features/` — learner, staff, speech, games, offline, and reminder features.
- `apps/web/tests/` — web unit/component and end-to-end coverage.
- `apps/api/routes/api.php` and `apps/api/tests/` — API contracts, authorization, persistence, and service behavior.
- `services/asr/`, `services/tts/`, and `services/gpu-runtime/` — speech-service behavior.
- `docs/READIRECT_COMPLETE_SYSTEM_ANALYSIS.md` — repository-wide architecture and known limitations.

Observed implementation does not automatically prove production readiness. Mark a check only after executing it in the target browser/device/deployment environment.
