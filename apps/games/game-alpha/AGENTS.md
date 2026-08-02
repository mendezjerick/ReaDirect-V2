# Game Alpha Working Scope

These instructions apply to the entire `apps/games/game-alpha/` subtree.

- Keep all Game Alpha implementation, tests, documentation, assets, styles,
  dependencies, and game-specific backend code inside this directory.
- Do not modify the game lobby, another game, the web host, the API host,
  shared packages, repository standards, or the workspace lockfile unless the
  project owner separately approves the exact integration change.
- Do not import implementation code or assets from another game.
- Keep CSS route-scoped beneath `.game-route.game-alpha` or `.game-alpha` and
  prefix custom classes, storage keys, events, asset keys, and scene names with
  `game-alpha`.
- Do not register or activate this game from within this folder. Lobby, route,
  API-provider, catalog, and database activation remain owner-controlled
  integration steps.
- Do not commit installed dependencies, generated builds, coverage output, or
  TypeScript build metadata.
