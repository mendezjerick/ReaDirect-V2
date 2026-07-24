# ReaDirect Content CSV And Selection Standard

Purpose: define the authoritative CSV structure, assessment forms, lesson
content pools, Filipino-friendly pronunciation rules, content validation,
learner-specific selection cycles, and immutable activity snapshots for
ReaDirect-V2.

This document is the source of truth for authored assessment and required-lesson
content. It complements:

- `READIRECT_REVAMP_ASSESSMENT_GUIDE.md` for fixed task counts, branches,
  scoring, and assessment completion.
- `READIRECT_REVAMP_LESSON_STRUCTURE_STANDARD.md` for displayed content, spoken
  targets, ASR model assignment, accepted answers, and lesson progression.
- `READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md` for the six
  lessons, required missions, Retry, Skip, Submit, and responsive presentation.
- `READIRECT_REVAMP_ASR_GUIDE.md` for Nu and Mu evidence, comparison, and scoring
  behavior.
- `READIRECT_REVAMP_PROJECT_STRUCTURE.md` for repository ownership and runtime
  asset placement.

## Top Rules

1. Published assessment forms are fixed, ordered, versioned, and never randomly
   selected at runtime.
2. Diagnostic and Final Assessment runs mirror one shared fixed form. They use
   the same ordered items, two story choices, task counts, and scoring rules.
3. Required lessons select active content without replacement from a published
   content version.
4. Selection is authoritative in Laravel and PostgreSQL. React never performs
   the final random draw or owns exposure history.
5. A started activity receives an immutable, persisted content snapshot. Refresh,
   exit, sign-out, or resume must not reroll it.
6. Selection uniqueness follows the primary `target_key`, not every word token
   appearing inside a larger phrase, sentence, or passage.
7. Repeated required activities use fresh, previously unencountered targets
   while sufficient targets remain.
8. When unused targets cannot fill a new activity, the remaining unused targets
   are consumed first and a new cycle supplies the remainder without creating a
   duplicate inside that activity.
9. Learner-spoken target words must not contain consonant clusters, consonant
   digraphs, or consonant multigraphs. Lesson 5 and Assessment Task 3A passages
   are the only approved target-content exception.
10. All learner-spoken targets must be manually reviewed for familiarity and
    pronunciation suitability for Filipino children before publication.
11. CSV files are reviewed authoring sources. Laravel imports and validates them
    into PostgreSQL; the browser does not parse raw CSV files during activities.
12. Published versions and identifiers are immutable. Corrections create a new
    version instead of silently changing an active or completed attempt.
13. The System Administrator True Sandbox may receive an admin-only catalog of
    active spoken targets through Laravel. This catalog excludes choice-only
    rhyme and comprehension items, including Lesson 6, and excludes isolated
    letters. It never gives the browser direct CSV access.

## Authority Boundaries

This standard owns:

- CSV directory and schema conventions.
- Fixed assessment-form content behavior.
- Initial required lesson item counts.
- Target identity and exposure-cycle behavior.
- Pool exhaustion and repeat behavior.
- Content import, validation, versioning, and activation.
- Pronunciation-focused content authoring restrictions.

It does not change:

- Assessment item counts, scoring, branches, or result timing.
- Nu or Mu model behavior.
- Lesson navigation, recording, Retry, Skip, Submit, or Next behavior.
- Achievement unlock rules.
- Learner, teacher, or staff authorization boundaries.

If a CSV row conflicts with an assessment, lesson, interaction, or ASR rule,
the CSV row is invalid. Content cannot override application behavior.

## Repository Content Layout

The approved root authoring structure is:

```text
content/
|-- README.md
|-- lexicon/
|   |-- letters.csv
|   |-- words.csv
|   |-- approved-prompt-words.csv
|   \-- proper-names.csv
|-- assessments/
|   \-- v1/
|       \-- shared/
|           |-- task-1a-letters.csv
|           |-- task-2a-rhymes.csv
|           |-- task-2b-words.csv
|           |-- task-3a-passages.csv
|           \-- task-3b-comprehension.csv
\-- lessons/
    \-- v1/
        |-- lesson-1-letter-items.csv
        |-- lesson-2-word-items.csv
        |-- lesson-3-phrases.csv
        |-- lesson-4-sentences.csv
        |-- lesson-5-passages.csv
        \-- lesson-6-comprehension.csv
```

The version folder is the content release identifier, not an informal filename
suffix. The database stores the exact imported version with every assessment run,
lesson save, activity snapshot, result, exposure, and analytics event.

## CSV File Requirements

Every CSV file must:

- Use UTF-8 encoding.
- Contain exactly one header row.
- Use commas as field separators.
- Use RFC 4180-style quoting for values containing commas, quotes, or line
  breaks.
- Use `true` and `false` for Boolean values.
- Use empty fields only where the schema explicitly permits null.
- Use lowercase kebab-case for permanent identifiers.
- Preserve authored learner-facing capitalization and punctuation in display
  fields.
- Avoid spreadsheet formulas, macros, comments, merged cells, and presentation
  formatting.
- Have stable column names and deterministic validation.

Multi-value fields such as accepted answers or answer choices use a valid JSON
array encoded as one quoted CSV value. Ad hoc delimiters such as commas, pipes,
or semicolons inside one untyped field are prohibited.

Example:

```csv
content_id,expected_answer,accepted_answers
lesson-6-who-001,lena,"[""lena"",""it is lena"",""lena does""]"
```

CSV row order is meaningful only for fixed assessment forms. Lesson content uses
stable identifiers and server selection; rearranging lesson source rows must not
change target identity or an existing learner snapshot.

## Shared Content Fields

Every lesson content row contains or resolves these fields:

| Field | Rule |
| --- | --- |
| `content_id` | Permanent globally unique item key. |
| `content_version` | Published version imported with the row. |
| `status` | `draft`, `active`, or `retired`. Runtime selection uses only `active`. |
| `lesson_key` | Permanent required lesson key. |
| `mission_key` | Permanent mission key within that lesson. |
| `activity_type` | Approved activity type from the Lesson Structure Standard. |
| `target_type` | `letter`, `word`, `phrase`, `sentence`, `passage`, or `comprehension`. |
| `target_key` | Canonical identity used for selection without replacement. |
| `display_text` | Exact learner-facing text. |
| `spoken_target` | Exact normalized target evaluated by Nu or Mu. |
| `asr_model` | `nu`, `mu`, or `none`. |
| `difficulty_band` | Centrally approved content band. |
| `syllable_guide` | Manual learner-pronunciation segmentation when applicable. |
| `syllable_count` | Positive authored count when applicable. |
| `pronunciation_review` | Required review status. Active content must be `approved`. |
| `display_fingerprint` | Canonical identity of the complete visible surface. |

Type-specific files add only fields required by that activity. A field must not
be overloaded with different meanings in different rows.

## Identity Model

### Content Identity

`content_id` identifies one authored target row. A row normally owns one
presentation. The explicit Version 1 exceptions are Lesson 1 and Lesson 2,
where one canonical target row owns all mission presentations of that same
letter or word.

```text
content_id: lesson-v1-letter-c
```

For a multi-presentation row, changing any visible context, expected answer, or
target changes that authored row and requires a new content version. The
mission variants must never be split into extra pool rows merely to inflate the
available target count. For all other activity types, changing the visible
context, question, passage, or target creates a different content item. Minor
text corrections in released content also require a new content version.

### Primary Target Identity

`target_key` identifies the skill target used by the no-repeat system.

```text
letter:c
word:cat
phrase:red-bag
sentence:lena-has-a-red-bag
passage:lena-and-the-garden-001
comprehension:who-lena-has-a-bag-001
```

The same target expressed through two presentation variants retains the same
target key. Uppercase and lowercase letter forms do not create separate targets.

### Display Fingerprint

`display_fingerprint` prevents an exact complete surface from being mistaken for
new content merely because it has another row identifier. When one row owns
multiple mission presentations, the importer derives and validates one
fingerprint for every presentation surface, even if the CSV stores only the
canonical display fingerprint directly.

```text
Letter pair `C c`:                    display:c-c
Highlighted `C` in `Cat`:            display:cat-highlight-c
Missing letter `cat - _at`:          display:cat-missing-c
Sentence `Lena has a red bag.`:       display:lena-has-a-red-bag
```

Duplicate active fingerprints inside the same activity type and content version
fail import unless the standard explicitly identifies the rows as presentation
variants of one target.

## Primary-Target Deduplication Rule

No-repeat behavior applies to the core target, not to every smaller token inside
a larger reading unit.

Examples:

- Lesson 1 Missions 1, 2, and 3 all target letter identities. If `letter:c` was
  encountered in Mission 1, Missions 2 and 3 exclude it while unused letter
  targets remain.
- Lesson 2 Missions 1 and 2 both target word identities. If `word:cat` was
  encountered in Mission 1, Mission 2 excludes it while unused word targets
  remain.
- A Lesson 4 sentence may contain the familiar word `cat` even when `word:cat`
  was practised in Lesson 2. The primary target is the complete sentence.
- A phrase, sentence, passage, or comprehension prompt may reuse necessary
  familiar vocabulary. It must not reuse the exact same complete primary target
  while unused targets remain in that target scope.

Prohibiting every previously seen token from later phrases, sentences, and
passages is not allowed. It would make natural content impossible and would
remove useful vocabulary reinforcement.

## Lesson Target Scopes

Exposure cycles are separate by learner, content version, and target scope.

| Target scope | Included required missions |
| --- | --- |
| `required.lesson-1.letter-targets` | Lesson 1 Missions 1, 2, and 3. |
| `required.lesson-2.word-targets` | Lesson 2 Missions 1 and 2. |
| `required.lesson-3.phrase-targets` | Lesson 3 Mission 1. |
| `required.lesson-4.sentence-targets` | Lesson 4 Mission 1. |
| `required.lesson-5.passage-targets` | Lesson 5 Mission 1. |
| `required.lesson-6.comprehension-targets` | Lesson 6 Mission 1, separated further by 5W type. |

Selection history does not cross account identities. It is never shared between
learners, schools, guests, or devices.

## Initial Required Lesson Draw Counts

The initial required content release uses these activity counts:

| Lesson | Mission | Items in one required run | Primary target requirement |
| --- | --- | ---: | --- |
| Lesson 1 | Mission 1: Display Letter Pair | 5 | Five unique letter targets. |
| Lesson 1 | Mission 2: Highlighted First Letter | 5 | Five new letter targets not used in Mission 1. |
| Lesson 1 | Mission 3: Missing First Letter | 5 | Five new letter targets not used in Missions 1 or 2. |
| Lesson 2 | Mission 1: Display Word | 5 | Five unique word targets. |
| Lesson 2 | Mission 2: Highlighted Sentence Word | 5 | Five new word targets not used in Mission 1. |
| Lesson 3 | Mission 1: Simple Phrase | 5 | Five unique phrase targets. |
| Lesson 4 | Mission 1: Simple Sentence | 5 | Five unique sentence targets. |
| Lesson 5 | Mission 1: Short Passage | 1 | One passage target. Authored pages remain one item. |
| Lesson 6 | Mission 1: Comprehension | 5 | Exactly one unique item for each of Who, What, Where, When, and Why. |

The counts balance independent child use with attention length. Changing them is
a curriculum revision and requires updating this standard and the interaction
standard before content generation or implementation changes.

At minimum, a published pool must be able to fill one complete required run
without repeating a target. For Lesson 1 this means at least 15 eligible letter
targets across the three missions. For Lesson 2 this means at least 10 eligible
word targets across its two missions.

The importer must verify that overlapping mission pools can actually produce a
complete unique allocation. Counting rows alone is insufficient when a target
is eligible for only one mission.

## Version 1 Authored Lesson Pool Sizes

The authored pool size is not the number of items presented in one required
run. It is the complete active content inventory from which the runtime draw
counts above are selected.

| Lesson | Version 1 authored pool | Authoring rule |
| --- | ---: | --- |
| Lesson 1 | 26 rows | Exactly one row for every letter A-Z. A row owns the display-pair, highlighted-first-letter, and missing-first-letter variants for that target. |
| Lesson 2 | 49 rows | Forty-nine unique simple words, ordered alphabetically and grouped by close onset-phoneme families. |
| Lesson 3 | 20 rows | Twenty unique simple phrases. |
| Lesson 4 | 20 rows | Twenty unique simple sentences. |
| Lesson 5 | 5 rows | Five unique 50-word passages. |
| Lesson 6 | 10 rows | Ten unique comprehension items: exactly two each for Who, What, Where, When, and Why. |

Lesson 1 must never create extra rows merely because the same letter appears in
another mission presentation. Mission eligibility belongs on the single letter
row. Under the current beginner-word restrictions, Q and X are eligible for
Mission 1 only; the remaining 24 letters are eligible for the two context-word
missions. This exception is explicit and must not be bypassed with a consonant
cluster, digraph, multigraph, irregular word, or unfamiliar loan word.

For Lesson 2, `sort_order` follows the alphabetical order of `display_text`.
`family_key` groups close onset-phoneme neighbours for author review; it does
not force the runtime selector to draw adjacent family members together.

Every Version 1 import must reject the release if any pool has the wrong row
count, duplicate target keys, broken sort order, an invalid mission allocation,
or a Lesson 6 question-type count other than two per 5W category.

## Fixed Assessment Forms

Assessments use authored forms, not lesson-style content pools.

### Shared Mirrored Form

Version 1 contains:

- One shared fixed assessment form used by Diagnostic runs.
- The same shared fixed assessment form used by Final runs.

Diagnostic and Final remain distinct assessment runs with separate answers,
scores, evidence, completion state, and timestamps. They mirror the content
exactly; the Final run does not substitute, shuffle, or select alternate rows.

### Assessment Form Counts

| Task | CSV requirement |
| --- | --- |
| Task 1A | Exactly 10 ordered isolated-letter items. |
| Task 2A | Exactly 10 ordered rhyme decisions: 6 rhyming and 4 non-rhyming. |
| Task 2B | Exactly 10 ordered isolated-word pronunciation items. |
| Task 3A | Exactly 2 fixed selectable passages. One is administered after the learner confirms a story choice. |
| Task 3B | Exactly 10 authored questions: 5 linked to each passage, covering Who, What, Where, When, and Why. Only the selected story's 5 questions are administered. Each question has 4 choices and 1 correct choice. |

Branching still determines which fixed tasks are administered. It does not
change, shuffle, or replace their authored rows.

### Task 1A Letter Selection

Task 1A uses ten distinct, easy-to-identify and easy-to-pronounce English letter
names. Content generation must:

- Exclude locally difficult or highly confusable letter names from the initial
  fixed form where practical.
- Consult Nu validation and confusion evidence, including the groups documented
  in the ASR Guide.
- Keep uppercase and lowercase display forms paired as one item.
- Store only the single uppercase letter class as the Nu spoken target.
- Do not duplicate TTS spellings in assessment CSV rows. Runtime isolated-letter
  speech resolves the uppercase class through
  `READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`.
- Use no duplicate letter within one form.
- Difficulty-match the Diagnostic and Final ten-letter sets.

The exact letters are authored in the CSV stage that follows this standard.

### Assessment Isolation

Assessment content ignores the learner's lesson target-exposure ledger. A fixed
assessment item may overlap content previously encountered in practice. That
overlap does not consume, reset, or advance a lesson selection cycle.

An assessment restart or authorized retake uses the same fixed form version. A
confirmed story choice remains locked for that assessment run. It does not
generate easier, harder, or unseen replacements.

### Task 3 Single-Fact 5W Map

Each Task 3A story has exactly one canonical fact for each Task 3B question type:

```text
Who  -> one person
What -> one central thing
Where -> one place
When -> one time or day
Why -> one stated purpose
```

The passage may repeat a canonical fact for clarity, but it must not introduce a
second person, object, place, time, or purpose that could plausibly answer the
same 5W question. Decorative details must not compete with the five canonical
facts.

Task 3A CSV rows store `who_fact`, `what_fact`, `where_fact`, `when_fact`, and
`why_fact`. Each story's five Task 3B `correct_answer_text` values must match
those fields exactly.

## Filipino-Friendly Target Authoring

“Easy for Filipino learners to pronounce” is an authored and reviewed content
property, not a runtime guess based only on spelling.

Every active learner-spoken target must:

- Use familiar, age-appropriate vocabulary.
- Use a clear and manually reviewed pronunciation.
- Prefer predictable letter-to-sound relationships.
- Avoid silent letters and irregular pronunciation outside an approved passage.
- Avoid contractions.
- Avoid obscure proper nouns, slang, and region-specific idioms.
- Have an authored spoken target independent from decorative display formatting.
- Pass a Filipino pronunciation review before activation.

Review should include actual Filipino educators or trained content reviewers.
Automated syllable or phoneme checks may flag problems but cannot approve a row.

### Syllable Rules

Isolated target words should normally use one or two clearly segmentable
syllables. Preferred shapes include:

```text
CV
CVC
CV.CV
CVC.CV
```

Example authoring metadata:

```text
display_text: Lena
spoken_target: lena
syllable_guide: Le-na
syllable_count: 2
pronunciation_review: approved
```

Syllable guides are authored manually. The system must not publish a generated
syllable split without human review.

### CVC `a/o/u` Scoring Equivalence

Active Mu content retains its exact authored spelling and pronunciation
metadata. At scoring time only, a regular three-letter CVC token whose middle
letter is `a`, `o`, or `u` accepts the other two middle-vowel realizations when
its first and final consonants remain identical.

```text
C1 a C2
C1 o C2
C1 u C2
```

These three forms share one expected-aware scoring family. This applies to
isolated words and matching tokens embedded in phrases, sentences, passages,
and spoken comprehension answers. It never rewrites CSV content, displayed
text, Mu's raw transcript, or the canonical final transcript. Middle `e` and
`i`, different consonant frames, and irregular spellings remain outside the
family.

The family is stored as deduplicated global token aliases rather than one rule
per item. Multi-word Mu targets are aligned first, then every substituted word
is checked independently. All differing tokens must either match exactly or
belong to the same CVC `a/o/u` family; omissions, insertions, and consonant
changes remain incorrect.

## Consonant Cluster, Digraph, And Multigraph Rule

### Definitions

A consonant cluster contains two or more adjacent consonant sounds in the same
word or syllable, such as:

```text
stop   -> /st/
plant  -> /pl/ and /nt/
desk   -> /sk/
```

A consonant digraph or multigraph uses two or more written letters for one
consonant sound or spelling unit, such as:

```text
fish   -> sh
chat   -> ch
thin   -> th
phone  -> ph
```

Therefore, `fish` is prohibited by the digraph rule, not the cluster rule.

### Hard Prohibition

Except for the approved passage exception, learner-spoken target content must
not contain:

- A consonant cluster at the beginning, middle, or end of a word.
- A consonant digraph.
- A consonant multigraph.

Common sequences requiring rejection or explicit validator coverage include:

```text
bl br ch ck cl cr dge dr fl fr gh gl gr kn ng ph pl pr
qu sc sh sk sl sm sn sp spl spr squ st str sw tch th tr
tw wh wr
```

This list is not exhaustive. Validation must examine the authored grapheme and
pronunciation fields rather than treating the list as the complete linguistic
rule.

The prohibition applies to learner-spoken targets in:

- Assessment Task 1A letter names where relevant to the authored letter choice.
- Assessment Task 2A displayed rhyme words.
- Assessment Task 2B spoken word targets.
- Lesson 1 context words used for highlighted or missing-letter items.
- Lesson 2 target words and their displayed sentence contexts.
- Lesson 3 phrases.
- Lesson 4 sentences.

Words spoken only by Ma'am Clara as interface instructions or mandatory 5W
questions are not learner-spoken targets. Lesson 6 answers are authored
four-choice selections and are outside the spoken-target rule.

### Existing Examples

Earlier documentation may contain illustrative words such as `plant` or `fish`
and sentences beginning with `The`. Those examples are not automatically
approved CSV content. Only rows that pass this standard and the content review
pipeline may become active.

When content CSVs are generated, new approved examples should replace or be
clearly separated from older structural illustrations where necessary.

## Passage-Only Exception

The only learner-target exception to the cluster, digraph, and multigraph
prohibition is passage reading:

- Lesson 5 Mission 1: Short Passage.
- Assessment Task 3A: Passage Reading.

This exception exists because passage reading is the most advanced reading unit
in the current system. It allows natural progression beyond the controlled
letter, word, phrase, and sentence targets.

The exception is permission, not a requirement to maximize complexity. Passage
content must still:

- Remain age-appropriate and familiar.
- Introduce complex forms gradually.
- Limit the density of clusters, digraphs, multigraphs, irregular spellings, and
  unfamiliar vocabulary.
- Use short, clear sentences.
- Pass Filipino pronunciation review.
- Fit the authored page and viewport rules.
- Preserve exact spoken targets for Mu comparison.

### Shared Passage Authoring Guide

Every Version 1 passage for Lesson 5 or Assessment Task 3A follows the same
clarity structure:

| Property | Required rule |
| --- | --- |
| Length | Exactly 50 words. |
| Sentence count | Exactly 4 complete sentences. |
| Sentence flow | Use commas to connect closely related simple actions instead of splitting the passage into many short sentences. |
| Main person | Exactly 1 named person. Do not add a friend, parent, owner, group, or another person. |
| Who fact | The one named person. |
| What fact | One central thing associated with the person's main action. |
| Where fact | One place only. Do not introduce another plausible location. |
| When fact | One day or time only. Do not introduce another plausible time. |
| Why fact | One directly stated purpose only. Do not introduce another plausible reason. |
| Setting | A familiar Filipino childhood setting such as a park, garden, home, or school, used without stereotypes. |
| Description | Minimal adjectives and adverbs. Description must not compete with the core facts. |

The passage must read as one coherent event, not as five disconnected answers.
The central person, thing, place, time, and purpose may be repeated for clarity.
Repetition is preferable to replacing a canonical fact with a synonym that may
look like a second answer.

Authoring must not pad the passage with:

- A second person or unnamed human role.
- A second object that could answer What.
- Another destination, nearby place, or return location that could answer Where.
- Another day, clock time, meal time, or time-of-day phrase that could answer
  When.
- Another goal, need, or motivation that could answer Why.
- Decorative colors, sizes, quantities, or descriptive details that make the
  central fact harder to identify.
- Repeated sentence fragments used only to reach 50 words.

Commas support natural rhythm, but they must not create confusing run-on
sentences. Each of the four sentences must remain understandable when read
aloud by a child.

Every passage CSV row stores:

```text
who_fact
what_fact
where_fact
when_fact
why_fact
word_count: 50
sentence_count: 4
named_person_count: 1
```

### Assessment Task 3 Use

For Assessment Task 3A and Task 3B:

- The five canonical facts are the exact correct answers for Who, What, Where,
  When, and Why.
- Each question asks for exactly one fact.
- `correct_answer_text` matches the corresponding passage fact field exactly.
- Distractors belong only in Task 3B answer choices. Competing distractor facts
  must not appear inside the passage.
- The learner reads one selected passage and receives only its five linked
  questions.

### Lesson 5 Use

Lesson 5 uses the same 50-word, four-sentence, one-person, single-fact structure
to keep passage difficulty consistent and readable.

- The five fact fields are authoring and validation metadata.
- Lesson 5 remains oral passage reading only.
- Do not generate or display comprehension questions from the metadata.
- Do not score Who, What, Where, When, or Why in Lesson 5.
- The entire passage remains one target and one mission result even when authored
  viewport pages are required.

Task 3B questions and answer choices may quote necessary proper nouns or facts
from its Task 3A passage, but they should use the simplest accurate phrasing.
This does not turn Task 3B into another unrestricted passage.

Lesson 6 comprehension sentences are not passages and do not receive the
exception.

## Lesson Selection Algorithm

### Start Or Resume

When a learner opens an activity, Laravel must perform the following operation:

1. Resolve the authenticated account and required lesson progression.
2. Check for an existing resumable activity attempt.
3. If one exists, return its persisted ordered snapshot without selecting new
   content.
4. Otherwise, lock the learner's applicable target-cycle state.
5. Load active items from the published lesson content version.
6. Validate mission eligibility and group candidates by `target_key`.
7. Exclude targets already encountered in the current scope cycle.
8. Select the required number without replacement.
9. If necessary, carry the remaining unused targets into the draw and begin the
   next cycle only for the unfilled positions.
10. Exclude every target already selected for the same new attempt, including
    across a cycle boundary.
11. Determine and persist the complete ordered content snapshot.
12. Commit the attempt, snapshot, and cycle reservation state before returning
    the activity to React.

The persisted snapshot, not a random seed alone, is the resume authority.

### Selection Randomness

Production selection should randomize eligible target order on the server.
Tests may use an injected deterministic selector or fixed seed, but production
behavior must not depend on browser randomness.

Randomness must not override:

- Mission eligibility.
- Target uniqueness.
- Content status.
- Content version.
- Difficulty band.
- 5W distribution.
- Pronunciation approval.
- Learner ownership.

### Exposure Timing

A selected target becomes encountered when its item is first presented to the
learner.

| Event | Counts as encountered? |
| --- | --- |
| Item first appears in the active stage | Yes. |
| Learner submits the item | Already counted. |
| Learner skips the item | Already counted; Skip does not return it to the pool. |
| Learner records and uses Retry | No additional exposure; same item. |
| Item is reserved later in a snapshot but never reached | No. |
| Learner exits after seeing the item | Yes. |
| Technical failure after the item appears | Yes for exposure; separately recorded as technical failure for analytics. |

The activity snapshot still preserves unpresented reserved items for resume.
They are not replaced merely because the learner left before reaching them.

### Pool Exhaustion

Unused targets must not be discarded merely because fewer remain than the next
activity requires.

Example:

```text
Active pool:                 10 targets
Required per activity:       6 targets

Activity 1:
  select 6 from cycle 1

Cycle 1 remaining:
  4 targets

Activity 2:
  select the remaining 4 from cycle 1
  begin cycle 2
  select 2 from cycle 2
  exclude all 4 targets already selected for Activity 2
```

This guarantees full-pool coverage before reuse wherever mathematically
possible and prohibits a duplicate within one activity.

If the complete eligible pool is smaller than the required unique draw, the
activity must not start with repeated content. Publication or activation fails
validation until enough valid content exists.

### Five-W Distribution

Lesson 6 maintains separate eligible groups for:

```text
who
what
where
when
why
```

One required run selects exactly one item from each group. Exposure cycles are
tracked per question type so a large Who pool cannot hide exhaustion in a small
Why pool.

## Retry, Resume, Repeat, And Reset

These operations are distinct:

| Operation | Content behavior |
| --- | --- |
| Retry the current recording | Keep the same item and snapshot. Do not select another target. |
| Refresh or reopen | Resume the same snapshot and latest confirmed item position. |
| Resume an incomplete lesson | Resume the same active attempt. |
| Repeat a completed mission or lesson | Create a new attempt and draw unused targets where possible. |
| Begin a new exposure cycle | Occurs only as required to fill a new draw after unused targets are consumed. |
| Authorized assessment retake | Reuse the same fixed assessment form version. |
| Activate a new content version | New attempts use a new exposure scope; existing attempts retain their old snapshot. |

The `KW000` system learner reset may remove its lesson progress, attempts,
snapshots, exposures, and cycle state as part of its approved zero-progress
reset. Ordinary learner exposure history is not cleared merely to obtain easier
or preferred content.

## Snapshot Contract

Every started lesson activity snapshot records at least:

- Account owner identity.
- Lesson progress and activity attempt identity.
- Lesson, mission, and target-scope keys.
- Content version.
- Exposure cycle number for each selected target.
- Ordered content IDs.
- Ordered target keys.
- Ordered display fingerprints.
- Selection timestamp.
- First-presented timestamp per item when available.
- Current item position.
- Snapshot schema version.

Snapshot content is immutable after the attempt starts. Progress and result
fields may advance, but selected item identities and order do not change.

Retiring a content row does not mutate an existing snapshot. A centrally
authorized emergency invalidation may block a harmful item, but it must record
an audit reason and use an explicit recovery path rather than silently rerolling
the entire activity.

## CSV Import And Publication

### Import Flow

Laravel owns the import pipeline:

1. Locate one candidate content-version directory.
2. Validate filenames and required schemas.
3. Parse every row without partial publication.
4. Validate permanent IDs and cross-file references.
5. Validate assessment counts and fixed order.
6. Validate lesson mission counts and pool capacity.
7. Validate target and display uniqueness.
8. Validate ASR model and spoken-target compatibility.
9. Run consonant cluster, digraph, multigraph, syllable, and pronunciation flags.
10. Require human pronunciation-review approval.
11. Import the version in one controlled database operation.
12. Activate it only after the complete validation report passes.

The importer reports row number, content ID, field, rule, and actionable reason
for every failure.

### Publication States

```text
draft -> validated -> published -> retired
```

- `draft`: editable authoring work and not runtime eligible.
- `validated`: passed automated checks but is not yet active.
- `published`: immutable and available to the intended runtime selector or
  assessment form.
- `retired`: unavailable for new attempts but retained for historical records
  and old snapshot resolution.

Only one published required-lesson version is the default for new attempts at a
time. Existing attempts remain pinned to the version in their snapshot.

### Mirrored Assessment Validation

Before publishing the shared form, validation confirms:

- Diagnostic and Final both reference the same published form version.
- Task 2A uses the required rhyme/non-rhyme distribution and order.
- Exactly two Task 3A story choices exist.
- Each story has exactly five Task 3B questions.
- Each story covers Who, What, Where, When, and Why exactly once.
- Every Task 3B row references one of the shared form's Task 3A passages.
- No duplicate target exists inside a task where uniqueness is required.
- Completed pronunciation and content review.

## Type-Specific CSV Contracts

### Letter Lexicon

Required fields:

```text
letter_key
uppercase_form
lowercase_form
nu_class
letter_name
difficulty_band
confusion_group
pronunciation_review
status
```

`nu_class` is one uppercase A-Z class. Display pairs such as `C c` never become
Nu class labels.

The same uppercase class is the lookup key for the central isolated-letter TTS
registry. `letter_name` is authoring metadata and must not become a competing
runtime TTS prompt. Per-row TTS fallback spellings are prohibited because they
can drift from the root pronunciation standard.

### Word Lexicon

Required fields:

```text
word_key
display_text
spoken_target
syllable_guide
syllable_count
grapheme_pattern
phoneme_guide
has_consonant_cluster
has_consonant_digraph
has_consonant_multigraph
is_irregular
difficulty_band
pronunciation_review
status
```

An active non-passage target requires all three prohibited-consonant flags and
`is_irregular` to be false unless another explicit rule rejects it sooner.

### Lesson 1 Letter Items

Additional fields include:

```text
uppercase_form
lowercase_form
context_word_key
context_word
highlighted_display
missing_display
eligible_mission_1
eligible_mission_2
eligible_mission_3
```

Mission 1 does not require a context word. Missions 2 and 3 reference an active,
approved word that begins with the target letter and passes all non-passage word
rules. Version 1 contains exactly one row per A-Z letter; mission presentations
are columns on that row, not additional content rows.

### Lesson 2 Word Items

Additional fields include:

```text
family_key
context_sentence
highlighted_word
highlight_occurrence
context_display_fingerprint
eligible_mission_1
eligible_mission_2
```

The highlighted word must resolve to the same canonical `target_key` as the spoken
target. The context sentence must pass non-passage rules. Version 1 word rows
are ordered alphabetically, while `family_key` records close onset-phoneme
neighbours for auditing.

### Phrase And Sentence Items

Phrase and sentence files preserve:

```text
display_text
spoken_target
component_word_keys
case_sensitive
punctuation_sensitive
```

`component_word_keys` is a JSON array of approved lexicon references. Every
learner-spoken word must pass the non-passage restrictions.

An active Lesson 3 phrase must never begin with the standalone article `a`.
The opening token must carry a stable lexical sound so Mu cannot merge a weak
initial article into the following word. An internal `a` remains permitted when
it is needed for a natural phrase, such as `cat on a mat`.

### Passage Items

Passage fields include:

```text
title
who_fact
what_fact
where_fact
when_fact
why_fact
display_text
spoken_target
authored_pages
word_count
sentence_count
named_person_count
complex_word_count
pronunciation_notes
```

`authored_pages` is a JSON array when the passage requires more than one
viewport-safe page. Page boundaries do not create separate content IDs or
results.

### Lesson 6 Comprehension Items

Required fields include:

```text
question_type
display_sentence
question_audio_text
choice_a
choice_b
choice_c
choice_d
correct_choice_key
correct_answer_text
expected_answer_role
answer_evidence_span
highlightable_evidence_span
targeted_clue
guided_clue
demonstration_text
correct_feedback_text
```

`question_type` is exactly one of `who`, `what`, `where`, `when`, or `why`.
Each row contains one sentence, one question, exactly four unique authored
choices, and exactly one correct choice key from `a`, `b`, `c`, or `d`.
The correct choice key and all teaching metadata remain server-owned.

Lesson 6 is choice comprehension, not spoken comprehension. It has no
`spoken_target`, `accepted_answers`, or Mu model. Every wrong choice must remain
unambiguous, child-readable, and safe for Clara's authored support. The
highlightable evidence span must occur exactly in the displayed sentence.

### Assessment-Specific Fields

Every assessment row includes:

```text
assessment_version
form_type
task_key
item_key
sort_order
```

`form_type` is `shared` because both assessment run types use the same content.
Task-specific columns must follow the Assessment Guide rather than forcing all
task shapes into one generic row.

Task 2A includes two display words, `is_rhyme`, and the correct Yes/No response.
Task 3A includes the five canonical fact fields. Task 3B includes its passage
key, question type, question text, four ordered choices, correct choice key, and
correct answer text.

## Validation Rules

Publication fails when any of these conditions is true:

- A required file, header, or value is missing.
- A permanent ID is duplicated or malformed.
- A cross-file reference cannot be resolved inside the approved version.
- An assessment file has the wrong item count or distribution.
- Assessment `sort_order` values are missing, duplicated, or non-contiguous.
- A lesson pool cannot fill one complete unique required run.
- A content row is active without approved pronunciation review.
- Display and spoken targets contradict the lesson activity type.
- A Nu row uses anything other than one isolated A-Z class.
- A non-passage learner target contains a consonant cluster, digraph, or
  multigraph.
- A prohibited word is hidden inside a phrase, sentence, context sentence, or
  Lesson 6 expected answer.
- A syllable count disagrees with its authored guide.
- A Lesson 6 release cannot supply every required 5W type.
- A Task 3B question references an unknown passage, duplicates a 5W type within
  one story, or leaves a story without all five required question types.
- A Task 3B correct answer does not exactly match the selected story's canonical
  fact for that question type.
- A Task 3A passage introduces a competing person, object, place, time, or
  purpose that could answer one of its canonical 5W questions.
- A Lesson 5 or Task 3A passage does not contain exactly 50 words, exactly 4
  complete sentences, or exactly 1 named person.
- A Lesson 5 passage omits its canonical fact metadata or uses that metadata to
  add comprehension questions or scoring.
- Two active rows create an unapproved duplicate display fingerprint.
- Accepted-answer JSON is invalid or empty where required.
- A passage lacks viewport-safe authored pages when its full text cannot fit.

Warnings may identify borderline length, repeated vocabulary, or high passage
complexity, but a warning cannot downgrade a hard-rule failure into approval.

## Database Ownership

The imported runtime model should distinguish:

- Content versions and import batches.
- Canonical lexicon entries.
- Assessment forms and fixed form items.
- Lesson content items and mission eligibility.
- Learner activity attempts.
- Immutable attempt-item snapshots.
- Target exposure events.
- Target selection cycles.

CSV filenames and row numbers are audit metadata, not runtime primary keys.
Database relationships use immutable imported identifiers.

The browser never receives unpublished rows, correct assessment answers, hidden
lesson answers before comparison, or another learner's exposure history.

## Concurrency And Idempotency

- Starting the same activity twice concurrently must return one authoritative
  attempt and snapshot.
- The attempt-start request uses an idempotency key or equivalent server guard.
- Target-cycle state is locked while a new selection is created.
- Snapshot creation and cycle reservation commit atomically.
- Repeating a successful request returns the existing snapshot.
- A failed transaction creates neither a partial attempt nor partially consumed
  cycle state.
- Presenting the same snapshot item repeatedly because of a network retry does
  not create duplicate exposure events.

## Analytics Boundaries

Analytics may group results by:

- Content version.
- Assessment form and item.
- Lesson, mission, content item, and primary target.
- Target exposure cycle.
- Pronunciation difficulty band.
- Skip, Retry, technical failure, and completion event.

Analytics must not:

- Treat random lesson selection as equivalent exposure without using actual
  presentation records.
- Compare content skip rates without presentation denominators.
- Merge Diagnostic and Final results merely because their content is identical;
  run type and timing remain separate analytics dimensions.
- Include `KW000` portal simulation activity in real learner aggregates.
- Expose hidden answers or learner identities in public reports.

## Implementation Reference Flow

```text
Reviewed CSV sources
        |
        v
Laravel validation and import
        |
        v
Published PostgreSQL content version
        |
        +-------------------------------+
        |                               |
        v                               v
Fixed assessment form          Lesson active content pool
exact ordered rows              target-key grouping
        |                               |
        v                               v
Assessment run                 Learner exposure-cycle filter
        |                               |
        v                               v
Persisted fixed form           Persisted immutable snapshot
        |                               |
        +---------------+---------------+
                        |
                        v
              Nu or Mu processing under
                 the existing ASR rules
```

## Acceptance Checklist

### Assessment Content

- [ ] Diagnostic and Final reference the same fixed shared form version.
- [ ] Task 1A contains exactly ten ordered, distinct, approved letters per form.
- [ ] Task 2A contains exactly six rhyme and four non-rhyme items per form.
- [ ] Task 2B contains exactly ten ordered approved words per form.
- [ ] Task 3A contains exactly two fixed selectable passages.
- [ ] Task 3B contains ten authored questions: five 5W questions per story, four
  choices each, and valid passage references.
- [ ] Each passage contains one unambiguous canonical fact per 5W type and no
  competing answer fact.
- [ ] No assessment task uses lesson exposure history or runtime randomization.
- [ ] Diagnostic and Final preserve identical content and rules while storing
  separate run results.

### Lesson Pools

- [ ] Lesson 1 can select fifteen unique letter targets across its three missions.
- [ ] Lesson 2 can select ten unique word targets across its two missions.
- [ ] Lessons 3 and 4 each select five unique targets.
- [ ] Lesson 5 selects one passage item.
- [ ] Every Lesson 5 passage follows the shared 50-word, four-sentence,
  one-person, single-fact passage guide.
- [ ] Lesson 6 selects exactly one item from each 5W group.
- [ ] A complete required run never repeats its primary target.
- [ ] Repeated activities use unused targets while available.
- [ ] Pool exhaustion carries remaining unused targets into the next draw before
  reuse.

### Pronunciation And Language

- [ ] Every active learner target has approved Filipino pronunciation review.
- [ ] Every isolated-letter class resolves to the central A-Z pronunciation
  standard without a CSV-local TTS override.
- [ ] Syllable guides are manually authored.
- [ ] Non-passage learner targets contain no consonant clusters, digraphs, or
  multigraphs.
- [ ] Lesson 5 and Task 3A are the only target-content exceptions.
- [ ] Passage complexity is controlled even when an exception is used.
- [ ] Task 3A and Lesson 5 passages contain one central Who, What, Where, When,
  and Why fact without competing passage details.
- [ ] Ma'am Clara's 5W prompt words are not mistaken for learner-spoken targets.

### Selection And Persistence

- [ ] Laravel performs and persists every authoritative lesson draw.
- [ ] Refresh, reopen, sign-out, and resume return the same snapshot.
- [ ] Retry never selects another target.
- [ ] An exposure is recorded once when an item is first presented.
- [ ] Skipped and exited-after-display items remain encountered.
- [ ] Concurrent starts cannot create two snapshots or duplicate exposures.
- [ ] Existing attempts remain pinned to their original content version.

### CSV And Import

- [ ] Every file is UTF-8 with a stable header and schema.
- [ ] Multi-value fields contain valid JSON arrays.
- [ ] IDs and references are globally stable and valid.
- [ ] Publication is atomic and rejects incomplete versions.
- [ ] Active rows are available only after automated validation and human review.
- [ ] The browser never parses raw CSV or receives unpublished or hidden-answer
  content.
