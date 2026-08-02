# Game Alpha Design Specification

Status: Approved for module implementation; host activation remains separate.

## Identity

- Permanent game key: `game-alpha`
- Working display title: Alphabet Defender
- Intended engine: React + PixiJS 8
- Reference stage: 270 × 480 logical pixels in a responsive 9:16 frame

## Educational Objective

Learners distinguish alphabet glyphs from hostile shapes while tracking moving
targets under time pressure. One protected letter from A–Z appears in every
wave. Shooting that letter is friendly fire and triggers the complete normal
ship-death sequence.

## Game Loop

The player moves a pixel-built ship horizontally, fires upward, destroys forty
hostile blocks, and protects one alphabet ally. Hostiles enter in groups, settle
into a moving formation, dive, fire, transform, and use capture abilities.

Every normal wave ends when all hostile blocks are destroyed. Challenge waves
at stages 3, 7, and 11 send forty targets through bounded attack paths and
calculate the retained hit bonus. After stage 11, progression cycles through
the later pattern set with an increasing visible stage offset. The run ends
when no hearts remain.

The protected letter never attacks, awards no points, and does not count toward
wave completion. If shot, it exits immediately and the player loses the active
ship through the same explosion, delay, heart deduction, and respawn flow as an
enemy collision. Tractor-beam capture, captured-fighter destruction, rescue,
and double-ship play remain part of the game.

## Controls

- Required visible touch controls: move left, fire, and move right.
- Pointer dragging across the gameplay stage moves the ship horizontally.
- Mouse users can operate the same visible controls.
- Optional keyboard controls: Left/Right or A/D to move and Space to fire.
- Pause, sound, and return-to-menu remain accessible React controls.

## Scoring

Ruleset version: `game-alpha-score-v1`.

Retained score values:

| Target state                  | Points |
| ----------------------------- | -----: |
| Basic block in formation      |     50 |
| Basic block diving            |    100 |
| Aggressive block in formation |     80 |
| Aggressive block diving       |    160 |
| Commander block in formation  |    150 |
| Commander block diving        |    400 |
| Commander with one escort     |    800 |
| Commander with two escorts    |  1,600 |
| Transformed block             |    160 |
| Captured fighter destroyed    |  1,000 |

A challenge stage awards `hits × 100`, or 10,000 points for all forty hits.
One extra heart is awarded at 30,000 points and every additional 30,000 points.
The initial displayed high-score floor is 20,000. The authoritative personal
best will be persisted by the authenticated host integration, not browser
storage.

## Achievements

Proposals for later owner review:

- Alphabet Guardian: clear five waves without shooting the protected letter.
- Perfect Formation: complete a challenge wave with forty hits.
- Rescue Formation: recover a captured fighter and form the double ship.

## Save Behavior

The initial implementation is a score run without meaningful checkpoint
progression. Refresh abandons the current run. Only verified completed-run
results and personal bests require host persistence.

## Assets

Ships, enemies, letters, projectiles, explosions, and the scrolling starfield
are drawn procedurally with PixiJS. No Galaga artwork or background is used.

The project owner supplied matching MP3 and PCM-in-Ogg source effects under
`assets/source/`. Selected runtime copies use semantic lowercase kebab-case
names. MP3 files are copied unchanged; Ogg runtime files are re-encoded as
Vorbis rather than shipping the source PCM container. The event-to-source
selection is fixed in `docs/AUDIO_MAP.md` and must not be changed based on the
source filename's apparent meaning.

Audio license evidence is still required in `assets/licenses/` before
activation or distribution.

## Database Needs

The game uses the core game session, result, score, personal-best, leaderboard,
and achievement contracts. No game-specific table is currently required.
