# Word Rescue: Online Canonical Words Game Plan

Status: Phase 0 product-boundary decisions approved; Phase 1A presentation
catalog foundation complete; Phase 1B has 27 approved image assets, five
approved Icon Batch A candidates, and one review-pending JOG revision; runtime
game implementation is still not authorized by this document.

Scope: Word Rescue is **ONLINE ONLY**. It must not use, extend, or modify Offline Practice, downloadable packs, local offline sessions, Capacitor Filesystem content, offline manifests, or synchronization.

The recommended architecture is a game-like presentation of the existing canonical Lesson 2 run at `/learner/lessons/2`, not a separate game session and not a second Words curriculum. Laravel remains the authority for access, selected content, speech evidence, teaching state, completion, achievement, and progression.

Phase 0 has now resolved the two source-of-truth conflicts identified during
reconnaissance:

1. `READIRECT_REVAMP_LEARN_WITH_CLARA_STANDARD.md` now records Words as an explicit entry into canonical Lesson 2, while Letters and future companion classes remain optional.
2. `READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md` now records a narrow, formative, reviewed-visual exception for canonical Lesson 2 Word Rescue only. Assessments and other lessons remain protected.

The decisions do not authorize parallel persistence, bypassing the diagnostic
gate, or runtime game/UI implementation. Phase 1A is limited to authored
presentation metadata, validation, tests, and review documentation.

## 1. Existing Letter Parade findings

### Observed implementation

- Entry route: `/learner/learn-with-clara/letters`, lazy-loaded from `apps/web/src/App.tsx`.
- Page coordinator: `apps/web/src/features/learn-with-clara/LearnWithClaraLettersPage.tsx`.
- Animated world: `apps/web/src/features/learn-with-clara/LearnWithClaraLetterParade.tsx`.
- Typed API client: `apps/web/src/features/learn-with-clara/learnWithClaraLettersApi.ts`, with Zod validation.
- Styling: `apps/web/src/features/learn-with-clara/learn-with-clara-letters.css`.
- Server sequence: `apps/api/app/Services/LearnWithClaraLettersFlow.php`.
- Server endpoints: `LearnerClaraListeningController` exposes authenticated `start`, `advance`, and `restart` actions.
- Persistence: `learner_clara_listening_sessions`, deliberately separate from required lessons.

### State and interaction architecture

Letter Parade is a React experience, not a KAPLAY/Pixi game. It uses semantic DOM controls, inline SVG, Motion for React, and page-local visual state around a server-owned scene checkpoint. Its scene kinds are `story`, `find`, `teach`, and `completion`.

The browser may animate and locally reject an incorrect letter, but Laravel validates every meaningful scene transition. The correct choice waits briefly for visual feedback and then advances the current server scene. A stale scene key receives a conflict response. Refresh resumes the persisted scene.

### Reusable patterns

- Explicit learner action unlocks browser audio before narration.
- Clara speech waits for the current renderer to report ready.
- Stable speech keys are requested through the existing speech layer; browser code does not send synthesis text.
- `Surface`, `BigButton`, semantic design tokens, fake depth, focus treatment, learner typography, and theme backgrounds establish visual continuity.
- Motion uses short entrance, bounce, wiggle, and finale effects, with a reduced-motion path.
- Choices are native buttons with accessible names rather than SVG-only hit regions.
- A compact 1-of-5 progress display, clear loading/error states, learner-controlled transitions, and retry actions work well for children.
- The page uses `100svh`, safe-area insets, a compact mobile composition, a side-by-side enhancement at 48rem, and height-specific rules.

### What must not be copied

- Word Rescue must not use `learner_clara_listening_sessions` or the Letter Parade `advance` contract for academic progress.
- It must not copy the A-E scene sequence, parade setting, or no-recorder echo flow.
- Letter Parade has no ASR submission, score, achievement, or canonical lesson completion. Word Rescue must preserve all of those existing Lesson 2 responsibilities.
- No standalone Letter Parade sound-effect system was found. Its audio behavior is Clara speech, so Word Rescue sound effects would be a new, optional layer.

## 2. Existing Words lesson findings

The canonical Words lesson already exists as required Lesson 2.

| Concern         | Current authority                                                                |
| --------------- | -------------------------------------------------------------------------------- |
| Route           | `/learner/lessons/2`                                                             |
| React page      | `apps/web/src/features/lesson/LessonTwoPage.tsx`                                 |
| Client contract | `apps/web/src/features/lesson/lessonApi.ts`                                      |
| Controller      | `apps/api/app/Http/Controllers/LearnerLessonTwoController.php`                   |
| Selection       | `apps/api/app/Services/LessonContentCatalog.php::lessonTwoSnapshot()`            |
| Teaching flow   | `LessonTeachingStateMachine` and `LessonTwoSupportPresentation`                  |
| Access          | `LearnerLessonAccessService`                                                     |
| Completion      | `LearnerLessonCompletionService`                                                 |
| Content         | `content/lessons/v1/lesson-2-word-items.csv`                                     |
| Speech          | activity manifest `lesson-2`, published catalog, and controlled runtime feedback |

One run locks ten unique approved words in an immutable snapshot:

- Mission 1: five `display_word` items.
- Mission 2: five different `highlighted_sentence_word` items.

For every item, the learner records, reviews, and explicitly submits speech. Mu receives `task_type=word`. `SpeechEquivalenceResolver` resolves accepted equivalents. The shared teaching state machine controls independent attempts, technical retries, clue, guided retry, demonstration, echo retry, terminal outcome, Skip, and Next.

Completing Mission 2 atomically completes the same `required-lesson-2` run, grants `reading.word_wizard`, recomputes completed-lesson progress, and returns the shared result payload. Reopening returns the committed run rather than creating a duplicate.

The current client already handles loading, refresh by run ID, recorder lifecycle, Clara readiness, published and runtime speech, errors, practice-try history, achievement presentation, and final navigation. Word Rescue should preserve these behaviors and change the item presentation layer, not replace the lesson engine.

## 3. Existing Words content inventory

### Pool facts

- 49 active approved targets.
- Every target is exactly three letters, one syllable, and CVC.
- Every row is eligible for both Lesson 2 missions.
- Every row has one approved context sentence and one exact highlighted-word occurrence.
- All targets use Mu and have approved pronunciation review.
- Runtime draws ten unique targets without replacement, then stores the exact ordered snapshot.
- `family_key` is an author-review grouping by onset; it is not a runtime category or difficulty level.

| Family  | Approved words          |
| ------- | ----------------------- |
| onset-b | bag, bat, bed, big, bun |
| onset-c | can, cap, cat, cut      |
| onset-d | dad, den, dig, dog, dot |
| onset-f | fan, fat, fin, fit, fun |
| onset-g | gap, gas, get, got, gum |
| onset-h | ham, hat, hen, hip, hot |
| onset-j | jam, jet, job, jog, jug |
| onset-l | lap, leg, lid, lip, log |
| onset-m | man, map, mat, men, mug |
| onset-p | pan, pen, pet, pig, pot |

### Existing supporting content

- Context sentences exist for all 49 words and are listed with the asset audit in Section 10.
- There are no authored word-choice distractors, missing-letter distractors, tile orders, picture keys, image alt descriptions, or per-word activity compatibility fields in the current CSV.
- There are no target-word illustrations in the current web asset inventory. Existing relevant assets are generic learner backgrounds, Clara assets, interface icons, and the `word-wizard.png` achievement.
- Existing game/RPG art is not vocabulary art and must not be repurposed merely because a filename appears useful.

## 4. Recommended game identity

Name: **Word Rescue**.

Identity: a storybook restoration activity inside canonical Words learning. Each approved word is a lost story tile. The learner restores its letters or its place in a sentence, then reads the restored word aloud to complete the rescue.

Word Rescue should feel like Letter Parade's sibling through shared typography, semantic colors, rounded tactile surfaces, Clara, gentle motion, and five-step progress. It should remain distinct through a storybook/page motif, snapped word tiles, glowing blank spaces, and restored-word stamps rather than a parade world.

This is not a lobby game, separate game module, iframe, downloadable client, or independent backend. KAPLAY, PixiJS, Phaser, a canvas loop, and a new dependency are unnecessary for the proposed mechanics. React, semantic HTML, CSS, SVG geometry, and the already-installed Motion for React are sufficient.

## 5. Story/theme

The words in Clara's storybook have slipped out of their pages. Every Lesson 2 item opens one damaged page. The learner repairs the word, then reads it aloud so the page can return to the book.

Suggested short story beats, subject to speech publication review:

- Opening: “Oh no! Some words are missing. Can you help me find them?”
- Chapter 1: restore five loose word tiles.
- Chapter 2: return five words to their sentences.
- Correct formative action: “You found it!”
- Retry: “Almost! Look closely.”
- Completion: retain the approved canonical Lesson 2 completion speech and Word Wizard result.

The story is supportive and finite. It must not imply that Clara is distressed, dependent on the learner, or remembering unstored personal events.

## 6. Learning objective

The authoritative objective remains the current Lesson 2 objective: independently read approved three-letter CVC words, first in isolation and then as highlighted words in sentences.

The game layer may support visual attention, left-to-right letter order, grapheme assembly, and locating a word in context. It must not replace the required spoken response or change the hidden spoken target, Mu task, equivalence rules, attempt limits, mastery decision, or item count.

Formative tile actions are preparation, not separate scored evidence. Only the existing speech submission may satisfy an item.

## 7. Game loop

The run is two rescue chapters of five canonical items each, matching the existing two missions and five-item progress rails.

For each item:

1. Laravel returns the current canonical run, item, teaching state, support sequence, and approved Word Rescue presentation metadata.
2. Clara's existing instruction finishes; incompatible controls remain unavailable.
3. The learner completes one short formative rescue interaction appropriate to that item.
4. The restored lowercase word becomes still and readable.
5. The existing recorder/review/Submit flow opens.
6. Laravel and Mu evaluate speech through the existing endpoint.
7. Existing support, retry, demonstration, Skip, and terminal feedback run unchanged.
8. After terminal feedback, the page shows the short restore animation and enables canonical Next.
9. Laravel advances to the next item or mission and ultimately completes the run.

Refreshing may repeat an unfinished formative animation, but it must return to the same canonical item and teaching state. A repeated local tile interaction must not create an academic attempt or reroll content.

## 8. Proposed activity types

| Mechanic                | Content fit                                                                    | Canonical mapping                                                        | Recommendation                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Picture → Find the Word | Only targets with a reviewed, unambiguous visual                               | Formative pre-step before the current Mission 1 speech item              | Conditional on the picture-rule amendment; never the scored answer                                                          |
| Missing Letter          | All 49 CVC words after authoring a controlled missing index and distractor set | Restore the current Mission 1 word, then read the whole word             | Strong text-only v1 mechanic                                                                                                |
| Build the Word          | All 49 words; duplicate letters need unique tile IDs                           | Assemble the current Mission 1 word, then read it                        | Strong v1 mechanic; drag plus tap fallback                                                                                  |
| Missing Word            | All 49 approved context sentences                                              | Restore the current Mission 2 highlighted word, then read only that word | Strong v1 mechanic; use exact authored sentence                                                                             |
| Word ↔ Picture Match    | Only reviewed visual targets; naturally needs several words at once            | Does not fit the current one-item-at-a-time contract                     | Do not use as a core v1 item. Consider only as an unscored post-mission recap after a server-owned seen-item payload exists |

Recommended v1 sequencing:

- Chapter 1 / Mission 1: alternate Missing Letter and Build the Word. Insert Picture → Find only for approved visual targets if the standards gate is passed.
- Chapter 2 / Mission 2: Missing Word using the exact server-selected sentence. A visual may decorate the restored page only after the answer is known and only if the visual carve-out is approved.
- Keep one formative interaction per canonical item. Do not add a third mission or turn one word into multiple academic questions.

## 9. Asset strategy

### Approved narrow visual model

Each approved word receives presentation metadata with one of three visual states:

- `image`: one clear concrete subject can be illustrated without ambiguity.
- `icon`: a simplified scene or symbolic treatment is possible but requires extra content review.
- `none`: the concept is abstract, grammatically ambiguous, sensitive, or likely to mislead; use typography only.

Phase 0 has amended the no-image rule only for formative Word Rescue support in
canonical Lesson 2. The exception does not apply to assessments or other
lessons. Every target still retains a `none` text-only path, and a visual may
be used only after the per-word review and catalog requirements below pass.

### Asset requirements if visuals are approved

- One reusable asset per `content_id`, never a copy per mechanic.
- Consistent child-friendly style, clear silhouette, transparent background where practical, no embedded answer text, and no distracting scene detail.
- WebP preferred for raster delivery; optimized PNG only where transparency or tooling requires it. Simple non-instructional geometry may remain inline SVG/CSS.
- Supply 1x/2x dimensions appropriate to a phone card; do not ship desktop-sized originals to Android.
- Import runtime assets through the feature so Vite fingerprints them. Keep editable sources and license/review records beside the feature asset catalog.
- A server-owned `visual_key` maps to a typed frontend asset registry. Laravel must never emit arbitrary paths or remote URLs.
- Every asset receives reviewed visible meaning, alt strategy, visual-disambiguation note, license/provenance, dimensions, byte size, and compatible mechanics.
- No remote hotlinks, runtime CDN images, base64 dumps, or assets borrowed from unrelated game modules.

### Presentation metadata

A companion authored catalog references the immutable Lesson 2 `content_id` and
declares `visual_kind`, `visual_key`, `visual_review_status`, compatible
mechanics, missing-letter position, approved letter distractors, and the exact
approved sentence occurrence. These fields are presentation metadata, not new
academic targets.

Phase 1A has created and validated
`content/lessons/v1/word-rescue-presentations.csv` with one row for each of the
49 active Lesson 2 words. It contains 27 image candidates, 13 icon candidates,
and 9 text-only fallbacks. Phase 1B now has 27 bundled image assets, all
formally approved, including the seven Batch C assets. Icon Batch A has five
approved bundled candidates — `bat`, `can`, `dot`, `gap`, and `hot` — plus the
revised `jog` candidate registered as `needs_review`; the remaining seven icon
candidates remain reserved for Icon Batch B.
`WordRescuePresentationCatalog` validates the companion rows against the
academic CSV without changing Lesson 2 runtime behavior or persistence.

## 10. Actual content-to-asset requirements

The table below audits all current approved targets. `Image` means a clear isolated illustration is plausible. `Icon` means a reviewed scene/symbol is required because an isolated object is insufficient or ambiguous. `None` means use text mechanics only. Phase 1A records these as reviewed semantic presentation decisions; final curriculum/art review and asset publication are still required.

| Word | Approved context sentence | Proposed state | Asset/review requirement                                          |
| ---- | ------------------------- | -------------- | ----------------------------------------------------------------- |
| bag  | A bag is tan.             | image          | Plain school/tote bag; avoid branding                             |
| bat  | A bat is on a mat.        | icon           | Explicitly approve animal versus sports-bat meaning               |
| bed  | Ben is in bed.            | image          | Simple bed, no character required                                 |
| big  | A pig is big.             | none           | Relative property is not clear in one isolated image              |
| bun  | Mia has a bun.            | image          | Approve bread bun rather than hairstyle meaning                   |
| can  | A can is on a mat.        | icon           | Clearly depict a plain tin can; avoid modal-verb ambiguity        |
| cap  | A cap is red.             | image          | Simple brimmed cap                                                |
| cat  | Ana has a cat.            | image          | Single cat silhouette                                             |
| cut  | Ben has a cut.            | none           | Avoid injury imagery; text-only is safer                          |
| dad  | Dad has a bag.            | icon           | Inclusive family scene; do not encode one fixed family appearance |
| den  | A fox is in a den.        | image          | Fox den opening with one obvious subject                          |
| dig  | A dog can dig.            | icon           | Dog/shovel action scene; action must be unmistakable              |
| dog  | Ana has a dog.            | image          | Single dog silhouette                                             |
| dot  | A dot is on a map.        | icon           | Dot-on-map scene; a lone dot is not enough vocabulary evidence    |
| fan  | Mia has a fan.            | image          | Approve handheld or electric-fan meaning consistently             |
| fat  | A pig is fat.             | none           | Avoid body-label imagery and ambiguous comparison                 |
| fin  | A fin is on a cod.        | image          | Fish with fin clearly indicated; review unfamiliar `cod` context  |
| fit  | A cap can fit.            | none           | Relation/action is difficult to show without giving extra context |
| fun  | A run is fun.             | none           | Abstract evaluation; text-only                                    |
| gap  | A gap is in a log.        | icon           | Broken/log-gap scene with strong contrast                         |
| gas  | Gas is in a can.          | none           | Invisible substance and multiple meanings; text-only              |
| get  | Ana can get a pen.        | none           | Abstract action; text-only                                        |
| got  | Ana got a pen.            | none           | Tense/action is not reliably pictured                             |
| gum  | Ben has gum.              | image          | Pack/piece of chewing gum; no brand                               |
| ham  | Mia has ham.              | image          | Simple food slice; culturally neutral presentation                |
| hat  | Ben has a hat.            | image          | Simple hat distinct from `cap`                                    |
| hen  | A hen can sit.            | image          | Single hen, distinct from generic bird                            |
| hip  | My hip is sore.           | icon           | Non-medical body outline; avoid pain/injury emphasis              |
| hot  | A bun is hot.             | icon           | Bun with heat lines; visual must not depend on color alone        |
| jam  | Mia has jam.              | image          | Jar/spread without branding or answer text                        |
| jet  | A jet is big.             | image          | Single airplane/jet silhouette                                    |
| job  | Dad has a job.            | none           | Abstract and occupation-dependent; text-only                      |
| jog  | Ana can jog.              | icon           | Generic jogging figure; action scene                              |
| jug  | A jug is on a mat.        | image          | Plain handled jug distinct from mug                               |
| lap  | A cat is on my lap.       | icon           | Seated child with cat; review body/pose clarity                   |
| leg  | A bug is on my leg.       | image          | Simplified clothed leg; avoid realistic body detail               |
| lid  | A lid is on a pot.        | image          | Pot and removable lid, with lid visually dominant                 |
| lip  | My lip has a cut.         | image          | Simplified face/lips; avoid showing injury                        |
| log  | A log is in mud.          | image          | Single log, readable silhouette                                   |
| man  | A man has a hat.          | icon           | Inclusive adult figure; avoid stereotypes                         |
| map  | Ana has a map.            | image          | Folded map without readable labels                                |
| mat  | A mat is tan.             | image          | Floor mat distinct from rug/background                            |
| men  | Men can sit.              | icon           | Two or more inclusive adult figures; plural must be clear         |
| mug  | A mug is on a mat.        | image          | Handled mug distinct from jug/cup                                 |
| pan  | A pan is on a mat.        | image          | Frying pan with clear handle                                      |
| pen  | Ben has a pen.            | image          | Simple writing pen                                                |
| pet  | A cat is a pet.           | icon           | Cat-with-person/home cue; a cat alone only depicts `cat`          |
| pig  | A pig can run.            | image          | Single pig silhouette                                             |
| pot  | A pot is on a mat.        | image          | Cooking pot distinct from pan                                     |

Every word remains compatible with Missing Letter, Build the Word, and its approved Mission 2 Missing Word sentence. Only reviewed `image`/`icon` entries may enter picture mechanics. No picture distractor may be inferred from the filename alone.

## 11. Interaction/touch model

- Use native buttons for letter tiles, word tiles, choices, replay, Skip, Submit, and Next.
- Minimum target is 44×44 CSS pixels; primary tiles should be larger, with visible spacing.
- Do not use the browser HTML drag-and-drop API as the only interaction. Implement touch drag with Pointer Events and pointer capture if needed, but always provide a tap-to-select then tap-slot fallback.
- Build Word fallback: tap a tile to move it to the next open slot; tap a placed tile to return it. Keyboard users use the same controls in logical DOM order.
- Missing Letter fallback: each candidate is a button; choosing inserts it into the blank.
- Missing Word fallback: each word choice is a button; selecting it moves a visual copy into the sentence blank.
- Drop zones visibly enlarge or highlight on valid approach. Snapping uses transform-only motion and never requires pixel-perfect placement.
- Dragging must cancel safely on pointer cancellation, route change, orientation change, Clara speech transition, or recorder activation.
- Disable only incompatible actions during speech, recording, submission, and support playback. Never rely on hover.
- Preserve the existing explicit recording review and Submit action. A correct tile cannot auto-submit speech.

## 12. Clara integration

Reuse the existing online architecture:

- `ClaraStage` and the configured static/Live2D renderer selection.
- `useActivitySpeechPreparation("lesson-2")` and the `lesson-2` manifest.
- `prepareClaraSpeech`, `playClaraSpeech`, runtime demonstration, and controlled runtime feedback.
- Existing renderer-ready gate, audio unlock, loader priority, speech-level animation, and teardown.

The existing 69-line Lesson 2 publication set already covers mission instructions, item ordinals, technical retry, clues, outcomes, completion, and all 49 demonstrations. Those lines remain authoritative for academic teaching.

Any new Word Rescue story or mechanic prompt is fixed, finite speech and therefore must be pre-generated, reviewed, added to the published catalog, and included in an approved manifest group. It must never be sent as arbitrary runtime text. Avoid duplicating existing feedback with lines such as “Great job” when the canonical outcome line will immediately play.

Audio turn-taking remains mandatory: no Clara speech or game sound while recording or learner playback is active. Tapping Clara may replay only the current approved instruction when the existing flow allows it.

## 13. Hint/feedback system

Keep formative game hints separate from the server teaching state.

### Formative tile hints

- First wrong interaction: gentle shake/return and “Almost! Look closely.”
- Second wrong interaction: emphasize a useful visual or first-letter clue without removing the correct answer.
- Third wrong interaction: reduce non-answer tiles or guide the next valid slot. Do not auto-complete the full word.
- Provide a visible “Show a hint” action rather than forcing repeated failure where practical.

These wrong tile actions do not call `/submit`, do not increment academic attempts, do not award mastery, and do not call `continue-support`. They may reset on refresh because they are not authoritative progress.

### Canonical speech support

After Submit, the current teaching engine remains unchanged: technical retry, first incorrect diagnosis, clue, guided retry, demonstration, echo retry, and terminal outcome. Word Rescue visuals may reflect the returned `support.display_mode`, but may not predict or override it.

Do not use red punishment screens, lives, timers, streak loss, or negative points. Feedback must always have a text/shape equivalent and cannot rely on color, animation, or sound alone.

## 14. Game progress UI

- Reuse `LessonProgressRail` or a themed wrapper around its exact server values.
- Present `Chapter 1 · Word Pages` and `Chapter 2 · Story Pages`, each with five restore markers.
- `progress.current` and `progress.total` come directly from the current canonical state; do not increment on local tile success.
- A marker becomes restored only after Laravel advances past the item. While terminal feedback is waiting for Next, show the current marker as ready rather than already persisted.
- The mission transition may animate the five restored pages joining the book, then display Chapter 2.
- No mastery percentage, coins, lives, grades, new points, or local score.
- The existing shared completion result remains the only score/result surface and uses real independent-mastery totals.

## 15. Canonical lesson integration

Recommended entry and ownership:

```text
Authenticated Learn with Ma'am Clara menu
        -> Words selection
        -> canonical /learner/lessons/2
        -> existing start/show Lesson 2 API
        -> Word Rescue presentation of current canonical item
        -> existing submit/support/skip/advance API
        -> existing Lesson 2 completion, Word Wizard, and progression
```

Do not create `/learn-with-clara/words/start`, a Word Rescue session table, or frontend-only completion. The menu should unlock audio and navigate to the canonical route. The canonical route should use one `LessonTwoPage` coordinator and one run regardless of whether the learner entered from the dashboard or Clara menu.

Access remains server-owned. The Clara menu is currently available before the Diagnostic Assessment, but `LearnerLessonAccessService` rejects required lessons before the diagnostic completion-or-skip gate. The UI may explain that response and return the learner to the dashboard; it must not bypass the gate. Any stronger sequential-access rule must be implemented as a separate approved canonical access-policy change, not inside Word Rescue.

The existing dashboard/Intro route and the new Clara-menu entry must converge on the same run. Switching entry points, refreshing, or opening a second tab must never select a second snapshot or duplicate completion.

## 16. Laravel/server boundary

Preserve the current endpoints:

- `POST /api/learners/lessons/lesson-2/start`
- `GET /api/learners/lessons/lesson-2/{lessonRun}`
- `POST /submit`
- `POST /continue-support`
- `POST /skip`
- `POST /advance`

Laravel continues to resolve learner identity from the bearer session, authorize the run, lock stale updates, select and snapshot words, hide the spoken target, call Mu, resolve speech equivalence, store evidence, control teaching state, and complete the lesson.

If a presentation companion catalog is approved, Laravel should merge only the current item's reviewed metadata into the existing response under a typed `word_rescue` object. Zod validates that object in the client. The server must validate every referenced visual/activity key against the current immutable `content_id`. No database migration is expected unless later requirements demand persisted formative analytics.

The frontend may determine immediate visual tile placement from server-declared metadata, because that interaction is explicitly non-academic. It may not use local correctness to call `advance`, synthesize a response, or claim persistence. Network errors retain the current item on screen and offer Retry or return; they never claim the rescue was saved.

## 17. Responsive/mobile behavior

Word Rescue inherits the canonical non-scrolling `LearnerActivityShell`, safe-area handling, and Clara/recorder/action hierarchy.

- Mobile portrait: compact header, rescue stage as the main item panel, recorder below it, Clara and actions in the existing dock. Keep the current word, active tiles, recorder, and primary action visible at 360×740.
- Tall phones: allow the storybook stage to grow without enlarging tiles beyond useful reach.
- Narrow/small phones: reduce decorative whitespace and particle count before reducing reading text or touch targets. A 320px-wide graceful mode should remain operable; below the supported minimum, show a clear unsupported-layout message rather than overlap controls.
- Landscape phones: use the existing three-card lower workspace pattern; do not invent a two-column intermediate lesson layout.
- Tablet/desktop: keep the same flow and controls, with additional whitespace and a bounded stage. Do not stretch the storybook across ultrawide screens.
- Orientation/resizing: recalculate slot geometry; cancel any active drag safely and retain the same item.
- Safe areas: no tile, mute control, recorder, Submit, Skip, or Next under notches, browser bars, or the Android gesture area.

Required implementation checks include the repository baseline viewports (360×740, 390×844, 412×915, 768×1024, 1366×768, 1920×1080), plus risk cases such as 320×568, 844×390 landscape, 1024×600, split-width 540×720, 200% zoom, increased text, and breakpoint checks at 767/768/769px.

## 18. Performance strategy

- Use React, CSS transforms, opacity, and existing Motion; no per-frame game engine.
- Static/lightweight Clara remains valid and Word Rescue must not require Live2D.
- Lazy-load Word Rescue presentation code with the Lesson 2 route where practical.
- Import only the current visual and at most the next server-declared visual; do not preload all 49 full-resolution assets.
- Set image dimensions/aspect ratios to avoid layout shift and decode before entrance animation.
- Prefer transform/opacity animation; avoid layout-thrashing drag calculations and large box-shadow animation.
- Cap sparkles and stop continuous effects when the page is hidden, recording begins, reduced motion is requested, or the component unmounts.
- Measure Android WebView memory, route load, image bytes, interaction latency, and long tasks before enabling visual assets broadly.
- No runtime network asset host. A missing optional visual falls back to the text mechanic for the same current item without changing academic content.

## 19. Sound/animation strategy

Animation vocabulary:

- tile press: 80–120ms tactile compression;
- valid snap: short translation/scale settle;
- incorrect tile: one gentle horizontal shake, then reset;
- successful restore: small bounce, outline, and limited sparkles;
- mission completion: five pages close into the storybook;
- reduced motion: immediate final states with opacity-only or no transition.

Optional sound effects may include select, snap, success, and gentle retry. They should be tiny bundled files, independently licensed/reviewed, and implemented without a new audio library unless evidence shows the existing platform cannot meet the need.

Sound effects are lower priority than learner audio and Clara speech. Stop or mute them during Clara playback, recording, learner playback, submission, and route teardown. Provide a clearly named sound-effects toggle; every cue must have a visual/text equivalent. Do not add background music in v1.

## 20. Accessibility

- Use a logical landmark and heading structure inside the existing activity shell.
- Every tile and slot has a concise accessible name, such as “Letter A, available” or “Position 2, empty.”
- Drag is never the only method. All activities are fully operable by touch, mouse, keyboard, switch-style sequential focus, and the tap fallback.
- Preserve visible focus, meaningful DOM order, and focus restoration after a tile moves. Do not use ARIA to hide non-semantic div controls.
- Announce short state changes through a polite live region: selected, placed, try again, restored, loading, or network error. Do not repeatedly announce decorative animation.
- The final restored word remains real text in Lexend, selectable by assistive technology even when letters animate visually.
- Illustrations are supplemental. If an image is part of a formative prompt after standards approval, it needs reviewed concise alternative text; decorative duplicates use empty alt text.
- Do not rely on color, sound, motion, or shape alone for correctness.
- Respect `prefers-reduced-motion`; provide stable final composition and no infinite tile bobbing.
- Validate contrast in all themes, 200% zoom/reflow, increased text, Windows High Contrast/forced colors where supported, and screen-reader announcements.
- Recorder accessibility and audio error handling remain the existing canonical controls.

## 21. Files likely to reuse

Reuse these established contracts and components rather than duplicating them:

- `apps/web/src/features/lesson/LessonTwoPage.tsx` — canonical coordinator and state transitions.
- `apps/web/src/features/lesson/lessonApi.ts` — Lesson 2 endpoints and Zod contract.
- `apps/web/src/features/lesson/lesson.css` and `apps/web/src/features/assessment/assessment.css` — existing activity layout and responsive shell behavior.
- `apps/web/src/features/learner-activity/LearnerActivityShell.tsx` and its shared result composition.
- Existing `AssessmentRecorder` (currently imported as `Recorder`), `LessonProgressRail`, `LessonPracticeTriesToggle`, `BigButton`, `Surface`, and action icons.
- `apps/web/src/features/intro/ClaraStage.tsx`.
- `apps/web/src/features/clara-audio/*` speech preparation/playback infrastructure.
- `packages/design-tokens/**` semantic colors, typography, radii, shadows, focus, and theme values; consume them without changing the package unless a genuinely missing semantic token is approved.
- `apps/api/app/Http/Controllers/LearnerLessonTwoController.php` and its current endpoint methods.
- `LessonContentCatalog`, `LessonTeachingStateMachine`, `LessonTwoSupportPresentation`, `LearnerLessonAccessService`, `LearnerLessonCompletionService`, `LearnerAssessmentAsr`, and `SpeechEquivalenceResolver`.
- `content/lessons/v1/lesson-2-word-items.csv` as the academic source of truth.
- Existing Lesson 2 published speech and the `word-wizard.png` completion achievement.

Letter Parade should be reused as a design/interaction reference, not imported as a dependency.

## 22. Files likely to add/modify

Exact names may be refined during implementation, but the intended change surface is:

### Add

- `apps/web/src/features/lesson/word-rescue/WordRescueStage.tsx`
- `apps/web/src/features/lesson/word-rescue/WordRescueMissingLetter.tsx`
- `apps/web/src/features/lesson/word-rescue/WordRescueBuildWord.tsx`
- `apps/web/src/features/lesson/word-rescue/WordRescueMissingWord.tsx`
- Conditional visual components for picture mechanics only after approval.
- `apps/web/src/features/lesson/word-rescue/wordRescuePresentation.ts`
- `apps/web/src/features/lesson/word-rescue/word-rescue.css`
- `apps/web/src/features/lesson/word-rescue/assets/**` plus source/license/review records if visuals or effects are approved.
- `apps/web/tests/WordRescueStage.test.tsx` and focused interaction/accessibility tests.
- `content/lessons/v1/word-rescue-presentations.csv` — Phase 1A foundation complete.
- `apps/api/app/Services/WordRescuePresentationCatalog.php` and `apps/api/tests/Unit/WordRescuePresentationCatalogTest.php` — Phase 1A validation foundation complete.
- `docs/WORD_RESCUE_PRESENTATION_CATALOG_REVIEW.md` — Phase 1A semantic and boundary review.
- `apps/web/src/features/lesson/word-rescue/assets/vocabulary/**` — Phase 1B Batch A, Batch B, and Batch C review assets only; no live consumer.
- `apps/web/src/features/lesson/word-rescue/wordRescueAssets.ts` and `wordRescueAssetReview.ts` — typed registry and review metadata for 27 approved image assets, 5 approved Icon Batch A candidates, and 1 review-pending JOG revision.
- `apps/web/tests/WordRescueAssets.test.ts` — file, mapping, budget, duplicate, unknown-key, and text-only safety checks.

### Modify narrowly

- `apps/web/src/features/lesson/LessonTwoPage.tsx` to mount the game presentation while preserving recorder/support/completion orchestration.
- `apps/web/src/features/lesson/lessonApi.ts` to validate optional Word Rescue presentation metadata.
- `apps/web/src/features/learn-with-clara/LearnWithClaraMenuPage.tsx` so Words unlocks audio and enters canonical Lesson 2.
- `apps/web/tests/LearnWithClaraMenuPage.test.tsx`, `LessonTwoApi.test.ts`, and Lesson 2 page tests.
- `LearnerLessonTwoController.php` only to serialize validated presentation metadata; do not alter scoring endpoints.
- `LessonContentCatalog.php` only if the approved companion data must be included in the immutable run snapshot.
- `apps/api/config/speech.php` and TTS catalog/review files only for newly approved fixed Word Rescue lines.
- `READIRECT_REVAMP_LEARN_WITH_CLARA_STANDARD.md` and `READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md` now record the approved canonical/menu and picture boundaries; implementation remains a later phase.
- `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md` now documents Word Rescue as the Lesson 2 presentation without changing its two-mission, ten-item, speech-scored contract.

No database migration, new API family, new JavaScript dependency, or new game workspace is expected for v1.

## 23. Systems/files to protect

- Offline Practice remains completely separate and unchanged. Word Rescue is ONLINE ONLY.
- Diagnostic Assessment and Final Assessment.
- Lessons 1 and 3–6 and their presentation/content.
- Existing Lesson 2 item count, missions, target selection, exposure cycles, immutable snapshots, retry semantics, scoring, and completion semantics.
- Mu, Nu, ASR preprocessing, `SpeechEquivalenceResolver`, and saved evidence.
- Learner authentication and server-owned run ownership.
- `learner_clara_listening_sessions`; do not store canonical Word Rescue progress there.
- Existing database schema unless a separately approved need emerges.
- Game lobby and `apps/games/**`; Word Rescue is not one of those game modules.
- Shared design tokens and global styles; consume existing values and keep new styles feature-scoped.
- Existing approved speech files and checksums; additions follow publication review rather than overwriting unrelated clips.
- User's current uncommitted mobile, dashboard, assessment, icon, database, and Offline Practice changes.

## 24. Test matrix

| Layer                 | Required cases                                                                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Presentation metadata | All 49 content IDs covered; no orphan/duplicate keys; valid visual state; approved mechanics; exact sentence occurrence; missing-letter index and distractors valid. Asset existence/hash/size remains a later final-art gate |
| Pure game logic       | Tile shuffling preserves multiplicity (`dad`); tap and drag produce same result; wrong answers do not complete; hints are bounded; reduced-motion state is deterministic                                                      |
| React component       | Missing Letter, Build Word, Missing Word, optional picture mechanic, loading/error, support modes, terminal feedback, Skip, Next, mission transition, completion                                                              |
| Accessibility         | Keyboard-only completion, visible focus, logical announcements, drag fallback, 44px targets, contrast, reduced motion, 200% zoom, screen-reader smoke test                                                                    |
| API schema            | Current payload remains valid; reviewed `word_rescue` metadata parses; unknown keys fail closed; hidden target remains hidden where required                                                                                  |
| Laravel feature       | Auth ownership, diagnostic gate, start/resume idempotency, ten unique words, stale item rejection, unchanged Mu request, support transitions, skip, completion, Word Wizard, progression                                      |
| Cross-entry           | Dashboard and Clara-menu entries open the same run; refresh and second tab do not duplicate snapshots; completed run returns results                                                                                          |
| Connectivity          | No connection blocks/returns from online entry; API loss during item shows retry without false save; reconnect reloads authoritative state                                                                                    |
| Speech/audio          | Audio unlock, static and Live2D readiness, published prompt failure, runtime feedback, demonstration, no TTS/SFX overlap with recorder or playback, teardown                                                                  |
| Responsive            | 320×568, 360×740, 390×844, 412×915, 540×720 split, 768×1024, 844×390, 1024×600, 1366×768, 1920×1080, 767/768/769 breakpoint checks                                                                                            |
| Physical Android      | Capacitor WebView portrait/landscape, touch drag cancellation, back navigation, safe area/gesture bar, microphone permission, low/mid-tier device performance, intermittent Wi-Fi                                             |
| Browser               | Chromium/Edge baseline and supported desktop browsers; touch emulation plus real touch; keyboard/mouse parity                                                                                                                 |
| Regression            | Existing Letter Parade, canonical Lesson 2 API tests, other lessons, learner dashboard, Clara menu, assessment, achievements, and Offline Practice remain unchanged                                                           |

Playwright should run the critical online path with screenshots at mandatory viewports. Manual Android checks must be labeled as physical-device results; emulation must not be reported as physical-device validation.

## 25. Implementation phases

### Phase 0 — source-of-truth decision — complete

- Approved Learn with Clara → canonical Lesson 2 progression for the Words choice.
- Approved the narrow reviewed-visual exception for formative Word Rescue support.
- Updated the three controlling standards before implementation.
- Confirmed one canonical route/run and no separate Word Rescue persistence.
- Preserved the diagnostic access gate, speech requirement, assessment rules,
  Letter Parade behavior, and Offline Practice separation.

### Phase 1 — content and asset publication

- **Phase 1A — presentation catalog foundation — complete.** Authored and validated one companion row for all 49 active words; recorded 27 image, 13 icon, and 9 text-only decisions; fixed missing-letter metadata; preserved exact approved sentence occurrences; and disabled Word/Picture Match.
- **Phase 1B Batch A — first clear-image asset batch — approved.** The ten assets for `bag`, `bed`, `cap`, `cat`, `dog`, `hat`, `jug`, `mug`, `pan`, and `pot` are formally marked `approved` and locked as the reference art direction. Content IDs, visual keys, current WebPs, dimensions, bytes, alt guidance, and review records are preserved.
- **Phase 1B Batch B — second clear-image asset batch — approved.** All ten Batch B assets, including the revised `ham` and `mat`, are formally approved and preserved with their review metadata.
- **Phase 1B Batch C — human review and targeted revisions — complete.** Human approval recorded `fan`, `leg`, and `lip` as `approved` without changing their files. The targeted `den`, `fin`, `gum`, and `lid` replacements were also human-approved with their files, dimensions, keys, alt guidance, and provenance preserved. The image track is now 27/27 approved.
- **Phase 1B Icon Batch A — five approved, JOG revised.** Human approval recorded `bat`, `can`, `dot`, `gap`, and `hot` as `approved` without changing their files. Only `jog` was regenerated; its replacement is registered as `needs_review` and documented with focused old-vs-new and Android-size review sheets. Icon Batch B (`dad`, `dig`, `hip`, `lap`, `man`, `men`, `pet`) remains reserved.
- See `docs/WORD_RESCUE_PRESENTATION_CATALOG_REVIEW.md` for all inventories, review sheets, the combined style reference, and the Icon Batch A review gate.
- Stop asset generation after the JOG revision. Wait for explicit human approval of `jog` before beginning Icon Batch B or adding any runtime consumer.
- Human-review final visual classifications, ambiguity, child safety, inclusion, alt descriptions, distractors, and mechanic compatibility before asset publication.
- Produce, optimize, license, and review approved assets only.
- Publish any new fixed Clara lines and optional effects through their normal review paths.

### Phase 2 — pure presentation components

- Implement typed, deterministic tile/slot logic and semantic components.
- Add tap fallback first, then pointer drag enhancement.
- Add reduced-motion and accessibility behavior.
- Test without connecting completion or altering APIs.

### Phase 3 — canonical Lesson 2 integration

- Add current-item presentation metadata to the existing server payload.
- Mount Word Rescue in `LessonTwoPage` while retaining recorder, support, Skip, Next, result, and achievement code.
- Wire Words menu entry to the canonical route and handle the diagnostic-gate response.
- Prove resume, stale-state rejection, and cross-entry identity.

### Phase 4 — polish

- Add conditional visuals, restrained animations, and optional sound effects.
- Tune phone/landscape/tablet/desktop layouts and static Clara mode.
- Optimize asset loading and Android memory use.

### Phase 5 — verification and rollout

- Run unit, frontend, API, accessibility, Playwright, build/type/lint, and physical Android checks.
- Review final Git diff for unrelated changes and protected systems.
- Roll out to staging online only, monitor API/speech errors and completion regressions, then approve production activation.

## 26. Risks

| Risk                                                              | Impact                                                                      | Mitigation                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Boundary drifts during implementation                             | A later UI change could make another Clara class canonical or bypass access | Phase 0 standard amendment, explicit Words-only copy, one canonical run, server access gate         |
| Picture rule conflict                                             | Implementation violates current curriculum/interaction standard             | Do not ship pictures without written approval; retain text-only variant                             |
| Visual ambiguity (`bat`, `bun`, `fan`, `can`, actions/properties) | Learner selects based on a different meaning                                | Per-word human review; `icon`/`none` states; never force an image                                   |
| Game action appears to replace reading                            | Learner completes tiles without speaking                                    | Recorder/review/Submit remains mandatory for every canonical item                                   |
| Duplicate or divergent progress systems                           | Completion, analytics, and achievements disagree                            | No Word Rescue session table/endpoints; reuse `LessonRun` and existing services                     |
| Extra pre-task length                                             | Ten items become tiring                                                     | One brief interaction per item, bounded hints, no recap in v1, usability timing                     |
| Drag failure on Android                                           | Core interaction becomes inaccessible                                       | Pointer capture plus tap fallback; physical WebView tests; large snap targets                       |
| Formative errors pollute academic attempts                        | Mastery data becomes invalid                                                | Never call submit/support for tile mistakes; document state separation                              |
| New speech overlaps recorder                                      | TTS is captured as learner evidence                                         | Preserve audio priority and existing recorder/Clara locks; SFX below TTS                            |
| Asset bundle growth                                               | Slow staging/Android startup and high memory                                | Per-current-item loading, WebP optimization, byte budgets, no preload-all                           |
| Two browser tabs race                                             | Stale item actions or confusing UI                                          | Existing server item/run checks; handle 409 by reloading canonical state                            |
| Existing completed Lesson 2 run                                   | Learner expects a new game but receives results                             | Clearly present completed canonical result; repeat behavior requires a separate curriculum decision |
| Current dirty worktree                                            | Unrelated mobile/offline changes are overwritten                            | Limit implementation diffs and review final Git status/diff carefully                               |

## 27. Definition of Done

Word Rescue is done only when all of the following are true:

- The controlling standards explicitly approve the final Learn with Clara/canonical and visual boundaries, with Words as the only canonical entry exception.
- Words selection enters the one canonical online Lesson 2 route and run.
- A run still contains exactly two missions of five unique approved words, selected and snapshotted by Laravel.
- Every item still requires the existing recorder review and explicit speech Submit or canonical Skip.
- Mu, speech equivalence, teaching support, attempts, mastery, completion, Word Wizard, and progression are unchanged and server-authoritative.
- The game layer offers approved, short, varied mechanics without adding academic targets, missions, scores, lives, or frontend completion.
- Every current word has reviewed presentation metadata and a safe text-only path; only approved words use approved visuals.
- Phase 1A catalog tests prove 49/49 coverage, deterministic mechanics, sentence integrity, and fail-closed metadata validation; final artwork review remains outstanding.
- Drag mechanics have an equally capable tap and keyboard fallback.
- Clara uses the existing renderer, speech preparation, published catalog, runtime-feedback boundaries, and audio safety.
- The page works in static/lightweight mode and does not require a game engine, new backend, or new database schema.
- Loading, refresh, resume, stale state, no-connection, API failure, speech failure, and completed-run states are truthful and recoverable.
- Required automated tests pass, mandatory viewports have screenshot evidence, accessibility checks pass, and a physical Android device validates touch, microphone, safe areas, orientation, and performance.
- No protected assessment, other lesson, game-lobby, authentication, ASR, scoring, or progression behavior regresses.
- Offline Practice has no Word Rescue code, assets, packs, manifests, storage, synchronization, routes, or modified behavior.
- Final Git review shows only intentionally approved Word Rescue and standards changes.

Implementation must stop if meeting this definition would require bypassing the canonical Lesson 2 services or silently overriding either Phase 0 source-of-truth decision.
