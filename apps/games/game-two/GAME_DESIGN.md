# Game Two Design Specification

Status: Draft

## Identity

- Permanent game key: `ottertale`
- Display title: OtterTale
- Intended engine: PixiJS (via `@pixi/react`)

## Educational Objective

The game teaches and reinforces basic English spelling and vocabulary recognition (e.g., Apple, Orange, Strawberries) under time and action constraints. It is intended for young learners and ESL students who need to practice quickly identifying correct spelling variations (e.g., "apple" vs "aple") to improve reading reflexes.

## Game Loop

The player navigates a 2D side-scrolling environment. Repeated actions include running, jumping over obstacles, stomping on slime enemies, collecting coins to fill in missing letters of a target word, and grabbing fruits to trigger multiple-choice spelling quizzes for temporary buffs.
*   **Success condition:** Collect enough coins to fully spell the stage's target word and reach the finish line.
*   **Failure condition:** Touching the damage hitbox (sides/bottom) of a slime enemy without an invincibility buff.
*   **Expected session length:** 1 to 3 minutes per stage.

## Controls

The game requires mobile-first touch controls via on-screen virtual UI buttons:
*   **Move Left:** Touch/Hold `<` button (Equivalent: Left Arrow / A key)
*   **Move Right:** Touch/Hold `>` button (Equivalent: Right Arrow / D key)
*   **Jump:** Touch `^` button (Equivalent: Up Arrow / W key / Spacebar)
*   **Pause/Menus:** Touch the UI buttons (Equivalent: Mouse Click)
Mouse behavior exactly mirrors touch behavior by clicking and holding the virtual buttons. Keyboard controls act as an optional enhancement.

## Scoring

*   **Formula:**
    *   Coin collected: +1 point
    *   Slime defeated: +2 points
    *   Spelling quiz answered correctly: +5 points
*   **Valid range:** 0 to ~100 points per stage, depending on enemy count.
*   **Leaderboard modes:** High Score (per stage).
*   **Difficulty scopes:** Normal (fixed enemy paths, generous jump physics).
*   **Ruleset version:** 1.0
*   **Server evidence:** The client will submit a payload at the end of a stage containing `coins_collected`, `slimes_defeated`, and `quizzes_passed`. The server multiplies these by their respective point values to verify the final submitted score.

## Achievements

*   **First Steps:** Clear the Tutorial stage. (Criteria: Trigger the `hasWon` state on Stage ID 0).
*   **Spelling Apprentice:** Complete a target word and clear Stage 1. (Criteria: Complete the word "APPLE" and reach the finish line).
*   **Fruit Ninja:** Answer 3 spelling quizzes correctly in a single stage. (Criteria: Pass 3 quizzes in one run without dying).
*   **Slime Bane:** Defeat 10 slimes across all play sessions. (Criteria: Cumulative server-side counter of slimes stomped reaches 10).
*   **Vocabulary Master:** Clear all available stages. (Criteria: Clear Stage 3).

## Save Behavior

Progression is currently meaningful only for unlocking subsequent stages. Refreshing the browser abandons the current run and resets the player to the Lobby with zero points for that active session.
*   **Checkpoints:** None mid-stage. Saving occurs only upon stage completion.
*   **Save Payload:** A one-slot save payload stores the `highest_stage_unlocked` integer.
*   **Restart Behavior:** Restarts reset the player to the beginning of the current stage, resetting the score, coin states, fruit states, and slime states.
*   **Save Schema Version:** 1.0

## Assets

*   **Original/Third-party Assets:**
    *   Visuals: `knight.png`, `world_tileset.png`, `coin.png`, `slime_green.png`, `slime_purple.png`, `platforms.png`, `fruit.png`.
    *   Audio: `time_for_adventure.mp3` (BGM), `coin.wav`, `explosion.wav`, `hurt.wav`, `jump.wav`, `power_up.wav`, `tap.wav` (SFX).
*   **Licenses:** Third-party assets (assuming CC0/Open Source for standard placeholder sprites).
*   **Runtime formats:** `.png` (textures/spritesheets), `.mp3` (background music), `.wav` (sound effects).
*   **Starter:** Uses the ReaDirect no-original-assets visual starter framework.

## Interface Typography

Game menus, overlays, and chrome inherit **Jersey 20** and the shared enlarged learner type scale. Authored reading content (such as the Tutorial instructions and quiz prompt questions) uses **Lexend** for optimal readability.

*Verification:* Gameplay-world text (like the floating target word UI) will be explicitly styled to inherit the shared standard fonts to ensure it does not introduce a second decorative pixel font or artificially synthesize Jersey 20 weights.

## Database Needs

*   **Shared records:** Uses standard ReaDirect user and high-score table structures.
*   **Game-specific tables:**
    *   `ottertale_runs`:
        *   `id` (UUID, Primary Key)
        *   `user_id` (Foreign Key -> users)
        *   `stage_id` (Integer)
        *   `score` (Integer)
        *   `coins_collected` (Integer)
        *   `slimes_defeated` (Integer)
        *   `quizzes_correct` (Integer)
        *   `completed_at` (Timestamp)
    *   `ottertale_progression`:
        *   `user_id` (Foreign Key -> users, Primary Key)
        *   `highest_stage_unlocked` (Integer)
        *   `total_slimes_defeated` (Integer, for achievement tracking)
*   **Retention rules:** Retain top 10 runs per user per stage; prune runs older than 1 year unless they are a personal best.
*   **Migration dependency:** Must run after the core `users` and `achievements` tables are established in the shared database.
