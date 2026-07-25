# ReaDirect Achievement System Standard

Purpose: define the permanent achievement catalog, authoritative unlock rules,
shared presentation queue, gallery behavior, persistence, and reset exceptions
for ReaDirect-V2.

This document is the source of truth for achievements earned through required
assessments, required lessons, and games. It complements:

- `READIRECT_REVAMP_ASSESSMENT_GUIDE.md` for valid Diagnostic and Final
  Assessment completion.
- `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md` for the required six-lesson
  sequence and authoritative lesson completion.
- `READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md` for Skip,
  Retry, Submit, processing, and Next behavior.
- `READIRECT_REVAMP_GAME_MODULE_STANDARD.md` for game-owned achievement
  proposals and the original achievement-pop behavior.
- `READIRECT_REVAMP_GAME_DATABASE_AND_API_STANDARD.md` for the shared catalog,
  account awards, evidence, and acknowledgement persistence.
- `READIRECT_REVAMP_FRONTEND_DESIGN_SYSTEM.md` for shared components, themes,
  accessibility, responsive layout, and motion rules.
- `READIRECT_REVAMP_RESULTS_AND_COMPLETION_PRESENTATION_STANDARD.md` for the
  approved completion-page achievement hosts and final Reading Journey
  collection reveal.

## Top Rules

1. Laravel is the only authority that can grant an achievement.
2. An achievement is granted only after the qualifying assessment, lesson, or
   game result is successfully committed.
3. Every permanent achievement has one globally unique key, one exact criterion,
   and one fixed position in its gallery category.
4. Each account can earn each achievement only once.
5. Reading Journey achievements reward completion, not score, speed, accuracy,
   retries, skipped items, streaks, or first-attempt performance.
6. The achievement overlay, queue, acknowledgement behavior, and animation are
   shared. Pages and games must not create local copies of them.
7. Achievement unlocks are permanent for ordinary accounts. Resetting a lesson,
   starting New Game, signing out, or repeating an activity does not remove them.
8. The special system learner `KW000` is the only approved reset exception and
   follows the rules in this document.

## Product Intent

Achievements should make progress feel visible and celebratory without turning
reading difficulty into a competition. A child who needs retries, uses Skip, or
receives a low score has still made meaningful progress by completing the
required activity.

The system must therefore celebrate journey milestones. It must not label only
high-scoring learners as successful, discourage honest retries, or encourage a
child to rush through speech tasks.

## Ownership And Shared Architecture

Achievements are an account-level ReaDirect feature, not a game-only feature.

```text
Assessment / Required Lesson / Verified Game Result
                         |
                         v
              Laravel completion transaction
                         |
             +-----------+-----------+
             |                       |
             v                       v
     progression/result       account achievement
             |                       |
             +-----------+-----------+
                         |
                         v
               shared achievement queue
                         |
              +----------+----------+
              |                     |
              v                     v
      Learner Dashboard        Game Lobby
              |                     |
              +----------+----------+
                         |
                         v
             shared unlock overlay component
```

Laravel owns:

- Achievement catalog records.
- Eligibility evaluation.
- Conflict-safe one-time granting.
- Award evidence.
- Earned and acknowledged timestamps.
- The ordered, unacknowledged queue.
- The `KW000` reset exception.

The central React application owns:

- The achievement gallery.
- The shared unlock overlay and its animation.
- Loading the queue and acknowledging one award at a time.
- Responsive presentation, keyboard behavior, focus, sound, and reduced motion.

Assessment, lesson, and game features may report committed evidence or consume
the shared UI. They must not grant achievements in browser state, duplicate the
overlay, invent achievement keys, or write directly to achievement tables.

The shared frontend feature should live in a central feature area such as:

```text
apps/web/src/features/achievements/
|-- components/
|   |-- AchievementGallery.tsx
|   |-- AchievementTile.tsx
|   \-- AchievementUnlockOverlay.tsx
|-- hooks/
|   \-- useAchievementQueue.ts
|-- achievement.api.ts
|-- achievement.types.ts
\-- achievement.tokens.css
```

Feature pages compose these components. They do not copy their markup, styles,
queue state, or acknowledgement logic.

## Achievement Sources And Account Ownership

The catalog supports exactly these source types:

- `assessment`: Diagnostic or Final Assessment completion.
- `lesson`: completion of a required lesson in the central lesson sequence.
- `game`: criteria proven by a verified game result or game session.

Awards belong to the authenticated account identity, never to a display name,
learner code, email address, game username, browser, or device.

- Registered learners can earn Reading Journey and game achievements.
- Verified guests can earn game achievements under the Game Module Standard.
- A verified guest can earn a Reading Journey achievement only if a future
  approved guest workflow gives that account authoritative access to the same
  assessment or lesson completion event. The achievement system must not fake
  missing academic progression for a guest.
- Learner and guest accounts use the same catalog but never share award rows.

## Reading Journey Catalog

The Reading Journey category has eight permanent positions. The keys, order,
names, and criteria below are stable integration contracts.

| Order | Permanent key | Name | Source | Exact server unlock criterion | Learner-facing locked criterion |
| ---: | --- | --- | --- | --- | --- |
| 100 | `reading.ready_reader` | Ready Reader | `assessment:diagnostic` | The account's Diagnostic Assessment reaches authoritative `completed` state after its score-routed valid path is committed. | Complete the Diagnostic Assessment. |
| 200 | `reading.letter_leader` | Letter Leader | `lesson:required-lesson-1` | Required Lesson 1, Letters, reaches authoritative `completed` state for the account. | Complete Lesson 1: Letters. |
| 300 | `reading.word_wizard` | Word Wizard | `lesson:required-lesson-2` | Required Lesson 2, Words, reaches authoritative `completed` state for the account. | Complete Lesson 2: Words. |
| 400 | `reading.phrase_pro` | Phrase Pro | `lesson:required-lesson-3` | Required Lesson 3, Phrases, reaches authoritative `completed` state for the account. | Complete Lesson 3: Phrases. |
| 500 | `reading.sentence_star` | Sentence Star | `lesson:required-lesson-4` | Required Lesson 4, Sentences, reaches authoritative `completed` state for the account. | Complete Lesson 4: Sentences. |
| 600 | `reading.passage_explorer` | Passage Explorer | `lesson:required-lesson-5` | Required Lesson 5, Short Passage, reaches authoritative `completed` state for the account. | Complete Lesson 5: Short Passage. |
| 700 | `reading.question_detective` | Question Detective | `lesson:required-lesson-6` | Required Lesson 6, Comprehension, reaches authoritative `completed` state for the account. | Complete Lesson 6: Comprehension. |
| 800 | `reading.readirect_champion` | ReaDirect Champion | `assessment:final` | The account's Final Assessment reaches authoritative `completed` state after its valid assessment branch is committed. | Complete the Final Assessment. |

### Diagnostic Completion

`Ready Reader` unlocks after any valid Diagnostic Assessment path:

```text
Task 1A -> low branch through Task 2A -> valid completion

or

Task 1A -> high branch through Task 2B -> Part 1 Score 0-16
        -> valid completion without Task 3

or

Task 1A -> high branch through Task 2B -> Part 1 Score 17-30
        -> Task 3A -> Task 3B -> valid completion
```

Scores still determine the assessment path defined by the Assessment Guide, but
there is no achievement score threshold. The final score, reading profile,
elapsed time, ASR confidence, and number of recording attempts do not otherwise
alter eligibility. Starting or partially completing the Diagnostic Assessment
is not enough.

### Required Lesson Completion

Each lesson achievement listens only to the committed completion event for its
matching required lesson. Opening a lesson, reaching its last screen, creating
a recording, submitting one item, or unlocking the lesson is not completion.

The Lesson Structure Standard decides when a required lesson is complete. If
that standard treats submitted and skipped items as resolved progress, a skip
does not block the achievement. An achievement evaluator must not add a second,
stricter completion definition.

Repeating an already completed lesson does not grant another award and does not
change `earned_at`.

### Final Assessment Completion

`ReaDirect Champion` unlocks only when the Final Assessment reaches committed
completion. Unlocking, starting, or partially completing the Final Assessment
does not qualify. Score and reading profile do not alter eligibility.

## Prohibited Reading Journey Criteria

Do not introduce Reading Journey achievements for:

- Perfect or minimum scores.
- High pronunciation accuracy or ASR confidence.
- Completing without Skip.
- Completing without Retry.
- Completing on the first attempt.
- Recording or answering quickly.
- Daily logins, consecutive-day streaks, or attendance.
- Comparing one learner with another.
- Finishing optional teacher-created lessons.

These criteria either conflict with the current academic rules, punish support
needs, encourage rushing, or turn sensitive performance data into a reward
gate. A future change requires an explicit revision of this standard.

## Game Achievements

Game achievements remain governed by the Game Module Standard, but they use the
same central catalog, account award table, queue, gallery, and unlock overlay.

A game contributor supplies:

- A proposed achievement name.
- Exact and testable unlock criteria.
- The verified server evidence needed to prove the criterion.

The central owner assigns the permanent key, global display order, source game,
placeholder artwork, and final artwork. A game must never implement a private
achievement database or a different pop animation.

Game positions begin at order `1000` so the eight Reading Journey positions
remain stable. Leave gaps between game achievement order values so later
approved achievements can be inserted without changing existing positions.

## Authoritative Grant Flow

### Assessment Transaction

The assessment completion operation must:

1. Lock or validate the active assessment run.
2. Validate that its required branch and items are complete.
3. Persist the final assessment result and progression state.
4. Evaluate the matching Diagnostic or Final achievement.
5. Insert the award with database conflict protection.
6. Commit the result, progression update, and award atomically.
7. Return committed progression and newly earned achievement identifiers.

### Lesson Transaction

The final lesson progress operation must:

1. Lock or validate the current lesson progress record.
2. Persist the final resolved item and save state.
3. Mark the matching required lesson complete.
4. Unlock the next required stage according to the Lesson Structure Standard.
5. Evaluate and conflict-safely insert the matching lesson achievement.
6. Commit completion, progression, and award atomically.
7. Return committed progression and newly earned achievement identifiers.

### Game Transaction

The verified game completion transaction follows the Game Database and API
Standard. Achievement insertion is part of that same trusted transaction.

### Idempotency And Concurrency

- A database unique constraint on account identity plus achievement identity is
  mandatory.
- Repeated completion requests return the already committed state without a
  duplicate award.
- Two concurrent qualifying requests can create at most one award.
- The client never fabricates an unlock because it predicted eligibility.
- An achievement enters the UI queue only after its award row commits.

## Award Evidence

Evidence must be sufficient to audit the grant without duplicating academic or
game data.

Assessment evidence contains the assessment run identifier, run type, content
or ruleset version, completion status, and committed completion timestamp.

Lesson evidence contains the lesson progress identifier, permanent lesson key,
content version, completion status, and committed completion timestamp.

Game evidence follows the Game Database and API Standard and references the
verified game session or result.

Do not copy raw audio, transcripts, names, learner codes, emails, passwords, or
full assessment responses into `award_evidence`. Scores are not needed for the
eight Reading Journey criteria and must not be copied into their evidence.

## Shared Achievement Queue

An award is pending presentation while `acknowledged_at` is null.

Queue rules:

- Order by `earned_at` ascending, then award row `id` ascending.
- Present one award at a time.
- Acknowledge only the currently displayed award after the learner activates
  `Tap to continue`.
- Load the next item only after the acknowledgement succeeds.
- Closing, refreshing, navigating away, or losing connection leaves all
  unacknowledged awards queued.
- A failed acknowledgement keeps the same award visible and offers a safe retry.
- Already acknowledged awards remain earned in the gallery and never pop again.

New Reading Journey awards are presented first on the committed lesson or
assessment completion surface defined by the Results And Completion
Presentation Standard. If that presentation cannot finish because the learner
refreshes, closes, loses connection, or navigates away, the first subsequent
Learner Dashboard visit is the guaranteed fallback. Game awards are guaranteed
presentation on the first subsequent Game Lobby visit. Completion pages,
Dashboard, and Game Lobby consume the same complete account queue and shared
component. A supported surface that finds older pending awards presents them in
canonical order; it must not filter, reorder, duplicate, or permanently hide
them.

Do not interrupt an active assessment item, lesson item, recording, ASR request,
or active game run with an achievement overlay.

## Shared Unlock Presentation

The Game Module Standard's achievement presentation is the shared ReaDirect
achievement animation. It is no longer treated as a lobby-local effect.

Required presentation:

- Dim the current surface with a theme-token backdrop.
- Center one achievement badge or placeholder artwork in a focused container.
- Keep only the unlock label, achievement name, artwork, and `Tap to continue`
  action prominent.
- Use a deliberate slow-pop entrance with a small scale overshoot and settle.
- Use the same animation tokens and component in the Learner Dashboard and Game
  Lobby.
- Block interaction with the dimmed page while the overlay is open.
- Move keyboard focus into the overlay and keep it there until acknowledgement.
- Allow pointer, touch, Enter, and Space activation of the continue action.
- Play at most one short reward sound when audio is enabled. Respect mute and
  browser playback restrictions.
- Present multiple awards sequentially, never as a stacked burst.
- On reduced motion, replace scale and overshoot with a gentle opacity fade;
  queue order and acknowledgement do not change.

The overlay must use theme variables for every color. No page or game may
hard-code a separate backdrop, glow, badge, text, or action color.

The overlay must not navigate immediately on activation. It uses the shared
button press-completion delay from the Frontend Design System so the push
animation finishes before acknowledgement advances the queue.

## Achievement Gallery

The learner-facing achievement holder is prominent but secondary to the current
required learning action and Games action.

It contains two categories:

1. `Reading Journey`: the eight fixed achievements in orders 100 through 800.
2. `Games`: centrally approved achievements beginning at order 1000.

Gallery rules:

- Positions never shift based on what the account has earned.
- Locked positions show a silhouette or central placeholder and the visible
  learner-facing criterion.
- Earned positions show the approved artwork, name, and earned date.
- Newly earned but not yet acknowledged positions may show a small `New` marker.
- Hidden criteria are prohibited for the Reading Journey category.
- Locked tiles are informative, not disabled-looking controls that imply they
  can be clicked to unlock.
- Achievement artwork is a reward asset and is not an instructional lesson
  image; it does not violate the lesson no-image rule.
- Artwork sources belong in `assets/illustrations/rewards/`; optimized runtime
  copies belong in the web public asset structure defined by the Project
  Structure Standard.
- Placeholder artwork remains acceptable until final reward artwork exists.

The gallery must use a responsive grid. It may scroll as part of the Learner
Dashboard; it must not force a lesson, assessment, or active game screen to
become scrollable.

### Prototype Migration

The obsolete placeholder keys and criteria `first-steps`, `lesson-one`,
`word-helper`, `steady-reader`, `game-starter`, and `final-reader` have been
removed. The Learner Dashboard now renders the eight canonical Reading Journey
identities in this standard and marks server-reported earned keys. Moving the
remaining display metadata into the shared database catalog remains required
before the gallery is considered fully integrated.

The integrated gallery renders the eight Reading Journey records in this
standard plus centrally approved game achievements returned by Laravel. It does
not keep a second hard-coded frontend catalog.

The current persistence implementation grants all eight Reading Journey
milestones from their authoritative activity completion transactions.
`reading.ready_reader` unlocks with the Diagnostic Assessment;
`reading.letter_leader` through `reading.question_detective` unlock with
Lessons 1 through 6; and `reading.readirect_champion` unlocks atomically with
Final Assessment completion and `reading_journey_complete` progression. The
`(learner_id, achievement_key)` uniqueness constraint makes repeated
completion idempotent. `KW000` reset deletes its assessment runs, lesson runs,
private activity audio, and awards as part of the approved portal-only reset
exception.

## Data Contract

### Achievement Catalog

Each catalog record contains:

- Permanent globally unique achievement key.
- Source type: `assessment`, `lesson`, or `game`.
- Permanent source key.
- Learner-facing name.
- Learner-facing unlock criterion.
- Fixed display order.
- Gallery category.
- Placeholder and earned asset keys.
- Active status and timestamps.

Catalog keys and display positions are immutable after release. Text and artwork
may be corrected through centrally reviewed content changes without altering an
earned award's identity.

### Account Achievement

Each award contains:

- Authenticated account owner key.
- Achievement catalog identifier.
- Matching source reference when applicable.
- `earned_at`.
- Nullable `acknowledged_at`.
- Limited audit evidence.
- Timestamps.

The source reference may identify an assessment run, lesson progress record, or
game session/result. The reference type must match the catalog source type.

### Shared API Semantics

The central achievement API must provide these authenticated operations,
regardless of final controller naming:

```text
GET  /api/achievements
GET  /api/achievements/queue
POST /api/achievements/<account-achievement>/acknowledge
```

- The catalog response includes every active position relevant to the account,
  its locked or earned state, criterion, artwork key, and earned date.
- The queue response returns unacknowledged account awards in canonical order.
- Acknowledge accepts the award row identity, not an arbitrary catalog key.
- Authorization derives the account identity from the authenticated session.
- Clients cannot request or acknowledge another account's award.
- Responses never expose learner codes, emails, assessment answers, raw audio,
  or private game evidence.

## The `KW000` System Learner Exception

`KW000` exists to test the real learner workflow and to support system-admin
portal simulations. It may earn achievements normally during a manual or portal
run so the complete unlock and presentation flow can be verified.

When the approved manual reset or portal cleanup resets `KW000` to zero progress,
the same server transaction or coordinated reset operation must also remove:

- Its Reading Journey and game account-award rows.
- Its pending achievement queue state.
- Its acknowledgement state.

This is the only account for which earned achievements may be reset. The reset
must target the immutable system-learner identity, not merely the text `KW000`,
and must be restricted to the approved system-admin operation.

`KW000`, its portal runs, and its reset awards remain excluded from learner,
school, system, and achievement analytics.

## Analytics And Privacy

Achievement status can support aggregate engagement reporting, but it must not
be presented as a reading score, ranking, diagnosis, or substitute for the
assessment results.

- Do not create public achievement leaderboards.
- Do not compare achievement counts between named learners.
- Staff access follows existing role and school-scope rules.
- Aggregate counts must exclude `KW000` and portal simulation activity.
- Public game leaderboard payloads do not include academic achievements.

## Failure Behavior

- If a qualifying transaction fails, neither progression nor its achievement is
  partially committed.
- If catalog evaluation fails, the completion request must not silently report a
  successful award. Log the server error and preserve transaction consistency.
- If queue loading fails, the dashboard or lobby remains usable and exposes a
  non-blocking Retry action for rewards.
- If artwork fails to load, show the central placeholder without changing earned
  status.
- Offline or client-only activity cannot grant an authoritative achievement.

## Acceptance Checklist

### Catalog And Criteria

- [ ] All eight Reading Journey keys, names, criteria, and positions match this
  standard.
- [ ] Diagnostic completion through either valid branch grants `Ready Reader`.
- [ ] Each required lesson completion grants only its matching milestone.
- [ ] Final Assessment completion grants `ReaDirect Champion`.
- [ ] Scores, skips, retries, speed, and accuracy do not gate these awards.
- [ ] Optional lessons do not grant or block Reading Journey milestones.

### Authority And Persistence

- [ ] Laravel grants awards only from committed authoritative evidence.
- [ ] Unique constraints prevent duplicate account awards.
- [ ] Concurrent and repeated completion requests are idempotent.
- [ ] Ordinary account achievements survive sign-out, repetition, and New Game.
- [ ] `KW000` reset removes progress and awards together and remains excluded
  from analytics.

### Presentation

- [ ] Learner Dashboard and Game Lobby use one shared unlock component.
- [ ] The slow-pop, dimmed background, focus handling, and button delay match on
  both surfaces.
- [ ] Multiple awards appear one at a time in earned order.
- [ ] Each tap persists acknowledgement before the next award appears.
- [ ] Closing the surface preserves the remaining queue.
- [ ] Reduced-motion mode uses a gentle fade.
- [ ] No overlay interrupts an active assessment, lesson, recording, ASR request,
  or game run.

### Gallery And Accessibility

- [ ] Reading Journey and Games use fixed positions and visible criteria.
- [ ] Locked, earned, new, focus, and fallback states remain understandable
  without color alone.
- [ ] The gallery is responsive and does not make active learning pages scroll.
- [ ] All colors come from theme variables.
- [ ] Pointer, touch, keyboard, screen-reader, mute, and reduced-motion behavior
  are tested.
