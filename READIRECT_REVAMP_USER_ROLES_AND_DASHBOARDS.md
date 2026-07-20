# ReaDirect Revamp User Roles and Dashboards Guide

Purpose: define the ReaDirect user roles and the dashboard surface each role
uses in the revamp.

This guide describes the role hierarchy, dashboard ownership, visible dashboard
content, and access boundaries. It does not define every route, controller,
database field, or page component.

Learner achievement keys, unlock criteria, gallery positions, shared queue, and
presentation behavior are defined by
`READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`.

## Role Model

ReaDirect uses five user-facing roles.

| Role code | Display role | Main dashboard | Scope |
|---|---|---|---|
| `system_admin` | System Administrator | System Admin Dashboard | Full system management, technical tools, content, Page Portals, and global reporting. |
| `school_admin` | School Administrator | School Admin Dashboard | School-scoped administration, teachers, classes, learners, and school reporting. |
| `teacher` | Teacher | Teacher Dashboard | Assigned learners, learner progress, reports, analytics, assessment review, and optional lesson creation. |
| `student` | Learner | Learner Dashboard | Learner assessment progress and optional teacher-created lessons. |
| `general_user` | Guest | Learner Dashboard after guest access | Trial or guest learner flow without staff administration. |

Role hierarchy:

- A System Administrator includes the System Administrator, School
  Administrator, and Teacher capability set.
- A School Administrator includes the School Administrator and Teacher
  capability set.
- A Teacher only uses the Teacher capability set.
- A Learner only uses the learner reading flow.
- A Guest only uses public guest access and learner-facing flow.

## Naming Rule

Use `ReaDirect Assessment` as the umbrella user-facing assessment name.

Use `Diagnostic Assessment` for the pre-test assessment run.

Use `Final Assessment` for the post-test assessment run.

Dashboards, reports, tables, cards, filters, and labels display ReaDirect
Assessment, Diagnostic Assessment, or Final Assessment terminology based on the
run type being shown. Internal data keys are implementation details and do not
define user-facing copy.

Use `lessons` for learning content. The revamp does not use assessment-based
placement, assessment-based routing, or non-lesson learning-unit dashboard
labels.

## Assessment And Lesson Flow Rule

Assessments provide assessment evidence and fixed progression gates.

Every learner follows the same required sequence:

~~~text
Diagnostic Assessment
    -> sequential required lessons
    -> Final Assessment
~~~

Required lessons remain locked until the learner completes the Diagnostic
Assessment. Completion unlocks the first required lesson. The assessment score
is stored and reported, but it does not place the learner into a different
starting track, reorder lessons, skip lessons, or select different lesson
content.

Required lessons unlock sequentially. Completing the current required lesson
unlocks the next required lesson. Completing the full required lesson sequence
unlocks the Final Assessment.

Lessons are the ReaDirect learning content unit. ReaDirect includes a
developer-made minimum lesson set, and that required set is sequential.
Teachers can add optional lessons from the Teacher Dashboard. Those
teacher-created lessons display on the Learner Dashboard as optional learning
items and do not block the required sequence or Final Assessment.

Detailed lesson creation rules belong in a separate lesson guide.

## System Administrator

Dashboard entry: System Admin Dashboard.

The System Admin Dashboard gives a global operational view of the full
ReaDirect system.

It contains:

- Total schools.
- Total teachers.
- Total learners.
- Sandbox attempts.
- Part 1 Score level distribution.
- Final reading profile distribution.
- Recent assessment activity.
- Recent ASR or speech-to-text failures when surfaced by the page.
- Recent admin actions.
- System health indicators for database, queue, and environment.

System Administrator controls include:

- AI service status.
- Agent display mode.
- Learner font mode.
- Agent voice stage.
- Schools.
- Teachers.
- Learners.
- Guests.
- Assessment content.
- Lesson content.
- Rules and thresholds.
- Agents.
- Prompt templates.
- Audit logs.
- System monitoring.
- Confusion matrix tools.
- Page Portals.
- IsoLetter Sandbox.
- True Sandbox.
- Equivalence Book.

System Administrator page portal and ASR review tools:

- Page Portals provide direct navigation into controlled admin/test pages
  without making those pages part of the normal learner or staff flow.
- All Page Portals use the dedicated portal-system Learner `KW000`, Kristen
  Rhine Wright. This account is visible only in the System Administrator Page
  Portals workspace and is excluded from learner analytics, totals, reports,
  class lists, and school or Teacher learner directories.
- `KW000` remains available through the normal Learner sign-in for direct
  workflow testing. An active Page Portal run blocks ordinary sign-in and
  invalidates any ordinary session that existed before the run.
- Page Portal entry must reset Kristen first, then create the same persisted
  prerequisite records that the real learner workflow would create before the
  chosen target. A portal must never invent a parallel or display-only progress
  state.
- Leaving or ending a Page Portal resets Kristen to `before_diagnostic` and
  revokes its session. Expired runs must receive the same cleanup.
- The Page Portals workspace provides a manual reset control. Resetting revokes
  every active Kristen session, ends any active portal run, clears persisted
  assessment and lesson progress, retains the account, and writes a staff audit
  log. The reset requires an explicit confirmation step.
- Portal destinations remain disabled until the corresponding real assessment
  and lesson save records exist. A page must not mark prerequisites complete
  using placeholder data.
- IsoLetter Sandbox is the direct Nu testing page for isolated-letter audio.
  It shows expected letter, predicted class, confidence, top predictions,
  class probabilities, special-class results, audio-quality result, and the
  target-aware letter decision.
- IsoLetter Sandbox must not contain, test, or evaluate words, phrases,
  sentences, or paragraphs.
- True Sandbox is the direct Mu testing page for raw transcript review,
  expected-aware comparison, highlighted transcript differences, and reviewed
  scoring decisions.
- True Sandbox must not contain, test, or evaluate isolated-letter items.
- True Sandbox can create Equivalence Book entries only when the admin marks a
  sample as expected-correct. If the admin marks the sample as expected-wrong,
  equivalence authoring is hidden or disabled.
- Equivalence Book is the editable rule surface for accepted transcript
  differences used by post-ASR scoring. It supports rule review, text-input
  rule creation, rule editing, rule deletion, rule type assignment, and
  scope assignment.
- Equivalence Book rule types include homophone, punctuation, contraction,
  spelling variant, accepted variant, and accent-safe variant.

Access rule: system-only tools are visible only to System Administrators.

## School Administrator

Dashboard entry: School Admin Dashboard.

The School Admin Dashboard gives a school-scoped operational view. A School
Administrator only sees data for the assigned school.

It contains:

- School context, including school name and available school metadata.
- Schools or school profile link, depending on the active scope.
- Teachers.
- Learners.
- Active learners.
- Recent assessment activity.
- Part 1 Score level distribution.
- Quick links for school profile, teacher management, learner management, and
  class creation.

School Administrator controls include:

- School profile and school-scoped records.
- Teacher accounts.
- Classes.
- Learner records.
- Teacher dashboard access for school-scoped learner review.

Access rule: a School Administrator does not receive system-only technical
tools such as AI status controls, guests, rules, prompts, audit logs, system
monitoring, confusion matrix, Page Portals, IsoLetter Sandbox, True Sandbox, or
Equivalence Book.

## Teacher

Dashboard entry: Teacher Dashboard.

The Teacher Dashboard gives a class and learner progress view for assigned or
school-scoped learners. It also gives teachers a simple lesson creation surface
for optional learner lessons.

It contains:

- Total learners.
- Diagnostic Assessment complete count.
- Diagnostic Assessment pending count.
- Learners ready for Final Assessment.
- Final Assessment complete count.
- Part 1 Score level distribution.
- Diagnostic Assessment reading profile distribution.
- Final Assessment reading profile distribution.
- Recent learner activity.
- Teacher-created lesson list.
- Lesson status for optional lessons.

Teacher controls include:

- Learner list.
- Learner creation.
- Learner import.
- Credential sheet generation.
- Learner password reset.
- Learner assessment review.
- Reports.
- Analytics.
- Audio playback.
- Transcript update for reviewed audio.
- Lesson creation.
- Lesson editing.
- Lesson publishing or visibility control.

Teacher lesson creation is friendly by design. A teacher types the needed lesson
details into guided text inputs instead of building a technical lesson package.
The exact fields and creation flow belong in a separate lesson creation guide.

Access rule: a Teacher reviews and manages learner progress, but does not
manage system configuration, assessment content, lesson system defaults, Page
Portals, IsoLetter Sandbox, True Sandbox, or Equivalence Book.

## Learner

Dashboard entry: Learner Dashboard.

The Learner Dashboard gives the learner a simple reading path and next action.
The confirmed learner flow is Diagnostic Assessment, sequential required
lessons, then Final Assessment.

The dashboard has one fixed primary-action position. Its control keeps the same
large size and location while its label and behavior change with the
authenticated account's persisted progress:

~~~text
Before Diagnostic completion:
Start or Resume Diagnostic Assessment

After Diagnostic completion:
Start Lesson <number or title> when no saved attempt exists
Continue Lesson <number or title> when an incomplete saved attempt exists

After all required lessons:
Start or Resume Final Assessment
~~~

Only the currently required primary action is shown. The previous action
disappears when its stage is complete. Leaving an incomplete lesson for the
dashboard does not reset it. The fixed primary action becomes Continue Lesson
and resumes the learner from the latest confirmed lesson save state.

It contains:

- Learner identity, display name, learner code, and current stage.
- One dominant fixed-position primary next action.
- Part 1 Score summary.
- Final reading profile when available.
- A clearly visible but secondary Games action.
- A prominent achievement holder with fixed badge positions, earned
  achievement artwork, and locked silhouettes with visible criteria.
- Diagnostic Assessment start or resume action.
- Current required lesson start or continue action when unlocked.
- Saved position and completion state for the current required lesson.
- Final Assessment start or resume action when available.
- Latest Diagnostic Assessment task scores.
- Latest Final Assessment task scores when available.
- Latest passage reading accuracy.
- Latest Comprehension Check score when available.
- Optional teacher-created lessons when available.

Learner controls include:

- Use the one current primary action for Diagnostic Assessment, the current
  sequential lesson, or Final Assessment.
- Open the Game Lobby through a smaller secondary action.
- View progress.
- Open optional teacher-created lessons when available.
- View achievements.
- View help.

Access rule: a Learner only sees learner-facing reading flow. Staff dashboards,
technical tools, and management screens are not available to the Learner role.

## Guest

Dashboard entry: Learner Dashboard after guest access.

Guest access supports a public trial or guest learner session. A Guest does not
have a separate staff dashboard.

It contains:

- Public registration.
- Verification.
- Guest login.
- Resolved learner session.
- Learner Dashboard once the learner session is active.

Access rule: a Guest follows the same learner-facing reading flow after access,
but does not receive staff administration, school records, system tools, or
management screens.

## Dashboard Data Rules

- Staff dashboards show aggregate counts and distributions for the role scope.
- System Administrator data is global.
- School Administrator data is school-scoped.
- Teacher data is learner-scoped to assigned or school-accessible learners.
- Learner data is specific to the active learner session.
- Guest data is specific to the resolved guest learner session.
- Nu letter-task scores use the final scoring response produced by the
  target-aware classifier decision.
- Mu speech-task scores use the final scoring transcript produced by
  expected-aware comparison and Equivalence Book rules.
- Choice-task scores use the selected choice as the final scoring response.
- Dashboard labels use ReaDirect Assessment, Diagnostic Assessment, or Final
  Assessment terminology based on the run type being shown.
- Assessment results do not create lesson placement or different learner
  starting tracks.
- Diagnostic Assessment completion unlocks the first required lesson.
- Required lessons unlock one at a time in their defined order.
- Every started lesson has a persistent save state tied uniquely to the
  authenticated learner or verified guest.
- Leaving a lesson for the dashboard or closing the application preserves the
  latest confirmed lesson position.
- An incomplete saved lesson changes the primary action to Continue Lesson and
  resumes at that saved position.
- One account can never load, overwrite, or continue another account's lesson
  save state.
- Completion of all required lessons unlocks the Final Assessment.
- Optional teacher-created lessons do not block required progression.
- Lesson dashboards use lesson terminology only.

## Out Of Scope

This guide does not define:

- Exact route lists.
- Controller method contracts.
- Database schema.
- Assessment scoring rules.
- ASR expected-aware processing.
- Lesson creation field requirements.
- Lesson progression rules.
- Visual design specifications.
