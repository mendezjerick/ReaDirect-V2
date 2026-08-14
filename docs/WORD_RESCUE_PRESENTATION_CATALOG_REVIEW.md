# Word Rescue Presentation Catalog Review

Status: The Phase 1B image track is complete with all 27 image assets human-approved; Icon Batch A has 5 human-approved candidates and 1 revised candidate (`jog`) registered as `needs_review`. This document does not approve runtime Word Rescue UI.

## Scope and gate

The catalog contains exactly one row for every active Lesson 2 word: 49 of 49. The academic Lesson 2 CSV remains the source of truth for content IDs, target words, approved context sentences, highlighted words, and sentence occurrences.

The companion catalog is:

`content/lessons/v1/word-rescue-presentations.csv`

The backend validator is `WordRescuePresentationCatalog`. It is standalone and not wired into the Lesson 2 API or learner page in Phase 1A. It fails closed on missing, duplicate, unknown, malformed, or incomplete rows.

## Approved visual classification

The classifications are semantic presentation decisions from Phase 1A. All 27 image candidates are now human-approved. Icon Batch A contains five human-approved icon candidates and one revised `jog` candidate awaiting human review; the remaining seven icon candidates are reserved for Icon Batch B.

### Image candidates — 27

`bag`, `bed`, `bun`, `cap`, `cat`, `den`, `dog`, `fan`, `fin`, `gum`, `ham`, `hat`, `hen`, `jam`, `jet`, `jug`, `leg`, `lid`, `lip`, `log`, `map`, `mat`, `mug`, `pan`, `pen`, `pig`, `pot`

### Icon candidates — 13

`bat`, `can`, `dad`, `dig`, `dot`, `gap`, `hip`, `hot`, `jog`, `lap`, `man`, `men`, `pet`

### Text-only fallback — 9

`big`, `cut`, `fat`, `fit`, `fun`, `gas`, `get`, `got`, `job`

Text-only rows intentionally have no visual key or alt text. Their notes explain why a visual would be abstract, unsafe, ambiguous, or unnecessarily sensitive. They use the same word and sentence mechanics as every other row.

## Mechanic coverage

| Mechanic           | Coverage | Phase 1A decision                                            |
| ------------------ | -------: | ------------------------------------------------------------ |
| Missing Letter     |    49/49 | Enabled; deterministic 1-based middle-letter gap at index 2  |
| Build Word         |    49/49 | Enabled for every approved CVC target                        |
| Missing Word       |    49/49 | Enabled; occurrence must match the academic sentence exactly |
| Picture Find       |    40/49 | Enabled only for reviewed image/icon candidates              |
| Word/Picture Match |     0/49 | Disabled in Phase 1A                                         |

Missing-letter distractors are two distinct lowercase vowels, never the correct vowel, and are checked so that reconstructing a distractor cannot produce another approved Lesson 2 target. Build Word remains multiset-safe for repeated letters such as `dad`.

## Semantic review notes for later art review

The following decisions need explicit human review when assets are produced:

- `bat`: animal bat, not sports equipment.
- `bun`: bread bun, not hair bun.
- `can`: container, not the verb.
- `fan`: electric fan, not a person who supports a team.
- `dad`, `man`, `men`: inclusive, non-stereotyped human representations.
- `dig`: action or tool must remain distinct from `dog`.
- `dot`, `gap`, `hip`, `hot`, and `lap`: use simple, literal, child-safe semantic cues without introducing unrelated reading clues.
- `fin`: use the approved fish context and avoid confusing it with `fit` or `fin` as an abstract fragment.
- `lip` and `cut`: preserve the text-only fallback policy where imagery could be sensitive or misleading.

All 40 visual rows require a final human and art review for child safety, clarity, inclusion, licensing/provenance, content-ID binding, and bundled delivery. `visual_review_status=approved` means the Phase 1A semantic presentation decision is reviewed; `visual_asset_status=planned` means no asset exists yet.

## Phase 1B Batch A asset inventory

The first batch establishes one consistent vocabulary-art direction: colorful 2D storybook illustration, dark-purple outlines, cream/coral/purple palette, isolated subject, transparent background, and no embedded answer text.

These ten entries are formally marked `review_status=approved` after human visual review. Their content IDs, visual keys, WebP files, dimensions, byte sizes, alt guidance, and review records are preserved.

| Word | Content ID           | Visual key | File            |  Dimensions |  Bytes | Status   |
| ---- | -------------------- | ---------- | --------------- | ----------: | -----: | -------- |
| bag  | `lesson-v1-word-bag` | `word-bag` | `word-bag.webp` | 1254 x 1254 | 55,958 | approved |
| bed  | `lesson-v1-word-bed` | `word-bed` | `word-bed.webp` | 1329 x 1183 | 45,880 | approved |
| cap  | `lesson-v1-word-cap` | `word-cap` | `word-cap.webp` | 1254 x 1254 | 39,724 | approved |
| cat  | `lesson-v1-word-cat` | `word-cat` | `word-cat.webp` | 1254 x 1254 | 55,018 | approved |
| dog  | `lesson-v1-word-dog` | `word-dog` | `word-dog.webp` | 1254 x 1254 | 53,282 | approved |
| hat  | `lesson-v1-word-hat` | `word-hat` | `word-hat.webp` | 1254 x 1254 | 40,868 | approved |
| jug  | `lesson-v1-word-jug` | `word-jug` | `word-jug.webp` | 1254 x 1254 | 44,978 | approved |
| mug  | `lesson-v1-word-mug` | `word-mug` | `word-mug.webp` | 1254 x 1254 | 34,452 | approved |
| pan  | `lesson-v1-word-pan` | `word-pan` | `word-pan.webp` | 1254 x 1254 | 29,636 | approved |
| pot  | `lesson-v1-word-pot` | `word-pot` | `word-pot.webp` | 1254 x 1254 | 40,108 | approved |

The typed registry is `apps/web/src/features/lesson/word-rescue/wordRescueAssets.ts`. Review metadata is recorded in `wordRescueAssetReview.ts`, including dimensions, byte size, intended meaning, alt guidance, disambiguation notes, reviewer status, and provenance/license follow-up.

## Batch A human visual review preparation

Development-only review sheets generated from the actual WebP assets:

- [Labeled contact sheet](assets/word-rescue-batch-a-contact-sheet.png)
- [Small Android-size preview](assets/word-rescue-batch-a-mobile-preview.png)

The sheets add labels only; they do not alter the vocabulary artwork. The ten source WebP files remain unchanged.

### Side-by-side consistency findings

- The batch reads as one art family: 2D storybook illustration, dark-purple outlines, rounded silhouettes, and a cream/coral/purple palette.
- Lighting and shading are consistent enough for a first-batch style gate; no asset is photorealistic, pixel-art, or from an unrelated icon family.
- The transparent-background check passed for all ten assets: all four corners are transparent and every image border has zero opaque pixels. No visible white halo was found in the contact sheets.
- No embedded answer text, logo, brand, watermark, or unnecessary scene object was found.
- The bed is naturally wider than the object assets, but remains centered, padded, and readable in both sheets.

### Small Android-size findings

At the mobile-preview scale, all ten targets remain recognizable without zooming. The strongest silhouettes are the bag, bed, cap, cat, dog, hat, jug, mug, pan, and pot. The pairwise distinctions remain visible at small size: cap versus broad-brimmed hat, spouted jug versus handled mug, and shallow single-handle pan versus lidded two-handle pot.

### Advisory asset recommendations

These recommendations are for human review only. They do not change the actual status from `needs_review`.

| Word | File            | Visual clarity                              | Ambiguity risk | Consistency notes                                     | Recommended status | Reason                                                                          |
| ---- | --------------- | ------------------------------------------- | -------------- | ----------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------- |
| bag  | `word-bag.webp` | Clear school bag silhouette                 | Low            | Matches palette, outline, and isolated framing        | **APPROVE**        | No branding; immediately reads as a bag                                         |
| bed  | `word-bed.webp` | Clear bed, pillow, blanket, and frame       | Low            | Wider composition is still clean and readable         | **APPROVE**        | Plain child-safe bed with no distracting symbol                                 |
| cap  | `word-cap.webp` | Clear brimmed cap                           | Medium         | Same outline and flat shading as the batch            | **APPROVE**        | Brim and crown distinguish it from the hat                                      |
| cat  | `word-cat.webp` | Unmistakable single cat                     | Low            | Friendly subject scale and clean silhouette           | **APPROVE**        | One clear subject with no breed-specific clue                                   |
| dog  | `word-dog.webp` | Unmistakable single dog                     | Low            | Friendly subject scale and clean silhouette           | **APPROVE**        | One clear subject with no extra object                                          |
| hat  | `word-hat.webp` | Clear broad-brimmed hat                     | Medium         | Same palette and outline; wider horizontal framing    | **APPROVE**        | Broad brim distinguishes it from the cap                                        |
| jug  | `word-jug.webp` | Clear handled jug with spout                | Medium         | Decorative band remains restrained and non-textual    | **APPROVE**        | Spout and pitcher form distinguish it from the mug                              |
| mug  | `word-mug.webp` | Clear handled mug                           | Medium         | Isolated-object treatment matches the batch           | **APPROVE**        | The approved plan allows an isolated mug; handle and cylindrical body are clear |
| pan  | `word-pan.webp` | Clear shallow frying pan and handle         | Medium         | Low-clutter silhouette remains legible at mobile size | **APPROVE**        | Single handle and shallow bowl distinguish it from the pot                      |
| pot  | `word-pot.webp` | Clear cooking pot with lid and side handles | Medium         | Same outline, lighting, and palette as the pan        | **APPROVE**        | Lid and two side handles distinguish it from the pan                            |

### Mug and pot decision

The approved Word Rescue plan does not require the sentence-context mat to appear in the vocabulary artwork. The isolated `mug` and `pot` drafts are therefore acceptable for this review gate and are recommended **APPROVE**, subject to human confirmation. The actual catalog and asset statuses are now `approved` for Batch A.

## Phase 1B Batch B asset inventory

Batch A is the reference art direction for the second batch: colorful 2D storybook illustration, dark-purple outlines, cream/coral/purple palette, isolated subject, transparent background, no embedded answer text, and no brand or logo clues. Batch B intentionally contains image candidates only; no icon or text-only rows were changed.

All ten Batch B entries below are registered as `review_status=approved` after the completed human visual review. File existence and technical validation do not constitute approval; the explicit human decision is recorded in the review metadata.

| Word | Content ID           | Visual kind | Visual key | File            |  Dimensions |  Bytes | Status   |
| ---- | -------------------- | ----------- | ---------- | --------------- | ----------: | -----: | -------- |
| bun  | `lesson-v1-word-bun` | image       | `word-bun` | `word-bun.webp` | 1254 x 1254 | 36,260 | approved |
| ham  | `lesson-v1-word-ham` | image       | `word-ham` | `word-ham.webp` | 1254 x 1254 | 51,534 | approved |
| hen  | `lesson-v1-word-hen` | image       | `word-hen` | `word-hen.webp` | 1254 x 1254 | 58,732 | approved |
| jam  | `lesson-v1-word-jam` | image       | `word-jam` | `word-jam.webp` | 1254 x 1254 | 52,774 | approved |
| jet  | `lesson-v1-word-jet` | image       | `word-jet` | `word-jet.webp` | 1402 x 1122 | 47,672 | approved |
| log  | `lesson-v1-word-log` | image       | `word-log` | `word-log.webp` | 1402 x 1122 | 43,310 | approved |
| map  | `lesson-v1-word-map` | image       | `word-map` | `word-map.webp` | 1254 x 1254 | 26,438 | approved |
| mat  | `lesson-v1-word-mat` | image       | `word-mat` | `word-mat.webp` | 1536 x 1024 | 78,764 | approved |
| pen  | `lesson-v1-word-pen` | image       | `word-pen` | `word-pen.webp` | 1254 x 1254 | 27,748 | approved |
| pig  | `lesson-v1-word-pig` | image       | `word-pig` | `word-pig.webp` | 1254 x 1254 | 52,788 | approved |

### Batch B human review preparation

Revision sheets:

- [Batch B revision contact sheet](assets/word-rescue-batch-b-revision-contact-sheet.png)
- [Batch B revision Android-size preview](assets/word-rescue-b-revision-mobile-preview.png)

Development-only sheets generated from the actual bundled WebP files:

The human review formally approved all ten Batch B targets, including the revised `ham` and `mat`. The isolated `log` is intentionally approved without adding mud because the vocabulary visual represents the target word, not a recreation of the full sentence. The revised `ham` and `mat` files remain unchanged after approval.

- [Batch B labeled contact sheet](assets/word-rescue-batch-b-contact-sheet.png)
- [Batch B small Android-size preview](assets/word-rescue-batch-b-mobile-preview.png)
- [Combined Batch A + Batch B style reference](assets/word-rescue-batch-a-b-style-reference.png)

Initial consistency findings are advisory and do not change the Batch B status:

- All ten assets use the Batch A palette, dark-purple outline treatment, flat storybook rendering, and transparent-background presentation.
- Each asset has one dominant subject and no readable answer text, logo, watermark, or unrelated scene object.
- Bun, hen, jam, jet, map, pen, and pig read clearly at the compact preview scale.
- The revised ham is now a cooked ham portion with a central bone cue and is formally approved.
- The revised mat has a woven textile surface and fringe, making the floor-mat meaning clearer, and is formally approved.
- The isolated log was explicitly approved by human review; reproducing the sentence context “in mud” is not required for the vocabulary visual.
- The jam lid has a decorative checker pattern but no label or brand; human review should confirm that it does not introduce an unnecessary clue.

### Batch B human-review recommendations

This table records the completed human decision. All ten entries are formally `approved`.

| Target | Current status | Visual clarity                                         | Ambiguity risk                                                                                | Batch A consistency                                                            | Android-size legibility                                    | Recommended decision | Revision note                                                                          |
| ------ | -------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| bun    | approved       | Clear single bread bun with a dominant silhouette      | Low; possible loaf/roll naming is still within the intended bread meaning                     | Strong palette, outline, shading, and isolated framing match                   | Clear without zooming                                      | **HUMAN APPROVED**   | Approved by the human Batch B decision                                                 |
| ham    | approved       | Revised cooked ham portion with a central bone cue     | Medium; the central bone cue supports the intended food meaning                               | Strong visual family match                                                     | Clear ham silhouette at card size                          | **HUMAN APPROVED**   | Revised draft formally approved by the human decision                                  |
| hen    | approved       | One large recognizable hen/chicken                     | Medium; “chicken” is a possible broader name, but there is no generic flock or scene          | Strong storybook treatment and subject scale                                   | Very legible; comb, beak, body, and feet survive reduction | **HUMAN APPROVED**   | Approved by the human Batch B decision                                                 |
| jam    | approved       | Clear jar filled with red jam                          | Low-medium; jam versus jelly is a minor vocabulary distinction, and the jar context is strong | Strong palette and outline match; lid pattern is restrained                    | Clear jar silhouette and contents                          | **HUMAN APPROVED**   | Approved by the human Batch B decision                                                 |
| jet    | approved       | Clear single jet airplane                              | Low; one dominant aircraft and no airline marks                                               | Strong outline, palette, and clean framing match                               | Excellent silhouette at compact size                       | **HUMAN APPROVED**   | Approved by the human Batch B decision                                                 |
| log    | approved       | Clear single log with readable cut end and branch stub | Low; isolated target visual does not need to recreate the sentence context                    | Strong isolated-object treatment, with slightly more wood texture than Batch A | Clear without zooming; no clipped details                  | **HUMAN APPROVED**   | Human decision accepts the isolated log; mud is not required for the vocabulary visual |
| map    | approved       | Clear folded blank map                                 | Low; folds communicate map and there are no labels                                            | Strong simple framing and palette match                                        | Excellent broad silhouette                                 | **HUMAN APPROVED**   | Approved by the human Batch B decision                                                 |
| mat    | approved       | Revised woven floor mat with fringe                    | Medium; textile cues distinguish it from a tray or placemat                                   | Strong palette and outline match; textile cues support the target              | Floor-mat meaning is clear at card size                    | **HUMAN APPROVED**   | Revised draft formally approved by the human decision                                  |
| pen    | approved       | Clear writing pen with barrel and clip                 | Low-medium; a child could call it a marker, but the clip and pen form are clear               | Strong palette and outline match                                               | Long silhouette remains recognizable                       | **HUMAN APPROVED**   | Approved by the human Batch B decision                                                 |
| pig    | approved       | Clear single friendly pig                              | Low; snout, ears, body, and feet distinguish it from other animals                            | Matches the approved cat/dog storybook treatment                               | Excellent at compact size                                  | **HUMAN APPROVED**   | Approved by the human Batch B decision                                                 |

### Cross-asset confusion findings

- The former Batch B distinction risks for `ham` and `mat` were addressed by the approved revisions: the central bone cue supports ham, and the woven surface with fringe supports mat.
- `jam` is distinct from the approved `jug`, `mug`, and `pot` because the jar has no handle, spout, or cooking-pot lid/body shape; the checker lid is the only follow-up question.
- `hen` and `pig` are distinct from the approved `cat` and `dog` at mobile size; no Batch A animal change is warranted.
- `bun`, `jet`, `log`, `map`, and `pen` have no serious pairwise conflict with Batch A or the other Batch B assets.

Batch C completes the Phase 1B image track. All seven image candidates are now formally approved: `fan`, `leg`, `lip`, `den`, `fin`, `gum`, and `lid`. The 13 icon candidates and 9 text-only fallbacks remain separate from the image approval decision.

## Phase 1B Batch C asset inventory

Batch C contains only the remaining catalog rows with `visual_kind=image`. These files follow the approved Batch A/B style direction. The three directly approved assets retain their original files, dimensions, bytes, keys, alt guidance, and provenance; only their approval decision records changed. The four targeted replacements were human-approved without regeneration after semantic review. No icon or text-only candidate is included in this inventory.

| Word | Content ID           | Visual kind | Visual key | File            |  Dimensions |  Bytes | Status   |
| ---- | -------------------- | ----------- | ---------- | --------------- | ----------: | -----: | -------- |
| den  | `lesson-v1-word-den` | image       | `word-den` | `word-den.webp` | 1254 x 1254 | 85,026 | approved |
| fan  | `lesson-v1-word-fan` | image       | `word-fan` | `word-fan.webp` | 1254 x 1254 | 69,538 | approved |
| fin  | `lesson-v1-word-fin` | image       | `word-fin` | `word-fin.webp` | 1254 x 1254 | 44,672 | approved |
| gum  | `lesson-v1-word-gum` | image       | `word-gum` | `word-gum.webp` | 1254 x 1254 | 30,602 | approved |
| leg  | `lesson-v1-word-leg` | image       | `word-leg` | `word-leg.webp` | 1199 x 1312 | 37,086 | approved |
| lid  | `lesson-v1-word-lid` | image       | `word-lid` | `word-lid.webp` | 1402 x 1122 | 36,106 | approved |
| lip  | `lesson-v1-word-lip` | image       | `word-lip` | `word-lip.webp` | 1254 x 1254 | 25,616 | approved |

### Batch C HUMAN REVIEW PREPARATION

- [Original Batch C labeled contact sheet](assets/word-rescue-batch-c-contact-sheet.png)
- [Original Batch C small Android-size preview](assets/word-rescue-batch-c-mobile-preview.png)
- [Batch C revision contact sheet](assets/word-rescue-batch-c-revision-contact-sheet.png)
- [Batch C revision Android-size preview](assets/word-rescue-batch-c-revision-mobile-preview.png)
- [Updated combined Batch A + Batch B + Batch C style reference](assets/word-rescue-batch-a-b-c-style-reference.png)

The sheets are generated from the exact bundled WebP files. They add labels and review status only; they do not alter the vocabulary artwork.

### Batch C final review findings and recommendations

These findings record the completed human decision. All seven Batch C registry entries are formally `approved`; the replacement files and their metadata remain unchanged.

| Target | Content ID           | Visual key |  Dimensions |  Bytes | Semantic clarity                                                                            | Ambiguity risk                                                                                                 | Batch A/B style consistency                                                                                   | Android readability                                              | Cross-asset confusion risk                                                                     | Recommended decision | Revision note                                                  |
| ------ | -------------------- | ---------- | ----------: | -----: | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------------- |
| den    | `lesson-v1-word-den` | `word-den` | 1254 x 1254 | 85,026 | The den opening now dominates and the fox is small and secondary.                           | Low-medium: the opening reads as a den/burrow rather than a generic cave.                                      | Strong family match; the scene composition is intentional because the catalog meaning includes an animal den. | Large opening and mound remain clear at card size.               | Low; the animal no longer competes strongly with the target den.                               | **APPROVE**          | Human approved after targeted revision; replacement preserved. |
| fan    | `lesson-v1-word-fan` | `word-fan` | 1254 x 1254 | 69,538 | Immediately reads as a small electric desk fan with grille, blades, stem, and base.         | Low: it does not read as a handheld fan or person.                                                             | Strong palette, outline, shading, and isolated-object treatment.                                              | Strong silhouette and fan parts remain visible without zooming.  | No genuine conflict with the approved household objects.                                       | **APPROVE**          | Human approved; file and metadata were preserved.              |
| fin    | `lesson-v1-word-fin` | `word-fin` | 1254 x 1254 | 44,672 | The large fin is the dominant subject; only a small partial fish body provides context.     | Low-medium: the body cue remains, but the image is now read first as a fin.                                    | Strong palette, outlines, and flat shading; simplified close-up remains within the art family.                | Fin rays and silhouette remain unmistakable at card size.        | Low; the fish is no longer the dominant animal cue.                                            | **APPROVE**          | Human approved after targeted revision; replacement preserved. |
| gum    | `lesson-v1-word-gum` | `word-gum` | 1254 x 1254 | 30,602 | Partly unwrapped pink chewing gum is clear as one stick rather than a food package.         | Low-medium: wrapper shape needs human confirmation but no candy bag, medicine, or branding is present.         | Strong isolated-object match with no logo, text, or unrelated prop.                                           | Pink gum and folded wrapper remain readable at card size.        | Low; no meaningful conflict with approved assets.                                              | **APPROVE**          | Human approved after targeted revision; replacement preserved. |
| leg    | `lesson-v1-word-leg` | `word-leg` | 1199 x 1312 | 37,086 | A simplified clothed lower leg is immediately visible from trouser cuff through shoe.       | Low-medium: the shoe is a secondary cue, but the leg remains the dominant body part.                           | Strong child-friendly adaptation with no medical detail or injury.                                            | Leg, cuff, sock, and shoe remain recognizable at card size.      | Low; isolated body-part framing avoids broad full-body confusion.                              | **APPROVE**          | Human approved; file and metadata were preserved.              |
| lid    | `lesson-v1-word-lid` | `word-lid` | 1402 x 1122 | 36,106 | An isolated lid with a large knob and visible double rim reads as a removable lid.          | Low-medium: its round form could resemble a plate, but the knob and thick underside rim provide cookware cues. | Strong style match while deliberately separating the asset from the approved pot.                             | Knob, rim, and three-quarter angle remain clear without zooming. | Low direct confusion risk with approved `word-pot` because no pot body or handles are present. | **APPROVE**          | Human approved after targeted revision; replacement preserved. |
| lip    | `lesson-v1-word-lip` | `word-lip` | 1254 x 1254 | 25,616 | The isolated cupid's-bow lip shape communicates lip without a face, teeth, wound, or blood. | Low-medium: it could be named mouth, but the isolated two-lip form is specific.                                | Strong palette, outline, shading, and uncluttered framing; fully child-safe.                                  | The lip silhouette remains clear without relying on tiny detail. | Low; no approved face or mouth visual competes with it.                                        | **APPROVE**          | Human approved; file and metadata were preserved.              |

### Batch C cross-asset findings

- The four revisions resolved their original risks: den dominance, fin-versus-fish priority, gum-versus-candy ambiguity, and lid-versus-pot confusion.
- `lid` remains the closest semantic comparison with approved `word-pot`, but the isolated knob-and-rim composition removes the pot body and handles that caused the original confusion.
- `fan`, `leg`, and `lip` were explicitly approved by the human decision without changing their files, dimensions, bytes, alt guidance, or provenance metadata. Together with the four targeted revisions, all seven Batch C image assets are approved.
- Batch C remains stylistically coherent with Batch A/B: dark-purple outlines, cream/coral/purple palette, rounded storybook forms, flat shading, isolated transparent artwork, and child-friendly presentation. The den's scene composition is an intentional semantic exception, not visual drift.

## Phase 1B Icon Batch A

The image track is complete at 27 of 27 approved image assets. The authoritative catalog contains exactly 13 icon candidates: `bat`, `can`, `dad`, `dig`, `dot`, `gap`, `hip`, `hot`, `jog`, `lap`, `man`, `men`, and `pet`.

Icon Batch A intentionally contains only six lower-risk candidates: `bat`, `can`, `dot`, `gap`, `hot`, and `jog`. They were selected because each has a concrete, child-safe visual subject or action with a short disambiguation cue. Icon Batch B remains reserved for `dad`, `dig`, `hip`, `lap`, `man`, `men`, and `pet`. No text-only fallback or `visual_kind=none` target was generated.

The assets use the approved Batch A/B/C visual language: dark-purple outlines, cream/coral/purple palette, storybook shading, transparent backgrounds, low clutter, and Android-readable silhouettes. `bat`, `can`, `dot`, `gap`, and `hot` are formally approved; the replacement `jog` remains `needs_review`. The JOG recommendation below is advisory only.

| Target | Content ID           | Visual key |  Dimensions |  Bytes | Intended meaning                | Context sentence   | Supporting subjects           | Dominant visual subject | Target dominance | Status           | Recommendation     | Review note                                                                                                          |
| ------ | -------------------- | ---------- | ----------: | -----: | ------------------------------- | ------------------ | ----------------------------- | ----------------------- | ---------------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| bat    | `lesson-v1-word-bat` | `word-bat` | 1402 x 1122 | 54,892 | Small flying animal bat         | A bat is on a mat. | None                          | Flying animal bat       | pass             | approved         | **HUMAN APPROVED** | Clear animal silhouette; no sports equipment cue.                                                                    |
| can    | `lesson-v1-word-can` | `word-can` | 1254 x 1254 | 39,842 | Plain tin can                   | A can is on a mat. | None                          | Plain tin can           | pass             | approved         | **HUMAN APPROVED** | Open rim and cylindrical container read clearly; no text or branding.                                                |
| dot    | `lesson-v1-word-dot` | `word-dot` | 1254 x 1254 | 27,584 | Single dot on a simple map      | A dot is on a map. | Simple blank map              | Single dot              | pass             | approved         | **HUMAN APPROVED** | The dot is dominant while the blank map supplies only context.                                                       |
| gap    | `lesson-v1-word-gap` | `word-gap` | 1254 x 1254 | 22,900 | Clear gap in a log              | A gap is in a log. | Two short log sections        | Empty gap               | pass             | approved         | **HUMAN APPROVED** | Broad empty space is unmistakable and not hidden by scenery.                                                         |
| hot    | `lesson-v1-word-hot` | `word-hot` | 1254 x 1254 | 52,748 | Warm bun with simple heat lines | A bun is hot.      | One plain bun                 | Heat lines / hot state  | pass             | approved         | **HUMAN APPROVED** | Large heat lines communicate the target state without relying only on red color.                                     |
| jog    | `lesson-v1-word-jog` | `word-jog` | 1254 x 1254 | 35,910 | Generic figure jogging          | Ana can jog.       | One simplified generic figure | Jogging body pose       | pass             | **needs_review** | **APPROVE**        | Action dominates through separated legs, bent arms, lifted feet, and forward lean; human approval is still required. |

### Icon Batch A review preparation

- [Icon Batch A contact sheet](assets/word-rescue-icon-batch-a-contact-sheet.png)
- [Icon Batch A Android-size preview](assets/word-rescue-icon-batch-a-mobile-preview.png)
- [JOG revision contact sheet](assets/word-rescue-icon-jog-revision-contact-sheet.png)
- [JOG revision Android-size preview](assets/word-rescue-icon-jog-revision-mobile-preview.png)
- [Updated combined image and icon style reference](assets/word-rescue-batch-a-b-c-style-reference.png)

The contact sheets are generated from the exact bundled WebP files and add labels/status metadata only. The five approved icons retain their files and metadata; the revised JOG replacement remains `needs_review` pending human visual, accessibility, curriculum, target-dominance, and provenance review. Icon Batch B must not begin until JOG has been reviewed.

## Unresolved visual questions

- The revised JOG asset is still a draft. Human review must confirm final silhouette clarity, action dominance, inclusive/culturally neutral presentation, and final accessibility wording.
- Final provenance/license records are still required before any asset can be exposed to live Word Rescue UI.

## Clara and sound inventory

Only proposed semantic keys are recorded. No TTS was generated and no audio files were added.

Potential new Clara keys for a later runtime phase:

- `word-rescue-intro`
- `word-rescue-missing-letter-prompt`
- `word-rescue-build-word-prompt`
- `word-rescue-missing-word-prompt`
- `word-rescue-picture-find-prompt`
- `word-rescue-restored`

Existing canonical lesson feedback should be reused where it already expresses the required feedback. Conceptual SFX keys only are `select`, `snap`, `success`, and `retry`; no SFX files were generated.

## Boundary protections

- No scoring, lives, coins, mastery, progression, completion, Mu metadata, ASR behavior, SpeechEquivalenceResolver behavior, database schema, or second assessment run was added.
- No Lesson 2 UI/API wiring was added; `LessonTwoPage`, `lessonApi`, and canonical Lesson 2 services remain unchanged.
- Letter Parade remains unchanged.
- Offline Practice remains unchanged and is not a source of Word Rescue metadata.
- The catalog contains no `spoken_target`, runtime audio path, remote URL, arbitrary asset path, or answer text intended to be printed over an image.
- Visuals are formative only. The canonical recorded speech, Submit action, Mu decision, and existing completion/progression path remain authoritative for a later implementation phase.

## Phase 1B outcome

Batch A, Batch B, and Batch C contain 27 formally approved image assets and serve as the reference art direction. Icon Batch A contains five formally approved icons (`bat`, `can`, `dot`, `gap`, and `hot`) plus the revised `jog` asset registered as `needs_review`; Icon Batch B remains reserved. No runtime implementation approval was granted, no text-only or `visual_kind=none` art was generated, and no gameplay/API behavior was changed.
