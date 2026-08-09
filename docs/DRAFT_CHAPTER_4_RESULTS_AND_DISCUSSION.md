# CHAPTER IV

# RESULTS AND DISCUSSION

> **Results-ready draft based on `CHAP_1-3_MANUSCRIPT_Revision_v15.4.docx`.**
> Replace every `[INSERT: ...]` field only from the approved de-identified
> datasets, signed test records, and validated instruments. Do not invent or
> estimate missing findings. Remove this notice before final submission.

## 4.1 Introduction

This chapter presents the results of the development and evaluation of
ReaDirect as an AI-based oral-reading and reading-comprehension learning-support
intervention. In accordance with the methodology, the findings are separated
into four principal sections: technical ASR evaluation; functional and
implementation testing; Grade 1 feasibility and supplementary ReaDirect
results; and Grade 3 effectiveness based on the school-administered official
English Comprehensive Rapid Literacy Assessment (CRLA). Usability and
acceptability findings are reported separately from educational outcomes.

This separation is necessary because the evidence sources answer different
questions. Offline ASR metrics describe speech-processing behavior. Software
tests describe whether the system operates according to its requirements.
Grade 1 records describe whether beginning readers can use ReaDirect
independently or with minimal assistance. The Grade 3 experimental comparison
provides the study's primary effectiveness evidence. ReaDirect-generated scores
and profiles are supplementary outputs and are not official DepEd CRLA results.

## 4.2 Presentation of the Developed System

### 4.2.1 ReaDirect V2 Architecture

ReaDirect was implemented as a web application with separate presentation,
application, data, and speech-service responsibilities. React and TypeScript
provide the learner and staff interfaces, recording controls, and Live2D
presentation of Ma'am Clara. Laravel authenticates users, enforces role and
record ownership, loads approved content, applies scoring and bounded lesson
support, controls progression, and persists confirmed evidence. PostgreSQL
stores the canonical application records. Separate FastAPI services provide
Mu/Whisper speech recognition and VoxCPM2 speech synthesis.

The browser does not directly access PostgreSQL or the ASR and TTS services.
Laravel validates the active learner and owned activity before sending audio to
ASR. The ASR service returns technical evidence; Laravel remains responsible
for educational interpretation, scoring, persistence, and progression. This
boundary prevents a model output from independently advancing a learner.

**Table 4.1. Implemented ReaDirect V2 components**

| Component | Responsibility | Repository evidence | Implementation status |
| --- | --- | --- | --- |
| React/Vite frontend | Learner and staff interfaces, recording, responsive presentation | Routes, features, components, tests | Verified in frozen build |
| Laravel API | Authentication, scope, orchestration, scoring, progression, reporting | Routes, middleware, controllers, services | Verified in frozen build |
| PostgreSQL | Learners, runs, responses, attempts, progression, audits, achievements | Migrations and models | Verified in frozen build |
| FastAPI ASR | Audio-quality evidence, Mu transcription, Mu-backed Nu resolution | `/mu/transcribe`, `/mu/resolve-letter` | Verified in frozen build |
| FastAPI TTS | VoxCPM2 warm-up, synthesis, conditioning, and cache | `/health`, `/warmup`, `/synthesize` | Verified in frozen build |
| Ma'am Clara | Live2D instruction and bounded learner feedback | Character and lesson-presentation components | Verified in frozen build |
| Staff workspaces | System-, school-, and teacher-scoped monitoring and review | Protected web and API routes | Verified in frozen build |

Implementation status establishes that the feature exists in the frozen study
build. Measured pass/fail results are reported in Section 4.4.

### 4.2.2 Fixed Academic Sequence

Grade 1 feasibility participants and Grade 3 experimental-group participants
were assigned the same fixed ReaDirect sequence:

```text
Diagnostic Assessment
 -> Lesson 1: Letters
 -> Lesson 2: Words
 -> Lesson 3: Phrases
 -> Lesson 4: Sentences
 -> Lesson 5: Passage Reading
 -> Lesson 6: Comprehension
 -> Final Assessment
```

Assessment performance did not change the starting lesson or bypass a required
lesson. Instructional assistance was available only within lessons through the
bounded support sequence. Optional games, Learn with Ma'am Clara, achievements,
and preview tools did not count as intervention exposure and did not affect
official CRLA results, ReaDirect assessment scores, or required progression.

### 4.2.3 Role and Research-Data Boundaries

System Administrators, School Administrators, Teachers, Learners, and Guests
received different permitted functions. Laravel enforced role, school, teacher,
learner, and record-ownership scope. The portal-system account `KW000`, sandbox
attempts, preview data, games, and optional activities were excluded from
learner academic and research exports. Private audio remained protected and
direct identifiers were separated from analysis data.

## 4.3 Technical ASR Evaluation Results

### 4.3.1 Evaluation Records and Audio Quality

The technical evaluation used locked, reviewed audio-reference records separate
from official CRLA outcomes. Table 4.2 must identify the unit of analysis,
speaker distribution, class balance, normalization rules, decision rules, and
all exclusions.

**Table 4.2. Offline ASR evaluation records**

| Evaluation set | Speakers | Unique records | Task or class coverage | Excluded | Final analyzed |
| --- | ---: | ---: | --- | ---: | ---: |
| Nu isolated-letter fixtures | [INSERT] | [INSERT] | A-Z, silence, unknown/unusable | [INSERT] | [INSERT] |
| Mu word records | [INSERT] | [INSERT] | Authored words | [INSERT] | [INSERT] |
| Mu phrase records | [INSERT] | [INSERT] | Authored phrases | [INSERT] | [INSERT] |
| Mu sentence records | [INSERT] | [INSERT] | Authored sentences | [INSERT] | [INSERT] |
| Mu passage records | [INSERT] | [INSERT] | Authored passages | [INSERT] | [INSERT] |
| **Total unique records** | **[INSERT]** | **[INSERT]** |  | **[INSERT]** | **[INSERT]** |

**Table 4.3. Audio-quality outcomes**

| Outcome | Frequency | Percentage | Required handling |
| --- | ---: | ---: | --- |
| Usable | [INSERT] | [INSERT]% | Continue to recognition |
| Silence | [INSERT] | [INSERT]% | Preserve as distinct outcome |
| Unusable audio | [INSERT] | [INSERT]% | Technical retry; not an academic error |
| Uncertain/review | [INSERT] | [INSERT]% | Retry or authorized review |
| Other documented exclusion | [INSERT] | [INSERT]% | Apply predefined rule |
| **Total** | **[INSERT]** | **100%** |  |

Of the evaluated recordings, `[INSERT: n and percentage]` were usable. The
principal documented audio problems were `[INSERT: observed causes]`. This
result indicates `[INSERT: interpretation limited to the tested conditions]`.

### 4.3.2 Mu Transcript Quality

Raw Mu transcripts were compared with reviewed reference transcripts using the
normalization procedure defined before analysis. Word Error Rate (WER) and
Character Error Rate (CER) were calculated on raw model output. Expected-aware
scoring transcripts were not substituted for raw transcripts in this technical
evaluation.

**Table 4.4. Mu transcript-quality results**

| Task type | Records | Reference words | WER | CER | Exact-match rate |
| --- | ---: | ---: | ---: | ---: | ---: |
| Words | [INSERT] | [INSERT] | [INSERT]% | [INSERT]% | [INSERT]% |
| Phrases | [INSERT] | [INSERT] | [INSERT]% | [INSERT]% | [INSERT]% |
| Sentences | [INSERT] | [INSERT] | [INSERT]% | [INSERT]% | [INSERT]% |
| Passages | [INSERT] | [INSERT] | [INSERT]% | [INSERT]% | [INSERT]% |
| **Overall** | **[INSERT]** | **[INSERT]** | **[INSERT]%** | **[INSERT]%** | **[INSERT]%** |

Mu obtained an overall WER of `[INSERT]%` and CER of `[INSERT]%`. The lowest
WER occurred in `[INSERT: task type]`, while the highest occurred in
`[INSERT: task type]`. Reviewed errors consisted primarily of `[INSERT:
substitutions, deletions, insertions, punctuation, or other observed patterns]`.

### 4.3.3 Nu Task-Acceptance Performance

Nu is the product name for Mu's deterministic isolated-letter mode; it is not a
separately trained classifier. Mu first produces a raw transcript, after which
the strict resolver returns A-Z, `SILENCE`, `UNKNOWN`, or an unusable outcome.
Accuracy, precision, recall, specificity, F1, and confusion counts therefore
describe final task-acceptance behavior on the locked fixtures.

**Table 4.5. Nu task-acceptance results**

| Metric | Estimate | 95% confidence interval, if approved |
| --- | ---: | ---: |
| Evaluated records | [INSERT] | - |
| Accuracy | [INSERT] | [INSERT] |
| Macro precision | [INSERT] | [INSERT] |
| Macro recall | [INSERT] | [INSERT] |
| Macro specificity | [INSERT] | [INSERT] |
| Macro F1 | [INSERT] | [INSERT] |
| Unknown rate | [INSERT]% | [INSERT] |
| Unusable/silence rate | [INSERT]% | [INSERT] |

**Figure 4.1. Nu confusion matrix**

`[INSERT: confusion-matrix figure with class support and normalization stated]`

The strongest task-acceptance performance occurred for `[INSERT: classes]`,
whereas `[INSERT: classes]` produced the greatest number of confusions. The
main reviewed patterns were `[INSERT]`. Built-in or approved aliases resolved
`[INSERT]` records, while `[INSERT]` remained unknown or ambiguous.

### 4.3.4 Expected-Aware Interpretation and Error Evidence

Expected-aware equivalence was evaluated separately from raw ASR accuracy. Its
purpose was to reduce false rejection of reviewed acceptable responses without
hiding genuine errors or rewriting raw evidence.

**Table 4.6. Reviewed task decisions before and after equivalence**

| Reviewed result | Before | After | Change |
| --- | ---: | ---: | ---: |
| True acceptance | [INSERT] | [INSERT] | [INSERT] |
| False rejection | [INSERT] | [INSERT] | [INSERT] |
| False acceptance | [INSERT] | [INSERT] | [INSERT] |
| True rejection | [INSERT] | [INSERT] | [INSERT] |
| Uncertain/review | [INSERT] | [INSERT] | [INSERT] |

Expected-aware interpretation changed `[INSERT]` decisions and reduced false
rejection by `[INSERT]`, while false acceptance `[INSERT: measured result]`.
These findings support `[INSERT: bounded conclusion for the locked content and
speakers]` and do not establish equal accuracy for untested populations or
recording environments.

## 4.4 Functional and Implementation Testing Results

### 4.4.1 Test Execution Summary

The frozen study build was evaluated through unit, functional, integration,
assessment-standardization, lesson-support, content, audio, persistence,
security, optional-boundary, responsive, accessibility, and regression tests.

**Table 4.7. Software test execution summary**

| Test category | Executed | Passed | Failed | Skipped | Evidence reference |
| --- | ---: | ---: | ---: | ---: | --- |
| Unit/domain rules | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Learner and staff functional flows | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Assessment standardization | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Lesson bounded support | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Content snapshots and resume | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Audio capture and quality | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| ASR/TTS integration | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Persistence and idempotency | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Security and access control | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Optional-feature isolation | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Responsive/accessibility | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Regression | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| **Total** | **[INSERT]** | **[INSERT]** | **[INSERT]** | **[INSERT]** |  |

The test execution produced a pass rate of `[INSERT]%`. Initial failures
concerned `[INSERT: defect categories]`. Corrective actions included `[INSERT]`,
after which `[INSERT: retest outcome]`. Test files that were not executed must
not be counted as passed cases.

### 4.4.2 Critical Acceptance Boundaries

**Table 4.8. Critical functional and security results**

| Boundary | Expected behavior | Observed behavior | Result |
| --- | --- | --- | --- |
| Fixed assessment form | Diagnostic and Final use the same approved form and scoring | [INSERT] | [INSERT] |
| Fixed six-lesson order | Scores never bypass a lesson | [INSERT] | [INSERT] |
| Resume/idempotency | Refresh and repeated submission do not reroll or duplicate records | [INSERT] | [INSERT] |
| Bounded lesson support | Technical retry, clue, retry, demonstration, and route forward remain finite | [INSERT] | [INSERT] |
| Role/record scope | Unauthorized school, teacher, learner, and record access is rejected | [INSERT] | [INSERT] |
| Private media | Browser receives authorized bytes, not private storage paths | [INSERT] | [INSERT] |
| Optional-feature isolation | Games and Learn with Clara do not change academic progression | [INSERT] | [INSERT] |
| Portal exclusion | `KW000` and sandbox data remain outside research analytics | [INSERT] | [INSERT] |

## 4.5 Grade 1 Feasibility and Supplementary Results

### 4.5.1 Participant Flow

All enrolled Grade 1 learners who began the ReaDirect Diagnostic Assessment
must remain in the feasibility analysis because non-completion and assistance
requirements are themselves outcomes.

**Table 4.9. Grade 1 feasibility participant flow**

| Stage | Learners | Percentage of enrolled cohort |
| --- | ---: | ---: |
| Eligible and enrolled | [INSERT] | 100% |
| Began Diagnostic Assessment | [INSERT] | [INSERT]% |
| Completed Diagnostic Assessment | [INSERT] | [INSERT]% |
| Completed Lesson 1 | [INSERT] | [INSERT]% |
| Completed Lesson 2 | [INSERT] | [INSERT]% |
| Completed Lesson 3 | [INSERT] | [INSERT]% |
| Completed Lesson 4 | [INSERT] | [INSERT]% |
| Completed Lesson 5 | [INSERT] | [INSERT]% |
| Completed Lesson 6 | [INSERT] | [INSERT]% |
| Completed Final Assessment | [INSERT] | [INSERT]% |

### 4.5.2 Independence and Assistance

Minimal assistance was defined before data collection as no more than two brief,
non-answer-giving assistance events during a required stage, with the learner
independently completing the academic response. Common orientation was not
counted as assistance. Device or service interruptions were recorded separately.

**Table 4.10. Grade 1 independence and assistance by stage**

| Stage | Independent | Minimally assisted | Substantially assisted | Technical interruption | Protocol deviation |
| --- | ---: | ---: | ---: | ---: | ---: |
| Diagnostic Assessment | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Lesson 1 | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Lesson 2 | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Lesson 3 | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Lesson 4 | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Lesson 5 | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Lesson 6 | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Final Assessment | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |

Overall, `[INSERT]%` completed the full sequence independently or with minimal
assistance. The most frequent assistance type was `[INSERT]`, most commonly
during `[INSERT: stage]`. Substantial assistance occurred in `[INSERT]` cases,
and the main implementation barriers were `[INSERT: coded barriers]`.

### 4.5.3 Time, Retries, Skips, and Interruptions

**Table 4.11. Grade 1 implementation indicators**

| Indicator | n | Mean | SD | Median | IQR | Range |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Total scheduled sessions attended | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Total time on task, minutes | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Academic retries | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Technical retries | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Skipped activities | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Technical interruptions | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Assistance events | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |

Technical retries, academic retries, and skips were not combined because they
represent different implementation conditions. The results show `[INSERT:
evidence-based feasibility interpretation]`.

### 4.5.4 Supplementary ReaDirect Diagnostic-to-Final Results

Only Grade 1 learners who completed both internal assessments are included in
this supplementary comparison. The results describe change on the
researcher-developed ReaDirect measure. They are not official English CRLA
outcomes and do not establish a causal intervention effect.

**Table 4.12. Grade 1 supplementary ReaDirect assessment results**

| Internal measure | n pairs | Diagnostic | Final | Change |
| --- | ---: | ---: | ---: | ---: |
| Task 1A score | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Task 2A score | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Task 2B score | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Part 1 score | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Passage-reading accuracy | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Comprehension percentage | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Final ReaDirect reading score | [INSERT] | [INSERT] | [INSERT] | [INSERT] |

The internal results showed `[INSERT: descriptive direction and magnitude]`.
Possible familiarity with the repeated fixed assessment form must be considered
when discussing this change.

## 4.6 Grade 3 Official English CRLA Effectiveness Results

### 4.6.1 Participant Flow and Intervention Fidelity

All randomized Grade 3 learners must appear in the participant-flow record,
regardless of attendance, withdrawal, ReaDirect completion, or inclusion in a
specific analysis.

**Table 4.13. Grade 3 experimental participant flow**

| Stage | Experimental | Control | Total |
| --- | ---: | ---: | ---: |
| Eligible and consented | [INSERT] | [INSERT] | [INSERT] |
| Randomized | [INSERT] | [INSERT] | [INSERT] |
| Official CRLA baseline available | [INSERT] | [INSERT] | [INSERT] |
| Began assigned condition | [INSERT] | [INSERT] | [INSERT] |
| Completed official CRLA posttest | [INSERT] | [INSERT] | [INSERT] |
| Included in primary analysis | [INSERT] | [INSERT] | [INSERT] |
| Withdrawn/missing posttest | [INSERT] | [INSERT] | [INSERT] |

**Table 4.14. Grade 3 experimental-group fidelity**

| Fidelity indicator | n | Percentage |
| --- | ---: | ---: |
| Attended at least 80% of scheduled sessions | [INSERT] | [INSERT]% |
| Completed ReaDirect Diagnostic Assessment | [INSERT] | [INSERT]% |
| Completed all six lessons | [INSERT] | [INSERT]% |
| Reached ReaDirect Final Assessment | [INSERT] | [INSERT]% |
| Met per-protocol definition | [INSERT] | [INSERT]% |
| Experienced documented protocol deviation | [INSERT] | [INSERT]% |

### 4.6.2 Baseline Description

The exact official CRLA field names must be copied from the school-authorized
data dictionary.

**Table 4.15. Grade 3 baseline characteristics and official English CRLA**

| Variable | Experimental | Control | Total |
| --- | ---: | ---: | ---: |
| n | [INSERT] | [INSERT] | [INSERT] |
| `[INSERT: official baseline numeric field]`, mean (SD) | [INSERT] | [INSERT] | [INSERT] |
| `[INSERT: secondary official indicator]`, mean (SD) | [INSERT] | [INSERT] | [INSERT] |
| High Emerging profile, n (%) | [INSERT] | [INSERT] | [INSERT] |
| Grade section distribution, n (%) | [INSERT] | [INSERT] | [INSERT] |

Baseline description is provided to characterize the randomized groups. It
should not be used as a sequence of significance tests to decide whether
randomization succeeded.

### 4.6.3 Primary Baseline-Adjusted Analysis

When an authorized continuous or percentage official CRLA outcome is available
and assumptions are adequate, the primary analysis uses ANCOVA with posttest as
the dependent variable, study group as the independent variable, and baseline
as the covariate. The significance level is 0.05. The principal effect estimate
is the adjusted mean difference with a 95% confidence interval, and partial eta
squared is reported as the effect-size measure.

**Table 4.16. Grade 3 primary official English CRLA outcome**

| Result | Experimental | Control | Adjusted group effect |
| --- | ---: | ---: | ---: |
| Baseline mean (SD) | [INSERT] | [INSERT] | - |
| Posttest mean (SD) | [INSERT] | [INSERT] | - |
| Adjusted posttest mean (SE) | [INSERT] | [INSERT] | - |
| Adjusted mean difference | - | - | [INSERT] |
| 95% confidence interval | - | - | [INSERT] |
| ANCOVA F and df | - | - | [INSERT] |
| p-value | - | - | [INSERT] |
| Partial eta squared | - | - | [INSERT] |

After adjustment for baseline official English CRLA performance, the estimated
posttest difference between the experimental and control groups was `[INSERT]`
points or percentage units (95% CI `[INSERT]`, p = `[INSERT]`). Partial eta
squared was `[INSERT]`. The null hypothesis was `[INSERT: rejected/not
rejected]` at alpha = 0.05. This finding indicates `[INSERT: interpretation of
direction, precision, and educational magnitude without relying on p-value
alone]`.

### 4.6.4 Assumptions, Missing Data, and Sensitivity Analysis

**Table 4.17. Primary-model diagnostics and sensitivity analyses**

| Check or analysis | Method | Result | Decision |
| --- | --- | --- | --- |
| Baseline-outcome relationship | [INSERT] | [INSERT] | [INSERT] |
| Homogeneity of regression slopes | Group-by-baseline interaction | [INSERT] | [INSERT] |
| Residual behavior | [INSERT] | [INSERT] | [INSERT] |
| Heteroscedasticity | [INSERT] | [INSERT] | [INSERT] |
| Influential observations | [INSERT] | [INSERT] | [INSERT] |
| Missing-data pattern | [INSERT] | [INSERT] | [INSERT] |
| Complete-case analysis | [INSERT] | [INSERT] | [INSERT] |
| Bootstrap/permutation/robust alternative, if needed | [INSERT] | [INSERT] | [INSERT] |
| Per-protocol sensitivity analysis | [INSERT] | [INSERT] | [INSERT] |

The primary result was `[INSERT: consistent/not consistent]` across the
predefined sensitivity analyses. `[INSERT: explain any meaningful difference]`.

### 4.6.5 Official Reading-Profile Transitions

Official reading profiles are ordinal and must not be converted into artificial
arithmetic averages.

**Table 4.18. Grade 3 official English CRLA profile transition by group**

| Posttest movement from baseline High Emerging | Experimental n (%) | Control n (%) |
| --- | ---: | ---: |
| Downward to Low Emerging | [INSERT] | [INSERT] |
| Remained High Emerging | [INSERT] | [INSERT] |
| Upward to Developing | [INSERT] | [INSERT] |
| Upward to Transitioning | [INSERT] | [INSERT] |
| Upward to Reading at Grade Level | [INSERT] | [INSERT] |
| Missing posttest classification | [INSERT] | [INSERT] |
| **Total randomized** | **[INSERT]** | **[INSERT]** |

The transition distribution showed `[INSERT]`. Any categorical or ordinal
group comparison must be reported only if the sample and cell counts support
the method approved by the statistician.

## 4.7 Usability and Acceptability Results

Use only the approved respondents, instrument, response scale, scoring
direction, and interpretation bands. Report learner and adult evaluator results
separately when their instruments or tasks differ.

**Table 4.19. Usability and acceptability evaluation**

| Respondent group and criterion | n | Items | Estimate | Dispersion | Interpretation |
| --- | ---: | ---: | ---: | ---: | --- |
| Learners: ease of use | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Learners: clarity and feedback | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Learners: overall | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Teachers/evaluators: functional suitability | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Teachers/evaluators: usability | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Teachers/evaluators: instructional usefulness | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |
| Teachers/evaluators: overall | [INSERT] | [INSERT] | [INSERT] | [INSERT] | [INSERT] |

The overall learner evaluation was `[INSERT]`, while teachers/evaluators rated
the system `[INSERT]`. The strongest criterion was `[INSERT]`; the principal
area for improvement was `[INSERT]`. Coded comments identified `[INSERT:
themes]`.

## 4.8 Discussion of Findings by Research Question

### 4.8.1 Design and Implementation of the Fixed Learning Sequence

ReaDirect was implemented with a Diagnostic Assessment, six required lessons,
and a Final Assessment. Its speech services, persistence, role boundaries, and
bounded feedback were integrated into the learner and staff workflows. The
results in Tables 4.7 and 4.8 show `[INSERT: measured implementation finding]`.

Unlike score-driven module placement, the implemented design uses a fixed
academic sequence. Adaptation is limited to bounded instructional support
inside lessons. This prevents an uncertain ASR response from denying a learner
required instructional content.

### 4.8.2 Technical Speech-Processing Performance

Mu produced `[INSERT]` transcript quality, while Nu produced `[INSERT]`
task-acceptance performance. Audio-quality handling identified `[INSERT]`, and
reviewed equivalence changed `[INSERT]` decisions. These findings apply to the
documented evaluation sets and should not be generalized automatically to all
children, accents, devices, or classroom environments.

### 4.8.3 Grade 1 Feasibility

The Grade 1 findings show that `[INSERT]%` completed the sequence independently
or with minimal assistance. The most common assistance and barriers were
`[INSERT]`. This answers the feasibility question without treating internal
score change as official CRLA improvement or proof of effectiveness.

### 4.8.4 Grade 1 Completion and Supplementary Change

Completion, retries, skips, time, assistance, and interruptions showed
`[INSERT]`. Among learners with both internal assessments, the descriptive
Diagnostic-to-Final change was `[INSERT]`. Repeated exposure to the same fixed
form and the absence of a Grade 1 control group limit the interpretation.

### 4.8.5 Grade 3 Effectiveness

The baseline-adjusted official English CRLA analysis found `[INSERT: primary
finding]`. The adjusted difference was `[INSERT]` with a 95% confidence
interval of `[INSERT]`. The result was `[INSERT: stable/not stable]` across the
predefined sensitivity analyses. Because the Grade 3 participants were
randomly assigned at the individual level `[OR REPLACE WITH FINAL ACTUAL DESIGN]`,
this section provides the study's primary effectiveness evidence within the
conditions, sample, and locale of the trial.

### 4.8.6 Functional Performance, Usability, and Acceptability

The frozen build passed `[INSERT]%` of executed tests and obtained an overall
evaluation of `[INSERT]`. Users identified `[INSERT]` as a strength and
`[INSERT]` as a limitation. These findings address practical use and system
quality; they do not substitute for the official Grade 3 outcome analysis.

## 4.9 Integrated Findings

The findings collectively indicate `[INSERT: integrated conclusion supported
by all completed analyses]`. The technical and functional evidence establishes
`[INSERT]`; the Grade 1 findings establish `[INSERT: feasibility conclusion]`;
and the Grade 3 official CRLA analysis establishes `[INSERT: effectiveness
conclusion]`. These conclusions remain bounded by the approved instruments,
participant flow, intervention fidelity, statistical assumptions, and the
single-school setting.

## 4.10 Chapter Summary

This chapter reported the ReaDirect V2 implementation and separately presented
technical ASR performance, software behavior, Grade 1 feasibility, Grade 3
official English CRLA effectiveness, and usability and acceptability. The
results showed `[INSERT: concise final synthesis]`. Chapter V summarizes the
study, presents conclusions aligned with the six research questions, discusses
limitations, and provides recommendations for implementation and future work.

## Completion Checklist

- [ ] Replace all `[INSERT: ...]` fields with approved results.
- [ ] Copy exact official English CRLA field names from the school data dictionary.
- [ ] Report the actual randomization unit and any design deviation.
- [ ] Account for every enrolled Grade 1 learner and every randomized Grade 3 learner.
- [ ] Keep Grade 1 feasibility, Grade 3 effectiveness, ASR, software, and usability evidence separate.
- [ ] Exclude `KW000`, sandbox, preview, game, and optional-activity records from academic analyses.
- [ ] Report raw ASR metrics separately from expected-aware educational decisions.
- [ ] Document ANCOVA assumptions, missing data, effect size, confidence interval, and sensitivity analyses.
- [ ] Do not call ReaDirect internal scores or profiles official CRLA results.
- [ ] Add approved Chapter II citations to the discussion.
- [ ] Reconcile final table and figure numbering with the manuscript.
- [ ] Remove drafting notes and this checklist before submission.
