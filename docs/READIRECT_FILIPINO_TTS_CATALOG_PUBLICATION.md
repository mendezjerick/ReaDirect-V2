# ReaDirect Filipino TTS Catalog Publication

## Slice 10 final launch status

On 2026-08-09, the product owner approved all 300 Filipino audio candidates.
The language-foundation migration ran successfully, the atomic publisher copied
and checksum-verified all 300 WAVs, and the database seeded the published
`clara-sh-fil-v1` voice with 300 language-scoped speech lines.

The active English `clara-sh-v1` catalog remains published with its original
300 lines. The live learner language contract now reports Filipino as available,
so the lesson-intro switch can persist `fil-PH` selections. No runtime route
falls back to English audio for a Filipino learner.

## Slice 9 audio-candidate completion status

All 300 fixed Filipino WAV candidates are now present in private staging and
pass the 48 kHz mono PCM 16-bit validator. Batch 001 records the first five;
`content/tts/v1/fil-PH/review-batches/batch-002.csv` records the remaining 295
with durations and SHA-256 checksums.

Audio review was subsequently approved for all 300 candidates in Slice 10, and
the catalog is now published. The candidate generator streams responses to
validated `.part` files before atomic finalization, keeping full-catalog runs
within the PHP CLI memory limit and leaving no partial WAV after a failed
request.

## Slice 8 shared-reference status

On 2026-08-08, the product owner directed all Filipino delivery roles to use
`sh-fil/general.wav`. The `introduce`, `instruction`, `question`, and `result`
profiles are now all approved aliases of that recording. Role identifiers stay
separate throughout requests, caching, readiness, and diagnostics.

Slice 8 made the source audit publication-ready: all 300 translations and all
four references were approved. Slice 10 subsequently approved and published
the complete staged audio catalog.

## Slice 7 translation approval status

On 2026-08-08, the product owner approved all 300 fixed Filipino translations
and all 23 live runtime-template translations. This includes the 10 fixed lines
previously held for academic-content review. The localization builder now
reproduces those approvals instead of resetting generated catalogs to draft.

Translation approval did not approve synthesized audio. Slice 8 resolved the
remaining semantic-reference decisions, and Slices 9 and 10 completed the WAV
catalog, listening approval, and publication gates.

## Slice 6 review batch status

Batch 001 contains five unpublished instruction-role WAV candidates generated
with the approved Filipino instruction reference. Its source translations were
subsequently approved in Slice 7 and its audio in Slice 10. The batch is
recorded in `content/tts/v1/fil-PH/review-batches/batch-001.csv`; its original
review WAVs remain in the ignored private staging tree.

The five candidates cover the Lesson 6 mission introduction and the Who, What,
Where, and When clue explanations. Each staged WAV passed the 48 kHz mono PCM
16-bit validator. Reviewers should listen for Filipino naturalness, consistent
Clara delivery, and clear pronunciation of the English question-word cues.

## Slice 4 status

Slice 4 implements the guarded generation and publication workflow for the 300
fixed Filipino speech keys. Later slices approved the translation and reference
manifests, but the workflow still requires every staged WAV before publication.

The authoritative inputs are:

- `content/tts/v1/fil-PH/published-lines.csv`
- `content/tts/v1/fil-PH/reference-profiles.csv`

Every Filipino row must retain the exact English speech key, English source
text, semantic reference role, and relative audio path. Structural divergence
stops audit, generation, seeding, and publication.

## Current gate

The current source audit reports:

| Item | State |
| --- | ---: |
| Total fixed lines | 300 |
| Draft lines | 0 |
| Academic-review-required lines | 0 |
| Approved lines | 300 |
| Candidate-generatable fixed lines | 300 |
| Staged fixed-line candidates | 300 |
| Approved audio-review candidates | 300 |
| Pending audio-review candidates | 0 |
| Published Filipino WAVs | 300 |
| Approved reference roles | 4 of 4 |

All fixed lines, semantic reference roles, and audio candidates are approved.
Every staged and active WAV is present, structurally valid, and checksum-equal.

## Audit

From `apps/api`:

```powershell
php scripts/audit-filipino-tts-catalog.php
```

CI or a release check can require readiness with:

```powershell
php scripts/audit-filipino-tts-catalog.php --require-ready
```

The second form now succeeds because the source and reference manifests are
ready. It does not replace the publisher's staged-WAV validation.

## Review-candidate generation

Candidate generation is deliberately separate from publication. This dry run
selects all 300 approved fixed lines using the shared general reference:

```powershell
php scripts/generate-filipino-tts-candidates.php --roles=introduce,instruction,question,result
```

Add `--confirm` to call Vox and write WAVs beneath
`storage/app/private/tts/staging/fil-PH-v1/sh-fil`. Use `--limit=<positive>` to
generate a review batch. Existing valid staged WAVs are retained and skipped;
invalid staged WAVs stop the command.

Batch manifests do not change source review status. A generated WAV remains a
candidate until its audio is explicitly reviewed. Both batch manifests now
record approved source and audio states.

The optional draft override authorizes review artifacts only if future source
changes reintroduce draft lines. It cannot make a row publishable.
`--allow-candidate-reference` remains available for an explicitly scoped future
reference review, and academic-review-required rows are never included by
`--include-drafts`.

## Atomic publication

After every source, reference, and audio-review status is `approved`, and all
300 staged WAVs pass the 48 kHz mono PCM 16-bit contract, publication is:

```powershell
php scripts/publish-filipino-tts-catalog.php --confirm
```

The command refuses existing destination files, verifies every staged WAV
before copying, streams files individually instead of buffering the 140.7 MB
catalog, checks each copied checksum, seeds the language-scoped
`clara-sh-fil-v1` database catalog, and removes newly copied files if seeding
fails. It never modifies the English `clara-sh-v1` catalog.

The live `instruction` and `result` profiles and the complete fixed catalog are
now published, satisfying the learner-switch availability contract.
