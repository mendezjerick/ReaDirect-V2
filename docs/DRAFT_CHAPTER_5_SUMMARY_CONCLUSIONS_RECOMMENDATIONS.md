# CHAPTER V

# SUMMARY, CONCLUSIONS, AND RECOMMENDATIONS

> **Results-ready draft based on `CHAP_1-3_MANUSCRIPT_Revision_v15.4.docx`.**
> Complete this chapter only after the approved Chapter IV tables and analyses
> are final. Replace every `[INSERT: ...]` field with a finding already reported
> in Chapter IV. Do not introduce new results in Chapter V. Remove this notice
> before final submission.

## 5.1 Summary

The study designed, developed, and evaluated ReaDirect as an AI-based oral
reading and reading-comprehension learning-support intervention under the DepEd
ARAL Program context. ReaDirect was intended to supplement regular reading
instruction and teacher judgment by providing structured learner activities,
automatic speech-recognition support, bounded feedback, persistent progress
records, and authorized staff monitoring.

The study addressed six questions concerning the design and implementation of
the fixed ReaDirect academic sequence; the technical performance of its speech
processing; Grade 1 feasibility; Grade 1 completion and supplementary internal
assessment patterns; Grade 3 effectiveness using the official English CRLA; and
the system's functional performance, usability, and acceptability.

The research used a quantitative design with two analytically separate learner
components and one supporting developmental component. The Grade 1 component
was a one-group feasibility and implementation evaluation among eligible High
Emerging Readers. It examined completion, independence, minimal assistance,
retries, skips, time on task, interruptions, and implementation barriers.
ReaDirect Diagnostic-to-Final results for Grade 1 were treated only as
supplementary researcher-developed measures.

The Grade 3 component used a pretest-posttest control-group design. Eligible
High Emerging Readers were assigned to an experimental group or control group
through the approved allocation procedure. The experimental group used
ReaDirect in addition to regular reading instruction, while the control group
received regular reading instruction alone. The school-administered official
English CRLA was the primary outcome at baseline and posttest. The planned
primary analysis compared posttest performance between groups while accounting
for baseline performance.

The developmental component documented the frozen ReaDirect V2 system. React
and TypeScript provided learner and staff interfaces. Laravel served as the
authoritative application layer for authentication, role scope, scoring,
bounded teaching, persistence, and progression. PostgreSQL stored canonical
records. FastAPI provided separate Mu/Whisper ASR and VoxCPM2 TTS services, and
Ma'am Clara delivered approved feedback through Live2D presentation. The
academic sequence consisted of the Diagnostic Assessment, six required lessons,
and the Final Assessment. Assessment scores did not bypass required lessons.

The evaluation maintained separate evidence streams. Offline ASR records were
used for WER, CER, task-acceptance metrics, audio-quality analysis, and error
review. Software records were used for functional, integration, persistence,
security, access-control, responsive, and regression testing. Grade 1 logs and
structured observations were used for feasibility. Official English CRLA data
were used for the Grade 3 effectiveness analysis. Approved evaluation
instruments were used for usability and acceptability.

## 5.2 Summary of Findings

### 5.2.1 Design and Implementation of ReaDirect

ReaDirect was implemented with the required fixed sequence of a Diagnostic
Assessment, Lessons 1 through 6, and a Final Assessment. The system integrated
learner audio capture, Mu/Whisper transcription, Mu-backed Nu isolated-letter
resolution, expected-aware interpretation, deterministic Laravel scoring,
bounded lesson support, persistent progression, Ma'am Clara, staff monitoring,
and protected research-data boundaries.

The executed software tests showed `[INSERT: total passed, total failed, pass
rate, and final frozen-build status from Chapter IV]`. The principal corrected
defects were `[INSERT]`, while the unresolved limitations were `[INSERT]`.

### 5.2.2 Technical Speech-Processing Performance

The offline evaluation included `[INSERT: number]` eligible technical records.
Mu obtained an overall WER of `[INSERT]%` and CER of `[INSERT]%`. Nu
task-acceptance accuracy was `[INSERT]`, with macro precision of `[INSERT]`,
macro recall of `[INSERT]`, macro specificity of `[INSERT]`, and macro F1 of
`[INSERT]`. The most frequent documented recognition or acceptance problems
were `[INSERT]`.

The audio-quality gate identified `[INSERT: number and percentage]` unusable,
silent, or uncertain records before academic interpretation. Expected-aware
equivalence reduced false rejection by `[INSERT]` and produced `[INSERT]` false
acceptances in the reviewed evaluation set.

### 5.2.3 Grade 1 Feasibility

The Grade 1 feasibility cohort included `[INSERT: n]` eligible High Emerging
Readers. Of these, `[INSERT: n and percentage]` completed the entire ReaDirect
sequence independently or with minimal assistance. `[INSERT: n and percentage]`
required substantial assistance, and `[INSERT: n and percentage]` did not
complete the sequence.

The most frequent assistance involved `[INSERT]`. The principal practical or
technical barriers were `[INSERT]`. Median time on task was `[INSERT]`, with
`[INSERT]` academic retries, `[INSERT]` technical retries, and `[INSERT]`
skipped activities. These results indicate `[INSERT: feasibility finding stated
in Chapter IV]`.

### 5.2.4 Grade 1 Completion and Supplementary Internal Change

Completion was highest for `[INSERT: stage]` and lowest for `[INSERT: stage]`.
Among learners with both ReaDirect assessments, the internal Final score changed
by `[INSERT]` from the Diagnostic score. The largest descriptive change occurred
in `[INSERT: task]`.

These results describe performance on the researcher-developed ReaDirect
assessment. They do not represent official English CRLA change and do not
establish a causal effect because the Grade 1 component had no non-user control
group and repeated the same fixed assessment form.

### 5.2.5 Grade 3 Official English CRLA Effectiveness

The Grade 3 effectiveness component randomized `[INSERT: total]` eligible High
Emerging Readers: `[INSERT]` to the experimental group and `[INSERT]` to the
control group. Official baseline and posttest data were available for `[INSERT]`
participants in the primary analysis.

After adjustment for baseline official English CRLA performance, the estimated
posttest difference between the experimental and control groups was `[INSERT]`
points or percentage units (95% CI `[INSERT]`, p = `[INSERT]`). Partial eta
squared was `[INSERT]`. The null hypothesis was `[INSERT: rejected/not
rejected]`. Sensitivity analyses `[INSERT: supported/did not support]` the same
interpretation.

Official profile transitions showed `[INSERT: concise experimental and control
group distribution]`. The official profile result remained supplementary to
the authorized continuous or percentage outcome and was not converted into an
artificial numeric average.

### 5.2.6 Functional Performance, Usability, and Acceptability

The frozen build passed `[INSERT]%` of executed software tests. Critical role,
record-ownership, private-media, fixed-progression, persistence, and optional-
feature boundaries `[INSERT: passed/failed with qualification]`.

Learners evaluated the system as `[INSERT]`, with an overall estimate of
`[INSERT]`. Teachers or approved evaluators assessed it as `[INSERT]`, with an
overall estimate of `[INSERT]`. The strongest reported quality was `[INSERT]`,
while the main improvement requirement was `[INSERT]`.

## 5.3 Conclusions

The following conclusions must mirror the finalized findings in Chapter IV.

1. **System design and implementation.** ReaDirect `[INSERT: conclusion about
   whether the fixed sequence and required architecture were successfully
   implemented]`. Laravel's authority over scoring and progression, together
   with the separation of ASR and TTS services, `[INSERT: supported conclusion]`.

2. **Technical speech processing.** Within the documented offline evaluation
   sets, Mu and Nu `[INSERT: conclusion supported by WER, CER, acceptance
   metrics, and error evidence]`. The results do not establish equivalent
   performance for untested speakers, devices, or environments.

3. **Grade 1 feasibility.** Grade 1 High Emerging Readers `[INSERT: could/could
   not generally complete the sequence independently or with minimal
   assistance]`. The principal conditions affecting feasibility were
   `[INSERT]`.

4. **Grade 1 implementation patterns.** Completion, time, retries, skips,
   assistance, and supplementary internal assessment records showed `[INSERT]`.
   These findings support only a feasibility and descriptive conclusion, not an
   official CRLA or causal-effect conclusion.

5. **Grade 3 effectiveness.** Based on the baseline-adjusted official English
   CRLA analysis, adding ReaDirect to regular instruction `[INSERT: produced/did
   not produce an estimated posttest advantage]` compared with regular
   instruction alone. The magnitude and precision of the estimate were
   `[INSERT: interpretation of adjusted difference, CI, and effect size]`.

6. **Functional quality and user evaluation.** ReaDirect `[INSERT: conclusion
   about functional performance, usability, and acceptability]`. The findings
   identify `[INSERT]` as the strongest aspect and `[INSERT]` as the principal
   remaining improvement need.

Overall, the study concludes that ReaDirect `[INSERT: final integrated
conclusion, explicitly separating technical validity, Grade 1 feasibility, and
Grade 3 effectiveness]`. It should be used as a supplementary support tool and
not as a replacement for authorized school assessment, teacher instruction, or
professional judgment.

## 5.4 Study Limitations

The conclusions should be interpreted in light of the following limitations:

1. The study was conducted in one public elementary school. Its participants
   were High Emerging Readers who met the approved eligibility criteria;
   findings cannot automatically be generalized to other profiles, grade
   levels, schools, or learner populations.
2. The Grade 1 component evaluated feasibility without a control group. Its
   internal Diagnostic-to-Final results cannot establish educational
   effectiveness or official CRLA improvement.
3. The ReaDirect Diagnostic and Final Assessments used the same fixed form.
   Familiarity with content may have contributed to internal score change.
4. The Grade 3 causal interpretation depends on the actual randomization unit,
   allocation concealment, intervention fidelity, missing-data pattern, and
   statistical assumptions. Any deviation from individual random assignment
   must be reported and the design relabeled when necessary.
5. The official English CRLA analysis was limited to the fields the school was
   authorized to release. If only ordinal profile data were available, the
   study could not use the planned continuous-outcome ANCOVA.
6. ASR metrics apply to the documented evaluation sets, speakers, content,
   devices, and recording conditions. They do not demonstrate uniform
   performance across all Filipino children or acoustic environments.
7. Historical technical evidence was limited where complete datasets, run
   logs, model checkpoints, or trained weights were unavailable.
8. Usability and acceptability estimates were limited by the final respondent
   groups, sample sizes, instruments, and duration of exposure.
9. Hardware, microphone, network, and local-service conditions may have
   influenced completion time, retries, and observed feasibility.
10. Teachers and learners could not be blinded to ReaDirect use. Expectancy,
    novelty, contamination, or concurrent school instruction may have affected
    behavior and outcomes.

## 5.5 Recommendations

### 5.5.1 Recommendations for School Implementation

1. Use ReaDirect as a supplement to regular reading instruction and authorized
   school assessment. Do not use its internal profile as an official CRLA
   classification.
2. Begin with a supervised implementation in conditions similar to those
   evaluated in the study. Confirm device, microphone, headphone, network, ASR,
   and TTS readiness before learner sessions.
3. Provide a common orientation and only brief non-answer-giving assistance
   during learner use. Preserve assessment standardization and document all
   technical or navigational assistance.
4. Use teacher review when audio is uncertain, unusable, or inconsistent with
   observed learner speech. Technical failures must not be treated as academic
   errors.
5. Maintain the fixed sequence of the Diagnostic Assessment, six required
   lessons, and Final Assessment unless a future validated protocol formally
   changes it.
6. Review privacy, consent, retention, and authorized data-release procedures
   before expanding to additional classes or schools.

### 5.5.2 Recommendations for System Improvement

1. Prioritize corrections identified by the functional, accessibility,
   usability, and feasibility results, particularly `[INSERT: measured
   high-priority issues]`.
2. Continue evaluating false acceptance and false rejection for Mu and Nu.
   Preserve raw model evidence and require reviewed, narrowly scoped rules for
   expected-aware equivalence.
3. Improve audio-quality guidance and recovery for the most frequent observed
   recording problems without applying aggressive processing that can damage
   child-speech evidence.
4. Expand automated regression coverage for assessment standardization,
   bounded lesson support, persistence, idempotency, private-file access,
   role scope, research export, and optional-feature isolation.
5. Monitor response time and service reliability on the hardware and network
   conditions expected in school deployment.
6. Keep Ma'am Clara, games, achievements, and optional activities separate from
   official CRLA data, assessment measurement, and mandatory progression.
7. Establish documented backup, recovery, audit-review, model-version, content-
   version, and incident-response procedures before production deployment.

### 5.5.3 Recommendations for Future Research

1. Replicate the Grade 3 study in multiple schools with a larger sample and an
   a priori powered design to improve precision and external validity.
2. Retain randomized allocation where feasible and consider stratification by
   section, baseline numeric score, or other prespecified factors. If sections
   rather than learners are assigned, use an appropriate cluster design and
   analysis.
3. Conduct longitudinal follow-up to determine whether any observed official
   CRLA difference is maintained after the intervention ends.
4. Validate ReaDirect with other reading profiles and grade levels only after
   establishing age-appropriate content, interface, safety, and outcome
   measures for those groups.
5. Compare ASR decisions with blinded human review using sufficiently balanced
   child-speech samples and report performance by relevant device, noise,
   speaker, and task conditions.
6. Examine the relationship between intervention fidelity, learner assistance,
   ReaDirect exposure, and outcomes using prespecified secondary analyses,
   without replacing the randomized primary comparison.
7. Develop and validate an alternative internal assessment form to reduce
   familiarity effects while preserving equivalent task coverage and scoring.
8. Evaluate teacher workload, instructional usefulness, accessibility, and
   sustained adoption over a longer implementation period.
9. Pre-register the final outcome variables, model specification, missing-data
   procedure, sensitivity analyses, and interpretation rules before examining
   final group outcomes.

## Chapter V Completion Checklist

- [ ] Confirm that every finding appears first in Chapter IV.
- [ ] Replace all `[INSERT: ...]` fields from finalized Chapter IV results.
- [ ] State the actual Grade 3 design and randomization unit.
- [ ] Use exact school-authorized official English CRLA field names.
- [ ] Keep Grade 1 feasibility and Grade 3 effectiveness conclusions separate.
- [ ] Interpret confidence intervals and effect sizes, not p-values alone.
- [ ] Do not call ReaDirect internal scores official CRLA outcomes.
- [ ] Do not claim generalization beyond the evaluated participants and locale.
- [ ] Retain only recommendations supported by findings or stated limitations.
- [ ] Reconcile terminology, table numbering, and figure numbering with the final manuscript.
- [ ] Remove drafting notes and this checklist before submission.
