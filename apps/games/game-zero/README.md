# ReaDirect Game Zero

This directory reserves the Game Zero integration boundary in the main
ReaDirect application. Its public contract is:

- workspace package: `@readirect/game-zero`
- learner route: `/learner/games/game-zero`
- public route component: `GameZeroRoutePage`
- lobby return route: `/learner/games`

The standalone Game Zero project must preserve this directory shape and public
contract so its completed source can replace this placeholder without changing
the lobby or unrelated learner routes.

Before standalone development begins, carry this `GAME_DESIGN.md` and the
following app-level standards into the new project for context:

- `READIRECT_REVAMP_GAME_MODULE_STANDARD.md`
- `READIRECT_REVAMP_GAME_INTEGRATION_BOUNDARY_STANDARD.md`
- `READIRECT_REVAMP_GAME_TECH_STACK.md`
- `READIRECT_REVAMP_GAME_DATABASE_AND_API_STANDARD.md`
- `READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`
- `READIRECT_REVAMP_FRONTEND_DESIGN_SYSTEM.md`
- `READIRECT_REVAMP_VIEWPORT_STANDARD.md`
- `READIRECT_REVAMP_PROJECT_STRUCTURE.md`
- `READIRECT_REVAMP_TECH_STACK.md`

The existing integration-boundary standard is written for Game One. Use its
isolation rules as the baseline, replacing Game One paths, package names, and
routes with the Game Zero contract above. Game Zero must treat the lobby, Game
One, Game Two, and all non-game application code as owner-controlled.
