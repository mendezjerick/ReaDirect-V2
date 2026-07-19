# ReaDirect Game Technology Stack

This standard narrows the global ReaDirect technology stack for game
development. It applies to the game lobby, game-one, game-two, contributor
repositories, game-specific Laravel code, and game-specific tests.

Only technologies named here and in READIRECT_REVAMP_TECH_STACK.md may be used.
Contributors must not add, replace, or substitute a runtime, engine, framework,
state library, persistence library, backend, or database technology without
written project-owner approval.

## Approved Game Combinations

Every game must use React and exactly one game renderer or engine:

```text
React + KAPLAY

or

React + PixiJS
```

KAPLAY and PixiJS must not power the same main gameplay canvas. A contributor
selects either combination without requiring engine-specific owner approval.
The selected combination must be recorded in GAME_DESIGN.md.

Phaser is prohibited and must never be installed, imported, bundled, copied, or
used through a CDN. Unity WebGL, Godot web exports, Three.js, Babylon.js, custom
Node backends, and other unapproved game engines are also prohibited.

## Responsibility Boundary

### React

React owns:

- The route component and game lifecycle boundary.
- The mandatory game menu.
- Loading, failure, confirmation, and accessibility UI.
- Touch controls rendered as normal accessible controls where practical.
- Communication with the ReaDirect API adapter.
- Returning to the lobby.
- Mounting and fully disposing the selected game runtime.

React Router owns page-level navigation. KAPLAY scenes or PixiJS state must not
replace application routes.

### KAPLAY

KAPLAY may own:

- The main 2D gameplay canvas.
- Scenes, game objects, components, collisions, cameras, layers, and audio.
- Tile-based levels and bounded top-down worlds.
- NPC patrol, pathfinding, and gameplay animation.
- Per-frame input and rendering.

KAPLAY must be installed from the pinned pnpm dependency. It must be initialized
with global mode disabled, attached to the React-owned canvas, and terminated
when the route unmounts. Global imports and CDN scripts are prohibited.

Required lifecycle shape:

```tsx
useEffect(() => {
  const game = kaplay({
    canvas: canvasRef.current ?? undefined,
    global: false,
  });

  registerScenes(game, host);

  return () => {
    game.quit();
  };
}, [host]);
```

The exact pinned stable KAPLAY version is set by the maintainer after the
integration smoke test. Preview, alpha, beta, release-candidate, caret, tilde,
latest, and unpinned versions are prohibited.

### PixiJS

PixiJS may own:

- The main 2D gameplay canvas.
- Custom sprites, effects, particles, animation, and rendering.
- Bespoke lightweight interactions that do not need a full game engine.

The React component must stop tickers, detach listeners, release textures owned
by the module, and destroy its PixiJS application on unmount.

### Laravel

Laravel owns:

- Authenticated player identity.
- Game username creation and cooldown enforcement.
- Game-session creation and completion.
- Automatic checkpoint persistence.
- Server-authoritative score verification.
- Progression, personal bests, leaderboards, and achievements.
- System Administrator preview isolation and player inspection.

The browser must never connect directly to PostgreSQL or use a second game
backend.

## Approved Supporting Frontend Technologies

The following existing technologies may be used when their purpose is present:

- TypeScript for all game application code.
- Vite for development and production bundling.
- React Router for host routes.
- Tailwind CSS Core and ReaDirect design tokens for interface layout.
- Motion for React for interface motion outside the per-frame game loop.
- XState for complex application or session workflows.
- TanStack Query for Laravel API server state.
- React Hook Form for forms.
- Zod for client boundary validation.
- Web Audio API for approved custom audio behavior.
- Canvas, WebGL, IndexedDB, and browser APIs already approved globally.

Do not duplicate state across KAPLAY or PixiJS, React, and XState. Per-frame game
state belongs to the selected engine. Remote state belongs to TanStack Query.
React owns interface state. XState is used only when a real state-machine
workflow makes it necessary.

## Tiled Map Editor

Tiled Map Editor is an optional approved asset-production tool for tile-based
games. It does not run in the browser and must not become a second application
runtime.

Committed map exports must:

- Use JSON when the selected loader supports it.
- Use lowercase kebab-case names.
- Reference licensed, committed runtime tilesets.
- Keep collision, trigger, spawn, and educational metadata documented.
- Be validated during tests or the asset build.
- Exclude absolute workstation paths.

If the chosen KAPLAY workflow does not directly support a Tiled feature, the
game may include a small typed converter owned by that module. Adding a separate
map runtime library still requires approval.

## Portrait and Input Standard

Every game is portrait-only.

- Phones use the available portrait viewport.
- Tablet and desktop display a centered portrait game stage.
- The remaining desktop area is a noninteractive ReaDirect background.
- A 9:16 stage is the design reference and must scale responsively.
- The game must not force the browser or operating system to rotate.
- Required controls are touch-first.
- Mouse or pointer input must operate the same visible controls.
- Keyboard controls may be optional enhancements only.
- Required actions must not depend on hover, right-click, or precise pointer
  movement.

## Online Operation

Games are online experiences. Offline gameplay and cross-device conflict
resolution are not required.

When the API becomes unavailable:

- Never claim that a save, score, reward, or achievement was persisted.
- Preserve a pending checkpoint in memory long enough to retry when practical.
- Show a clear retry or return-to-lobby action.
- Do not submit an unverifiable score to a leaderboard.
- Do not silently use localStorage as the authoritative save.

## Visual Design Technologies

Host chrome always follows the ReaDirect design system:

- Lobby and game menus.
- Navigation and Back to Lobby controls.
- Loading, errors, confirmations, and empty states.
- Achievement presentation.
- Touch-control chrome outside the game canvas.

A game may use its own art direction inside the gameplay stage. A simple game
without original art or graphics must use the ReaDirect starter button,
container, typography, color-token, and fake-depth patterns documented in
READIRECT_REVAMP_GAME_MODULE_STANDARD.md.

Hard-coded theme colors are prohibited in shared or no-original-assets UI.
Consume semantic variables from @readirect/design-tokens.

## Assets

Approved browser-ready formats include:

- SVG, WebP, AVIF, and optimized PNG images.
- OGG, MP3, and WebM audio where supported by the application standard.
- JSON map, atlas, animation, and configuration data.
- WOFF2 fonts already approved by ReaDirect.

Runtime assets belong in the module's src/assets directory and are imported by
the module so Vite can fingerprint them. Editable sources and licenses belong
in the module's assets/source and assets/licenses directories.

Unlicensed assets, remote hotlinks, data-URI asset dumps, and runtime CDN
dependencies are prohibited.

## Backend and Database Stack

Game backends use only:

- PHP and Laravel.
- Laravel validation, authorization, service classes, Eloquent, and migrations.
- PostgreSQL through the configured Laravel connection and readirect_v2 schema.
- PHPUnit and Laravel Pint.

Games must not introduce a Node, Python, serverless, Firebase, Supabase, or
direct-PostgreSQL backend. The Python ASR and TTS services remain specialized
ReaDirect services and are not general game backends.

## Testing and Quality

Every game uses:

- TypeScript compiler checks.
- ESLint and Prettier.
- Vitest for pure game and frontend logic.
- React Testing Library for React interface behavior.
- Playwright for lobby, menu, gameplay, exit, and portrait integration.
- PHPUnit for API, authorization, score, save, and achievement behavior.
- Laravel Pint for PHP formatting.

Canvas mechanics that are difficult to query semantically must expose a narrow
test adapter in non-production tests. Tests must not depend only on screenshots
or arbitrary delays.

## Dependency Rules

- pnpm is the only JavaScript package manager.
- Composer is the only PHP package manager.
- Dependencies use exact versions already pinned by the root workspace.
- Each contributor declares only the chosen game engine.
- The maintainer owns lockfile integration.
- A game must be lazy-loaded from its route.
- Unused experimental dependencies must be removed before acceptance.
- Copying library source into the repository to avoid dependency approval is
  prohibited.

## Maximum Game Scope

The maximum approved scope is a bounded, single-player, 2D top-down educational
RPG with portrait controls, multiple contained maps, NPC interaction, simple
quests or combat, automatic checkpoints, progression, achievements, and
server-verified scoring.

The following are outside the approved module scope:

- 3D games.
- Massive or streaming open worlds.
- Real-time multiplayer or MMO systems.
- User-to-user chat.
- User-generated executable content.
- Native downloadable clients.
- Separate deployment domains or microfrontends.
- Physics or graphics requirements that cannot meet the supported mobile
  performance target.

If a proposed mechanic exceeds this standard, development pauses for a project
owner technology and scope review.
