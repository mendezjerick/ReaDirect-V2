# ReaDirect Results And Completion Presentation Standard

Purpose: define the learner-facing design language, responsive layout,
interaction, animation, Clara behavior, and achievement handoff for every
result and completion screen in ReaDirect-V2.

This document is the source of truth for:

- Assessment Part 1 Results.
- Assessment Part 2 Results, which present the final reading score and profile.
- Required-lesson completion results.
- Diagnostic and Final Assessment completion.
- The final Reading Journey congratulatory page and achievement collection.

It complements, but does not replace:

- `READIRECT_REVAMP_ASSESSMENT_GUIDE.md` for scoring, branching, labels, and
  result timing.
- `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md` for lesson completion and
  separately persisted lesson-component results.
- `READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md` for authoritative awards,
  queueing, acknowledgement, and the shared slow-pop unlock presentation.
- `READIRECT_REVAMP_FRONTEND_DESIGN_SYSTEM.md` for tokens, typography, shared
  buttons, surfaces, fixed unavailable styling, and accessibility.
- `READIRECT_REVAMP_CLARA_LIVE2D_SPECIFICATION.md` for Clara's crop,
  expressions, speaking overlay, and audio-level behavior.
- `READIRECT_REVAMP_VIEWPORT_STANDARD.md` for required viewports and safe-area
  rules.

## Authority Boundary

This standard owns presentation only. It must never:

- Recalculate an assessment or lesson score in React.
- Change a branch, profile, lesson order, completion rule, or achievement
  criterion.
- Treat a visual animation as proof that a result or award committed.
- Merge separately persisted lesson or assessment results into a new score.
- Reveal active-assessment item correctness before an approved result page.

Laravel remains authoritative. A result screen renders only committed result,
progression, and achievement data returned by the application API.

## Top Experience Rules

1. Every result screen must feel rewarding, tactile, and alive without becoming
   visually noisy.
2. All result and completion pages are non-scrollable learner-flow pages on
   mobile, tablet, and desktop.
3. Use the existing learner background, semantic theme variables, Jersey 20
   typography, vector surfaces, solid fills, and fake downward depth.
4. Gradients, glass blur, photographic effects, score fireworks, and raster
   result backgrounds are prohibited.
5. Ma'am Clara remains visible on every result and completion page. On mobile,
   she remains in the lower-left using the canonical square passport crop.
6. The result itself is the largest information unit. The primary action is the
   largest control. Clara supports the result without covering either.
7. Celebration intensity increases with milestone importance; ordinary result
   pages must not visually compete with the final Reading Journey celebration.
8. Essential values are never hidden behind a tap, carousel, hover, tooltip,
   animation, color, or audio.
9. All recurring presentation is implemented through shared components. A
   Part 1 page, Part 2 page, lesson result, and finale must not create separate
   card, particle, counter, or achievement systems.
10. Motion runs once, settles completely, and leaves a calm readable screen.

## Screen Taxonomy And Route Order

| Screen | When it appears | Primary purpose | Celebration level |
| --- | --- | --- | --- |
| Part 1 Results | At the branch point defined by the Assessment Guide | Present the committed `0-30` Part 1 Score and its exact assessment level | Light |
| Part 2 Results | After eligible Task 3A and Task 3B results commit | Present the final reading score, final profile, reading accuracy, and comprehension as separate facts | Medium |
| Lesson Complete | After all required missions in one lesson commit | Confirm lesson completion, show mission-level completion facts, and introduce its earned milestone | Medium |
| Assessment Complete | After a valid Diagnostic completion when no Part 2 page remains | Confirm the assessment is finished and the next required stage is unlocked | Medium |
| Reading Journey Finale | After the valid Final Assessment completion transaction | Congratulate the learner, present the final award, and show the completed Reading Journey collection | Highest |

Required route order:

```text
Low assessment branch
  -> Part 1 Results
  -> Assessment Complete
  -> newly earned achievement presentation
  -> Learner Dashboard

Eligible Part 2 branch
  -> Part 1 Results
  -> Story choice and Task 3
  -> Part 2 Results
  -> Assessment Complete or Reading Journey Finale

Required lesson
  -> Lesson Complete
  -> newly earned achievement presentation
  -> Learner Dashboard with the next lesson unlocked

Final Assessment
  -> valid branch result page or pages
  -> Reading Journey Finale
  -> ReaDirect Champion unlock presentation
  -> completed Reading Journey collection
  -> Learner Dashboard
```

If Part 2 was not administered, do not render an empty, zero-filled, disabled,
or simulated Part 2 Results page. The committed Part 1 result leads directly to
the applicable completion page.

## Shared Component Contract

The frontend should establish one shared result feature, for example:

```text
apps/web/src/features/results/
|-- ResultsStage.tsx
|-- ResultHero.tsx
|-- ResultNumber.tsx
|-- ResultBreakdown.tsx
|-- ResultSegmentRail.tsx
|-- CompletionSeal.tsx
|-- MissionResultTile.tsx
|-- JourneyAchievementGrid.tsx
|-- ResultParticles.tsx
|-- result.types.ts
|-- result.motion.ts
|-- result.api.ts
\-- results.css
```

Names may change, but ownership may not:

- `ResultsStage` owns the non-scrollable responsive shell, safe areas, Clara
  placement, focus target, and result action region.
- `ResultHero` owns the dominant title, score, profile, or completion message.
- `ResultBreakdown` owns separately persisted supporting facts.
- `ResultSegmentRail` owns the solid task or mission segments.
- `ResultParticles` owns the one-shot vector celebration and reduced-motion
  fallback.
- The central achievement feature owns award presentation. Results must compose
  it rather than copying it.
- `BigButton` owns `primary` and fixed `unavailable` action variants.

## Canonical Visual Hierarchy

The settled page uses this order:

```text
short milestone label
dominant result or congratulatory message
supporting result breakdown
progress, mission, or achievement collection
primary action
Ma'am Clara in the approved anchored stage
```

The dominant result may be:

- A fraction such as `24 / 30`.
- A percentage such as `82 / 100`.
- A reading-profile label returned by Laravel.
- A completion message such as `Lesson 2 complete!`.
- The finale message `You finished your Reading Journey!`.

Do not put a large decorative heading above a larger score and another equally
large profile. There must be one unmistakable focal point.

## Result Containers

- Use one large raised hero container rather than several unrelated cards.
- Supporting facts use two or three smaller raised tiles inside or immediately
  beneath the hero.
- Corners remain large and friendly but must not turn every value into a pill.
- Use solid borders and downward fake depth. Do not use soft floating drop
  shadows, gradients, glass effects, or glowing score outlines.
- Keep whitespace intentional. Empty space frames the result; it must not force
  important controls below the viewport.
- Reward artwork is allowed only for achievements. Scores, levels, mission
  results, and profiles remain typography and vector geometry.

## Responsive Layout

### Mobile priority

For widths below `48rem`:

- Use one column.
- Keep the milestone label near the safe top edge.
- Place the hero result in the upper-middle region.
- Keep supporting tiles compact and allow a `2 x 2` or `4 x 2` fixed grid only
  when every label remains readable at the approved learner font size.
- Anchor Clara at the lower-left. The primary action occupies the lower-center
  or lower-right without overlapping Clara.
- Keep the primary action reachable by one thumb and at least as large as the
  standard learner primary button.
- Use `minmax(0, 1fr)`, `clamp()`, and container-relative sizing rather than
  absolute pixel placement.

### Tablet and desktop

At `48rem` and above:

- Use a two-region composition: result content on the dominant side and Clara
  plus the action on the supporting side.
- A result breakdown may use up to three columns.
- Do not stretch a single score card across the entire desktop viewport.
- Keep the content width bounded so the page continues to read like a focused
  game result rather than a staff dashboard.

### Short landscape

- Reduce gaps before reducing type.
- Move Clara beside the hero instead of shrinking her below the canonical
  readable crop size.
- Compact supporting tiles into one row where labels allow it.
- Never introduce vertical scrolling to preserve decorative space.

## Shared Animation Choreography

Every result page uses a staged sequence. Exact content varies, but ordering is
stable:

```text
1. page and hero surface settle
2. task or mission segments lock into place
3. committed result value resolves
4. result label or profile appears
5. Clara reacts and may speak
6. one-shot particles play at the approved intensity
7. primary action changes from unavailable to primary
```

Recommended full-motion timing:

| Stage | Timing |
| --- | ---: |
| Hero surface rise and settle | `0-320ms` |
| Segment or mission tile stagger | `220-700ms`, `90-120ms` between units |
| Number count or character assembly | `480-1050ms` |
| Profile, level, or completion label | begins after the main value settles |
| Clara reaction and result audio | begins after essential text is visible |
| One-shot particle release | after the committed result is fully readable |
| Primary action becomes available | after required choreography settles and any required Clara line ends |

Animation rules:

- A number animation must end on the exact server value. It must not display a
  random overshoot, fake score, or value outside the valid range.
- Segment movement uses short translations and solid locking motion, not
  elastic physics.
- Mission tiles may press into place like stamps.
- Achievement badges use only the canonical slow-pop animation from the
  Achievement System Standard.
- Particles are solid circles, rectangles, letter shapes, or outlined vector
  stars. They emit once, clear themselves, and never block input.
- Do not loop confetti, pulse the score indefinitely, continuously bob the hero
  card, or make Clara compete with perpetual background motion.
- Do not combine shake, bounce, scale, spin, particle, and sound effects on one
  element.

### Celebration intensity

- Part 1 Results: task segments, score assembly, Clara response, and a small
  particle release.
- Part 2 Results: stronger score/profile reveal and a medium particle release.
- Lesson Complete: mission tiles stamp into place, followed by its completion
  seal and achievement handoff.
- Assessment Complete: completion seal, next-stage unlock motion, and the
  assessment achievement handoff.
- Reading Journey Finale: the largest one-shot particle release, Clara's happy
  praise, ReaDirect Champion unlock, and the eight-position journey collection
  reveal. It still must settle into a calm page.

## Primary Action States

The action is visible throughout the result reveal so layout does not jump.

```text
LOADING_RESULT or REVEALING or REQUIRED_AUDIO_PLAYING
  -> BigButton variant="unavailable"

READY
  -> BigButton variant="primary"
```

- The unavailable variant uses its fixed muted-grey cross-theme palette.
- It becomes primary only when the result is committed, essential information
  is visible, and the page is safe to leave.
- The button label remains stable while unavailable. Do not replace `Continue`
  with a shifting sequence of loading labels.
- The tactile press-completion delay runs before navigation or award
  acknowledgement.
- A failed API acknowledgement returns the same page to a recoverable state and
  does not pretend the next stage opened.

## Ma'am Clara Contract

- Clara remains in the canonical crop and position; result animations must not
  translate or scale the model stage.
- Use `happy` for committed completion and congratulatory moments.
- Use `default` or another approved supportive expression when presenting a
  low assessment result; never use a disappointed, angry, mocking, or punitive
  reaction.
- Speaking remains an independent overlay and follows the actual TTS playback
  envelope.
- Use the semantic `result` voice reference for score/profile explanation,
  lesson completion, and the Reading Journey Finale.
- Clara's line is short and supportive. It does not read every number, tile, or
  achievement criterion aloud unless accessibility settings request it.
- Tapping Clara may replay the settled result line after initial playback.
- TTS failure must not erase or alter a committed visible result. Offer a voice
  retry without recalculating the page.

## Part 1 Results Contract

The page displays only committed Part 1 facts:

- Heading: `Part 1 Results`.
- Dominant fraction: committed Part 1 Score over `30`.
- Exact ReaDirect Assessment level from the Assessment Guide.
- Three task segments corresponding to Task 1A, Task 2A, and Task 2B.
- A short neutral-supportive Clara line.
- Primary action: `Continue`.

Task segments may show the committed task score returned by Laravel. An
auto-scored or non-administered task must use the exact server status and must
not animate as if the learner completed unseen items.

The screen must not:

- Show the future branch before Continue.
- Announce a required lesson recommendation.
- Present Part 1 as the final reading profile.
- Reveal individual assessment answers.
- Grant the assessment-completion achievement before the valid assessment run
  completes.

Mobile reference:

```text
+------------------------------+
|       PART 1 RESULTS         |
|                              |
|          24 / 30             |
|       LIGHT REFRESHER        |
|                              |
| [Letters] [Rhyme] [Words]    |
|                              |
| Clara              Continue  |
+------------------------------+
```

## Part 2 Results Contract

Part 2 uses two consecutive persisted result steps after the eligible Task 3A
and Task 3B results are committed.

### Passage Results

The first step displays:

- Heading: `Your Passage`.
- The complete administered passage at the approved readable passage size.
- Reading accuracy and reading speed in words per minute as supporting facts.
- Authoritative substitutions and omissions highlighted in the passage.
- Primary action: `Next`.

The passage review must:

- preserve every authored word and its original punctuation;
- identify a highlighted word with more than color, using an underline and an
  accessible explanation of a missed or replaced word;
- expose inserted recognized words in one compact supporting note;
- show neutral text and no false highlights when the passage was skipped or a
  development portal has no detailed alignment evidence; and
- fit inside the existing non-scrollable result composition.

### Part 2 Score Results

`Next` opens the original Part 2 score result layout. It displays:

- Heading: `Part 2 Results`.
- Supporting label: `Reading and Understanding`.
- Dominant final reading score over `100`.
- Exact final reading profile from the Assessment Guide.
- Reading accuracy as its own supporting tile.
- Comprehension percentage as its own supporting tile.
- Primary action: `Continue`.

Reading accuracy and comprehension remain separate. Their tiles may assemble
beside one another, but the frontend must not recalculate, average, or combine
them. The final reading score is rendered exactly as returned by Laravel.
On Passage Results, reading speed and story alignment are rendered exactly from
the committed Task 3A response. React must not transcribe, realign, or
recalculate them.

## Lesson 5 Passage Result Contract

Lesson 5 inserts the shared passage-review surface directly between its one
clear submitted recording and the ordinary Lesson Complete page.

- It uses the locked Lesson 5 passage and committed Lesson response.
- It displays the complete passage, authoritative word states, reading
  accuracy, reading speed, and correct-word speed exactly from Laravel.
- Skipped or unavailable evidence stays neutral and does not fabricate timing
  or mistakes.
- Clara speaks the published response selected from the committed accuracy
  band while this result is visible. Speed never selects or lowers the band.
- Its primary action is `Next`.
- `Next` remains unavailable until Clara's selected review line finishes.
- `Next` commits the explicit review boundary. Only the successful server
  response reveals the shared Lesson Complete page, Passage Explorer award,
  and dashboard-return action.
- The Lesson Complete page does not repeat the full passage; it uses the shared
  mission-tile, seal, Clara, achievement, and action composition.

The page must not show task-level correct answers, compare the learner with a
class or grade, or describe the profile as a diagnosis.

Mobile reference:

```text
+------------------------------+
|         YOUR PASSAGE         |
| Lena at the Park             |
|                              |
| [Accuracy 78%] [Speed 72 WPM]|
|                              |
| Lena goes to the [park] ...  |
|                              |
| Clara                  Next  |
+------------------------------+

              Next

+------------------------------+
|       PART 2 RESULTS         |
|  Reading and Understanding   |
|                              |
|          82 / 100            |
|     TRANSITIONING READER     |
|                              |
| [Accuracy 78%] [Compreh.85%] |
|                              |
| Clara              Continue  |
+------------------------------+
```

## Lesson Complete Contract

Each required lesson ends on one Lesson Complete page after its authoritative
completion transaction succeeds.

Required content:

- `Lesson <number> complete!` as the hero message.
- The authored lesson title.
- One fixed-position tile for every required mission in that lesson.
- A completion seal that appears only after every required mission has a
  committed completion state.
- The lesson's newly earned Reading Journey achievement when applicable.
- Primary action: `Back to my reading path`.

Mission tiles may show committed facts such as `Complete`, item count, or
skipped count. They must not invent a combined lesson grade. Skips use neutral
language such as `We can practice this again`; never display a red failure
stamp, zero badge, broken star, or punitive sound.

Sequence:

```text
mission tiles stamp into place
  -> completion seal settles
  -> Clara praise
  -> canonical achievement unlock overlay when a new award exists
  -> return to the settled Lesson Complete page
  -> Back to my reading path
```

Repeating a completed lesson still shows its completion page but does not replay
an already acknowledged achievement as newly earned.

### Required Lessons Complete Variant

Lesson 6 completion uses a specialized variant of the shared Lesson Complete
page because it also marks completion of the six-lesson sequence.

Required settled content:

- Hero message: `You finished all six reading lessons.`.
- Six fixed lesson tiles in canonical order. The first five are already settled;
  the sixth stamps into place last.
- Ma'am Clara in `happy + speaking` for one short published praise line.
- The shared `Question Detective` achievement presentation when newly earned.
- A clear confirmation that the Final Assessment is now ready.
- Primary action: `Back to my reading path`.

The completion transaction must atomically complete Lesson 6, grant
`reading.question_detective`, and change progression to the Final Assessment
stage before this page renders. This page is not the Reading Journey Finale and
must not present ReaDirect Champion or an eight-of-eight collection.

## Assessment Complete Contract

The Diagnostic completion page confirms:

- `Assessment complete!`.
- A short supportive message.
- `Your first lesson is ready` after the committed progression response confirms
  the unlock.
- Ready Reader achievement presentation when newly earned.
- Primary action: `Back to my reading path`.

Do not repeat every score on this page. Part 1 and Part 2 pages own score detail;
the completion page owns progress and celebration.

When the Final Assessment completes, use the Reading Journey Finale instead of
this generic page.

## Reading Journey Finale Contract

The finale is the highest-intensity learner celebration and appears only after
the Final Assessment completion, progression, and `reading.readirect_champion`
award transaction commit.

Required settled content:

- Hero message: `You finished your Reading Journey!`.
- Ma'am Clara in `happy + speaking` during one short praise line.
- The canonical ReaDirect Champion achievement unlock presentation.
- An eight-position Reading Journey collection containing the achievements in
  canonical order `100` through `800`.
- A clear `8 of 8` completion count when all required milestones are present.
- Primary action: `Back to my reading path`.

The eight positions are not eight new unlock pops. The queue presents only the
newly earned ReaDirect Champion once; the settled collection then assembles the
already earned journey badges as a final retrospective.

Interactive collection behavior:

- Every badge is keyboard-focusable and touch-readable after the main reveal.
- Activating or focusing a badge updates one stable detail panel with its name,
  learner-facing criterion, and earned state.
- Badge interaction must not navigate, open nested modals, or move positions.
- Essential completion text and the primary action remain visible without
  selecting a badge.
- On mobile use a fixed `4 x 2` collection when labels remain outside the badge
  cells; otherwise use two compact rows with the same canonical order.

Finale choreography:

```text
hero message settles
  -> Clara praise begins
  -> final completion seal locks
  -> ReaDirect Champion slow-pop overlay
  -> learner acknowledges the award
  -> eight badge positions assemble in canonical order
  -> one final solid particle release
  -> primary action becomes available
```

Do not add a leaderboard, rank, perfect-score requirement, share-to-social
control, countdown, streak, or comparison with other learners.

## Achievement Queue Integration

Result and completion surfaces are approved hosts for the shared achievement
queue only after the qualifying activity is no longer active and its completion
transaction committed.

Priority:

1. Present a newly earned assessment or lesson award on its completion page.
2. If the learner refreshes, closes, loses connection, or navigates away before
   acknowledgement, keep the award queued.
3. Present any still-pending award on the next supported Learner Dashboard or
   Game Lobby visit according to the Achievement System Standard.

The completion page and fallback surfaces use the same queue, overlay,
acknowledgement API, focus trap, animation, and ordering. Page-specific
achievement overlays are prohibited.

## Loading, Failure, Refresh, And Resume

- Result routes identify an immutable committed result; they do not depend on
  transient navigation state alone.
- Refresh reconstructs the same settled result from Laravel.
- While loading, render the stable page shell and unavailable primary action;
  do not show a fake zero score.
- A result-load failure shows one themed recovery notice and `Try again`.
- A completion-save failure remains on the prior activity state and must not
  open a congratulatory page.
- Achievement acknowledgement failure keeps the same award visible.
- Audio or particle failure never removes a committed textual result.
- Re-entering an acknowledged result page may use the settled reduced
  choreography; it must not replay a new-award pop.

## Accessibility And Reduced Motion

- Transfer focus to the result heading after the route transition clears.
- Announce the final settled result once through a concise live region. Do not
  announce every counting-animation frame.
- Provide readable text for every icon, segment, badge, status, and profile.
- Do not rely on color, sound, scale, or particle count to communicate a score
  or completion state.
- Maintain learner minimum type sizes and `44 x 44` CSS-pixel touch targets.
- Trap focus only inside the achievement overlay while it is open.
- Respect mute and browser audio restrictions.

With reduced motion:

- Render the final score, profile, tiles, and collection immediately.
- Replace surface rise, stamping, counting, overshoot, and particle motion with
  a short opacity fade.
- Preserve content order, Clara's final expression, button availability,
  achievement acknowledgement, and every result value.
- Do not delay the primary action merely to imitate removed motion. Required
  persistence and audio gates remain authoritative.

## Required Analytics Events

Presentation analytics must remain separate from academic results:

```text
result_page_viewed
result_reveal_completed
result_clara_audio_started
result_clara_audio_completed
result_clara_audio_failed
completion_page_viewed
achievement_overlay_presented
achievement_overlay_acknowledged
journey_finale_viewed
journey_badge_detail_viewed
result_primary_action_committed
```

Events may include activity type, stable result ID, lesson order, assessment run
type, screen type, motion mode, and achievement key where applicable. They must
not duplicate raw learner audio, full transcripts, credentials, or hidden
assessment answers.

## Prohibited Presentation

Do not:

- Use a generic staff-dashboard result table for learners.
- Put all Part 1, Part 2, lesson, and achievement data on one crowded page.
- Scroll an active result page.
- Show assessment item correctness before its authorized result stage.
- Invent combined lesson grades or recalculate assessment values in React.
- Use gradients, glowing neon score rings, photographic confetti, or video.
- Use endless particles, looping score pulses, or continuous badge bouncing.
- Hide Continue until layout space suddenly opens; keep the unavailable variant
  visible in its final position.
- Celebrate skips, technical failures, or missing results as correct.
- Use sad Clara reactions, red failure splashes, lives, penalties, rankings, or
  shame language.
- Replay already acknowledged achievements as new.
- Create a result-local achievement component or animation.

## Acceptance Checklist

- [ ] Part 1 Results show the exact committed score over 30 and exact level.
- [ ] Part 2 Results appear only when Task 3 was administered and show the exact
      final score, profile, reading accuracy, and comprehension separately.
- [ ] Low branches never render a fake Part 2 page.
- [ ] Each lesson has one non-scrollable completion page with mission-level
      committed facts and no invented aggregate grade.
- [ ] Diagnostic completion confirms the first-lesson unlock only after Laravel
      returns the committed progression.
- [ ] Final Assessment completion uses the Reading Journey Finale.
- [ ] The finale presents ReaDirect Champion once and then the stable eight-slot
      journey collection.
- [ ] Clara remains visible in the canonical crop at every mandatory viewport.
- [ ] All recurring structures use shared result and achievement components.
- [ ] Primary action uses `unavailable` until the page is safe to leave, then
      changes to `primary`.
- [ ] Full-motion choreography runs once and settles.
- [ ] Reduced motion preserves every value and interaction without kinetic
      dependency.
- [ ] Refresh and resume reconstruct committed results without fake zeros or
      duplicate award presentation.
- [ ] Every color resolves through semantic variables and every fixed color
      lives in the approved cross-theme token file.
- [ ] Automated viewport, keyboard, reduced-motion, API-failure, refresh, and
      achievement-queue tests pass.
