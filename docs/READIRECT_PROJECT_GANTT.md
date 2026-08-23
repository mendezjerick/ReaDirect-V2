# ReaDirect Project Schedule

**Status:** Draft baseline — replace the dates with the approved school/project calendar.  
**Last updated:** 2026-08-23  
**Owner:** ReaDirect project team

This document provides a visual project schedule for ReaDirect V2. It is written
in Markdown with a Mermaid Gantt chart so it can be previewed in GitHub,
GitLab, VS Code, or any Markdown viewer that supports Mermaid.

## Gantt chart

```mermaid
gantt
    title ReaDirect V2 project schedule
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d
    excludes    weekends

    section Planning
    Requirements and scope                 :plan_scope, 2026-08-24, 5d
    Research instruments and success criteria :plan_research, after plan_scope, 5d
    Architecture and risk review           :plan_arch, after plan_research, 5d

    section Product design
    Learner and staff user flows            :design_flows, after plan_arch, 5d
    Responsive UI and visual system         :design_ui, after design_flows, 10d
    Accessibility review                    :design_a11y, after design_ui, 5d

    section Core implementation
    API, authentication, and database       :impl_api, after design_flows, 15d
    Diagnostic and final assessments        :impl_assessments, after impl_api, 10d
    Learn with Clara lessons                :impl_clara, after impl_assessments, 10d
    ASR, TTS, and speech recovery           :impl_speech, after impl_api, 15d
    Games and learner persistence            :impl_games, after impl_clara, 15d
    Capacitor Android shell                 :impl_android, after design_ui, 10d
    Offline practice and local storage      :impl_offline, after impl_android, 10d
    Daily reading notifications             :impl_notifications, after impl_android, 5d

    section Verification
    Unit and integration tests              :qa_tests, after impl_assessments, 10d
    Browser and responsive viewport checks  :qa_browser, after design_a11y, 10d
    Android device and permission testing   :qa_android, after impl_notifications, 10d
    Security and data-protection review     :qa_security, after impl_speech, 5d
    Pilot/UAT and defect correction         :qa_pilot, after qa_tests, 15d

    section Release and evaluation
    Release candidate and store checklist  :release_candidate, after qa_pilot, 5d
    Production release and monitoring      :milestone, release, after release_candidate, 1d
    Documentation and handoff              :release_docs, after release_candidate, 10d
    Post-release review                    :release_review, after release_docs, 5d
```

## Schedule legend

| Marker | Meaning |
| --- | --- |
| `plan_*` | Planning and research tasks |
| `design_*` | UX, visual design, accessibility, and interaction decisions |
| `impl_*` | Application, API, database, mobile, and service implementation |
| `qa_*` | Automated, browser, device, security, and pilot verification |
| `release_*` | Release, handoff, monitoring, and evaluation |
| `milestone` | A release event rather than a multi-day task |

## Deliverables by phase

| Phase | Primary deliverable | Acceptance evidence |
| --- | --- | --- |
| Planning | Approved scope, requirements, risks, and success criteria | Signed scope or approved issue set |
| Product design | Learner/staff flows and responsive UI decisions | Design review and accessibility checklist |
| Core implementation | Working web/mobile features, API contracts, and persistence | Typecheck, unit tests, and feature tests |
| Verification | Regression, responsive, Android, security, and pilot results | Test reports with pass/fail evidence |
| Release | Build artifact, store checklist, monitoring, and rollback notes | Release approval and deployment record |
| Evaluation | Updated technical and research documentation | Final report and stakeholder sign-off |

## How to update the chart

1. Replace the draft dates in the Mermaid block with the approved dates.
2. Keep task IDs stable (`plan_scope`, `impl_api`, and so on) so links and reviews remain easy to follow.
3. Add `done` before a task ID when a task is complete, for example:

   ```text
   Requirements and scope :done, plan_scope, 2026-08-24, 5d
   ```

4. Use `after <task-id>` when a task should begin after another task instead of hard-coding a date.
5. Record major changes in the revision history below.

## Revision history

| Date | Change | Owner |
| --- | --- | --- |
| 2026-08-23 | Created the draft ReaDirect V2 Gantt schedule. | ReaDirect project team |

