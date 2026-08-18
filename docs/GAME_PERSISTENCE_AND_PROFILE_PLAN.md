# 1. Executive Summary

This document is an implementation plan only. It does not authorize or perform application, migration, or database changes.

Repository snapshot inspected: branch `development/post-pilot-updates-v2`, commit `81404fc00a1971e7d6fd8d1d51eb7a4aa600c6a7` on 2026-08-18. `docs/READIRECT_COMPLETE_SYSTEM_ANALYSIS.md` was inspected. `ReaDirect-SOL-Analysis.txt` is not present in the current repository.

The safest implementation is to reuse the existing core Laravel architecture:

```text
authenticated standard Learner
  -> one game_profiles row
       -> one server-issued public handle
       -> one game_saves row per active catalog game
```

The database schema already enforces this ownership model. No new profile table, username column, save table, or per-game table is needed. Game Alpha and Game Two need catalog rows; all three games need a working frontend host boundary. Game Zero must remain excluded because it is still an explicit placeholder.

The most important current findings are:

- The Games Lobby creates a random profile only in React memory. It does not call Laravel, disappears on refresh, and can display a handle that differs from the learner's database profile.
- Laravel already provides authenticated profile, load/save, and per-game reset endpoints with ownership inferred from the learner session, a 256 KiB save limit, active-catalog enforcement, and optimistic revision control.
- Only Game One is present in `game_catalog` today.
- Game One has a server adapter, save contract, and save coordinator, but the active `GameOneRoutePage` does not consume them. It still initializes and writes durable gameplay state through anonymous, browser-wide `localStorage` keys. The web host passes a `host` prop that the current exported route component does not accept. Therefore server persistence is reusable scaffolding, not a currently complete live integration.
- Game Alpha and Game Two are playable, but neither has a core catalog row or live host/save integration.
- The existing System Admin Games/Players endpoint will consume new catalog and save rows without a redesign.

The recommended implementation order is backend contract hardening, authoritative lobby profile loading, Game One normalization as the reference host integration, then Game Alpha and Game Two, followed by browser/security verification. Catalog activation must occur only when the corresponding frontend integration is ready.

# 2. Confirmed Three Playable Games

| Persistent game key | Current title | Route | Package/folder | Current status |
| --- | --- | --- | --- | --- |
| `game-alpha` | Runtime/design: **Alphabet Defender**; lobby card: **Space Letter** | `/learner/games/game-alpha` | `@readirect/game-alpha`; `apps/games/game-alpha` | Playable PixiJS game. Its design declares `game-alpha` as the permanent key. It has score, stage, and high-score state, but no live core host/save integration and no catalog row. |
| `chronicles-of-the-lost-kingdom` | Backend/runtime: **Chronicles of the Lost Kingdom**; lobby/welcome alias: **Readscape** | `/learner/games/game-one` | `@readirect/game-one`; `apps/games/game-one` plus `apps/web/src/features/game-one` | Playable KAPLAY game. It is the only cataloged/active game. Backend and adapter persistence scaffolding exists, but the current route still uses local storage and is not wired to that adapter. |
| `ottertale` | **OtterTale** (lobby spelling: **Ottertale**) | `/learner/games/game-two` | `@readirect/game-two`; `apps/games/game-two` | Playable PixiJS/@pixi-react game with tutorial and three stages. Current state is React memory only; no core catalog row, host adapter, or durable save exists. |

Title aliases are a current repository inconsistency, not a persistence requirement. Before implementation, product owners should choose one displayed title per game. Persistence should continue to use the stable keys above regardless of display-title changes. This plan preserves the current backend title for Game One, the approved runtime title for Game Alpha, and the design/runtime title for Game Two.

`game-zero` is excluded. `/learner/games/game-zero` still renders text saying that it is a placeholder, a demo mount area, and a reserved integration boundary. It is not listed by the actual lobby cards and has no implemented game or persistence contract. Its protected route should be removed separately under the already documented Game Zero cleanup, not activated by this work.

# 3. Current Game Lobby State

Confirmed current behavior:

- `GameLobbyPage.tsx` hard-codes three cards: `game-alpha`, `game-one`, and `game-two`. The owner-controlled `registeredGames` export is empty and is not the source of those cards.
- `GameLobbySkeletonProvider` owns `profile` in `useState` only.
- `createProfile()` generates a random four-digit discriminator in the browser. No API request is made.
- `RequireSkeletonGameProfile` redirects a direct game route to `/learner/games` when that in-memory value is absent.
- Refreshing or remounting the app loses the profile, even if Laravel already has one.
- Guest mode displays the supported unavailable state and should continue to make no profile/save requests.
- Game One later calls `GET /games/profile` only after a save load returns 409. If a profile is absent, it posts the lobby's requested username. Alpha and Two never do this.

This creates two correctness failures. First, a lobby handle can be presented as persistent when it is not. Second, when a database profile already exists, a newly generated lobby name can disagree with the server identity because Game One accepts the existing profile but the lobby never replaces its fake state with the server response.

Target behavior:

1. When an authenticated standard learner enters Games, the profile provider performs one bounded `GET /api/learners/games/profile`.
2. While pending, the lobby and direct-game guards show an explicit loading state, not the username form and not a redirect loop.
3. A returned profile is stored in React query/context state and displayed exactly as returned by Laravel.
4. A `null` profile shows the create form.
5. Submit posts only `{ username }`; the lobby updates from the returned authoritative profile, including the server discriminator.
6. Direct game routes wait for profile resolution. If the profile is absent, they return to the lobby with `requestedGame`; after successful creation, the requested route is resumed.
7. A retryable profile-load failure displays a recoverable error and Retry. It must not fall back to a random profile.
8. Logout clears only the browser cache/context. The database profile remains. A later login or another device refetches it.

# 4. Current Game Profile Architecture

The authoritative backend architecture is already appropriate:

- `Learner::gameProfile()` is a `HasOne` relationship.
- `LearnerGameProfileService::current()` resolves the learner from `LearnerSession`; it never accepts `learner_id` from the browser.
- Persistent profiles are allowed only for standard sessions whose learner has `account_purpose=standard`.
- `POST /games/profile` is create-once and idempotent for the same case-insensitive username. A different username returns 409.
- The service allocates an available four-digit discriminator transactionally and retries unique-constraint races.
- The API serializes only `audience`, `username`, `discriminator`, `public_handle`, and `is_active`; it does not expose profile or learner database IDs.

The browser architecture is not yet appropriate. The lobby context is parallel fake identity state, and Game One's host performs profile creation as a side effect of loading a save. The lobby should become the only create/present owner. Game hosts should require an already resolved server profile and should never create or replace it.

# 5. Current game_profiles Schema

Migration `2026_07_26_000021_create_game_persistence_foundation.php` defines:

| Column | Current definition/meaning |
| --- | --- |
| `id` | Primary key. Internal only. |
| `learner_id` | Foreign key to `learners`, unique, cascade on learner delete. Enforces one profile per learner. |
| `audience` | String length 16, default `learner`. |
| `username` | String length 10, display casing retained. |
| `username_normalized` | String length 10, currently lowercase. |
| `discriminator` | Fixed four-character string. |
| `username_changed_at` | Nullable timestamp; currently unused because rename is disabled. |
| `is_active` | Boolean, default true. |
| timestamps | `created_at`, `updated_at`. |

Constraints and indexes:

- Unique `learner_id`.
- Unique (`username_normalized`, `discriminator`), which makes the complete public handle unique without requiring username text itself to be globally unique.
- Index (`audience`, `is_active`).
- Deleting a learner cascades to the profile and then its saves.

`GameProfile` exposes matching fillable fields, casts `username_changed_at` to datetime and `is_active` to boolean, belongs to `Learner`, and has many `GameSave` records.

No duplicate `display_name`, `handle`, `nickname`, or `player_name` field is needed. `username` plus the server discriminator is the existing product identity.

# 6. Current game_saves Schema

The same migration defines one current save per profile/game:

| Column | Current definition/meaning |
| --- | --- |
| `id` | Primary key. Internal only. |
| `game_profile_id` | Foreign key to `game_profiles`, cascade on profile delete. |
| `game_id` | Foreign key to `game_catalog`, restrict on game delete. |
| `checkpoint_key` | String length 80, default `autosave`; describes the current logical checkpoint. It is not a separate slot key. |
| `save_schema_version` | Unsigned small integer, default 1. |
| `state` | JSONB payload, cast to array by `GameSave`. |
| `revision` | Unsigned big integer, default 1; used for optimistic concurrency. |
| `saved_at` | Timestamp of the logical save. |
| timestamps | `created_at`, `updated_at`. |

Constraints and indexes:

- Unique (`game_profile_id`, `game_id`) enforces exactly one current save per learner profile per game.
- Index (`game_id`, `saved_at`) supports catalog/admin activity inspection.
- Profile deletion cascades; catalog deletion is restricted, protecting saves.

This is already the smallest correct model. Multiple slots and checkpoint history are not required by current game behavior. `checkpoint_key` should remain metadata for the single current save, not be added to the unique constraint.

# 7. Existing Game API

All learner routes are under the existing authenticated learner boundary in `apps/api/routes/api.php`:

| Method and path | Current behavior |
| --- | --- |
| `GET /api/learners/games/profile` | Returns `{ profile: null }` or the current learner-owned profile. |
| `POST /api/learners/games/profile` | Validates 3-10 ASCII alphanumeric characters and creates the learner's profile. Returns 201 when created, 200 for an idempotent same-name request, and 409 for a different existing name. |
| `GET /api/learners/games/{gameKey}/save` | Requires an active catalog game and active profile; returns the learner's one save or `null`. |
| `PUT /api/learners/games/{gameKey}/save` | Accepts checkpoint key, schema version, state object, and expected revision; creates or updates under a transaction. |
| `POST /api/learners/games/{gameKey}/new-game` | Deletes only the selected game's save after an expected-revision check. |

The route regex permits lower-case kebab-case keys. The service then requires an exact active `game_catalog.game_key`; arbitrary or inactive keys return 404 and cannot allocate storage.

Current generic save protections are useful and must be retained:

- Maximum encoded `state` size: 256 KiB.
- Recursive rejection of identity and credential keys such as `learner_id`, `game_profile_id`, `username`, `password`, and tokens.
- Expected revision 0 for initial create and exact current revision for update/reset.
- Unique-constraint races are normalized to revision conflicts.

The missing protection is per-game schema validation. An active catalog key currently accepts any JSON object under 256 KiB and any schema version from 1 through 65535. Implementation should add a small core validator keyed by the three fixed game keys. It should reject unsupported versions, unknown top-level fields, wrong types, invalid ranges, and unsafe collection sizes before saving.

# 8. Current Game One Persistence

Backend foundation:

- Catalog key: `chronicles-of-the-lost-kingdom`.
- `GameCatalogSeeder` creates it with slot `game-one`, engine `kaplay`, contract/ruleset v1, meaningful progression true, and active true for a new row. Reseeding intentionally preserves an operator's later deactivation.
- The generic Laravel save endpoints use `game_saves`; feature tests cover create/load/update, revision conflicts, cross-learner isolation, another-session resume, target-only reset, invalid state, and oversized state.

Reusable frontend scaffolding:

- `gameOneHostAdapter.ts` targets the core profile/save/reset endpoints.
- `GameOneHostAdapter.ts` defines `load`, `save`, and `reset`.
- `gameOneSaveContract.ts` defines schema version 1 and serializes `contentVersionId`, mission, exploration, tutorial, character selection, and shop task state.
- `GameOneSaveCoordinator.ts` serializes writes, debounces by 600 ms, tracks the revision, and stops after a failed write.

Current live integration gap:

- `apps/games/game-one/src/index.ts` exports the route and constants, but not the host types used by the web host.
- `GameOneRoutePage` accepts no `host` prop and does not call `host.load`, the save contract, or the save coordinator.
- The route synchronously initializes mission, exploration, tutorial, character, language, and control state from browser storage.
- Mission, exploration, and tutorial effects continue writing anonymous, browser-wide `localStorage` keys. Controlled exit currently does not flush a server coordinator because none is mounted by the route.
- Some E2E/unit tests describe server writes, but the current runtime path and public exports do not match that expectation. These tests must be corrected to exercise the actual host integration rather than only mocked/stale assumptions.

Durable Game One state should remain the existing save-contract state: mission progress, exploration safe position/discoveries, tutorial completion, selected character, shop task, language/content version through mission state, and revision. Transient UI such as open dialogs, focus, pause reasons, nearby prompts, active audio objects, current keyboard directions, and animation/canvas state must not be saved.

Device-only preferences such as audio volume, narration mute, typewriter effect, and movement-control style may remain in local storage. They must not override server gameplay progress. Character/language may be locally cached for startup convenience, but an existing server save is authoritative.

# 9. Current Game Alpha Persistence Gap

Game Alpha is a complete playable run-based game. `GameAlphaModel` tracks stage, current score, high score, hearts, next-extra-heart threshold, player/enemy/projectile state, challenge state, and protected letter. The design specification explicitly says refresh abandons an active run and only completed-run results/personal best require host persistence.

Durable state:

- Personal best score.
- Highest stage reached at the end of a run, if the product wants that progress displayed.
- Ruleset version needed to interpret those values.

Temporary state that must intentionally reset:

- Current run score before game over.
- Hearts, extra-heart threshold, active stage/wave, enemies, ally, projectiles, player position, firing/movement input, pause state, menus, loading/error state, audio objects, and animation timing.

The runtime accepts an optional initial high score, but the route always creates it without server data and does not report the final snapshot to a host. The smallest integration is to load the one save before mounting the runtime, pass the persisted personal best into `createGameAlphaRuntime`, and emit a bounded completed-run summary when game over occurs. Save once on game over only when the new values differ. Do not write per frame, shot, enemy, or score increment.

Until a server-side replay/verifier exists, Alpha scores are learner game progress, not trusted leaderboard, academic, or achievement evidence. The UI and System Admin must not label a client-submitted score as verified.

# 10. Current Game Two Persistence Gap

Game Two/OtterTale is playable and currently stores all game progress in component state. It has a lobby, tutorial, stage selector, tutorial plus three stage configurations, per-run score, collected coins/letters/fruits, spelling quiz state, buffs, slime state, death/win state, and current camera/player state. There is no local or server host adapter and no reset API call.

Its design says active runs are abandoned on refresh and saving occurs only on successful stage completion. The actual UI currently exposes all stages; it does not enforce the design document's proposed unlock progression. Persistence work must not silently introduce a new locking mechanic.

Durable state:

- Set of successfully completed stage IDs, including tutorial completion.
- Best score per completed stage.
- Ruleset/content version.

Temporary state that intentionally resets:

- Active stage run, current score, camera/player position, coin/fruit/letter collections, current quiz/options, temporary buff and expiry time, slime positions/alive state, death/win overlays, pause state, input keys, asset/audio objects, and menu state.

Save once after a successful finish transition, using a deterministic merge that keeps prior completions and the maximum score for that stage. Retry/restart of the current stage must not reset durable progress. The explicit New Game operation deletes the whole OtterTale save. Whether completed stages later become an unlock gate is a separate gameplay decision; this persistence implementation should only record them.

# 11. Persistent Username Design

Use the existing `game_profiles.username` as the display username and the server-issued discriminator to form `public_handle`. Do not add game-specific usernames or duplicate columns.

Recommended flow:

```text
Games route opens
  -> authenticated web host GETs current profile
     -> profile exists: cache returned object and show public_handle
     -> no profile: show create form
        -> POST username only
           -> cache and show returned authoritative object
```

The same returned profile object is supplied to every game's host. Games may display `publicHandle` or `username`, but they do not authenticate with it and never use it as a database selector. The bearer/session token stays inside the ReaDirect web API closure and is not passed into game packages.

On refresh, logout/login, or another device, the browser refetches the profile. Browser caching is optional and non-authoritative. A stale cache must never be shown as a confirmed profile after a different learner logs in.

# 12. Username Validation / Uniqueness Decision

Preserve the current core policy for this implementation:

| Decision | Recommendation and reason |
| --- | --- |
| Length | 3-10 characters. This matches the schema, controller, tests, and child-friendly UI. |
| Characters | ASCII letters and digits only. This prevents markup, whitespace tricks, confusables, and punctuation in the discriminator format. Render as normal React text, never raw HTML. |
| Trimming | Trim in the lobby before submission. The backend should continue to reject, not silently store, leading/trailing whitespace if called directly. |
| Case | Preserve submitted display case in `username`; compare using lowercase `username_normalized`. |
| Global uniqueness | Do **not** make username text globally unique. Existing handles are uniquely identified by case-insensitive username plus a server discriminator. This supports common child-friendly names without unnecessary scarcity. |
| Rename | Keep rename disabled in this scope. Current service safely enforces create-once and `username_changed_at` is unused. Renaming introduces impersonation/history/cooldown and cross-device conflict policy that is not needed to meet persistence goals. |
| Cooldown | Not applicable while rename is disabled. If a later product decision enables rename, add a separate authenticated PATCH workflow with a server-enforced cooldown and audit plan; do not overload create. |
| Reserved values | Add a small server-owned, case-insensitive exact denylist for product/role impersonation such as `admin`, `teacher`, `system`, `readirect`, and `clara`. Product/security should approve the final list. Avoid substring filters that reject innocent names. |
| Offensive/sensitive content | Keep the restrictive alphabet and add only a small approved exact denylist for clearly prohibited terms. Do not introduce a moderation service in this work. The UI should remind learners not to use their full name, learner code, contact details, or password. |

Database uniqueness already matches this decision. No new unique constraint is required.

# 13. Shared Game Host Contract

Use one structural contract for the three games, implemented by the ReaDirect web host and passed into each package:

```ts
type GameProfile = {
  audience: "learner";
  username: string;
  discriminator: string;
  publicHandle: string;
  isActive: boolean;
};

type RemoteGameSave<TState> = {
  checkpointKey: string;
  saveSchemaVersion: number;
  state: TState;
  revision: number;
  savedAt: string;
};

interface GameHost<TState> {
  readonly profile: GameProfile;
  load(): Promise<RemoteGameSave<TState> | null>;
  save(input: {
    checkpointKey: string;
    saveSchemaVersion: number;
    state: TState;
    expectedRevision: number;
  }): Promise<RemoteGameSave<TState>>;
  newGame(expectedRevision: number): Promise<void>;
}
```

The generic web adapter binds a fixed compile-time game key and learner bearer token in a closure. Each package exports its game key, typed state validator/hydrator, and route props. The game package receives profile data and operations only. It never receives a password, raw cookie, token, learner ID, database ID, or database credential.

Each route has explicit `loading`, `ready`, `load-error`, `saving`, and `save-error` states. The game must not start from an empty state until an authoritative load has returned `null`; a timeout/error is not equivalent to no save.

Profile creation remains a lobby concern. Remove Game One's save-load side effect that creates a profile.

# 14. Per-Game Save Contracts

All contracts use `save_schema_version=1`, reject unknown top-level keys, remain below 256 KiB, and contain no identity data.

## Game Alpha — `game-alpha`

Recommended state:

```json
{
  "rulesetVersion": "game-alpha-score-v1",
  "personalBestScore": 24500,
  "highestStageReached": 6
}
```

- `personalBestScore`: integer, minimum 0, bounded to a documented safe maximum.
- `highestStageReached`: integer, minimum 1, bounded to the runtime's safe integer range.
- Checkpoint: `run-complete`.
- Save trigger: game over, only if the merged best/stage changes.
- Resume: pass the saved personal best to the runtime; start a fresh run.

## Game One — `chronicles-of-the-lost-kingdom`

Preserve the existing `gameOneSaveContract` v1 top-level shape:

```json
{
  "contentVersionId": "bilingual-v1",
  "mission": {},
  "exploration": {},
  "tutorial": {},
  "characterId": "yato",
  "shopTask": {}
}
```

The existing TypeScript restore functions remain the client authority for safe hydration. Add matching PHP validation for the known top-level keys, supported content/schema version, bounded mission indexes and collections, safe exploration coordinates/collection lengths, tutorial/character enums, and shop-task shape. Do not persist open overlays or live canvas state.

- Checkpoint: existing `mission-N` or `journey-complete` mapping.
- Save triggers: meaningful mission/tutorial/shop transitions and throttled safe exploration changes; serialize/debounce writes and flush before controlled exit.
- Resume: hydrate before mounting gameplay.

## Game Two — `ottertale`

Recommended state:

```json
{
  "rulesetVersion": "v1",
  "completedStageIds": [0, 1],
  "bestScoresByStage": { "0": 12, "1": 24 }
}
```

- Stage IDs must be from the static current stage catalog; arrays/maps have a small fixed maximum.
- Scores are non-negative bounded integers and are accepted only for completed stages.
- Checkpoint: `stage-{id}-complete`.
- Save trigger: successful stage completion only.
- Resume: show completion/best-score metadata; start active stages from the beginning.

Do not implement the draft Game Two design's proposed `ottertale_runs` or `ottertale_progression` tables. They conflict with the current shared persistence architecture and are unnecessary for the requested one-current-save behavior.

# 15. New Game / Reset Semantics

Reuse `POST /api/learners/games/{gameKey}/new-game` with the loaded save revision.

For every game:

- If no save exists, send expected revision 0; reset succeeds as a no-op.
- If a save exists, send its exact revision; Laravel deletes only that profile/game row.
- After success, set local revision to 0 and initialize that game's clean state.
- On 409, retain local state and require a fresh load/explicit retry; do not pretend reset succeeded.
- Require an in-game confirmation that names the selected game and explains that the action cannot be undone.

Reset must preserve the game profile/username, other two game saves, learner account and session, Diagnostic, Lessons 1-6, Final Assessment, reading profile, achievements, and all academic records. Game One's current `?resetProgress=all` local-only mechanism must not remain the authoritative reset path; the server reset should coordinate in-memory cleanup. Device-only preferences such as volume/control choice may remain unless the confirmation explicitly says settings will reset.

# 16. Database Changes Required

**No table or column schema changes are required.** Reuse `game_catalog`, `game_profiles`, and `game_saves` exactly as they exist.

One additive catalog-data migration is required for deployed databases, plus the matching idempotent seeder update:

- Add `game-alpha`: title `Alphabet Defender`, slot `game-alpha`, engine `pixi`, contract version 1, ruleset `game-alpha-score-v1`, `has_meaningful_progression=false` (run-based personal best, no checkpoint resume).
- Preserve existing Game One metadata and rows.
- Add `ottertale`: title `OtterTale`, slot `game-two`, engine `pixi`, contract version 1, ruleset `v1`, `has_meaningful_progression=true`.

The migration should insert only missing keys, never overwrite an existing operator-controlled `is_active` value, and never delete rows in `down()`. A safe rollback deactivates rows created for Alpha/Two; it does not delete them because `game_saves.game_id` uses `restrictOnDelete`. The seeder should follow the current `firstOrNew` pattern and set active only on a brand-new row.

Activation is a release gate: do not mark Alpha or Two active until its server validator and frontend host integration are deployed together. If phased commits must coexist, register them inactive first, then use a later additive activation migration after integration passes.

# 17. API Changes Required

No new routes are required.

Required backend changes within the existing endpoints:

1. Add fixed Game Alpha and Game Two constants/catalog metadata.
2. Add `LearnerGameSavePayloadValidator`, keyed by the three catalog keys, and invoke it inside `LearnerGameSaveService` after resolving an active game but before beginning a save transaction.
3. Restrict each key to schema version 1 and its exact state shape/ranges. Keep the generic 256 KiB and forbidden-identity checks as defense in depth.
4. Move username rules to one reusable backend rule/validator so create tests and the lobby contract cannot drift. Add the small approved reserved-name list.
5. Keep `POST /games/profile`; do not add profile update/rename in this scope.
6. Keep the response envelope and status behavior stable so existing consumers and System Admin are unaffected.

Recommended failure semantics:

- 401: missing/expired learner session.
- 403: preview/non-standard session or inactive profile.
- 404: unknown or inactive game key.
- 409: missing required profile, stale revision, or temporarily unsupported active game contract.
- 422: invalid username, unsupported save schema version, malformed state, prohibited keys, or oversized payload.

# 18. Frontend Changes Required

1. Replace the skeleton profile provider/guard with an authoritative profile provider that receives an authenticated profile client from `apps/web`.
2. Load the profile on entry and expose `{status, profile, error, createProfile, retry}`.
3. Update the lobby form asynchronously; disable duplicate submission, show server validation/conflict messages safely, and use the returned discriminator/handle.
4. Keep the requested-game redirect only after authoritative profile creation succeeds.
5. Consolidate the three card manifests into the owner-controlled lobby registry so the rendered list, routes, names, and game keys cannot drift.
6. Add one generic authenticated game-save adapter in `apps/web/src/features/games`; bind tokens and fixed game keys there.
7. Wrap Alpha, One, and Two in small web host pages that read the resolved profile, create the fixed-key adapter, and pass only the typed host into the package.
8. Remove direct profile creation from the Game One save adapter.
9. Do not use `localStorage`/`sessionStorage` as authoritative identity or gameplay progress. Limited device preference caching remains allowed.
10. Preserve the existing Guest unavailable flow and ensure it creates no fake profile or game request.

# 19. Game Package Changes Required

## Lobby package

- Replace `SkeletonGameProfile` and random discriminator generation with the authoritative profile/client types and loading/error states.
- Rename public exports away from `Skeleton` terminology.
- Make `registeredGames` the actual source for the three playable cards. Do not add Game Zero.

## Game Alpha

- Export the permanent key and a typed host/save state.
- Accept the host in `GameAlphaRoutePage`/`GameAlphaCanvas`.
- Load/hydrate before runtime creation.
- Pass `personalBestScore` as the runtime's initial high score.
- Expose a game-over summary from the runtime and save the merged result once.
- Add reset confirmation and recoverable load/save errors without changing mechanics.

## Game One

- Export `GameOneHostAdapter` types from the package index and accept a host prop in the exported route.
- Load and validate the remote save before initializing reducers/canvas.
- Use the existing save contract and coordinator in the live route.
- Replace durable local-storage effects with coordinator schedules. Preserve pure serializer/restore helpers for tests.
- Keep device-only preference storage separate and make remote state win for overlapping gameplay fields.
- Flush before the controlled Exit-to-Lobby action; if flush fails, retain the route/state and show retry/continue-without-saving choices rather than falsely claiming success.
- Replace local-only reset with host reset plus clean reducer state.

## Game Two

- Export the permanent key and typed host/save state.
- Load progress before showing stage selection.
- On successful stage finish, merge completion and per-stage best score and make one save request.
- Keep retry/death/current-run state transient.
- Add target-only reset and bounded recovery UI without adding stage locks.

The dormant package-specific Laravel service providers and empty backend route groups should remain unused. Shared profile/save/catalog ownership stays in `apps/api`; do not create parallel per-game persistence endpoints.

# 20. System Admin Compatibility

`SystemAdminOperationsService::gamesAndPlayers()` already:

- lists every `game_catalog` row with active status, engine, contract/ruleset, player count, and save count;
- lists standard learner profiles and public handles;
- lists save metadata (`game_key`, title, checkpoint, schema version, revision, `saved_at`) without exposing private state;
- excludes portal-system learners; and
- labels the interface read-only.

Once Alpha and OtterTale catalog rows and saves exist, the current service will populate them naturally. No controller, route, response, or page redesign is needed. Add regression fixtures/tests with all three catalog games and ensure counts/last-save metadata remain correct. Do not expose save JSON or add mutation controls.

# 21. Security / Ownership

Preserve these invariants:

- Laravel's resolved learner session is the only ownership selector.
- Ignore extraneous browser `learner_id`, `game_profile_id`, `game_id`, username, or discriminator fields; preferably reject them through exact state validation.
- Profile and save responses do not expose database IDs.
- A standard learner can read/write only their own profile and saves.
- Logged-out, expired, preview, portal-system, and inactive-profile contexts cannot persist.
- Unknown and inactive catalog games cannot allocate saves.
- The game key is bound by the web host, not supplied by game state.
- The game package never sees credentials or auth tokens.
- The server validates username and game state even when the client has already validated them.
- Usernames are rendered as text, never HTML.
- Save data remains game-only and cannot influence Diagnostic, lessons, Final Assessment, reading profiles, unlocking, CRLA evidence, or academic achievements.

Direct cross-learner URLs are not available in the learner API, which is preferable to accepting and authorizing an ID. Tests should still submit another learner's IDs as extra payload and prove they cannot redirect ownership.

# 22. Failure / Retry Behavior

## Profile load/create

- Use the repository's bounded API timeout helper.
- Pending: show `Loading game profile...`.
- Network/5xx/timeout: show a friendly message and Retry; do not show the create form as if `null` was returned.
- 401: use existing learner-session handling and login routing.
- Create 409: refetch once. If a profile now exists (concurrent tab/device), use it; otherwise show the server conflict.

## Save/load

- Do not mount a new game until load returns a valid save or explicit `null`.
- Keep the current playable state in memory when a save fails.
- Never label failed/pending progress as Saved.
- Serialize writes per game. Debounce only high-level changes; Alpha and Two normally save once per completed run/stage.
- On a request timeout followed by 409, refetch. If the server revision/state exactly matches the attempted state, treat the timed-out request as acknowledged; otherwise surface a concurrency conflict.
- On a genuine revision conflict, do not blindly overwrite. Preserve local state and offer an explicit reload of the newer server save or continued play without a false saved status.
- Controlled exit should await an outstanding flush. Browser close/unload is not a reliable authenticated save mechanism and should not be the primary trigger.
- Do not build offline synchronization. If offline, gameplay may retain in-memory state for the open page, but cross-refresh durability resumes only after a confirmed server save.

# 23. Data Migration / Backward Compatibility

- Existing `game_profiles` rows are already the authoritative shared identity. Preserve every username, discriminator, active flag, and timestamp.
- Existing Game One `game_saves` rows remain valid under schema version 1 and must load through the existing hydrator. The catalog migration must not modify or delete them.
- New Alpha/Two rows are additive. Their absence before deployment is normal.
- In-memory lobby usernames/discriminators cannot be migrated because they disappear on refresh and were never authoritative. Do not claim otherwise.
- Existing Game One browser storage is anonymous and not reliably scoped to a learner. On a shared device, automatically uploading it after login could assign one child's progress to another. Therefore do not auto-import it.
- When server Game One state exists, it wins. When it does not, initialize a clean server save from the authenticated game session. Leave old local keys untouched for one release if rollback safety is desired, but stop reading/writing them as durable progress; remove them only in a later announced cleanup.
- If product owners require recovery of old same-browser Game One progress, design a separate one-time, explicit, learner-confirmed import after identity review. It is out of scope for this implementation.
- Rollback must deactivate newly registered games rather than delete catalog/save data.

# 24. Test Plan

## Backend feature/unit tests

- Profile: unauthenticated/expired denied; standard learner create/read; another session/device reads the same row; 3-10 ASCII validation; case-insensitive idempotence; discriminator uniqueness; reserved-name rejection; preview/portal denied; different-name re-create conflict.
- Ownership: payload learner/profile/game IDs cannot select another record; two learners with the same game have isolated saves.
- Catalog: exactly the three intended games have canonical keys/slots; Game Zero is absent/inactive; seeding is idempotent and preserves operator deactivation.
- Each game: create, load, update, revision increment, same-state timeout reconciliation path where applicable, and reset.
- Isolation: reset Alpha leaves One/Two; reset One leaves Alpha/Two; reset Two leaves Alpha/One; username remains in all cases.
- Validation: unknown key, inactive game, unsupported schema version, unknown fields, wrong types, negative/out-of-range values, excessive collection lengths, forbidden nested identity fields, malformed JSON/object shape, and over-256-KiB payload.
- Backward compatibility: an existing Game One v1 row hydrates and updates without reset; existing profile/discriminator remains unchanged.
- System Admin: all three catalog rows/counts/save metadata appear; save state remains absent from the API response.

## Frontend and package tests

- Lobby waits for GET, displays returned handle, shows create only on explicit null, submits trimmed valid username, uses returned discriminator, prevents duplicate submit, and retries errors.
- Refresh/provider remount refetches and restores the same username; logout/login with a new browser cache restores from server.
- Direct game routes wait for profile load and resume requested route after creation.
- Guest unavailable state performs no profile/save call and never creates a fake handle.
- Generic host always uses a fixed game key and auth header while package callbacks receive no token.
- Game Alpha hydrates personal best, saves only on completed run, keeps active run transient, handles failed save, and resets only Alpha.
- Game One hydrates existing remote v1 state, does not let local progress override it, schedules serialized writes on meaningful transitions, flushes before exit, handles conflicts, and performs server reset.
- Game Two hydrates completions/bests, saves once on successful stage completion, does not save active entities/UI, handles failure, and resets only Two.
- Package save-state parsers reject invalid payloads before hydration.

## Browser/E2E

With an authorized standard QA learner:

1. Login -> Games -> create username -> verify exact returned handle.
2. Refresh, logout/login, and use a second browser context/session -> verify the same handle.
3. Alpha: complete a safe run -> exit -> relaunch -> personal best restored.
4. Game One: make one safe, non-academic game transition -> exit -> relaunch -> mission/exploration restored.
5. OtterTale: complete a safe stage -> exit -> relaunch -> completion/best restored.
6. Reset one game -> confirm username and other two saves are unchanged.
7. Simulate bounded profile/load/save timeout, 500, 401, and revision 409 -> confirm truthful recoverable UI and no silent loss claim.
8. If two authorized QA learners are available, verify profile/save isolation across both.

No test should fabricate Diagnostic, lesson, Final Assessment, or other academic outcomes.

# 25. Exact Files Expected to Change

This is the expected implementation change set; it is not modified by this planning task.

## Core API

- `apps/api/app/Models/GameCatalog.php`
- `apps/api/database/seeders/GameCatalogSeeder.php`
- `apps/api/database/migrations/2026_08_18_000001_register_game_alpha_and_ottertale.php` (new additive catalog-data migration; timestamp may be advanced if implementation occurs later)
- `apps/api/app/Http/Controllers/LearnerGameProfileController.php`
- `apps/api/app/Services/LearnerGameSaveService.php`
- `apps/api/app/Services/LearnerGameSavePayloadValidator.php` (new)
- `apps/api/app/Rules/GameUsername.php` (new reusable rule)
- `apps/api/tests/Feature/GameDatabaseFoundationTest.php`
- `apps/api/tests/Feature/LearnerGameSaveApiTest.php`
- `apps/api/tests/Feature/SystemAdminOperationsTest.php`

No changes are expected to `GameProfile.php`, `GameSave.php`, the foundation table migration, academic models/services, or System Admin production code.

## Web host

- `apps/web/src/App.tsx`
- `apps/web/src/features/games/gamePersistenceApi.ts` (new generic profile/save client)
- `apps/web/src/features/games/GameAlphaHostPage.tsx` (new)
- `apps/web/src/features/game-one/GameOneHostPage.tsx`
- `apps/web/src/features/game-one/gameOneHostAdapter.ts` (reduce to a compatibility wrapper or replace with the generic client)
- `apps/web/src/features/games/GameTwoHostPage.tsx` (new)
- `apps/web/tests/GameSkeletonFlow.test.tsx`
- `apps/web/src/features/game-one/gameOneHostAdapter.test.ts`
- `apps/web/tests/end-to-end/game-one-integration.spec.ts`
- `apps/web/tests/end-to-end/game-persistence-integration.spec.ts` (new three-game/profile E2E)

## Lobby package

- `apps/games/lobby/src/GameLobbySkeletonContext.tsx` (replace/rename; remove random profile behavior)
- `apps/games/lobby/src/GameProfileContext.tsx` (new authoritative provider/guard)
- `apps/games/lobby/src/GameLobbyPage.tsx`
- `apps/games/lobby/src/registry.ts`
- `apps/games/lobby/src/index.ts`
- `apps/games/lobby/src/styles/lobby.css` (only for loading/error/create states)

## Game Alpha package

- `apps/games/game-alpha/src/index.ts`
- `apps/games/game-alpha/src/GameAlphaRoutePage.tsx`
- `apps/games/game-alpha/src/components/GameAlphaCanvas.tsx`
- `apps/games/game-alpha/src/game/pixi/createGameAlphaRuntime.ts`
- `apps/games/game-alpha/src/host/GameAlphaHostAdapter.ts` (new)
- `apps/games/game-alpha/src/game/persistence/gameAlphaSaveContract.ts` (new)
- `apps/games/game-alpha/tests/unit/game-alpha-persistence.test.ts` (new)

## Game One package

- `apps/games/game-one/src/index.ts`
- `apps/games/game-one/src/GameOneRoutePage.tsx`
- `apps/games/game-one/src/host/GameOneHostAdapter.ts`
- `apps/games/game-one/src/game/persistence/gameOneSaveContract.ts`
- `apps/games/game-one/src/game/persistence/GameOneSaveCoordinator.ts`
- `apps/games/game-one/src/game/mission/missionPersistence.ts`
- `apps/games/game-one/src/game/world/explorationPersistence.ts`
- `apps/games/game-one/src/game/tutorial/tutorialState.ts`
- `apps/games/game-one/src/game/progress/resetLearnerProgress.ts`
- Corresponding existing persistence/coordinator/route tests under `apps/games/game-one/src/`.

## Game Two package

- `apps/games/game-two/src/index.ts`
- `apps/games/game-two/src/GameTwoRoutePage.tsx`
- `apps/games/game-two/src/OttertaleGame.tsx`
- `apps/games/game-two/src/host/GameTwoHostAdapter.ts` (new)
- `apps/games/game-two/src/game/persistence/gameTwoSaveContract.ts` (new)
- `apps/games/game-two/src/game/persistence/gameTwoSaveContract.test.ts` (new)

Documentation likely requiring behavioral updates after implementation:

- `apps/games/lobby/README.md`
- `apps/games/game-alpha/README.md`
- `apps/games/game-one/README.md`
- `apps/games/game-two/README.md`
- `docs/READIRECT_COMPLETE_SYSTEM_ANALYSIS.md`

# 26. Implementation Phases

## Phase A — Core catalog and validation contract

- Add fixed Alpha/Two model constants and idempotent inactive-first catalog registration.
- Add reusable username rule/reserved values without enabling rename.
- Add per-game save payload validation while preserving generic size/identity/revision protections.
- Expand backend tests for all three keys, ownership, validation, reset isolation, and existing Game One rows.
- Do not activate Alpha/Two yet.

Exit gate: targeted API tests pass; no existing Game One/profile row is changed or reset.

## Phase B — Authoritative Games Lobby profile

- Implement the injected authenticated profile client/provider.
- Remove random discriminator generation and skeleton guard semantics.
- Make loading/null/error/create states explicit and make the registry authoritative.
- Preserve Guest unavailable behavior.

Exit gate: refresh, logout/login, and a second authenticated session restore the same server handle; no game package creates a profile.

## Phase C — Shared host plus Game One normalization

- Introduce the generic fixed-key web save adapter.
- Wire the existing Game One save contract/coordinator into the live route.
- Make server save state authoritative; retain local storage only for device preferences.
- Add controlled-exit flush, reset, and recoverable conflict behavior.
- Repair tests so they prove real host calls and hydration.

Exit gate: an existing Game One v1 save resumes, a new save survives refresh/device login, and local anonymous state cannot override it.

## Phase D — Game Alpha persistence

- Add the Alpha host/save contract and game-over callback.
- Load personal best before runtime mount; save only completed-run summary.
- Add reset/error tests.
- Activate Alpha only after the integrated test passes.

Exit gate: personal best survives relaunch while current run state intentionally does not.

## Phase E — Game Two persistence

- Add the OtterTale host/save contract.
- Persist completion/best score only on successful stage completion.
- Keep current run transient; add target-only reset/error handling.
- Activate OtterTale only after the integrated test passes.

Exit gate: completion/best survives relaunch without introducing stage locking or per-run tables.

## Phase F — Integration, browser, security, and release verification

- Run API, web, package, and E2E suites.
- Verify cross-device/session restore, concurrency conflicts, 401/404/409/422/5xx recovery, payload bounds, Guest behavior, and two-learner isolation where authorized.
- Verify System Admin naturally shows the three catalog entries and save metadata only.
- Confirm no academic tables/routes/behavior changed.
- Review the exact Git diff and update affected documentation.

Exit gate: the Definition of Done below is evidenced in a real browser against the intended environment.

# 27. Risks

| Risk | Mitigation |
| --- | --- |
| Game One is assumed to be server-persistent because scaffolding/tests exist, while the live route is local-only. | Treat Phase C as a real integration, run typecheck and browser tests, and inspect network writes/hydration rather than trusting file names. |
| Anonymous Game One local storage may belong to another learner on a shared device. | Never auto-import; server wins. Offer any recovery later as explicit separate work. |
| Lobby/backend/runtime title drift confuses catalog/admin/testing. | Approve canonical display titles while keeping stable persistence keys. |
| Alpha/Two frontend ships before active catalog rows or validators. | Register inactive first and activate only at each phase exit gate. |
| Catalog migration rollback attempts to delete rows with saves. | Down migration deactivates only; never delete catalog/save data. |
| Client-submitted scores are mistaken for verified academic or leaderboard evidence. | Label as game progress only; no academic integration or verified leaderboard claim. |
| Frequent Game One exploration effects cause write amplification. | Use meaningful distance/transition thresholds, debounce, and one serialized coordinator. |
| Timed-out successful save is retried with an old revision. | Refetch on conflict and compare attempted state before deciding whether it was acknowledged. |
| Concurrent tabs/devices overwrite progress. | Preserve revision checks; no blind last-write-wins retry. |
| Save schema evolves with game content. | Keep explicit schema/content/ruleset versions and reject unsupported state safely. |
| Per-game PHP validation drifts from TypeScript contracts. | Use shared fixtures in API/package tests and update both in one reviewed change. |
| Username denylist causes false positives or leaks policy. | Use a small approved exact list, no substring filter, and retain discriminator uniqueness. |
| Game Zero is accidentally activated because its route exists. | Keep it out of registry/catalog changes and test the exact three keys. |
| Persistence work expands into academic progression or new achievement rules. | Enforce the explicit academic boundary in code review and regression tests. |

# 28. Definition of Done

Implementation is done only when all of the following are true:

- Exactly Game Alpha, Game One, and Game Two are integrated; Game Zero remains excluded.
- A standard authenticated learner has at most one database game profile and one unique server-issued public handle.
- The lobby loads that profile before showing games, creates it through Laravel only when absent, and never displays a random fake persisted handle.
- The same username/handle returns after refresh, logout/login, and login from another browser/device.
- All three packages receive the same resolved profile through a credential-free host contract.
- Each game loads and saves only its documented v1 durable state through `game_saves`.
- Alpha current runs and OtterTale current stages intentionally reset, while their completed-run/stage summaries persist.
- Game One's live route uses the server adapter/save contract/coordinator; anonymous local storage is not authoritative gameplay progress.
- Reset deletes only the selected game's save and preserves username, other games, account, academic data, and achievements.
- Unknown/inactive games, invalid/oversized/malformed states, unsupported versions, forbidden identity data, logged-out sessions, preview sessions, and cross-learner attempts are rejected.
- Revision conflicts and network failures retain in-memory state, show truthful recovery, and never falsely report Saved.
- Existing Game One profiles and v1 saves survive deployment without destructive migration/reset.
- System Admin shows all three catalog entries and save metadata using the existing read-only interface, without exposing save payloads.
- Guest mode remains unavailable and creates no profile/save data.
- Backend, frontend, package, browser/E2E, security, and regression tests pass.
- No Diagnostic, lesson, Final Assessment, reading-profile, CRLA, ASR, TTS, Clara, learner-auth architecture, or academic progression behavior is changed.
