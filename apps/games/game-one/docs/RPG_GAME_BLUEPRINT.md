# Chronicles of the Lost Kingdom RPG Blueprint

Status: Draft

This document adapts the attached minigame brief to `apps/games/game-one`. The
locked lobby and `game-two` module remain unchanged.

## Concept

Chronicles of the Lost Kingdom is a short ReaDirect RPG-style minigame. The
learner enters a small village, reads natural RPG dialogue and signs, follows
directions, finds a missing map fragment, and returns it to Mapmaker Lolo Ambo.

The experience should feel like a real 2D RPG, not a quiz with RPG decoration.
Reading comprehension is shown through correct exploration and interaction.

## Scope

Include:

- One small connected 2D tile-based map.
- One playable learner character.
- Miss Estelle as guide.
- Three NPCs: Lolo Ambo, Market Vendor, Bridge Keeper.
- One short mission.
- Simple dialogue.
- Environmental and written clues.
- One collectible map fragment.
- One final mission decision.
- Optional hints.
- One completion and reward screen.
- Basic result synchronization with ReaDirect.
- Keyboard and touch controls.

Exclude:

- Large open world.
- Multiple villages.
- Combat.
- Character classes.
- Equipment systems.
- Complex inventory.
- Skill trees.
- Side quests.
- Multiple endings.
- Procedural generation.
- Multiplayer.
- Manual save slots.
- Long storyline.
- Classroom-style quiz screens.

## Route And Host Boundary

React owns:

- Route entry.
- Launch payload validation.
- Loading screen.
- Rotate-device screen.
- Error boundary.
- Main menu and exit confirmation.
- Result screen.
- ReaDirect return handling.

KAPLAY owns:

- Main gameplay canvas.
- Tile map rendering.
- Player movement.
- Collision.
- Camera.
- Interaction markers.
- Simple effects and audio triggers.

## Orientation

The attached brief requires landscape-first, touch-first responsive play:

- Desktop browsers.
- Tablets.
- Mobile devices rotated to landscape.
- Portrait devices show a friendly rotate-device screen.

This conflicts with the current repository portrait-stage standard. Do not
implement landscape until the project owner confirms that the attached brief
overrides the repository standard for this minigame.

## Map Layout

The first map should be compact enough to finish in 5 to 10 minutes.

Areas:

- Village Entrance: starting point and Miss Estelle introduction.
- Lolo Ambo's Map Table: mission start and completion point.
- Market Area: Market Vendor clue.
- River Path: direction-following area.
- Old Bridge: Bridge Keeper clue.
- Twin Waterfalls: landmark used in directions.
- Hidden Fragment Spot: final clue location and collectible item.

Map design rule: each clue should physically point the learner toward the next
area through signs, landmarks, or NPC dialogue.

## Mission Flow

1. Launch from ReaDirect.
2. Validate launch context.
3. Load assets.
4. Enter the village.
5. Miss Estelle introduces the mission.
6. Lolo Ambo explains the missing map fragment.
7. Market Vendor points toward the river path.
8. Bridge Keeper explains the old bridge and twin waterfalls.
9. Learner follows written and environmental clues.
10. Learner collects the map fragment.
11. Learner returns to Lolo Ambo.
12. Completion scene plays.
13. Result payload is submitted or queued.
14. Learner returns safely to dashboard.

## Content Data

Keep content data separate from mechanics.

Suggested files:

- `src/game/content/npcs.ts`
- `src/game/content/dialogue.ts`
- `src/game/content/clues.ts`
- `src/game/content/mapAreas.ts`
- `src/game/content/missionSteps.ts`

Example NPC shape:

```ts
interface NpcDefinition {
  id: "miss-estelle" | "lolo-ambo" | "market-vendor" | "bridge-keeper";
  displayName: string;
  areaKey: string;
  dialogueKeys: string[];
  role: "guide" | "quest-giver" | "clue-giver";
}
```

## Natural Reading Design

Do not show direct quiz questions. Use applied reading tasks:

- A sign says the river path bends behind the blue stall; the learner navigates
  behind the correct stall.
- The Market Vendor says the old bridge is past the fruit crates; the learner
  follows the described landmark.
- The Bridge Keeper mentions twin waterfalls; the learner searches near the two
  matching waterfalls.
- The final decision asks what action to take with the fragment inside the RPG
  world, not as a quiz screen.

Dialogue style:

- Short chunks.
- Elementary-friendly vocabulary.
- Repeatable lines.
- Clear next-dialogue indicator.
- Encouraging and neutral correction feedback.

## Controls

Desktop:

- WASD or arrow keys: move.
- E, Enter, or Space: interact.
- Escape: pause or exit confirmation.

Touch:

- Large directional pad.
- Large interaction button.
- Pause button.
- Optional hint button.

Touch controls should be anchored away from dialogue and important map objects.

## Game State Model

Required states:

- Loading.
- Introduction.
- Exploring.
- Dialogue.
- Hint display.
- Item collected.
- Returning to quest giver.
- Mission completed.
- Results submitting.
- Results successfully submitted.
- Offline or failed submission.
- Paused.
- Exit confirmation.
- Unexpected error.

Use XState only if these transitions become difficult to keep correct with
plain TypeScript state.

## Result Payload

Validate inbound and outbound data with Zod.

Inbound launch context:

- Learner ID.
- Game session ID.
- Learner display name.
- Difficulty level.
- Return URL.
- Access token or authenticated host context.
- Optional accessibility preferences.

Outbound result:

- Learner ID.
- Game session ID.
- Minigame identifier.
- Session start and completion timestamps.
- Completion status.
- NPCs interacted with.
- Clues discovered.
- Hints requested.
- Incorrect locations or interactions.
- Map fragment collected.
- Mission completed.
- Elapsed play time.
- Exit reason.
- Client-generated unique attempt ID.

Never put sensitive information in query parameters, console logs, source code,
or local storage.

## Local Sync Queue

If result submission fails:

- Save the pending result to a temporary local queue.
- Mark it as waiting to synchronize.
- Retry when connectivity returns.
- Use the attempt ID to prevent duplicate submissions.

IndexedDB is acceptable only for temporary progress or recovery. Keep sensitive
host credentials out of local storage.

## Suggested Architecture

Suggested directories:

- `src/GameOneRoutePage.tsx`
- `src/game/kaplay/createGame.ts`
- `src/game/kaplay/scenes/villageScene.ts`
- `src/game/map/mapConfig.ts`
- `src/game/player/playerController.ts`
- `src/game/input/keyboardInput.ts`
- `src/game/input/touchInput.ts`
- `src/game/interactions/interactionSystem.ts`
- `src/game/dialogue/dialogueSystem.ts`
- `src/game/mission/missionState.ts`
- `src/game/results/resultTracker.ts`
- `src/game/integration/readirectAdapter.ts`
- `src/game/integration/schemas.ts`
- `src/game/sync/localResultQueue.ts`
- `src/game/assets/assetManifest.ts`

## Prototype Assets

Use temporary original placeholders:

- Colored terrain tiles.
- Basic learner sprite.
- Basic Miss Estelle sprite.
- Basic NPC sprites with labels.
- Map fragment icon.
- Sign and clue icons.
- Placeholder sound effects.

Centralize asset keys so production assets can replace placeholders later.

## Testing Plan

Add tests for:

- Route rendering.
- KAPLAY initialization and cleanup.
- Movement boundaries.
- Collision.
- NPC interaction.
- Dialogue progression.
- Clue tracking.
- Hint tracking.
- Fragment collection.
- Mission completion.
- Zod payload validation.
- Duplicate-submission prevention.
- Failed-submission recovery.
- Dashboard return.
- Keyboard controls.
- Touch controls.
- Landscape-orientation handling.

## Definition Of Done

- Launches through the React route.
- Uses KAPLAY as the only gameplay engine.
- Phaser is absent.
- Plays with keyboard and touch controls.
- Supports the approved orientation behavior.
- Can be completed in 5 to 10 minutes.
- Integrates reading naturally through RPG interactions.
- Lets the learner collect the map fragment and return it to Lolo Ambo.
- Validates results and prepares ReaDirect synchronization.
- Recovers failed submissions without duplicate records.
- Safely returns to the ReaDirect dashboard.
- Required tests pass.
