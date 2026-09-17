# School-year selection design

## Goal

Give every authenticated staff workspace a visible school-year designator and make the selected year the server-enforced scope for standard learner data. A 2025-2026 learner and all of that learner's existing activity remain visible in 2025-2026; a new 2026-2027 year starts with an empty standard learner roster until staff create/import accounts for it.

## Data boundary

- `school_years` is school-owned. Each row has a validated adjacent-year label such as `2025-2026`, start/end years, current status, and audit timestamps.
- `learners.school_year_id` is the immutable year ownership of a standard learner account. This keeps its assessment, lesson, progress, game, and review rows together without rewriting those established runtime tables.
- Portal/system learners remain year-neutral and are not hidden by staff year filtering.
- Existing schools and standard learners are backfilled to `2025-2026`, which is the compatibility baseline requested for the current deployment.
- Creating the first school transactionally creates its first current year. Completing first-time school setup may provide the initial label, defaulting to `2025-2026`.
- Subsequent year creation is school-admin-only, validated, audited, and makes the new year current while retaining historical years as read-only selectable data. There is no destructive year deletion.

## Request and authorization boundary

- Staff requests accept a `school_year` label. Middleware resolves it to the authenticated school for school administrators/teachers, or to a matching global label for system administrators.
- An absent label resolves to the school's current year or the current global label. Invalid or cross-school labels return a validation error.
- A request-scoped learner global scope filters standard learners by the resolved year. This also scopes learner relationships and `withCount` queries used by dashboards, reports, analytics, directories, classes, details, and operations. Portal-system rows are explicitly exempt.
- Learner creation in a staff request is assigned to the resolved year; direct model-created standard learners fall back to their school's current year for compatibility.
- Year changes and creation publish existing staff realtime topics so other open staff views refresh safely.

## Staff experience

- A reusable `StaffSchoolYearProvider` loads available years, keeps the active selection in memory/session storage, appends it to staff API requests, and invalidates active staff queries when it changes.
- `StaffShell` renders a compact calendar-icon year selector in the upper-right toolbar on desktop and mobile. It has explicit loading, disabled, error, empty, focus, and mutation states.
- School administrators can add the next year from the selector and are switched into it immediately. System administrators can select any year label represented by the schools but cannot create one from the global view.
- The selected year is cleared with the staff session and is never persisted as part of the bearer/session credential.

## Verification and rollout

- Add API tests for initial setup, authorization, current/default resolution, historical selection, invalid/cross-school selection, and learner roster isolation.
- Add web tests for request propagation, selector rendering, changing years, and school-admin year creation.
- Preserve all unrelated dirty files. Run focused red/green tests, then the full API and web suites, typecheck/build/lint/format checks, and the UI detector/browser verification.
- Push only the feature files and documentation, monitor Render migration/deploy health, then update the Cloudflare static distribution with the repository's Wrangler flow and visually verify the deployed staff workspace.
