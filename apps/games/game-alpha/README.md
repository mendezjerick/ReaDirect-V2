# ReaDirect Game Alpha

This directory contains Alphabet Defender, an isolated portrait pixel shooter
built with React and PixiJS. Work on Game Alpha stays within this directory
until the project owner separately approves an integration change.

The contributor repository root must match this directory exactly so it can be
merged without relocating files. `GAME_DESIGN.md` is the gameplay and scoring
source of truth. The public package exports only the route and slot identifier.

The frontend slot is active at `/learner/games/game-alpha` and appears first in
the learner game lobby. Its Laravel service provider, catalog record,
migrations, persistence, and APIs remain unregistered until those integration
slices are approved separately.

## Local verification

```text
pnpm --filter @readirect/game-alpha typecheck
pnpm --filter @readirect/game-alpha test
```

The module intentionally has no standalone deployment or alternate backend.

## Credits

Sound effects by SoundsbyDane. The supplied audio is licensed for commercial
use with attribution; retain this credit in distributed versions of the game.
