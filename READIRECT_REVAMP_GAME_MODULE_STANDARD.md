# ReaDirect Game Module Standard

This standard defines how the game lobby and three independently developed games
connect to ReaDirect. It is mandatory for the owner-controlled lobby, game-zero,
game-one, game-two, and every contributor repository.

The central catalog, account-level award rules, shared queue, gallery, and
shared unlock overlay are defined by
`READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`.

## Non-Negotiable Architecture

ReaDirect has one deployed React application, one Laravel API, and one
PostgreSQL database. The lobby and games are source modules inside that system.
They are not independently deployed applications, iframes, microfrontends, or
separate services.

```text
Learner or verified-guest dashboard
                |
                v
        /learner/games
           Game Lobby
                |
        +-------+-------+
        |       |       |
        v       v       v
 game-zero  game-one  game-two
    menu       menu       menu
        |       |       |
        +-------+-------+
                |
                v
       ReaDirect Laravel API
                |
                v
 readirect database / readirect_v2 schema
```

The lobby is the only game-selection surface. Use lobby consistently in routes,
code, database names, documentation, and interface copy.

## Required Repository Structure

```text
apps/games/
|-- lobby/
|   |-- src/
|   |   |-- api/
|   |   |-- components/
|   |   |-- features/
|   |   |   |-- achievements/
|   |   |   |-- leaderboards/
|   |   |   \-- username/
|   |   |-- styles/
|   |   |-- index.ts
|   |   \-- registry.ts
|   |-- tests/
|   |-- package.json
|   \-- README.md
|
|-- game-zero/
|   \-- same required structure as game-one
|
|-- game-one/
|   |-- src/
|   |   |-- api/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- game/
|   |   |-- state/
|   |   |-- styles/
|   |   \-- index.ts
|   |-- backend/
|   |   |-- src/
|   |   |   |-- Http/Controllers/
|   |   |   |-- Models/
|   |   |   |-- Services/
|   |   |   \-- GameOneServiceProvider.php
|   |   |-- database/migrations/
|   |   |-- routes/api.php
|   |   \-- tests/
|   |       |-- Feature/
|   |       \-- Unit/
|   |-- assets/
|   |   |-- source/
|   |   \-- licenses/
|   |-- tests/
|   |   |-- component/
|   |   |-- end-to-end/
|   |   \-- unit/
|   |-- GAME_DESIGN.md
|   |-- README.md
|   |-- composer.json
|   \-- package.json
|
\-- game-two/
    \-- same required structure as game-one
```

The contributor repository root must exactly match its destination game
directory. Contributors must not wrap the module in another project directory
or submit only a build artifact.

## Ownership

### Main ReaDirect owner

The main owner controls:

- The lobby and registry.
- Application routes and guards.
- Shared game API endpoints and common database migrations.
- Username rules and moderation.
- Learner and guest audience separation.
- Achievement artwork, placeholder stars, and fixed gallery ordering.
- System Administrator preview and player inspection.
- Final dependency and lockfile integration.
- Acceptance and registration of each game.

### Game contributor

The contributor controls:

- The approved educational game concept and mechanics.
- React plus either KAPLAY or PixiJS.
- Game-specific art, audio, levels, and licensed sources.
- The mandatory game menu implementation.
- Game-specific Laravel services and tables.
- Score evidence and verification logic.
- Checkpoint serialization for games with meaningful progression.
- Proposed achievement names and exact unlock criteria.
- All module tests and documentation.

Contributors must not edit the lobby registry, shared authentication, shared
tables, global rewards, another game, or apps/web application routes in their
own repository.

## Required Design Specification

GAME_DESIGN.md must be completed before gameplay development. It must define:

1. Permanent game key and display title.
2. Educational objective and intended learners.
3. Game loop, success, failure, and expected session duration.
4. Touch controls and equivalent pointer behavior.
5. Score formula, valid range, modes, difficulty, and ruleset version.
6. Every proposed achievement name and exact unlock criteria.
7. KAPLAY or PixiJS selection.
8. Whether meaningful progression exists.
9. Automatic checkpoints, one-slot save payload, and restart behavior.
10. Original, third-party, and no-original-assets design sources.
11. Shared records used and every proposed game-specific table.

The owner assigns permanent achievement keys and fixed gallery positions during
integration. Achievement artwork is produced centrally by the owner.

## Game Manifest Contract

Each completed game exports a manifest and one lazy-loadable route component
from src/index.ts. It must not expose internal components.

```ts
export type GameEngine = "kaplay" | "pixi";

export interface GameAchievementProposal {
  name: string;
  unlockCriteria: string;
}

export interface GameManifest {
  contractVersion: 1;
  slot: "game-zero" | "game-one" | "game-two";
  gameKey: string;
  displayTitle: string;
  routeSegment: string;
  engine: GameEngine;
  hasMeaningfulProgression: boolean;
  achievements: readonly GameAchievementProposal[];
}
```

Rules:

- gameKey and routeSegment use lowercase kebab-case.
- A production game key is permanent after records exist.
- contractVersion must equal the lobby-supported contract.
- The manifest contains no secrets, learner identifiers, or executable data
  received from the server.
- The lobby registry imports only the public manifest and route export.
- A game never imports another game's code.

## Routes

Required production routes:

```text
/learner/games
    Game Lobby

/learner/games/<game-slug>
    Game menu and gameplay

/staff/system-admin/games
    Game administration and player database

/staff/system-admin/games/preview/<game-slug>
    Non-persistent System Administrator preview
```

Selecting a game always opens its menu. A route must not start gameplay
immediately. Authentication and audience resolution belong to the main host.
The game must never trust a learner code, email address, account type, or player
ID supplied by its canvas.

System Administrator preview:

- Is visually marked as preview.
- Creates no normal player session.
- Writes no save or progression.
- Awards no achievement or reward.
- Creates no personal best or leaderboard result.
- Is excluded from game analytics.
- Uses disposable fixture state.

## Learner Dashboard Placement

The learner dashboard always prioritizes its current required learning action:

~~~text
Diagnostic Assessment
    -> current sequential required lesson
    -> Final Assessment
~~~

The Games button is clearly visible but smaller and visually secondary to that
fixed primary-action slot. It must not encourage the learner to bypass or
confuse the current learning requirement. Games do not unlock lessons or
advance assessment eligibility.

The achievement holder is also prominent and follows the primary action and
Games action in the dashboard hierarchy. It uses fixed positions for all
declared lesson and game achievements. Locked positions show silhouettes and
visible unlock criteria.

## Lobby Contract

The lobby owns:

- Required game-username onboarding before play.
- The owner-controlled game registry.
- Zero, one, two, or three available game cards.
- Separate learner and verified-guest leaderboard views.
- Queued first-time achievement presentation.
- Navigation back to the learner-facing dashboard.

One game profile and username applies across the entire lobby and all games.
The base username:

- Is required before a player can start a game.
- Contains 3 to 10 letters and numbers only.
- Is normalized and moderated centrally by Laravel.
- Rejects sexual, racist, hateful, and reserved system terms.
- Receives a generated numeric discriminator not counted in the 10-character
  base-name limit.

Public form:

```text
Reader7#4821
```

Duplicate base names are allowed. The complete public handle is displayed on
leaderboards. A username change has a rolling 24-hour cooldown and updates the
display of existing results without changing ownership.

## Mandatory Game Menu

Every game has a React-rendered portrait menu.

Required contents:

- Game title.
- Play for games without meaningful saves.
- Continue when a meaningful save exists.
- New Game for games with meaningful progression.
- How to Play.
- Sound control.
- Back to Lobby.
- Confirmation before New Game overwrites an existing save.

New Game resets the active save and game-specific progression. It does not
remove verified personal bests, historical sessions, leaderboard eligibility,
or achievements already earned.

How to Play must explain visible touch controls. Keyboard shortcuts may be
listed only as optional alternatives.

## Host Boundary

The React route passes a narrow host adapter to the game:

```ts
export interface GameHost {
  mode: "player" | "sysadmin-preview";
  startSession(): Promise<{ sessionId: string }>;
  loadSave(): Promise<unknown | null>;
  saveCheckpoint(input: unknown): Promise<void>;
  completeSession(input: unknown): Promise<void>;
  returnToLobby(): void;
}
```

The real API resolves the authenticated identity from the server session. The
host must not pass learner codes, guest emails, passwords, or raw authentication
tokens into the game engine.

Game-specific payloads are validated by Zod at the frontend boundary and by
Laravel at the server boundary. Zod validation is not a substitute for server
validation.

## Portrait Stage

Games use a 9:16 reference composition.

```css
.game-page {
  min-height: 100vh;
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding: max(0.75rem, env(safe-area-inset-top))
    max(0.75rem, env(safe-area-inset-right))
    max(0.75rem, env(safe-area-inset-bottom))
    max(0.75rem, env(safe-area-inset-left));
  background: var(--color-surface-page);
}

.game-stage {
  width: min(100%, calc(100svh * 9 / 16));
  max-width: 32rem;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  position: relative;
  border: 2px solid var(--color-border-warm);
  border-radius: var(--radius-frame);
  background: var(--color-surface-frame);
  box-shadow: var(--shadow-panel-depth);
}

@media (max-aspect-ratio: 9 / 16) {
  .game-stage {
    width: 100%;
    min-height: calc(100svh - 1.5rem);
    aspect-ratio: auto;
  }
}
```

The surrounding desktop background is decorative and noninteractive. The
learner flow stays portrait on every viewport. Mobile browser bars and safe
areas must not cover controls.

## Touch and Pointer Input

- All required actions have visible touch controls.
- A mouse can operate the same controls.
- Touch targets are at least 44 by 44 CSS pixels.
- Top-down movement uses a visible directional pad or virtual stick plus
  clearly separated action controls.
- Controls cannot depend on hover.
- Keyboard input is optional and cannot unlock exclusive functionality.
- Input pauses while a blocking React dialog or achievement presentation is
  active.

## ReaDirect No-Original-Assets Starter

Games without their own graphics must use the main ReaDirect vector-game
language. The following patterns are the required baseline.

### Button

```tsx
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type GameButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement>
>;

export function GameButton({
  className = "",
  children,
  type = "button",
  ...props
}: GameButtonProps) {
  return (
    <button {...props} type={type} className={"game-button " + className}>
      <span>{children}</span>
    </button>
  );
}
```

```css
.game-button {
  min-width: 44px;
  min-height: 4.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.9rem 1.25rem;
  border: 3px solid var(--color-action-primary-depth);
  border-radius: 1.5rem;
  color: var(--color-text-on-action);
  background: var(--color-action-primary);
  box-shadow: 0 8px 0 var(--color-action-primary-depth);
  font-family: var(--font-display-family);
  font-size: var(--font-button-large);
  font-weight: 400;
  line-height: 1;
  touch-action: manipulation;
  cursor: pointer;
  transition:
    transform 140ms ease-out,
    box-shadow 140ms ease-out;
}

.game-button:active {
  transform: translateY(6px);
  box-shadow: 0 2px 0 var(--color-action-primary-depth);
}

.game-button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 4px;
}

.game-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
```

### Container

```tsx
import type { HTMLAttributes, PropsWithChildren } from "react";

export function GameContainer({
  className = "",
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div {...props} className={"game-container " + className}>
      {children}
    </div>
  );
}
```

```css
.game-container {
  width: 100%;
  padding: 1.25rem;
  border: 2px solid var(--color-border-warm);
  border-radius: var(--radius-frame);
  color: var(--color-text-primary);
  background: var(--color-surface-frame);
  box-shadow: var(--shadow-panel-depth);
}

.game-container h1,
.game-container h2 {
  margin: 0;
  font-family: var(--font-display-family);
  font-weight: 400;
  line-height: 1.1;
}

.game-container p {
  font-family: var(--font-reading-family);
  font-size: var(--font-body);
  line-height: 1.5;
}
```

Game chrome inherits Jersey 20 and the enlarged learner type scale from
`learner-flow-page`. Primary game-button text must be at least `30px` on the
supported mobile viewport. Authored reading targets and sustained instructions
switch to Lexend through `--font-reading-family` without reducing the approved
font-size token. Games must not introduce another decorative pixel font.

Do not hard-code substitute colors or add blurred corporate-style shadows.
Games with custom art may style their gameplay world independently, but their
menu, navigation, dialogs, loading, errors, and touch chrome still use shared
ReaDirect semantics.

## Saves and Refresh

Games with meaningful progression:

- Have one server-authoritative save slot per player and game.
- Save automatically at documented checkpoints.
- Version every save payload.
- Offer Continue and New Game.
- Resume from the last confirmed server checkpoint.

Simple games:

- Do not create a resumable save merely to satisfy the structure.
- Lose the active run on refresh or route exit.
- Still create server sessions and verified results.
- Preserve historical personal bests and achievements.

## Achievements

Game achievements integrate with the central achievement system. The lobby and
games consume the shared queue and `AchievementUnlockOverlay`; they must not
fork the animation, acknowledgement logic, catalog, or persistence.

Contributors provide, for each proposed achievement:

- Achievement name.
- Exact, testable unlock criteria.

Integration adds the permanent key, source game, fixed display order, placeholder
star, and future owner-produced pixel-art asset.

Achievement rules:

- Each achievement can be earned once per authenticated learner or guest
  account.
- Laravel authoritatively grants it from verified game evidence.
- New Game never removes it.
- Learners and guests use the same catalog but own separate records.
- The dashboard shows every obtainable achievement in fixed order.
- Locked achievements show a silhouette and visible criteria.
- Earned achievements fill their corresponding fixed position.

After a session, newly earned achievements are queued for the first subsequent
lobby visit. The shared overlay dims the lobby behind a centered slow-pop
presentation. Only the achievement, its name, and Tap to continue remain
prominent. Multiple achievements appear sequentially in first-earned order.

Acknowledgement is persisted after each tap. Closing the lobby leaves remaining
items queued. Reduced-motion mode uses a gentle fade without changing the
sequence.

## Leaderboards

- Learners compete only against learners.
- Verified guests compete only against verified guests.
- Each view shows the top 10 for its audience.
- A profile occupies at most one position in a leaderboard partition.
- Only its best verified result is used.
- Partitions include game key, mode, difficulty when present, and ruleset
  version.
- Game-specific score ordering is declared in GAME_DESIGN.md.
- An exact tie is resolved by the result achieved first.
- The display contains only the complete public game handle and game result.
- Learner codes, emails, names, schools, grade levels, and sections are never
  returned.

## Styling and Asset Isolation

- Custom global selectors are prohibited inside a game module.
- Custom class names start with the permanent game key.
- Browser-storage keys, event names, asset keys, and KAPLAY scene names start
  with the permanent game key.
- Runtime assets use lowercase kebab-case names.
- Another game's assets cannot be imported by path.
- Large game code and assets are lazy-loaded only after its route is selected.
- Editable sources and license evidence remain committed under the module's
  asset directories when redistribution permits.

## Contributor Workflow

1. Start from the assigned game-zero, game-one, or game-two skeleton.
2. Keep the contributor repository root identical to the slot root.
3. Complete GAME_DESIGN.md.
4. Assign a permanent game key before database migrations.
5. Choose React + KAPLAY or React + PixiJS.
6. Build the mandatory menu before gameplay entry.
7. Implement pure game logic independently of the canvas where practical.
8. Add only namespaced game-specific Laravel code and migrations.
9. Test against learner, guest, API-failure, and preview contexts.
10. Deliver source, tests, licenses, migrations, and documentation.
11. Do not edit the lobby registry; the owner registers the accepted module.

## Formal Acceptance Checklist

### Repository

- [ ] Repository root exactly matches the assigned slot.
- [ ] GAME_DESIGN.md is complete.
- [ ] No unrelated application or shared-table changes are present.
- [ ] No secrets, database dumps, build output, or restricted assets are
      committed.
- [ ] Every dependency is approved and exactly pinned.
- [ ] Phaser is absent.

### Frontend

- [ ] React uses exactly one of KAPLAY or PixiJS for the main gameplay canvas.
- [ ] The module exports only its public manifest and route.
- [ ] The route opens the mandatory menu first.
- [ ] Play or Continue, New Game where applicable, How to Play, sound, and Back
      to Lobby work.
- [ ] Engine loops, listeners, audio, canvases, and owned resources are disposed
      on every unmount.
- [ ] The module is lazy-loaded.
- [ ] Custom styles and runtime keys are namespaced.

### Portrait and access

- [ ] Required gameplay works by touch.
- [ ] Mouse input operates the same controls.
- [ ] Keyboard input is optional only.
- [ ] Phone portrait, tablet, desktop portrait-stage, and safe areas pass.
- [ ] No horizontal scrolling or hidden primary controls exist.
- [ ] Reduced motion, focus visibility, and minimum touch targets pass.
- [ ] How to Play clearly explains required controls.

### Backend and database

- [ ] The game uses the shared Laravel API and readirect_v2 schema.
- [ ] Migrations create only approved namespaced tables.
- [ ] Fresh migrate, existing-schema migrate, rollback, and re-migrate pass.
- [ ] Foreign keys, indexes, uniqueness, and deletion behavior are tested.
- [ ] The browser never submits a trusted identity or directly accesses the
      database.
- [ ] Scores and achievements require server verification.
- [ ] Preview mode cannot create persistent data.

### Saves and results

- [ ] Every normal play creates a session.
- [ ] Meaningful games have exactly one save slot and automatic checkpoints.
- [ ] Simple games correctly abandon an active run on refresh.
- [ ] New Game preserves personal bests and achievements.
- [ ] Duplicate completion requests are idempotent.
- [ ] Learner and guest leaderboards are separate.
- [ ] Top-10, personal-best, partition, and first-achieved tie rules pass.

### Achievements

- [ ] Every proposed achievement has a name and exact unlock criteria.
- [ ] Each achievement can be awarded only once per profile.
- [ ] Fixed gallery ordering and locked silhouettes are supported.
- [ ] Unread achievements queue in first-earned order.
- [ ] Tap acknowledgement persists after each presentation.
- [ ] Closing the lobby preserves the remaining queue.

### Verification

- [ ] TypeScript, ESLint, Prettier, and frontend tests pass.
- [ ] PHPUnit and Laravel Pint pass.
- [ ] Playwright covers lobby-to-menu, play, complete, return, achievement queue,
      and preview isolation.
- [ ] The supported lowest-tier mobile target maintains acceptable interaction
      responsiveness.
- [ ] The owner has reviewed licenses, database migrations, and the final
      manifest before registry entry.
