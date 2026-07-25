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
| `teacher` | Teacher | Teacher Dashboard | Assigned learners, learner progress, reports, analytics, and assessment review. |
| `student` | Learner | Learner Dashboard | Learner assessment and required-lesson progress. |
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
- Conditional Mu noise reduction. It is off by default, requires confirmation
  to change, affects new Mu submissions only, and preserves original-audio
  evidence even when its optional second pass runs. Nu never uses this setting.
- Agent display mode.
- Learner font mode. The canonical default is Jersey 20 for learner interface
  chrome, with Lexend reserved for authored reading content.
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
- `Learner Dashboard` is always the first Page Portal destination. It resets
  Kristen to `before_diagnostic`, creates no assessment or lesson run, and
  opens `/learner/dashboard` with the standard one-hour portal session.
- Leaving or ending a Page Portal resets Kristen to `before_diagnostic` and
  revokes its session. Expired runs must receive the same cleanup.
- The Page Portals workspace provides a manual reset control. Resetting revokes
  every active Kristen session, ends any active portal run, clears persisted
  assessment and lesson progress, retains the account, and writes a staff audit
  log. The reset requires an explicit confirmation step.
- Portal destinations remain disabled until the corresponding real assessment
  and lesson save records exist. A page must not mark prerequisites complete
  using placeholder data.
- Assessment Part 1 Page Portals are available for the microphone check, Task
  1A, Task 2A, Task 2B, and Part 1 Results because those checkpoints now have
  real Laravel persistence. Each launch resets Kristen, creates an active
  Diagnostic Part 1 run in the normal assessment tables, and opens the selected
  checkpoint with a one-hour portal Learner session.
- Later Part 1 checkpoints use explicit `portal_prerequisite` response records
  in the same assessment run to establish the required low or high branch.
  These records are marked as portal-created evidence, remain exclusive to
  `KW000`, and are excluded from all analytics. They must never be created for a
  standard Learner.
- Lesson 1 through Lesson 5 Page Portals are active because all five lessons
  now own
  real persisted runs, responses, progression, achievements, and reload
  routes. Lesson 1 exposes each of its three mission starts and its completed
  result. Lesson 2 exposes both mission starts and its completed result.
  Lesson 3 exposes its phrase mission and completed result. Lesson 4 exposes
  its sentence mission and completed result. Lesson 5 exposes passage reading,
  the dedicated passage result, and its completed result.
- Opening a lesson portal first creates Kristen's persisted completed
  Diagnostic run and Ready Reader award. A Lesson 2 portal then creates a
  persisted completed Lesson 1 run and Letter Leader award before the selected
  Lesson 2 checkpoint. Mission 2 includes five persisted Mission 1 responses.
  The completed destination includes all ten Lesson 2 responses, advances the
  required lesson order to 3, and grants Word Wizard.
- A Lesson 3 portal additionally persists completed Lesson 2 and Word Wizard.
  Its completion destination persists all five phrase responses, advances the
  required lesson order to 4, and grants Phrase Pro.
- A Lesson 4 portal additionally persists completed Lesson 3 and Phrase Pro.
  Its completion destination persists all five sentence responses, advances
  the required lesson order to 5, and grants Sentence Star.
- A Lesson 5 portal additionally persists completed Lesson 4 and Sentence
  Star. It exposes the active passage, dedicated passage result, and completion
  destinations. Completion advances required lesson order to 6 and grants
  Passage Explorer.
- Portal prerequisite responses use the same lesson tables and teaching-state
  fields but are explicitly marked `portal_prerequisite`; they do not fabricate
  learner audio or ASR attempts.
- Lesson destinations beyond Lesson 5 remain unavailable until their real save
  and progression workflows are implemented.
- IsoLetter Sandbox is the direct Nu testing page for isolated-letter audio.
  Nu is Mu's letter mode. The page shows the expected letter, raw and normalized
  Mu transcript, resolved A-Z/`SILENCE`/`UNKNOWN` class, matched alias, mapping
  source, applied letter-equivalence rules, segments, audio quality, and the
  target-aware decision.
- IsoLetter Sandbox must not contain, test, or evaluate words, phrases,
  sentences, or paragraphs.
- True Sandbox is the direct Mu testing page for raw transcript review,
  expected-aware comparison, highlighted transcript differences, and reviewed
  scoring decisions.
- True Sandbox must not contain, test, or evaluate isolated-letter items.
- True Sandbox provides a Laravel-owned selector for active Mu speech targets
  from Assessment Tasks 2B and 3A and Lessons 2 through 5. Rhyme yes/no items,
  assessment comprehension questions and choices, all Lesson 6 content, and
  isolated letters are excluded. Lesson 6 is a choice activity and has no Mu
  target.
- Selecting authored content locks the exact spoken target, Mu task type, and
  stable item key. Administrators may return to custom text for isolated tests.
- True Sandbox can create Equivalence Book entries only when the admin marks a
  sample as expected-correct. If the admin marks the sample as expected-wrong,
  equivalence authoring is hidden or disabled.
- IsoLetter Sandbox uses the same expected-correct review gate. A reviewed
  wrong or unmapped result may create a global `letter_alias`, but literal
  letters cannot be reassigned. Unapproved conflicts resolve to `UNKNOWN`.
  Explicitly approved ambiguity may expose a fixed candidate set; `aye` is
  approved for A/I and passes only when the active item expects A or I.
- Every IsoLetter and True Sandbox run stores its original audio privately and
  records the complete request/result evidence outside learner analytics.
- The Confusion Matrix workspace keeps the raw token matrix separate from its
  fixed binary acceptance baseline. The binary view displays TP, TN, FP, FN,
  accuracy, precision, recall, specificity, F1, and the `fptn`/silence negative
  source counts defined by the ASR Guide. Its voice filter exposes the approved
  `millie2`, `millie2-plus`, `jz`, and `shai` fixture sets, while activity and
  voice filters never alter the fixed binary baseline.
- Equivalence Book is the active System Administrator rule-management surface
  for accepted transcript differences used by post-ASR scoring. It supports
  review, search, filtering, and enable/disable controls. Rule creation remains
  gated through expected-correct IsoLetter or True Sandbox review; unrestricted
  manual creation is prohibited.
- Equivalence Book rules use a compact data table with exactly one rule per row.
  Each row keeps its expected text, recognized text, rule type, scope, status,
  author metadata, and enable/disable action visible. Narrow viewports scroll
  the table horizontally instead of expanding every rule into a large card.
- Equivalence Book rule types include homophone, punctuation, contraction,
  spelling variant, accepted variant, accent-safe variant, and letter alias.

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

The School Administrator workspaces use these security and data rules:

- School Profile reads the authenticated administrator's assigned school and
  may update only that school's display name. A rename is audited and does not
  update Learner accounts, assessment or lesson evidence, progression, scores,
  outcomes, or achievements.
- A class is the existing one-Teacher grade-and-section assignment. Class
  creation remains part of Teacher account creation. Updating an assignment
  synchronizes grade and section on that Teacher's standard Learner account
  context and requires the Teacher to acknowledge the revised assignment.
  It does not reset, recalculate, or update any learner-flow record.
- The school Learner directory and Learner detail routes are read-only.
  Laravel resolves the Learner through the authenticated School Administrator's
  `school_id` and `account_purpose = standard` before loading persisted
  evidence. Changing a URL cannot expose another school's Learner, `KW000`, or
  any portal-system Learner.
- School reports aggregate the existing Teacher report contract for Teachers
  assigned to the school. Reports use persisted evidence, add no snapshots or
  conclusions, and write no learner-flow or audit data when opened, filtered,
  or printed.
- Teacher Dashboard Review is a read-only School Administrator view of an
  in-school Teacher's overview and class report. It does not create a Teacher
  session, impersonate the Teacher, acknowledge the Teacher assignment, or
  expose another school's class.
- School overview metrics, Part 1 distribution, and recent assessment activity
  use persisted records from school-scoped standard Learners. Portal-system and
  out-of-school records are excluded before aggregation.

Access rule: a School Administrator does not receive system-only technical
tools such as AI status controls, guests, rules, prompts, audit logs, system
monitoring, confusion matrix, Page Portals, IsoLetter Sandbox, True Sandbox, or
Equivalence Book.

## Teacher

Dashboard entry: Teacher Dashboard.

The Teacher Dashboard gives a class and learner progress view for assigned or
school-scoped learners.

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

Learner import is a Teacher-scoped account-creation workflow:

- The import accepts the fixed CSV columns `first_name`, `middle_name`,
  `last_name`, `suffix`, and `lrn` in that order. First, middle, and last names
  are mandatory; suffix and LRN may be blank.
- One import contains between 1 and 100 Learners and is all-or-nothing.
  Client-side parsing provides a preview, but Laravel repeats validation and is
  the authority. An invalid row creates no accounts.
- Every imported account is a new active standard Learner assigned
  automatically to the authenticated Teacher's school, grade, and section.
  The import cannot supply account purpose, Teacher, school, grade, section,
  learner code, password, or progression data.
- Learner Codes use the canonical global generator. Generated passwords are
  hashed and returned only in the successful one-time credential response.
- A `learner.imported` staff audit event records the imported Learner IDs,
  count, and class assignment without plaintext passwords.

Credential sheets are an explicit credential-rotation workflow:

- A Teacher may select between 1 and 50 active standard Learners assigned to
  that Teacher. If any requested identifier is outside that scope, Laravel
  rejects the complete operation without changing any password.
- The confirmation must state that current passwords stop working, active
  Learner sessions are revoked, and learning progress is preserved.
- A successful operation replaces the selected passwords, returns each new
  password once, and provides a print-specific sheet containing only Learner
  name, Learner Code, and new password.
- Assessment, lesson, score, progression, and achievement records are never
  changed. A `learner.credentials_issued` audit event records only Learner IDs,
  count, and the session-revocation fact.

The Teacher Learner Detail workspace is a read-only progress-review surface for
one assigned standard Learner:

- A Teacher can open it only from the assigned Learner directory.
- Laravel resolves the Learner through the authenticated Teacher ID and
  `account_purpose = standard` in the same query. Changing the Learner
  identifier cannot expose another Teacher's Learner, `KW000`, or any other
  portal-system Learner.
- It displays Learner identity, school, grade, section, persisted progression,
  the latest Diagnostic and Final Assessment summaries when available, and the
  six required lessons in course order.
- Assessment review includes separate task and result values plus explicitly
  skipped assessment items. Skips remain distinct persisted `SKIPPED`
  responses.
- Lesson review reports run completion, item outcomes, academic attempts,
  technical retries, clear incorrect practice attempts, final transcripts,
  scaffold use, diagnoses, and review flags only where those values were
  persisted.
- Review recommendations are deterministic. They are created only from an
  explicit saved assessment or lesson skip or a persisted lesson
  `review_recommended` flag, and they show the evidence that caused the
  recommendation. The workspace does not generate unrestricted AI conclusions
  or infer a lasting weakness from one response.
- Raw model transcripts, service evidence, private audio paths, and audio
  checksums are not included in the read-only detail response.
- Learner editing, password reset, reassignment, export, and messaging remain
  outside this workspace.

Learner password reset is a separate Teacher directory control:

- A Teacher may reset only an active standard Learner currently assigned to
  that authenticated Teacher. Laravel applies the Teacher ID,
  `account_purpose = standard`, and active-account constraints in the same
  lookup. Another Teacher's Learner, `KW000`, every other portal-system
  Learner, and an inactive Learner return no account data and cannot be reset
  through an altered URL.
- The directory requires an explicit confirmation that names the affected
  Learner and explains that the old password will stop working. The Learner
  Detail workspace remains read-only and contains no account-management
  action.
- A successful reset replaces only the password, stores it through the
  Learner model's password hash, and revokes every active Learner session.
  Assessment, lesson, achievement, and canonical progression records are
  unchanged.
- The generated replacement password is returned once in the successful
  response and shown only in the resulting credential notice. Dismissing the
  notice removes it from the interface; it is not added to directory queries,
  browser storage, or audit metadata.
- The reset writes a `learner.password_reset` staff audit event with the
  Learner identity and session-revocation fact. The plaintext password must
  never appear in the audit description or metadata.

The Teacher Dashboard overview uses persisted class-scoped data:

- Counts come from the authenticated Teacher's assigned standard Learners and
  their canonical progression states. Diagnostic pending is the assigned total
  minus confirmed Diagnostic completions, readiness for Final Assessment is
  the persisted `final_assessment` stage, and Final completion requires its
  saved completion timestamp.
- The Part 1 Score level distribution uses each Learner's latest Diagnostic
  Assessment run with a persisted Part 1 result.
- Diagnostic and Final reading-profile distributions use each Learner's latest
  completed run of the corresponding assessment type.
- Recent progress combines persisted Diagnostic Assessment, Final Assessment,
  and required-lesson runs, orders them by their saved completion or update
  time, and links back to the read-only Learner Detail workspace.
- Dashboard aggregates and activity never include `KW000`, another portal
  system Learner, or a Learner assigned to another Teacher.
- Missing results remain zero or empty. The overview does not estimate scores,
  profiles, completion, or activity.

The Teacher Diagnostic Assessment review workspace is a read-only class
directory:

- It shows every standard Learner assigned to the authenticated Teacher once
  and uses that Learner's latest persisted Diagnostic Assessment run.
- Status is `Pending` when no run exists, `In progress` when the latest run is
  active, and `Completed` only when the latest run is saved as completed.
- Persisted Part 1 Score and level, passage reading accuracy, Comprehension
  Check values, final reading score and profile, completion time, and skipped
  item count may be shown when available. Missing values remain explicitly
  unavailable.
- The summary does not expose response transcripts, audio locations, audio
  checksums, or internal scoring evidence. Full safe review evidence remains in
  the existing Learner Detail workspace.
- Each row may link to that Learner Detail workspace. This review directory
  does not edit results, reset assessments, update transcripts, or generate
  unsupported conclusions.
- `KW000`, every portal-system Learner, and Learners assigned to another
  Teacher are excluded before assessment runs are resolved.

The Teacher Final Assessment review workspace follows the same read-only
evidence contract with one necessary progression distinction:

- `Not ready` means no Final Assessment run exists and the canonical
  progression stage has not reached `final_assessment`.
- `Ready` means the Learner's canonical stage is `final_assessment` and no
  Final Assessment run exists yet.
- `In progress` and `Completed` require a persisted Final Assessment run with
  the corresponding saved status.
- Results and skipped counts come only from each assigned Learner's latest
  Final Assessment run. Diagnostic runs never populate the Final directory.
- Completion, score, profile, privacy, drill-down, and scope rules are
  otherwise identical to the Diagnostic Assessment review directory.

Teacher reporting, analytics, and review surfaces consume persisted
learner-flow evidence. They must not update assessment responses, lesson
responses, scores, outcomes, progression, achievements, or learner-facing
routes and components.

The Teacher Class Progress Report is a read-only printable cohort record:

- It includes each standard Learner assigned to the authenticated Teacher and
  excludes `KW000`, portal-system Learners, and other Teachers' Learners before
  resolving evidence.
- Each row reports the canonical progression stage, latest persisted
  Diagnostic and Final Assessment status/result, unique completed required
  lessons, explicit skipped-item count, and persisted lesson
  `review_recommended` count.
- Missing runs and results remain `Not started`, `No profile`, or unavailable.
  The report does not estimate performance or infer recommendations.
- Search is a client-side view filter. Printing hides workspace navigation and
  controls; opening or printing a report writes no learner-flow or audit data.

Teacher Class Analytics is a read-only evidence aggregation:

- It resolves assigned standard Learners first and uses only each Learner's
  latest persisted run per assessment type and per required lesson. Retakes do
  not silently multiply one Learner's contribution.
- Independent success, supported success, demonstrated items, not-yet-correct
  items, unscorable recordings, technical retries, review recommendations, and
  assessment skips remain separate counts.
- Each lesson shows cohort size, Learners started, Learners completed, recorded
  item denominator, independent and supported successes, and review flags.
- Recurring evidence lists persisted deterministic `diagnosis_key` counts.
  Labels do not become diagnoses of a Learner, rankings, predictions, or
  unsupported conclusions.
- Private transcripts, audio locations, internal evidence, and portal-system
  activity are excluded. Loading analytics never changes learner-flow data.

Teacher Audio Review is a staff-only evidence annotation workspace:

- The queue contains only persisted assessment and lesson responses with a
  saved recording for active standard Learners assigned to the authenticated
  Teacher. `KW000`, portal-system Learners, and other Teachers' Learners are
  excluded before response evidence is resolved.
- Recording bytes are delivered only through an authenticated, Teacher-scoped
  Laravel endpoint. Browser payloads never receive private storage paths,
  checksums, raw service evidence, or an unauthenticated recording URL.
- A Teacher may listen to the recording and save a reviewed transcript,
  reviewed decision, and optional note. Each save creates an append-only
  `staff_response_reviews` row and a `learner.response_reviewed` audit event.
- A staff review is an annotation, not a rescore or learner-flow correction.
  It never updates the source assessment or lesson response, run, score,
  outcome, progression, achievement, recommendation, or learner-facing
  behavior. The original persisted transcript and decision remain canonical.
- The workspace shows the latest annotation while preserving earlier review
  rows for audit history. It makes no generated diagnosis, recommendation, or
  unsupported conclusion.

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

After Final Assessment completion:
Reading Journey Complete (settled, non-navigating state)
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
- A settled Reading Journey Complete primary card after Final Assessment
  completion; it must not create another Final Assessment run.
- Latest Diagnostic Assessment task scores.
- Latest Final Assessment task scores when available.
- Latest passage reading accuracy.
- Latest Comprehension Check score when available.

Learner controls include:

- Use the one current primary action for Diagnostic Assessment, the current
  sequential lesson, or Final Assessment.
- Open the Game Lobby through a smaller secondary action.
- View progress.
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

## Staff Session And Access Rules

- Successful staff sign-in creates an opaque bearer session. Only its SHA-256
  hash is persisted in PostgreSQL; the plaintext token exists only in the
  current browser tab's session storage.
- A staff session expires after eight hours by default. The duration is
  configurable through `STAFF_SESSION_LIFETIME_HOURS`.
- Staff sign-in is rate limited. Explicit sign-out revokes the active server
  session, and inactive accounts, expired sessions, and revoked sessions
  receive `401 Unauthorized`.
- Every staff data and mutation endpoint requires a valid server-resolved staff
  session. Role scope is enforced by Laravel, and a route containing a staff
  account identifier must match the authenticated account. Changing a URL or
  request body must never allow one staff account to impersonate another.
- React staff route guards verify the session before rendering a workspace and
  redirect users to their own role home when they open another role's route.
  These guards improve navigation only; Laravel remains the authorization
  authority.
- A browser profile left over from the earlier development-only login format is
  invalid and must sign in again.

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
- Final Assessment completion changes progression to
  `reading_journey_complete`, records its completion timestamp, and prevents
  the dashboard primary action from restarting the assessment.
- Every started lesson has a persistent save state tied uniquely to the
  authenticated learner or verified guest.
- Leaving a lesson for the dashboard or closing the application preserves the
  latest confirmed lesson position.
- An incomplete saved lesson changes the primary action to Continue Lesson and
  resumes at that saved position.
- One account can never load, overwrite, or continue another account's lesson
  save state.
- Completion of all required lessons unlocks the Final Assessment.
- Lesson dashboards use lesson terminology only.

## Out Of Scope

This guide does not define:

- Exact route lists.
- Controller method contracts.
- Database schema.
- Assessment scoring rules.
- ASR expected-aware processing.
- Lesson progression rules.
- Visual design specifications.
