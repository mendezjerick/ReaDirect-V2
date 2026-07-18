# ReaDirect Revamp User Roles and Dashboards Guide

Purpose: define the ReaDirect user roles and the dashboard surface each role
uses in the revamp.

This guide describes the role hierarchy, dashboard ownership, visible dashboard
content, and access boundaries. It does not define every route, controller,
database field, or page component.

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

Assessments are purely for assessment.

The ReaDirect Assessment score does not determine where a learner starts. Every
learner starts from the same learner starting point. The assessment result is
stored as assessment evidence and shown in staff/learner reporting, but it does
not place the learner into a different starting track.

Lessons are the ReaDirect learning content unit. ReaDirect includes a
developer-made minimum lesson set. Teachers can add optional lessons from the
Teacher Dashboard. Those teacher-created lessons display on the Learner
Dashboard as optional learning items.

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
The confirmed learner flow is assessment-first. Lesson flow details are defined
separately.

It contains:

- Learner identity, display name, learner code, and current stage.
- Primary next action.
- Part 1 Score summary.
- Final reading profile when available.
- Star rewards.
- Diagnostic Assessment start or resume action.
- Final Assessment start or resume action when available.
- Latest Diagnostic Assessment task scores.
- Latest Final Assessment task scores when available.
- Latest passage reading accuracy.
- Latest Comprehension Check score when available.
- Optional teacher-created lessons when available.

Learner controls include:

- Start or resume Diagnostic Assessment.
- View progress.
- Start or resume Final Assessment.
- Open optional teacher-created lessons when available.
- View rewards.
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
