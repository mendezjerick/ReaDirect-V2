# ReaDirect Game One

This directory is contributor-ready as game slot one. Keep it at
`apps/games/game-one` in the standalone starter so it can be merged without
relocating files. Do not edit `apps/games/lobby` or game two.

Before development, complete GAME_DESIGN.md. Replace placeholder names and the
manifest only after the permanent game key has been assigned. The frontend must
use React with exactly one approved engine: KAPLAY or PixiJS. Its menu, dialogs,
navigation, loading, errors, touch chrome, short prompts, reading-panel
questions, and transition copy use the host application's self-hosted Pixelify
Sans face through the `.game-route`-scoped `--game-ui-font` variable and the
enlarged learner scale. Do not bundle another decorative pixel font or apply
this exception outside `.game-route`.

The Laravel package is not registered in apps/api until the game passes its
integration checklist.
