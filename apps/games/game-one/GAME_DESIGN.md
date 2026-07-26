# Game One Design Specification

Status: Draft

## Identity

- Permanent game key: pending maintainer assignment
- Project name: Chronicles of the Lost Kingdom
- Working title: Chronicles of the Lost Kingdom
- Display title: pending maintainer approval
- Intended engine: KAPLAY, pinned version pending maintainer approval

## Specification Conflicts To Resolve

The attached project brief is the active game concept for this draft, but it
conflicts with the current repository standards in these areas:

- Orientation: repository standards require portrait 9:16, while the brief
  requires landscape-first with a rotate-device screen for portrait devices.
- Engine: repository standards allow KAPLAY or PixiJS, while the brief requires
  KAPLAY only and explicitly prohibits PixiJS for the main gameplay canvas.
- Styling stack: the brief allows Tailwind CSS Core, while the starter currently
  uses plain CSS and does not include Tailwind.

These items need project-owner approval before implementation. Until resolved,
this document follows the attached brief for game design and preserves the
repository's locked lobby and route contract.

## Educational Objective

Chronicles of the Lost Kingdom is a bounded, 5 to 10 minute, 2D RPG-style
reading comprehension minigame for ReaDirect. It supplements the learner
dashboard experience and must not become a separate full-scale RPG or a
replacement for ReaDirect's primary oral reading modules.

The learner explores a small village, reads natural in-world text, follows NPC
directions, finds a missing map fragment, and returns it to Mapmaker Lolo Ambo.
Reading comprehension is tested through navigation, interaction choices, clues,
and final mission decisions rather than classroom-style quiz screens.

## Game Loop

1. ReaDirect launches the minigame route with learner and session context.
2. React validates launch data and shows a loading screen.
3. KAPLAY initializes the landscape gameplay canvas.
4. The learner enters the village and meets Miss Estelle.
5. Mapmaker Lolo Ambo explains that a map fragment is missing.
6. The learner speaks with the Market Vendor and Bridge Keeper.
7. The learner follows directions through the market, river path, old bridge,
   and twin waterfalls.
8. The learner locates and collects the missing map fragment.
9. The learner returns the fragment to Lolo Ambo.
10. A short completion scene and reward screen appear.
11. The game validates and submits the result to ReaDirect.
12. The learner can safely return to the ReaDirect dashboard.

Success condition: collect the map fragment and return it to Mapmaker Lolo Ambo.

Failure condition: no harsh game-over state. The learner may exit early, pause,
request hints, or recover from failed result submission.

Expected session length: 5 to 10 minutes.

## Controls

Desktop:

- WASD or arrow keys for eight-direction movement.
- E, Enter, or Space for interaction.
- Escape for pause or exit confirmation.

Touch devices:

- Large virtual directional pad.
- Large interaction button.
- Pause button.
- Optional hint button.

Touch controls must avoid covering important characters, dialogue, clues, and
map locations. The game area must prevent accidental browser scrolling, zooming,
and text selection.

## Map And Characters

Map areas:

- Village entrance.
- Lolo Ambo's map table.
- Market area.
- River path.
- Old bridge.
- Twin waterfalls.
- Hidden map-fragment location.

Characters:

- Learner Character: player-controlled, supports eight-direction movement, and
  interacts with NPCs, signs, clues, and the quest item.
- Miss Estelle: introduces the mission, provides optional hints, and gives
  encouraging feedback without constantly interrupting gameplay.
- Mapmaker Lolo Ambo: gives the mission, explains the missing map fragment, and
  receives the fragment at the end.
- Market Vendor: gives a clue about the river path.
- Bridge Keeper: gives information about the old bridge and waterfalls.

## Reading Integration

Reading must be embedded naturally through:

- NPC dialogue.
- Location signs.
- Written directions.
- Environmental clues.
- A compact quest objective.
- Final mission decisions.
- Optional contextual hints.

The game must not show direct quiz prompts such as "What is the main idea?",
"Where did Lolo Ambo say to go?", or "Choose the correct answer." The learner
applies reading by moving to the right location, choosing an in-world action, or
interacting with the correct object.

Text must be concise, age-appropriate, and understandable for elementary
learners.

## Game States

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

XState may be used only if the implementation needs explicit state-machine
coordination. Otherwise, keep state management local and simple.

## Scoring And Results

This minigame should not use speed-based scoring and should not punish learners
for requesting hints.

Track result evidence:

- Learner ID from validated host context.
- Game session ID from validated host context.
- Minigame identifier.
- Session start timestamp.
- Completion timestamp.
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

The result payload must be validated with Zod before submission. Laravel remains
authoritative for authentication, identity, persistence, result acceptance, and
duplicate prevention.

## Achievements

Possible achievements for maintainer review:

- Kingdom Helper: return the missing map fragment to Lolo Ambo.
- Careful Explorer: discover all environmental clues.
- Friendly Listener: speak with all three NPCs before collecting the fragment.
- Independent Traveler: complete the mission without opening optional hints.
- Safe Return: submit or queue a valid result and return to the dashboard.

Permanent achievement keys and fixed display ordering are assigned during
integration.

## Restart And Recovery

Manual save slots are out of scope.

If result submission fails:

- Store a pending result locally.
- Clearly show that the result is waiting to synchronize.
- Retry safely when connectivity returns.
- Use the unique attempt ID to prevent duplicate result records.

IndexedDB may be used only for temporary local progress or recovery. Sensitive
information must not be stored in query parameters, console logs, source code, or
local storage.

## Assets

Prototype assets:

- Colored tiles.
- Basic character sprites.
- Clearly labeled NPC placeholders.
- Temporary icons.
- Placeholder sound effects.

Asset paths should be centralized so final art can replace placeholders without
rewriting gameplay logic. Do not copy copyrighted assets from commercial games.
Runtime assets must be local to the module and licensed before handoff.

## Interface Typography

Game route UI, menus, loading, errors, result screens, and pause controls should
preserve the ReaDirect learner interface style. Dialogue and written clues must
use readable text sizes, strong contrast, short chunks, and a clear next-dialogue
indicator.

Dialogue can be repeated. Avoid flashing effects, harsh failure language, and
small touch targets.

## Database And Integration Needs

The game should receive validated launch context:

- `learnerId`
- `gameSessionId`
- `learnerDisplayName`
- `difficultyLevel`
- `returnUrl`
- Access token or authenticated host context
- Optional accessibility preferences

Do not hardcode production URLs, authentication credentials, learner identity, or
backend assumptions. TanStack Query may be used only for backend communication if
it is added with approval.

All integration payloads must use Zod schemas. Browser code must never connect
directly to PostgreSQL, create parallel identity APIs, or award achievements
without a committed backend response.

## Testing Requirements

Add tests for:

- Game route rendering.
- KAPLAY initialization and cleanup.
- Player movement boundaries.
- Collision behavior.
- NPC interaction.
- Dialogue progression.
- Clue tracking.
- Hint tracking.
- Quest-item collection.
- Mission-completion conditions.
- Result-payload validation.
- Duplicate-submission prevention.
- Failed-submission recovery.
- Return-to-dashboard behavior.
- Keyboard controls.
- Touch controls.
- Landscape-orientation handling.

## Phased Implementation Plan

Phase 1: Foundation

- Create the game route and host boundary.
- Initialize the KAPLAY canvas.
- Add loading, error, orientation, pause, and exit handling.

Phase 2: Core Gameplay

- Add the connected tile map, player movement, camera, collision, and
  interaction system.
- Implement keyboard and touch controls.

Phase 3: Mission Content

- Add Miss Estelle, Lolo Ambo, Market Vendor, Bridge Keeper, dialogue, clues,
  map fragment collection, and completion logic.

Phase 4: Integration

- Add validated ReaDirect launch data.
- Add result tracking, result submission, offline recovery, and safe dashboard
  return.

Phase 5: Testing And Polish

- Add automated tests.
- Fix functional and responsive issues.
- Optimize asset loading and game lifecycle cleanup.
