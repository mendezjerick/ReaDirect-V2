# ReaDirect Conceptual Framework

```text
                                      CONCEPTUAL FRAMEWORK OF READIRECT

+--------------------------------+     +----------------------------------------------------------+     +--------------------------------+
|             INPUT              | ==> |                         PROCESS                          | ==> |             OUTPUT             |
+--------------------------------+     +----------------------------------------------------------+     +--------------------------------+
| READIRECT STUDY INPUTS         |     |                                                          |     | A. LEARNER AND SYSTEM OUTPUTS  |
|                                |     |  +-------------------------+   +------------------------+ |     |                                |
| - Eligible learner and         |     |  | 1. ACCESS AND           |-->| 2. RESPONSE CAPTURE    | |     | - confirmed response result    |
|   authenticated account        |     |  |    VALIDATION           |   |                        | |     | - child-safe bounded feedback  |
|                                |     |  |                         |   | - present activity     | |     | - assessment task scores       |
| - spoken audio or selected     |     |  | - authenticate account  |   | - record speech or     | |     | - Part 1 and reading profile   |
|   answer                       |     |  | - verify role, owner,    |   |   capture a choice     | |     | - persistent learner progress  |
|                                |     |  |   and activity state     |   | - prepare audio and    | |     | - Diagnostic and Final         |
| - expected letter, word,       |     |  | - load confirmed task    |   |   activity context     | |     |   Assessment summaries         |
|   phrase, sentence, passage,   |     |  +-------------------------+   +-----------+------------+ |     | - class and school reports     |
|   or comprehension target      |     |                                            |              |     | - achievement/completion state |
|                                |     |                                            v              |     |                                |
| - assessment or lesson context |     |  +-------------------------+   +------------------------+ |     +--------------------------------+
|                                |     |  | 4. AUTHORITATIVE        |<--| 3. SPEECH AND         | |     | B. RESEARCH AND QUALITY       |
| - approved assessment and      |     |  |    INTERPRETATION       |   |    RESPONSE ANALYSIS   | |     |    OUTPUTS                     |
|   lesson content               |     |  |                         |   |                        | |     |                                |
|                                |     |  | - expected-aware        |   | - audio-quality gate   | |     | - reviewed speech evidence    |
| - fixed Lessons 1 through 6    |     |  |   equivalence           |   | - isolated letter:     | |     | - ASR accuracy/error evidence |
|                                |     |  | - transcript alignment  |   |   Mu-backed resolver   | |     | - functional test evidence    |
| - role, school, and ownership  |     |  | - deterministic scoring |   | - other spoken tasks:  | |     | - usability/acceptability     |
|   rules                        |     |  | - skip and bounded      |   |   Mu/Whisper transcript| |     |   evidence                     |
|                                |     |  |   teaching rules        |   | - choice validation    | |     | - technical and audit records |
| - expected-answer and          |     |  +-----------+-------------+   +------------------------+ |     | - de-identified research data |
|   equivalence rules            |     |                                            |              |     | - observed Diagnostic-to-Final|
|                                |     |               |                                           |     |   within-learner change        |
|                                |     |               v                                           |     |                                |
| - audio-quality, privacy, and  |     |  +-------------------------+   +------------------------+ |     +---------------+----------------+
|   feedback standards           |     |  | 5. PERSISTENCE AND      |-->| 6. FIXED LEARNING      | |                     |
|                                |     |  |    FEEDBACK             |   |    JOURNEY             | |                     v
| - ReaDirect English CRLA-style |     |  |                         |   |                        | |     +--------------------------------+
|   assessment context           |     |  | - store runs, responses|   | Diagnostic Assessment  | |     |       END USERS AND            |
+--------------------------------+     |  |   attempts, scores,     |   |          |             | |     |       STAKEHOLDERS             |
          ^                            |  |   progress, and evidence|   |          v             | |     +--------------------------------+
          |                            |  | - select published or   |   | Lessons 1 -> 2 -> 3    | |     | - learners                    |
          |                            |  |   VoxCPM2 speech         |   |          -> 4 -> 5 -> 6| |     | - teachers                    |
          |                            |  | - Ma'am Clara presents  |   |          |             | |     | - school administrators       |
          |                            |  |   bounded feedback       |   |          v             | |     | - system administrators       |
          |                            |  | - save next activity    |   | Final Assessment       | |     | - DepEd/ARAL implementers     |
          |                            |  +-------------------------+   |          |             | |     | - researchers                 |
          |                            |                                |          v             | |     +--------------------------------+
          |                            |                                | Reading Journey Complete| |
          |                            |                                |                        | |
          |                            |                                | Scores provide evidence;| |
          |                            |                                | they do not bypass the  | |
          |                            |                                | required lesson sequence| |
          |                            |                                +------------------------+ |
          |                            +----------------------------------------------------------+
          |                                                      ^
          |                                                      |
          |                                verified refinement and quality feedback
          |                                                      |
+---------+------------------------------------------------------------------------------------------------------------+
|                                         SYSTEM TESTING AND EVALUATION                                                |
+------------------------------+------------------------------+------------------------------+-------------------------+
| 1. TECHNICAL ASR EVALUATION  | 2. FUNCTIONAL/SYSTEM TESTING | 3. USABILITY/ACCEPTABILITY   | 4. RESEARCH OUTCOME     |
|                              |                              |                              |    EVALUATION           |
| - letter-resolution accuracy | - unit and component tests   | - approved evaluator survey  | - paired Diagnostic and |
| - confusion matrix           | - API/integration tests      | - usefulness and clarity     |   Final evidence        |
| - precision, recall, and F1  | - end-to-end flow testing    | - usability and accessibility| - descriptive and paired|
|   when supported             | - role and ownership checks  | - coded qualitative comments |   statistical analysis  |
| - WER/CER for verified text  | - compatibility/reliability  | - transparent denominators   | - integrated findings   |
| - unusable/uncertain rates   | - defect correction/retest   |                              | - no unsupported causal |
| - latency when measured      |                              |                              |   claim                 |
+------------------------------+------------------------------+------------------------------+-------------------------+
```

**Figure. Conceptual Framework of ReaDirect.** Approved learner, content, and
governance inputs pass through six controlled system processes. React captures
the response, the FastAPI ASR service produces technical speech evidence, and
Laravel remains responsible for interpretation, scoring, persistence, bounded
teaching, and sequential progression. The resulting learner, system, and
research outputs are evaluated through technical ASR testing, functional
testing, usability and acceptability evaluation, and Diagnostic-to-Final
outcome analysis. Verified findings feed controlled refinement without
overwriting original evidence or bypassing required lessons.
