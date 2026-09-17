# Implement staff school-year selection

> **For the next agent:** Required sub-skill: use `superpowers:executing-plans` to implement this plan task by task.

**Spec:** [2026-09-17-school-year-selection-design.md](../specs/2026-09-17-school-year-selection-design.md)

**Goal:** Add a server-enforced, staff-visible school-year boundary with a current 2025-2026 compatibility backfill and a clean 2026-2027 rollover path.

## Task 1: Establish red tests and test schema support

**Files:** `apps/api/tests/Feature/SchoolYearTest.php`, `apps/api/tests/TestCase.php`, `apps/web/tests/StaffShell.test.tsx`, `apps/web/tests/staffSchoolYearApi.test.ts`

- Add API tests first for setup creating the initial year, listing/creating/selecting years, role and school isolation, and school-admin learner list returning only the selected year's learners.
- Add a web test for the staff shell selector and a request helper test proving the selected label is appended to staff requests.
- Run the focused tests and record the expected failures before implementing production behavior.
- Extend only the in-memory test schema enough for the feature's tables/column so existing tests can continue to run.

## Task 2: Add the school-year data model and compatibility backfill

**Files:** `apps/api/database/migrations/2026_09_17_000001_create_school_years_and_assign_learners.php`, `apps/api/app/Models/SchoolYear.php`, `apps/api/app/Models/School.php`, `apps/api/app/Models/Learner.php`

- Create school-owned years with adjacent-year validation support, current-state indexing, and foreign keys.
- Add nullable `learners.school_year_id` with an index/foreign key; backfill every existing school and standard learner to `2025-2026` while leaving portal-system learners neutral.
- Add model relationships, casts, and guarded creation hooks that assign a standard learner to the selected/current school year without changing portal behavior.
- Keep the migration reversible and safe for the repository's SQLite test database and deployed PostgreSQL database.

## Task 3: Resolve and enforce staff year scope

**Files:** `apps/api/app/Http/Middleware/ResolveStaffSchoolYear.php`, `apps/api/app/Services/StaffSchoolYearService.php`, `apps/api/app/Models/Learner.php`, `apps/api/bootstrap/app.php`, `apps/api/routes/api.php`

- Add request-scoped resolution after staff authentication. Validate requested labels against the authenticated school; resolve a global label for system administrators; default to current year.
- Add the staff year middleware to the authenticated staff route group and register it safely.
- Add a Learner global scope that filters only standard learners by the request context and deliberately exempts portal-system learners.
- Ensure creating learners through existing teacher/import flows uses the resolved year and that cross-school/cross-role requests cannot select another school's private year.

## Task 4: Add year management endpoints and audit/realtime behavior

**Files:** `apps/api/app/Http/Controllers/StaffSchoolYearController.php`, `apps/api/app/Services/StaffSchoolYearService.php`, `apps/api/app/Enums/StaffRealtimeTopic.php`, `apps/api/app/Services/StaffRealtimePublisher.php`, `apps/api/routes/api.php`, `apps/api/app/Http/Controllers/SchoolAdminWorkspaceController.php`

- Add authenticated `GET /api/staff/school-years` for school-scoped years or system-admin global labels.
- Add school-admin-only `POST /api/staff/school-years` with strict `YYYY-YYYY` validation, duplicate protection, transaction locking, audit logging, and immediate current-year selection.
- Make first-time school setup create/configure its initial year in the same transaction and return the existing staff response shape.
- Publish staff invalidation topics after year creation/current changes and include useful year metadata in API responses.

## Task 5: Make the staff UI year-aware

**Files:** `apps/web/src/features/staff-auth/StaffSchoolYearProvider.tsx`, `apps/web/src/app/AppProviders.tsx`, `apps/web/src/features/staff-auth/staffApi.ts`, `apps/web/src/components/staff/StaffShell.tsx`, `apps/web/src/components/staff/StaffSchoolYearSwitcher.tsx`, `apps/web/src/components/ui/PixelIcon.tsx`, `apps/web/src/styles/index.css`, `apps/web/src/features/staff-dashboard/SchoolAdminSetupPage.tsx`

- Add strict Zod schemas and API functions for available years and school-admin creation.
- Add an in-memory/session-scoped provider that tracks the active label, appends it to staff requests, clears it on logout, and refreshes active queries without changing every page's existing query key.
- Render the reusable calendar year selector in the staff shell's upper-right toolbar with accessible states and a compact create-year flow for school administrators.
- Add the initial-year field to first-time school setup with a `2025-2026` default, clear copy, and validation feedback.
- Read the craft-floor immediately before editing the UI and preserve existing staff tokens/layout language.

## Task 6: Complete verification and delivery

**Files:** feature files only; no unrelated dirty files

- Run focused API/web tests, then full `composer test` and `pnpm test`.
- Run API formatting/static checks and web typecheck/build/lint/format; run the Impeccable detector on changed UI targets and fix actionable findings in one bounded pass.
- Inspect staged diff/status, stage only school-year feature files, commit, and push the requested branch.
- Use the Render deployment/monitoring workflow to confirm migration and service health, then use the repository's Wrangler/Cloudflare flow to publish the built distribution.
- Use the visual browser to sign in with the user-provided staff account, confirm the upper-right selector, create/select a next year if safe, and verify the roster changes to the selected year without old-year leakage.
