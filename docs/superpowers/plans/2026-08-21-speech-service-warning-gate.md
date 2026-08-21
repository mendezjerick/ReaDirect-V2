# Speech Service Warning Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate learner ASR activities when speech recognition is unavailable and allow a clearly warned, published-voice-only lesson flow when runtime TTS is unavailable.

**Architecture:** A shared Laravel health service will probe ASR and runtime TTS and expose a small throttled public readiness contract usable by authenticated learners, portal learners, and local guests. A React route guard will own the responsive alert dialog and navigation behavior for assessment routes and Lessons 1–5. Existing activity readiness will continue to require the published Clara catalog but will treat runtime TTS failure as degraded rather than blocking, allowing the server's approved published fallback lines to replace dynamic feedback.

**Tech Stack:** Laravel 13/PHPUnit 12, React 19/TypeScript, React Router, Zod, Vitest/Testing Library, existing ReaDirect design components and CSS tokens.

**Spec:** Approved in the 2026-08-21 task conversation.

## Global Constraints

- ASR is the blocking dependency for every guarded page.
- ASR offline or an unreadable readiness response shows one `Try Again Later` action and returns the learner to the journey page; portal launches return to their recorded Page Portals origin.
- ASR online with runtime TTS offline shows one `Proceed with Prepared Voice Lines` action and does not navigate away.
- Published Clara audio remains mandatory; only runtime Vox/TTS generation may degrade.
- The alert dialog is fixed and centered, responsive, keyboard-contained, and cannot be dismissed through the backdrop or Escape.
- Guard diagnostic/final assessment routes and Lessons 1–5; do not guard Lesson 6, games, or Learn with Clara.
- Preserve unrelated workspace changes.

---

### Task 1: Speech readiness backend contract

**Files:**
- Create: `apps/api/app/Services/SpeechServiceHealthService.php`
- Create: `apps/api/app/Http/Controllers/SpeechServiceReadinessController.php`
- Modify: `apps/api/routes/api.php`
- Test: `apps/api/tests/Feature/SpeechServiceReadinessTest.php`

**Interfaces:**
- Produces: `SpeechServiceHealthService::readiness(): array{asr: 'online'|'offline', tts: 'online'|'offline'}`.
- Produces: `GET /api/speech/readiness` with the same JSON fields and no infrastructure details.

- [ ] Write feature tests for all four service combinations and failed probes.
- [ ] Run the focused PHPUnit test and verify it fails because the endpoint does not exist.
- [ ] Implement the shared probes, controller, and throttled route.
- [ ] Run the focused PHPUnit test and verify it passes.

### Task 2: Published-voice degraded readiness

**Files:**
- Modify: `apps/api/app/Services/ActivitySpeechPreparationService.php`
- Modify: `apps/api/tests/Feature/LearnerActivitySpeechReadinessTest.php`

**Interfaces:**
- Consumes: existing activity readiness response.
- Produces: `ready: true`, `published_ready: true`, `runtime_ready: false` when Vox warmup fails but approved voice lines are intact.

- [ ] Change the Vox-failure expectation to the approved degraded contract and add a response-message assertion.
- [ ] Run the focused test and verify the old blocking behavior fails it.
- [ ] Make activity readiness depend on the published catalog while preserving runtime status separately.
- [ ] Run the focused readiness suite and verify it passes.

### Task 3: Learner route warning gate

**Files:**
- Create: `apps/web/src/features/speech-readiness/speechServiceReadiness.ts`
- Create: `apps/web/src/features/speech-readiness/SpeechServiceGate.tsx`
- Create: `apps/web/src/features/speech-readiness/speech-service-gate.css`
- Modify: `apps/web/src/App.tsx`
- Test: `apps/web/tests/SpeechServiceGate.test.tsx`

**Interfaces:**
- Produces: a parser/fetcher for `{asr, tts}` readiness.
- Produces: `<SpeechServiceGate>{page}</SpeechServiceGate>` with blocking redirect and degraded continuation behavior.

- [ ] Write component tests for online entry, ASR-only blocking, both-offline blocking, TTS-only continuation, failed readiness, and portal return navigation.
- [ ] Run the focused Vitest file and verify it fails because the guard does not exist.
- [ ] Implement the fetcher, accessible modal, focus containment, copy, and route wrapping.
- [ ] Add responsive token-based styling and reduced-motion behavior.
- [ ] Run the focused Vitest file and verify it passes.

### Task 4: Integration and visual verification

**Files:**
- Verify all modified files from Tasks 1–3.

**Interfaces:**
- Consumes: backend readiness endpoint and guarded learner routes.
- Produces: verified desktop/mobile learner behavior.

- [ ] Run focused backend and frontend suites.
- [ ] Run web typecheck, lint for changed frontend files, and production build.
- [ ] Use the in-app browser to check the centered desktop dialog, a narrow responsive viewport, ASR-blocked redirect, both-offline redirect, and TTS-degraded continuation.
- [ ] Inspect the final diff and confirm unrelated background assets remain untouched.
