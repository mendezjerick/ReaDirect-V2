# ReaDirect Game Integration Boundary Standard

Status: mandatory, owner-controlled source of truth.

This standard defines the hard integration boundary for bringing Game One and
future games into ReaDirect. Its primary purpose is to prevent a game module
from changing the main application's design language, lobby, routing behavior,
shared assets, or unrelated data.

Where an older game contributor document conflicts with this standard, this
standard controls the integration. The main ReaDirect design-system standards
continue to control every surface outside an active game route.

## Non-Negotiable Outcome

A game may look and behave like its own game while its route is active. Loading,
playing, leaving, or failing to load that game must not change the appearance or
behavior of:

- the game lobby;
- the learner dashboard;
- lessons or assessments;
- staff or administrator pages;
- Game Zero;
- Game Two;
- shared transitions, typography, controls, backgrounds, or design tokens.

Returning from a game must restore the same main-application presentation that
would exist if the game had never been loaded.

## Ownership Boundaries

### Protected owner-controlled paths

Game One implementation work must not modify:

```text
apps/games/lobby/**
apps/games/game-zero/**
apps/games/game-two/**
packages/design-tokens/**
apps/web/src/styles/**
apps/web/public/**
```

It must also not replace or edit shared UI components, dashboard presentation,
lesson presentation, assessment presentation, or staff presentation to
accommodate Game One.

An exception requires explicit project-owner approval that names the exact file
and purpose before the change is made.

### Game One-owned paths

Game One source, tests, editable assets, runtime assets, licenses, styles, and
game-specific backend code belong under:

```text
apps/games/game-one/**
```

Game One must not import another game's implementation or assets.

### Narrow shared integration paths

The following changes may exist outside the Game One directory only when they
are required for shared platform integration:

```text
pnpm-lock.yaml
apps/web/src/game-host/**
apps/web/src/App.tsx
apps/api/app/**
apps/api/database/migrations/**
apps/api/database/seeders/**
apps/api/routes/**
apps/api/tests/**
```

These are not general permission to refactor the main application. Every change
must be minimal, directly related to the shared game host or shared game data
contract, and independently reviewable.

Game-specific visual code, gameplay code, content, and assets are prohibited in
these shared locations.

## Lobby Boundary

The lobby is owner-controlled and must have a zero-file diff during Game One
integration:

```text
apps/games/lobby/**
```

The existing lobby-to-game route remains:

```text
/learner/games/game-one
```

Game One returns to the lobby at:

```text
/learner/games
```

Game One must not replace the lobby, reproduce the lobby inside the game,
redirect the application root, or change how Game Two is presented.

## Main Application Design Isolation

Game One styles must be route-scoped. The outermost Game One element must use
the stable class:

```text
.game-route
```

Every Game One selector must be rooted beneath `.game-route`, except for a
uniquely named module-owned `@font-face` declaration or module-owned keyframe.

Game One CSS must not target or redefine:

```text
:root
html
body
#root
button
a
input
select
textarea
main
```

Unqualified element selectors, global resets, and global CSS custom-property
assignments are prohibited.

Game One must not:

- import Tailwind CSS a second time;
- add a global Tailwind preflight or reset;
- edit the main application stylesheet;
- edit shared design tokens;
- load a remote web font;
- change global font, color, background, focus, overflow, or tap-highlight
  behavior;
- leave inline styles, classes, event listeners, timers, animation frames,
  audio, speech, canvases, or portals behind after route teardown.

If Game One temporarily changes document-level browser behavior while active,
it must capture the previous value and restore it during teardown. Persistent
visual behavior belongs on `.game-route`, not on `document.body` or
`document.documentElement`.

Game One uses the application's self-hosted `Pixelify Sans` face as its one
approved host-provided typography exception. The module declares the following
stack only on `.game-route` and consumes it through `var(--game-ui-font)`:

```css
.game-route {
  --game-ui-font: "Pixelify Sans", ui-sans-serif, system-ui, sans-serif;
}
```

This exception does not permit Game One to add an application-level
`@font-face`, edit shared design tokens, load a remote font, or apply Pixelify
Sans outside `.game-route`. Game One menus, dialogs, touch chrome, short
prompts, reading-panel questions, and transition copy use this one route-scoped
family consistently.

If Game One later replaces Pixelify Sans with a module-owned font, the font file
must be stored inside the Game One directory, the family must have a
Game One-specific name, and it must remain applied only beneath `.game-route`.

## Asset Containment

All Game One runtime assets must live inside the Game One module. The preferred
locations are:

```text
apps/games/game-one/src/assets/runtime/**
apps/games/game-one/assets/source/**
apps/games/game-one/assets/licenses/**
```

Runtime code must resolve module-owned assets through imports or
`new URL(..., import.meta.url)`. Absolute application paths such as
`/assets/game/...` are prohibited for Game One-owned files.

Game One assets must not be copied into:

```text
apps/web/public/**
assets/**
apps/games/lobby/**
apps/games/game-two/**
```

The standalone contributor host file below must never be copied into
ReaDirect:

```text
RD-game/public/_redirects
```

It redirects the application root and violates the host routing boundary.

Editable source assets and redistribution licenses may remain under Game One
when their inclusion is approved. Their repository-size impact must be reported
before transfer.

Generated output and installed dependencies must not be transferred:

```text
node_modules/**
dist/**
coverage/**
*.tsbuildinfo
```

Only source-controlled files and specifically approved runtime assets are
eligible for transfer.

## Dependency Isolation

Game One declares its runtime dependencies in:

```text
apps/games/game-one/package.json
```

Dependencies must use exact approved versions. Version ranges such as `^`, `~`,
`latest`, preview tags, and unapproved aliases are prohibited.

KAPLAY must be pinned to the exact owner-approved version before integration.
Updating the root `pnpm-lock.yaml` is an allowed mechanical workspace change.
KAPLAY must not be added to the main web application's package manifest merely
to make Game One compile.

A dependency added for Game One must not initialize on non-game routes. Large
game code and assets must remain lazy-loaded behind the Game One route.

Vendoring `node_modules` or copying dependencies from the standalone repository
is prohibited.

## Shared Host Boundary

The main application may provide a narrow host adapter to Game One. The adapter
may handle:

- authenticated session resolution;
- loading a save;
- saving a checkpoint;
- starting or completing a game session;
- resetting only the active game's save;
- returning to the lobby;
- preview-mode isolation.

The adapter must not expose passwords, learner codes, raw database identifiers,
or unrelated application state to the game engine.

Any `apps/web/src/App.tsx` change is limited to mounting the host adapter at the
existing Game One route. It must not alter the lobby presentation, main design
providers, dashboard hierarchy, or unrelated routes.

## Database Separation

Per-learner, cross-device progress requires shared Laravel and PostgreSQL work
outside the Game One directory. This is a shared platform capability, not
permission for Game One to alter unrelated data.

Shared game persistence uses core-owned tables such as:

```text
game_catalog
game_profiles
game_saves
```

Game Zero, Game One, and Game Two normally use separate rows identified by
`game_id`, not separate generic save tables.

The ownership chain is:

```text
learner -> game_profile -> game_save for a specific game
```

The authenticated Laravel API resolves the learner. Browser requests must never
be trusted to supply their own `learner_id` or `game_profile_id`.

Shared game migrations must be:

- additive;
- reversible;
- covered by database tests;
- isolated from lesson and assessment progression;
- constrained by foreign keys and uniqueness;
- inactive until their owning integration slice is approved.

Game integration must not repurpose or alter:

```text
learner_progress_states
lesson_runs
lesson_responses
assessment_runs
assessment_responses
learner_achievements
```

Game-specific tables are allowed only for mechanics that cannot fit the shared
save contract. They must have permanent game-key-derived names, remain inside
the approved game backend boundary, and reference an approved shared game
owner key.

Copying the Game One frontend must never automatically register a service
provider, run migrations, seed data, or activate the game catalog entry.
Database foundation, API activation, frontend transfer, and route activation
are separate reviewable slices.

## Browser Storage

Browser storage is not the authoritative source for authenticated learner game
progress.

If local storage is retained as a recovery cache:

- its key must include the permanent game key and stable learner scope;
- it must never contain credentials or learner codes;
- it must never be assigned automatically from an anonymous browser state to a
  newly signed-in learner;
- server state wins after successful authenticated hydration;
- logging out or switching learners must discard in-memory game state;
- cache failures must not corrupt the server save.

Anonymous Game One progress that predates authenticated persistence must not be
silently attached to the next learner who uses that browser.

## Integration Slices

Work must remain divided into independently reviewable slices:

1. Boundary standard.
2. Shared game database foundation.
3. Shared authenticated game-save API.
4. Self-contained Game One source and asset transfer.
5. Game One host-adapter and persistence wiring.
6. Verification and explicit activation.

One slice must not smuggle in work belonging to a later slice.

In particular:

- the database-foundation slice must not change the lobby or frontend;
- the Game One transfer slice must not activate database code;
- the host-adapter slice must not restyle the main application;
- activation must occur only after all boundary checks pass.

## Required Verification

Before Game One can be activated, verification must prove:

- `apps/games/lobby/**` has a zero-file diff;
- `apps/games/game-zero/**` has a zero-file diff;
- `apps/games/game-two/**` has a zero-file diff;
- `packages/design-tokens/**` has a zero-file diff;
- `apps/web/src/styles/**` has a zero-file diff;
- no Game One asset exists under `apps/web/public/**`;
- no standalone redirect file was copied;
- no `node_modules`, build output, coverage output, or TypeScript build metadata
  was copied;
- every Game One CSS selector passes the design-isolation rules;
- Game One's `--game-ui-font` remains declared only on `.game-route`, resolves
  to the host's self-hosted Pixelify Sans face, and does not create a second
  application-level font declaration;
- loading and leaving Game One does not change lobby or dashboard screenshots;
- route teardown stops game loops, audio, speech, timers, listeners, and input;
- lobby to Game One to lobby navigation works;
- Learner A cannot load or overwrite Learner B's save;
- the same learner can load progress on another browser or device;
- Game One reset does not affect Game Two or educational progress;
- expired or invalid sessions cannot read or write game data;
- shared migrations roll back cleanly;
- dependency, typecheck, build, frontend, and backend tests pass.

## Stop Conditions

Implementation must stop for owner review if any step would require:

- editing a protected path;
- adding a Game One file to a main-application public asset directory;
- introducing a global CSS selector or reset;
- changing the main application design language;
- changing the lobby or Game Two;
- altering an existing educational table;
- creating a separate database or schema;
- accepting a client-supplied learner identity;
- copying a redirect, build artifact, dependency directory, or unreviewed
  binary;
- activating Game One before verification is complete.

No convenience shortcut overrides these boundaries.
