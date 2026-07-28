# ReaDirect Revamp Frontend Design System

Purpose: define the visual language, reusable frontend surfaces, typography,
buttons, responsive behavior, and reference component patterns for ReaDirect-V2.

This guide applies to learner-facing React interfaces. Staff dashboards may use
denser tables, controls, and the documented professional font exception, but
they must reuse the same semantic tokens, focus treatment, and component
foundations.

This guide complements:

- `READIRECT_REVAMP_TECH_STACK.md`
- `READIRECT_REVAMP_PROJECT_STRUCTURE.md`
- `READIRECT_REVAMP_VIEWPORT_STANDARD.md`
- `READIRECT_REVAMP_MAIN_TRANSITION_STANDARD.md`
- `READIRECT_REVAMP_LESSON_AND_ASSESSMENT_INTERACTION_STANDARD.md`
- `READIRECT_REVAMP_RESULTS_AND_COMPLETION_PRESENTATION_STANDARD.md`
- `READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`

It does not define assessment scoring, audio processing, backend behavior, or
lesson-routing rules.

## Top Rule: Shared Components First

Shared components must be used as much as possible. New pages should primarily
compose established design-system components instead of recreating containers,
buttons, page shells, typography, icons, feedback surfaces, or interaction
patterns locally.

- Search the existing shared component packages and feature foundations before
  creating new markup or styles.
- Extend an existing component through typed variants, sizes, slots, or props
  when the requested design remains part of the same component family.
- Do not copy and paste component markup or CSS between pages. Repeated visual
  or behavioral patterns must be extracted into a shared component.
- Page components should own page composition and page-specific content;
  reusable appearance, states, accessibility, and responsive behavior belong
  in shared components.
- A page-local component is acceptable only when it is genuinely unique or its
  reusable API is not yet understood. Once a second use appears, or a clear
  cross-page role is established, promote it to the appropriate shared package.
- Shared components must consume the design tokens and viewport rules in this
  guide so fixes and future theme changes propagate throughout the system.

### Lesson item-panel accessory

Lesson pages use one shared practice-journal accessory in the upper-right of
the item panel. It is a small rounded-square vector button with solid fake
depth, a circular-practice icon, and an optional count badge. It must not be
placed in the lesson header or duplicated inside keyed item animation content.

The accessory opens an overlay rather than expanding the item panel:

- Mobile uses a bottom sheet.
- Wider viewports use a right-side dialog.
- The page behind it does not scroll or reflow.
- Only the contained history list may scroll.
- Every color comes from design tokens.
- Opening observes the standard button commit interval.
- The button is unavailable during speech preparation, Clara speech,
  recording, and playback.

## Approved Frontend Foundation

The design system must be implemented with the approved frontend stack:

- React and TypeScript for typed, reusable components.
- Tailwind CSS Core for layout, responsive rules, and utility styling.
- Motion for React for short, purposeful transitions.
- SVG for interface icons and simple visual indicators.
- The `packages/design-tokens` package for shared visual constants.
- Vitest and React Testing Library for component tests.
- Playwright for responsive and screenshot validation.

Do not add a component library, CSS-in-JS library, icon package, class-name
package, or animation package without approval.

## Design Direction

ReaDirect uses a warm, friendly, oversized, vector-like, and tactile game
interface. It should feel welcoming to children without looking crowded,
noisy, or babyish.

The main design characteristics are:

- Warm cream page backgrounds instead of harsh white backgrounds.
- Off-white panels with soft warm borders.
- Dark navy text for a calm, dependable visual anchor.
- Orange as the main action color.
- Large rounded containers and pill-shaped controls.
- Large Jersey 20 pixel typography for learner headings, interface text, and
  button labels.
- Solid offset depth that makes containers and buttons feel game-like.
- One clear primary action in each learner panel.
- Generous whitespace between instructions and controls.
- Stable layouts that do not jump when labels or statuses change.

The interface must emphasize **vector-like, game-like, big, and simple**. This
visual direction is mandatory, not an optional theme.

## Mandatory Vector Game Language

All learner-facing interface chrome must look as though it was constructed from
clean vector shapes. Game-like depth must come from deliberately offset solid
shapes, not from realistic lighting or photographic effects.

### Vector-like rules

- Use solid color fills only.
- Do not use CSS gradients or SVG linear, radial, or mesh gradients.
- Use CSS geometry and SVG for interface shapes whenever practical.
- Use clean silhouettes, consistent outlines, and clearly separated color
  regions.
- Use one main fill, one border color, and one darker depth color for a typical
  control.
- Create shading with separate solid-color shapes when additional definition is
  necessary.
- Keep corners rounded and mathematically consistent through radius tokens.
- Keep icons simple enough to remain recognizable at `24px`.
- Avoid photographic textures, metallic finishes, glass effects, gloss,
  reflections, noise overlays, and realistic bevels in interface chrome.
- Use optimized raster artwork only when an illustration cannot reasonably be
  represented as SVG; the surrounding interface must remain vector-like.

### Game-like depth rules

Primary learner buttons and main activity frames must have visible fake depth.
The depth is part of the component silhouette and is required even when the
screen is otherwise minimal.

- Build depth with a solid, hard-edged downward offset.
- Use a darker tone derived from the component fill or border.
- Use one consistent light direction: the visible depth falls downward.
- Main activity frame depth should normally be `6px` to `8px`.
- Primary button depth should normally be `6px` to `8px`.
- Secondary button depth should normally be `3px` to `4px`.
- Inner panels, notices, and quiet controls may remain flat when the enclosing
  frame already provides the required depth.
- Pressed buttons must move downward and reduce their visible depth to `1px` or
  `2px`.
- Disabled buttons must remove or greatly reduce the fake depth so that they no
  longer appear pressable.
- Do not combine the hard offset with a large blurred shadow.
- Do not use different shadow directions on the same screen.

The target appearance is a minimal vector game interface, not flat corporate
software and not realistic three-dimensional rendering.

### Pixel-game typography rules

Pixel typography is a mandatory part of the learner design language, not a
page-specific decoration.

- Jersey 20 is the default interface face from the Intro through Home, learner
  sign-in, dashboard, assessments, lessons, and Game Lobby. Game One is the
  documented route-scoped exception and uses the shared self-hosted Pixelify
  Sans face for its interface.
- Learner headings, buttons, badges, navigation, short instructions, and status
  labels use Jersey 20 through shared semantic font variables.
- Keep Jersey 20 deliberately large. Its minimum primary-button size is `30px`;
  reducing it to conventional dashboard sizes breaks the intended design.
- Use only one pixel family in a rendered route. Pixelify Sans is the local
  loading fallback outside Game One; inside Game One it is the sole interface
  pixel family and must not be mixed with Jersey 20.
- Authored reading content switches to Lexend so children evaluate clean
  letterforms rather than stylized pixel glyphs.
- Authenticated staff workspaces remain professional Lexend interfaces and do
  not inherit learner pixel typography.
- Font selection and scale must be applied through shared page scopes and
  tokens, never through page-local literal family names. The only current
  exception is Game One's `.game-route`-scoped `--game-ui-font` declaration,
  which is governed by the Game Integration Boundary Standard.

## Big And Simple Rules

For learner-facing screens:

1. Show one main task or decision at a time.
2. Use one visually dominant primary button per panel.
3. Prefer a few large controls over many small controls.
4. Keep instructions short and place them close to the related action.
5. Use large icons only when they reinforce a text label.
6. Keep critical labels visible; do not rely on tooltips or hover.
7. Do not shrink important text to fit more content.
8. Do not create more than two visually nested panel layers.
9. Keep learner prompt lines to approximately `28ch` to `42ch` where possible.
10. Preserve empty space around the main action so it remains easy to find.

Large elements must still have hierarchy. If every element is equally large,
the learner cannot tell what to do first.

## Mandatory Learner Background Readability

The themed learner background is decorative artwork. It must never become the
direct reading surface for required content.

- Required headings, instructions, identity information, progress, status,
  form labels, and controls must sit inside an opaque semantic `Frame`, `Panel`,
  `Notice`, or action surface.
- Transparent headers floating over illustrated backgrounds are prohibited.
  Learner dashboard identity headers and Game Lobby headers use solid panels.
- Background artwork may remain visible in gutters and deliberate empty space
  between containers, but not through the readable surface itself.
- Solve contrast with a solid vector surface and semantic colors. Do not use a
  blurred overlay, gradient, glass effect, text shadow, or translucent scrim to
  rescue unreadable text.
- Verify readability against both the mobile and desktop artwork for every
  theme. A clear area in one crop does not make direct-on-art text acceptable.
- Decorative text may appear outside a panel only when it is not required to
  understand, navigate, or complete the learner flow.

This rule applies to all learner routes, including future assessments and
lessons. The artwork supports the visual identity; containers carry the
information.

## Home About ReaDirect

Home provides a compact `About ReaDirect` trigger centered at the bottom of the
viewport. It is a supporting action, not a third primary navigation choice.
It therefore remains visually smaller and quieter than `Let's Read` and
`Staff login`, stays outside the main Home action group, and must not alter the
position or hierarchy of those two actions.

Activating the trigger opens the page-local `AboutReaDirectDialog`:

- The overlay uses `role="dialog"`, `aria-modal="true"`, and an accessible name.
- A visible close control receives initial focus. Escape and backdrop activation
  also close the dialog.
- The Home composition stays fixed behind the overlay and does not reflow.
- The dialog is centered, width-limited, and height-limited. Only its content
  region may scroll when the supplied institutional copy exceeds the viewport.
- The trigger remains horizontally centered at the bottom across supported Home
  viewport sizes and must not compete with or overlap the main actions.
- Long-form copy uses the reading family. Section labels, facts, controls, and
  team-card labels use the learner interface family.
- The development team appears as three consistent portrait cards containing
  only the person's professional photograph, name, and role. The cards remain
  in one row when the available width permits and retain readable wrapping on
  narrow phones.

The dialog owns the approved About, mission, vision, acknowledgments, research
information, development-team, and disclaimer copy. It must not introduce
learner progress, authentication, or navigation state. Its required institutional
facts are:

| Field | Required value |
|---|---|
| Research title | READIRECT: An AI-Based Oral Reading and Comprehension Learning Support Intervention Using Automatic Speech Recognition under the DepEd ARAL Program |
| Application | ReaDirect |
| Technology | Artificial Intelligence (AI) and Automatic Speech Recognition (ASR) |
| Institution | College of Computer Studies |
| Application version | Version 1.0 |

Acknowledgments identify Dr. Orlando T. Valverde, Chief, Curriculum
Implementation Division (CID), and Ms. Mia V. Villarica, DIT, Associate Dean,
College of Computer Studies, together with participating schools,
administrators, teachers, and learners. The team-card records are:

| Portrait | Name | Role |
|---|---|---|
| `jerick.png` | Jerick E. Mendez | Lead Developer |
| `nick.png` | Nick Narry S. Mendoza | Developer |
| `victor.jpg` | Victor P. De Mesa Jr. | Developer |

The disclaimer must state that ReaDirect is a research-based supplementary
learning support intervention and that its findings do not necessarily express
official Department of Education policy, position, or endorsement.

The implementation and contract test live at:

```text
apps/web/src/features/home/AboutReaDirectDialog.tsx
apps/web/tests/HomePage.test.tsx
```

## Learner Dashboard Action Hierarchy

The Learner Dashboard has one dominant primary-action slot above its secondary
content. It must be the first actionable element the learner notices after the
identity header.

The slot keeps the same large button size, visual weight, and responsive
position while the authenticated account's persisted progression changes its
action:

```text
Diagnostic Assessment
    -> Start Lesson <number or title>
    -> Continue Lesson <number or title> while a saved attempt is incomplete
    -> Final Assessment
```

The completed stage disappears instead of remaining as a competing button.
Layout must not jump when the primary action changes. Start Lesson and Continue
Lesson use the same primary component and geometry. Continue Lesson resumes the
latest persisted save state belonging to the authenticated learner or verified
guest rather than restarting the lesson.

The Games action is clearly visible but smaller and visually secondary. It must
not appear before, overlap, or compete with the required learning action.

The achievement holder follows the primary action and Games action. It remains
easy to discover, uses fixed badge positions, and shows locked silhouettes with
visible criteria. Supporting scores, progress, help, and other controls use
lower visual emphasis.

The achievement gallery, shared queued unlock overlay, slow-pop animation, and
acknowledgement behavior are defined by
`READIRECT_REVAMP_ACHIEVEMENT_SYSTEM_STANDARD.md`. Pages and games must compose
that shared feature instead of recreating it.

Reading Journey tiles must use the shared permanent pixel-icon mapping. Icons
render in a theme-variable fake-depth frame, retain crisp nearest-neighbor
pixels, use a muted grayscale treatment while locked, and show their full
artwork when earned. Unicode stars, emoji, and repeated placeholder artwork are
not permitted. The dashboard holder uses a fixed four-by-two recessed black
badge case; selecting one badge reveals its name, criterion, and earned state
in the compact detail strip below the grid.

## Professional Staff Workspace

Staff dashboards use a professional, clean extension of the ReaDirect visual
language. They must feel like the same product without reproducing the
oversized learner activity layout inside administrative tools.

The public Staff login page remains an entry surface and therefore keeps the
full vector-game treatment: themed background artwork, a layered frame and
panel, a large primary action, rounded controls, and visible solid fake depth.

After staff login, dashboards must retain these ReaDirect foundations:

- Semantic theme variables for every color and theme-controlled asset.
- Solid vector-like fills with no gradients, glass effects, or photographic
  interface texture.
- Lexend typography for dashboard content, forms, tables, and controls.
- Fredoka only for the ReaDirect brand and short high-level staff page titles.
- Jersey 20 is not used inside authenticated professional staff workspaces.
- Shared buttons, surfaces, fields, badges, focus treatment, and responsive
  foundations.
- The standard tactile button commit interval before navigation or major
  interface replacement.
- Clear warm accents, navy structure, rounded geometry, and accessible status
  colors.

System Administrator, School Administrator, and Teacher pages must compose the
same shared professional staff component family. The shared contracts are:

- `StaffShell`, `StaffWorkspacePage`, and `StaffPageHeader` for workspace
  framing, the shared System Administrator page rhythm, and identity.
- `StaffButton`, `StaffCard`, `StaffBadge`, `MetricCard`, and
  `StaffSectionHeader` for actions, surfaces, status, totals, and hierarchy.
- `StaffNotice` and `StaffState` for feedback, loading, error, and empty states.
- `StaffDataTable` for desktop data grids that become labeled stacked rows
  below the wide staff breakpoint.
- `StaffTextAreaField`, `StaffSearchField`, `StaffSelectControl`,
  `StaffCheckbox`, and `StaffFileField` for professional staff inputs.
- `StaffFactGrid`, `StaffContentGrid`, `StaffSelectionList`,
  `StaffSelectionButton`, and `StaffDisclosure` for repeated content patterns.

Role pages may own business copy, data selection, and genuinely unique feature
composition. They must not create `teacher-*` or `school-admin-*` visual
component systems, role-prefixed copies of shared containers, handcrafted
tables, or parallel button and status treatments. A repeated System
Administrator visual pattern must first become a shared staff component, then
be consumed unchanged by all staff roles that need it.

`StaffWorkspacePage` owns the vertical spacing between top-level dashboard
sections. Role dashboards must not recreate that rhythm with page-local margins
or allow adjacent cards, notices, metric grids, and content grids to collapse
together.

Professional dashboard adjustments are required:

- Use smaller radii, tighter spacing, and denser information layouts than
  learner activities.
- Keep tables, filters, charts, and ordinary data cards primarily flat.
- Limit solid fake depth to approximately `2px` to `3px` on data cards,
  navigation selection, and routine staff controls.
- Reserve stronger depth for the ReaDirect brand mark and genuinely primary
  actions.
- Use a persistent sidebar on desktop and a compact top header on mobile.
- Stack dashboard regions into one readable column on mobile; do not force
  desktop tables or panels into horizontal overflow.
- Use CSS or authored SVG for simple charts unless another approved technology
  is added to the technology stack.
- Keep motion short and functional. Do not add learner pointer trails, custom
  cursors, celebration effects, or continuous decorative animation.
- Do not place Ma'am Clara in a staff dashboard unless the project owner
  explicitly requests her for that page.
- Do not apply the ReaDirect Link Start Transition to staff navigation unless
  that route change is added to the transition standard's approved placement
  list.

The intended result is clean operational software with recognizable ReaDirect
geometry and color—not generic corporate software and not an oversized learner
game screen.

### School Administrator workspaces

- Keep the shared staff shell and use School management plus Review and
  reporting navigation groups. Every visible navigation item must resolve to
  an implemented protected route; do not show `Next` or `Later` placeholders.
- School Profile uses a two-panel identity-and-form layout. State that a rename
  changes display identity only and does not alter learner-flow evidence.
- Classes use a responsive assignment list and editor. Explain that a class is
  the existing Teacher grade-and-section assignment and distinguish account
  context changes from protected academic-flow records.
- The Learner directory becomes labeled stacked rows on narrow screens.
  Learner detail is read-only and summarizes persisted progression,
  assessments, ordered lessons, and evidence-based review flags.
- School reports preserve school, Teacher, grade, and section context in both
  screen and print layouts. Filtering and printing must not create report
  records or audit events.
- Instructional Insights is a dedicated Review and reporting route immediately
  above Reports in the sidebar. Keep its school summary, face-to-face teaching
  priorities, assessment skips, lesson signals, and class context in separate
  shared staff surfaces so the report workspace remains uncluttered.
- Every instructional priority displays its persisted affected-Learner and
  evidence counts. Use the API's deterministic wording; do not add browser-side
  scoring, AI conclusions, or controls that apply recommendations to Learners.
- Teacher Dashboard Review uses a Teacher picker beside the selected class
  overview at wide widths and stacks them on mobile. Keep a visible
  `No impersonation` boundary and provide no Teacher-only mutations.
- Overview activity displays only persisted school-scoped assessment records.
  Empty state copy must describe the absence of saved activity rather than a
  future implementation.

### Staff learner-detail workspace

The Teacher Learner Detail workspace uses the professional staff language:

- Keep identity and progression in compact shared surfaces near the top.
- Present Diagnostic and Final Assessment as separate peer summary cards.
- Keep the six required lessons in course order and use native expandable
  sections for dense item-level evidence.
- On mobile, assessment cards, lesson metrics, item facts, attempts, and
  recommendations stack into the normal page column. Do not require horizontal
  table scrolling.
- Use compact status pills, flat evidence regions, semantic feedback colors,
  and no more than `2px` to `3px` of solid card depth.
- Final transcripts and incorrect attempts remain readable text. Do not hide
  required evidence behind hover or color alone.
- Recommendations must state their persisted evidence source. Do not add
  speculative charts, scores, labels, or AI-generated learner conclusions.
- The page remains read-only. Editing and account-management actions do not
  share the progress-review surface.

### Teacher learner password reset

Password reset is an account action in the Teacher Learner directory:

- Keep `View progress` and `Reset password` as distinct row actions. Reset
  never appears in the read-only Learner Detail workspace.
- Opening reset shows an inline warning surface naming the Learner. Require
  separate Cancel and Confirm actions, and state both effects: existing
  sessions are signed out and learning progress is preserved.
- Show the replacement Learner Code and password only in the successful
  one-time credential surface. Use the same credential presentation as account
  creation, label the password as new, and provide an explicit
  `Credentials saved` dismissal.
- Use warning tokens for confirmation, success tokens for returned
  credentials, shared surfaces and buttons, and the normal `2px` to `3px`
  staff depth cue. Do not introduce a modal, raw colors, or decorative motion.
- Stack confirmation actions and directory row actions on narrow screens.
  Align confirmation content and actions at the standard `48rem` breakpoint;
  retain the staff table-to-labeled-card behavior without horizontal scrolling.

### Teacher Learner import

- Use a dedicated Teacher route with the shared staff shell, page header,
  surfaces, buttons, and class context.
- Provide a downloadable fixed-column CSV template, file selection, validation
  feedback, and a bounded roster preview before the import action.
- State that import is all-or-nothing and that school, grade, and section are
  inherited rather than editable.
- Present returned codes and passwords in a success surface only after the
  server commits the roster. The surface must explain that passwords are shown
  once and provide an explicit dismissal.
- Stack controls and credential rows on mobile. Use a two-panel import layout
  and aligned credential columns only when sufficient width is available.

### Teacher credential sheets

- List active assigned Learners with native checkboxes, a select-all control,
  and a visible selection count. Do not allow more than 50 per sheet.
- Require an inline confirmation that explains password replacement, session
  revocation, and preservation of learning progress.
- After issuance, replace selection controls with a one-time credential sheet.
  Provide Print and `Credentials saved` actions.
- The print stylesheet hides staff navigation, controls, and unrelated page
  content. Credential cards remain legible in a two-column paper grid and avoid
  page breaks within one Learner's card.

### Teacher overview activity

The Teacher Dashboard recent-progress surface uses a compact vertical activity
list:

- Show the Learner name and code, persisted activity title, completion state,
  and saved activity time.
- Use compact semantic status pills and one shared secondary Review action.
- The Review action opens the existing read-only Learner Detail workspace.
- Stack activity facts and the Review action on mobile, then align the action
  beside the facts at the standard `48rem` breakpoint.
- Show an honest empty state when no persisted activity exists. Do not create
  sample events, inferred activity, or decorative trend values.

### Teacher assessment review directory

The Teacher Diagnostic and Final Assessment directories use one shared
responsive evidence table:

- Start with compact status totals, then list the latest persisted result for
  each assigned Learner.
- On mobile, render each row as labeled facts without horizontal scrolling. At
  medium widths use a two-column fact card, and switch to the full table header
  only when the staff content region is wide enough.
- Keep pending, not-ready, ready, in-progress, and completed states
  text-labeled and supported by semantic status colors. Diagnostic uses
  pending; Final uses not-ready and ready to preserve progression meaning.
- Missing score and profile fields say `Not available`; they are never replaced
  by estimates or placeholder analytics.
- Use one shared secondary action to open the existing Learner Detail
  workspace. Do not place editing or assessment-reset actions in this
  directory.

### Teacher class progress report

- Lead with five persisted summary counts and follow with one responsive
  Learner report table.
- On narrow screens, rows become labeled two-column facts with a full-width
  Review action. Use the full header and seven-column layout only at wide staff
  content widths.
- Display missing assessment scores and profiles explicitly. Review evidence
  means saved skips or saved lesson review flags, never an inferred concern.
- Provide name/code search and a print action. The print view hides navigation,
  search, and row actions while preserving class context, summary, and data
  rows.

### Teacher class analytics

- Use compact evidence cards with the persisted count and its recorded-item
  denominator. Never present a percentage without its source count.
- Present the six required lessons in order with native meters for completed
  Learners and explicit started, recorded-item, independent, supported, and
  review values.
- Keep unscorable audio and technical retries visually and semantically
  separate from not-yet-correct learning outcomes.
- Label recurring diagnosis keys as saved evidence counts and include copy
  stating that they are not conclusions about a Learner.
- Stack cards and lesson facts on mobile; use four evidence columns and the
  two-panel lesson/diagnosis layout only when sufficient width is available.

### Teacher audio review

- Use a responsive queue-and-editor layout inside the shared staff shell. Stack
  the queue above the editor on narrow screens; use two columns only when both
  the recording identity and form controls remain readable.
- Lead with a persistent notice that a review is a staff annotation and does
  not overwrite the original transcript, decision, score, progression, or
  Learner experience.
- Present canonical transcript and decision in a distinct read-only evidence
  block. Keep the reviewed transcript, reviewed decision, and optional note in
  the staff annotation form below it.
- Load recording bytes only after an explicit action through the authenticated
  staff client. Do not expose private paths or place a reusable public media URL
  in page data.
- Label saves as staff-only reviews and confirm after success that canonical
  Learner records were not changed. Do not describe the control as rescoring,
  correction, remediation, or an AI recommendation.

## Typography

### Font families

Jersey 20 is the canonical default font for the learner experience. Its large,
blocky pixel forms reinforce the vector-game language and remain visible on
small screens. The approved roles are:

- **Jersey 20** for the Intro, Home, learner sign-in, learner dashboard,
  learner-facing navigation, Game Lobby, headings, short prompts, badges,
  support labels, and button labels outside Game One.
- **Lexend** for authored letters, words, phrases, sentences, passages,
  comprehension text, longer instructions, form-heavy staff content, tables,
  and dense professional interfaces.
- **Fredoka** only for the ReaDirect brand and short high-level titles inside
  the professional staff workspace.
- **Pixelify Sans** as Game One's route-scoped interface face and as the first
  local fallback if Jersey 20 cannot load elsewhere.
- `ui-monospace`, `ui-rounded`, `system-ui`, and `sans-serif` only as final
  platform fallbacks appropriate to the role.

Jersey 20 is provided as one regular face. Do not depend on unavailable Jersey
20 weight variants or synthetic bolding. Establish learner hierarchy through
the approved size tokens, color, spacing, and component depth. Lexend remains
mandatory wherever letterform clarity and sustained reading are more important
than interface personality.

The approved families are available in the Google Fonts repository under the
SIL Open Font License 1.1:

- <https://github.com/google/fonts/tree/main/ofl/jersey20>
- <https://github.com/google/fonts/tree/main/ofl/pixelifysans>
- <https://github.com/google/fonts/tree/main/ofl/lexend>
- <https://github.com/google/fonts/tree/main/ofl/fredoka>

Font files must be self-hosted. Runtime pages must not depend on a third-party
font CDN.

Font families and the learner type scale are semantic variables owned by
`packages/design-tokens`. Components must use `--font-pixel-family`,
`--font-display-family`, `--font-reading-family`, `--font-interface-family`, and
the approved type-scale variables. Literal family stacks are allowed only in
the token definition, required `@font-face` declarations, and Game One's
documented `.game-route`-scoped `--game-ui-font` exception.

The shared `learner-typography-page` scope applies the learner family and scale
without adding a background. The Intro uses this scope. The shared
`learner-flow-page` scope applies the same typography plus the themed responsive
background. Home, learner sign-in, learner dashboards, assessments, lessons,
the Game Lobby, and learner game routes use `learner-flow-page`. Page-local CSS
must not redefine the default learner font stack except for Game One's approved
route-scoped Pixelify Sans override.

Store browser-ready files in:

```text
apps/web/public/assets/fonts/
|-- jersey-20-regular.woff2
|-- jersey-20-OFL.txt
|-- pixelify-sans-variable.woff2
|-- pixelify-sans-OFL.txt
|-- lexend-variable.woff2
\-- fredoka-variable.woff2
```

The current Jersey 20 and Pixelify Sans OFL records live beside their
browser-ready files. If original font packages are archived later, keep them
under `assets/fonts/` and do not load those source packages at runtime.

### Font loading reference

```css
@font-face {
  font-family: "Jersey 20";
  src: url("/assets/fonts/jersey-20-regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

@font-face {
  font-family: "Pixelify Sans";
  src: url("/assets/fonts/pixelify-sans-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}

/* Lexend and Fredoka remain self-hosted for their approved exception roles. */
```

Preload Jersey 20 on learner entry routes when font preloading is used. Preload
only the font files needed above the fold. Avoid loading separate files for many
weights when a validated variable font is available.

### Type scale

Learner typography uses deliberately oversized fluid sizes:

| Token            | Mobile size | Large-screen size | Default learner font | Intended use                          |
| ---------------- | ----------: | ----------------: | -------------------- | ------------------------------------- |
| `display`        |        48px |              68px | Jersey 20 400        | Celebration or major lesson title     |
| `page-title`     |        40px |              52px | Jersey 20 400        | Screen title                          |
| `panel-title`    |        32px |              40px | Jersey 20 400        | Main panel heading                    |
| `learner-prompt` |        28px |              34px | Jersey 20 400        | Short task prompt                     |
| `button-large`   |        30px |              36px | Jersey 20 400        | Primary learner action                |
| `body-large`     |        24px |              27px | Jersey 20 400        | Short learner instruction or control  |
| `body`           |        21px |              24px | Jersey 20 400        | General learner interface content     |
| `support`        |        18px |              20px | Jersey 20 400        | Noncritical learner interface support |

Authored reading material uses the corresponding approved size token but
switches to `--font-reading-family`. The font-family exception must not reduce
the font size.

Critical instructions must never use the `support` size.

Recommended fluid values:

```css
.learner-typography-page,
.learner-flow-page {
  --font-display-family: var(--font-pixel-family);
  --font-interface-family: var(--font-pixel-family);
  --font-display: clamp(3rem, 2.35rem + 2.7vw, 4.25rem);
  --font-page-title: clamp(2.5rem, 2.05rem + 1.7vw, 3.25rem);
  --font-panel-title: clamp(2rem, 1.78rem + 0.95vw, 2.5rem);
  --font-learner-prompt: clamp(1.75rem, 1.55rem + 0.75vw, 2.125rem);
  --font-button-large: clamp(1.875rem, 1.65rem + 0.85vw, 2.25rem);
  --font-body-large: clamp(1.5rem, 1.36rem + 0.5vw, 1.6875rem);
  --font-body: clamp(1.3125rem, 1.2rem + 0.4vw, 1.5rem);
  --font-support: clamp(1.125rem, 1.04rem + 0.3vw, 1.25rem);
  font-family: var(--font-interface-family);
}
```

### Typography rules

- Use sentence case for buttons and headings.
- Jersey 20 is the default on every learner-facing interface, including Intro,
  except for the documented Game One route.
- Do not replace Jersey 20 page by page or hard-code a learner font family.
  Game One alone may declare its approved Pixelify Sans stack through
  `.game-route`'s `--game-ui-font`.
- Use Lexend for authored reading targets, passages, comprehension content,
  sustained instructions, and authenticated staff workspace content.
- Do not use the pixel face as a reason to reduce the approved learner sizes.
- Do not simulate unavailable Jersey 20 weights.
- Do not write long instructions in all caps.
- Use all caps only for very short status badges when useful.
- Use a minimum body line height of `1.5`.
- Use heading line heights between `1.1` and `1.25`.
- Avoid very tight letter spacing in learner content.
- Keep text left-aligned unless a short prompt is intentionally centered.
- Never place important text directly over a detailed illustration.
- Do not justify passages.
- Lesson 5's fixed 50-word continuous passage is the only authored-reading
  fitting exception: measure its real text area and fit Lexend from `16px` to
  `23px`. Keep its recorder row protected; never flatten the recorder, paginate
  the passage, or add an internal scrollbar to make the composition fit.

## Design Tokens

Tokens must use semantic names. Components should reference roles such as
`action-primary` or `surface-panel`, not raw color names such as `orange-500`.

### Mandatory theme-ready visual rule

Every frontend color must come from a semantic CSS custom property. This is a
hard architectural rule so that future themes can replace the palette without
rewriting components.

- Literal color values may appear only inside theme-definition files or an
  explicitly fixed cross-theme effect token file in `packages/design-tokens/`.
- Component CSS, Tailwind class strings, TypeScript, TSX, canvas code, WebGL
  code, and authored SVG must not contain hex, RGB, HSL, named-color, or raw
  transparent color values.
- Components must consume variables such as `var(--color-surface-panel)` and
  must not use raw Tailwind palette utilities such as `bg-white`, `text-black`,
  or `bg-orange-500`.
- State colors for hover, focus, active, disabled, success, warning, and error
  must each use semantic variables.
- Do not add literal fallback colors such as
  `var(--color-surface-panel, #ffffff)`. A missing required token must be fixed
  in the active theme.
- Canvas and WebGL renderers must resolve their colors from CSS variables at
  runtime. They must not duplicate theme values in JavaScript or TypeScript.
- `currentColor` is allowed for SVG only when the inherited `color` ultimately
  comes from a semantic variable.
- Transparency must use `--color-transparent` or a purpose-specific semantic
  variable rather than the literal `transparent` keyword in components.
- A theme change must update every theme-controlled visible color, including
  custom cursors, particle effects, loading indicators, and theme-aware
  character overrides. Documented fixed visual identities such as the Link
  Start palette and unavailable-button palette are the only exceptions and
  must live in `effects.css`.
- Theme-specific artwork must also come from semantic CSS custom properties.
  Responsive background pairs use separate mobile and desktop asset tokens so
  that a theme can replace both compositions without editing page components.
- Page and component styles must reference asset roles such as
  `var(--asset-learner-flow-background-mobile)`, never a theme filename such as
  `T1mobile.png` directly.
- Every learner-facing route after the intentionally plain Intro screen must
  use the shared `learner-flow-page` background foundation. This includes Home,
  learner sign-in, the learner dashboard, assessments, lessons, the Game Lobby,
  and learner game routes. Page-local CSS must not replace it with a flat page
  color or duplicate its image-selection rules.
- The shared foundation uses the mobile background by default and switches to
  the desktop background at the standard `48rem` breakpoint. Future themes
  replace both learner-flow asset tokens together.

The canonical default theme is
`packages/design-tokens/src/colors.css`. Additional themes must provide the
same semantic variable names under a theme selector or stylesheet.

The following values are the starting palette. They may be tuned after visual
and contrast testing, but their semantic roles must remain stable.

```css
:root {
  /* Theme artwork */
  --asset-learner-flow-background-mobile: url("/assets/backgrounds/T1mobile.png");
  --asset-learner-flow-background-desktop: url("/assets/backgrounds/T1desktop.png");

  /* Font families */
  --font-pixel-family:
    "Jersey 20", "Pixelify Sans", "Courier New", ui-monospace, monospace;
  --font-display-family:
    "Fredoka", "Arial Rounded MT Bold", ui-rounded, system-ui, sans-serif;
  --font-reading-family: "Lexend", system-ui, sans-serif;
  --font-interface-family: var(--font-reading-family);

  /* Surfaces */
  --color-transparent: transparent;
  --color-surface-page: #f7efdc;
  --color-surface-frame: #f1e3c3;
  --color-surface-panel: #fffdf7;
  --color-surface-notice: #fff0e7;
  --color-surface-muted: #f4f2ec;

  /* Text */
  --color-text-primary: #102a43;
  --color-text-secondary: #40566d;
  --color-text-muted: #5c7084;
  --color-text-on-action: #ffffff;

  /* Borders */
  --color-border-warm: #dfc994;
  --color-border-soft: #ead9c8;
  --color-border-strong: #8f6b32;
  --color-frame-depth: #c9ae70;

  /* Actions */
  --color-action-primary: #c94712;
  --color-action-primary-hover: #b83d0d;
  --color-action-primary-pressed: #a73509;
  --color-action-primary-depth: #892b08;
  --color-action-secondary: #ffffff;
  --color-action-secondary-hover: #fff5ed;

  /* Feedback */
  --color-success: #247451;
  --color-success-soft: #e8f6ef;
  --color-warning: #9a5a00;
  --color-warning-soft: #fff4d6;
  --color-danger: #b42318;
  --color-danger-soft: #feeceb;
  --color-focus: #1769d2;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Shape */
  --radius-small: 0.75rem;
  --radius-control: 1rem;
  --radius-notice: 1.25rem;
  --radius-panel: 1.5rem;
  --radius-frame: 2rem;
  --radius-pill: 999px;

  /* Hard-edged vector game depth; blurred shadows are not used. */
  --shadow-panel-depth: 0 7px 0 var(--color-frame-depth);
  --shadow-button-depth: 0 7px 0 var(--color-action-primary-depth);
}
```

Color values must be checked in their real component combinations. Meeting a
contrast rule in isolation does not prove that overlays, disabled states, or
illustrated backgrounds remain readable.

## Container System

Containers organize the learner's attention. They must not be used merely to
decorate every group of elements.

### Container hierarchy

Use these container roles:

| Container      | Purpose                                 | Typical treatment                                              |
| -------------- | --------------------------------------- | -------------------------------------------------------------- |
| `PageShell`    | Viewport-safe page boundary             | Warm page background and responsive gutter                     |
| `Stage`        | Main activity width and alignment       | Transparent, centered, maximum width                           |
| `Frame`        | Required main learner activity boundary | Cream surface, warm border, large radius, solid downward depth |
| `Panel`        | Main readable content surface           | Off-white, soft border, panel radius                           |
| `Notice`       | Short instruction or requirement        | Soft tinted surface, smaller radius                            |
| `ControlGroup` | Related controls and status             | Layout only; usually no extra border                           |

A normal learner activity should use:

```text
PageShell
\-- Stage
    \-- Frame
        \-- Panel
            |-- Header
            |-- Notice
            \-- ControlGroup
```

Do not place a framed card inside another framed card unless the inner surface
has a distinct interaction purpose. Excessive nesting makes a simple screen
look complicated.

### Container sizing

- Page gutters: `12px` minimum at 360px, normally `16px` at 390px.
- Panel padding: `20px` on mobile, increasing to `28px` or `32px`.
- Gap between major panel sections: `20px` to `28px`.
- Learner activity maximum width: normally `560px` to `720px`.
- Wide lesson layouts may use a larger stage while keeping the activity panel
  readable.
- Do not assign a fixed height to content panels.
- Use `min-height` only when it stabilizes a known state transition.

### Page shell reference

```tsx
import type { PropsWithChildren } from "react";

export function PageShell({ children }: PropsWithChildren) {
  return (
    <main
      className="min-h-svh overflow-x-clip bg-[var(--color-surface-page)]
        pl-[max(0.75rem,env(safe-area-inset-left))]
        pr-[max(0.75rem,env(safe-area-inset-right))]
        pb-[max(1rem,env(safe-area-inset-bottom))]
        pt-[max(1rem,env(safe-area-inset-top))]
        sm:pl-[max(1.5rem,env(safe-area-inset-left))]
        sm:pr-[max(1.5rem,env(safe-area-inset-right))]
        lg:pl-[max(2rem,env(safe-area-inset-left))]
        lg:pr-[max(2rem,env(safe-area-inset-right))]"
    >
      {children}
    </main>
  );
}
```

### Typed surface reference

Keep complete Tailwind class names in static maps. Do not construct partial
class names such as `` `bg-${color}` `` because the build cannot reliably find
them.

```tsx
import type { HTMLAttributes, PropsWithChildren } from "react";

type SurfaceKind = "frame" | "panel" | "notice" | "muted";
type SurfacePadding = "none" | "compact" | "normal" | "roomy";

type SurfaceProps = PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & {
    kind?: SurfaceKind;
    padding?: SurfacePadding;
  }
>;

const surfaceClasses: Record<SurfaceKind, string> = {
  frame:
    "rounded-[var(--radius-frame)] border border-[var(--color-border-warm)] " +
    "bg-[var(--color-surface-frame)] shadow-[var(--shadow-panel-depth)]",
  panel:
    "rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] " +
    "bg-[var(--color-surface-panel)]",
  notice:
    "rounded-[var(--radius-notice)] border border-[var(--color-border-soft)] " +
    "bg-[var(--color-surface-notice)]",
  muted: "rounded-[var(--radius-control)] bg-[var(--color-surface-muted)]",
};

const paddingClasses: Record<SurfacePadding, string> = {
  none: "",
  compact: "p-3 sm:p-4",
  normal: "p-5 sm:p-6",
  roomy: "p-5 sm:p-7 lg:p-8",
};

function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function Surface({
  kind = "panel",
  padding = "normal",
  className,
  children,
  ...props
}: SurfaceProps) {
  return (
    <div
      className={joinClasses(
        surfaceClasses[kind],
        paddingClasses[padding],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

The small `joinClasses` helper is sufficient for this pattern and avoids adding
an unapproved class-name dependency.

### Layered activity container reference

```tsx
export function ActivityContainer({ children }: React.PropsWithChildren) {
  return (
    <div className="mx-auto w-full max-w-[35rem]">
      <Surface kind="frame" padding="compact">
        <Surface kind="panel" padding="roomy">
          {children}
        </Surface>
      </Surface>
    </div>
  );
}
```

On a small mobile screen, the frame must become thinner through its compact
padding. The visual frame must not consume space needed by the task.

## Button System

Buttons are the strongest interactive elements in the learner interface. They
must look obviously pressable before hover or focus occurs.

### Button hierarchy

#### Primary learner button

Use for the one main action in the current panel.

- Minimum height: `60px`; prefer `64px` for major actions.
- Minimum text size: `30px` using `--font-button-large`.
- Horizontal padding: at least `24px`.
- Icon size: normally `24px` to `28px`.
- Strong orange fill with a darker lower edge.
- Full width on small mobile when practical.
- Sentence-case, verb-first label such as `Start recording` or `Continue`.

#### Secondary button

Use for a safe alternative such as `Hear again` or `Try again`.

- Minimum height: `52px`.
- White or lightly tinted surface.
- Visible warm border.
- Dark navy label.
- Less depth than the primary action.

#### Quiet button

Use for optional or low-priority actions.

- Minimum touch target: `44px` by `44px`.
- Text label is preferred over an icon-only control.
- Must still show a visible keyboard focus ring.

#### Assessment Skip button

Use the shared `skip-vertical` variant only for a learner-selected assessment
skip before an answer is committed.

- The surface is fixed across themes through
  `--color-action-skip-surface: #FFFAFA`.
- Hover, pressed, border, and fake-shadow colors use the corresponding
  `--color-action-skip-*` variables and must never be hard-coded in a component.
- It remains visually secondary in the lower 20% of the assessment action
  dock before submission. Submit occupies the upper 80%; once committed, Skip
  disappears and the replacement Next expands to 100% of the action column.
- It retains the standard tactile commit animation and accessible focus ring.

Destructive buttons are normally staff-facing and must not visually resemble a
learner's positive primary action.

### Button states

Every button must define:

- Default.
- Hover for pointer users.
- Focus-visible.
- Pressed.
- Disabled.
- Busy when an operation takes time.

### Button press commit rule

Button activation must visibly complete its tactile press before its normal
function changes or replaces the current interface. A CSS `:active` state alone
is not sufficient because it ends as soon as the pointer is released.

- On activation, hold an explicit pressed or `committing` state that moves the
  button downward and compresses its fake depth.
- Normal button functions must wait for a short commit interval before running.
  Use approximately `180ms`, with an acceptable range of `160ms` to `220ms`.
- Navigation, route changes, modal replacement, and other immediate surface
  changes must not occur until the commit interval finishes.
- Block repeated activation while the button is committing. Expose this state
  accessibly through `disabled`, `aria-disabled`, or the component's busy state.
- When reduced motion is requested, remove the animation delay and execute the
  action immediately.
- Continuous controls, hold-to-act controls, and urgent safety actions are
  exempt when delaying their behavior would make the interaction incorrect.
- Component tests must verify that a screen-changing action does not run before
  its commit interval ends.

Pressed styling must move a tactile button down by approximately `4px` to `5px`
while reducing its solid lower depth. This creates the game-button press
illusion. Do not use large bounce effects.

Disabled controls must remain readable. Do not communicate the disabled state
through opacity alone. An unavailable primary action must use the shared
`unavailable` variant, which retains fixed muted structural depth but never
compresses or responds as a pressable control. Other disabled controls remove
their press shadow and use an appropriate cursor.

### Typed button reference

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "unavailable" | "secondary" | "quiet";
type ButtonSize = "regular" | "large";

interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  busy?: boolean;
  busyLabel?: string;
}

const baseButtonClass =
  "inline-flex max-w-full select-none items-center justify-center gap-3 " +
  "[font-family:var(--font-display-family)] font-bold leading-none " +
  "transition-[transform,box-shadow,background-color,border-color] " +
  "duration-150 ease-out focus-visible:outline-none focus-visible:ring-[3px] " +
  "focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-[var(--color-surface-panel)] " +
  "motion-reduce:transition-none disabled:cursor-not-allowed";

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-[var(--color-action-primary-depth)] " +
    "bg-[var(--color-action-primary)] text-[var(--color-text-on-action)] " +
    "shadow-[var(--shadow-button-depth)] hover:bg-[var(--color-action-primary-hover)] " +
    "active:translate-y-[5px] active:bg-[var(--color-action-primary-pressed)] " +
    "active:shadow-[0_2px_0_var(--color-action-primary-depth)] " +
    "disabled:translate-y-[5px] disabled:bg-[var(--color-text-muted)] " +
    "disabled:shadow-none",
  unavailable:
    "border border-[var(--color-button-unavailable-border)] " +
    "bg-[var(--color-button-unavailable-surface)] " +
    "text-[var(--color-button-unavailable-text)] " +
    "shadow-[0_8px_0_var(--color-button-unavailable-depth)]",
  secondary:
    "border-2 border-[var(--color-border-strong)] " +
    "bg-[var(--color-action-secondary)] text-[var(--color-text-primary)] " +
    "shadow-[0_4px_0_var(--color-border-warm)] " +
    "hover:bg-[var(--color-action-secondary-hover)] active:translate-y-[3px] " +
    "active:shadow-[0_1px_0_var(--color-border-warm)] disabled:shadow-none",
  quiet:
    "border border-[var(--color-transparent)] bg-[var(--color-transparent)] " +
    "text-[var(--color-text-primary)] " +
    "hover:bg-[var(--color-surface-muted)] active:bg-[var(--color-surface-notice)]",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  regular:
    "min-h-[3.25rem] rounded-[var(--radius-control)] px-5 py-3 text-base",
  large:
    "min-h-16 rounded-[var(--radius-pill)] px-6 py-4 " +
    "text-[length:var(--font-button-large)] sm:px-8",
};

function joinClasses(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function BigButton({
  variant = "primary",
  size = "large",
  leadingIcon,
  busy = false,
  busyLabel = "Please wait",
  disabled,
  className,
  children,
  type = "button",
  ...props
}: BigButtonProps) {
  const isDisabled = disabled || busy;

  return (
    <button
      type={type}
      className={joinClasses(
        baseButtonClass,
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        className,
      )}
      disabled={isDisabled}
      aria-busy={busy || undefined}
      {...props}
    >
      {leadingIcon ? (
        <span
          className="grid size-7 shrink-0 place-items-center"
          aria-hidden="true"
        >
          {leadingIcon}
        </span>
      ) : null}
      <span>{busy ? busyLabel : children}</span>
    </button>
  );
}
```

The button uses native HTML behavior. A custom `div` with a click handler is not
an acceptable substitute for a button.

`variant="unavailable"` is intrinsically disabled. It represents a primary
action that is visible but cannot yet be performed; callers must not use the
variant on an interactive button. Its colors are fixed across themes through
these roles in `packages/design-tokens/src/effects.css`:

```css
--color-button-unavailable-surface
--color-button-unavailable-border
--color-button-unavailable-depth
--color-button-unavailable-text
```

The busy label must be chosen so that the button does not change width
dramatically. In a fixed action row, reserve enough space for the longest
expected label.

### Button usage reference

```tsx
<div className="grid gap-4 min-[30rem]:grid-cols-[minmax(0,1fr)_auto]">
  <BigButton className="w-full" leadingIcon={<MicrophoneIcon />}>
    Start recording
  </BigButton>

  <BigButton variant="secondary" size="regular">
    Hear again
  </BigButton>
</div>
```

At widths below `30rem`, the actions stack. The main action remains first and
full width.

## Notices, Badges, And Supporting UI

### Notice containers

Use notices for short requirements, hints, or feedback that must be seen before
an action.

- Use one short sentence.
- Use at least `16px` text; prefer `18px` for learner instructions.
- Use a soft tinted background rather than a strong filled alert.
- Keep a notice visually smaller than the primary action.
- Do not use a notice as a replacement for an error message attached to a
  specific field.

### Status badges

Status badges are compact and informational.

- Minimum height: `36px` for learner screens.
- Use a pill shape.
- Use short labels such as `Ready`, `Listening`, or `Done`.
- Do not make badges look like buttons.
- Do not put essential instructions only inside a badge.

### Keyboard hints

Keyboard shortcuts may be displayed as optional help for keyboard users, but a
learner must never need the shortcut to complete the activity.

Use a `kbd` element for the key cap:

```tsx
<p className="[font-family:var(--font-reading-family)] text-base text-[var(--color-text-secondary)]">
  Press{" "}
  <kbd className="rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-action-secondary)] px-2 py-1 font-semibold text-[var(--color-action-primary)] shadow-[0_2px_0_var(--color-border-warm)]">
    Space
  </kbd>{" "}
  to record.
</p>
```

On touch-first layouts, a short tap instruction is more useful than repeating a
keyboard shortcut.

## Reference Learner Panel

The following example demonstrates the intended visual composition. It is a
presentational reference and does not define recording behavior.

```tsx
export function RecordingPanelView() {
  return (
    <PageShell>
      <div className="mx-auto grid min-h-[calc(100svh-2rem)] w-full max-w-[35rem] place-items-center">
        <Surface kind="frame" padding="compact" className="w-full">
          <Surface kind="panel" padding="roomy">
            <div className="grid gap-6">
              <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                <div className="min-w-0">
                  <h1 className="[font-family:var(--font-display-family)] text-[length:var(--font-panel-title)] font-bold leading-tight text-[var(--color-text-primary)]">
                    My audio
                  </h1>
                  <p className="mt-2 max-w-[38ch] [font-family:var(--font-reading-family)] text-[length:var(--font-body)] leading-relaxed text-[var(--color-text-secondary)]">
                    Tap Start recording. Record for at least 0.5 seconds.
                  </p>
                </div>

                <span className="inline-flex min-h-9 items-center rounded-[var(--radius-pill)] border border-[var(--color-action-primary)] px-4 [font-family:var(--font-display-family)] text-sm font-bold text-[var(--color-action-primary)]">
                  Ready
                </span>
              </header>

              <Surface kind="notice" padding="compact">
                <p className="text-center [font-family:var(--font-display-family)] text-[length:var(--font-learner-prompt)] font-semibold leading-snug text-[var(--color-text-primary)]">
                  Minimum 0.5 seconds for transcription.
                </p>
              </Surface>

              <div className="grid gap-4 min-[30rem]:grid-cols-[minmax(0,1fr)_10rem] min-[30rem]:items-center">
                <BigButton className="w-full" leadingIcon={<MicrophoneIcon />}>
                  Start recording
                </BigButton>

                <Surface
                  kind="muted"
                  padding="compact"
                  className="grid min-h-14 place-items-center"
                  role="img"
                  aria-label="Audio activity"
                >
                  <AudioActivityGraphic />
                </Surface>
              </div>

              <p className="min-h-7 pl-0 text-center [font-family:var(--font-reading-family)] text-base font-semibold text-[var(--color-text-muted)] min-[30rem]:pl-8 min-[30rem]:text-left">
                0s
              </p>

              <Surface kind="notice" padding="compact">
                <p className="[font-family:var(--font-reading-family)] text-base font-medium text-[var(--color-text-secondary)]">
                  Tap the large orange button to begin.
                </p>
              </Surface>
            </div>
          </Surface>
        </Surface>
      </div>
    </PageShell>
  );
}
```

Important structural decisions in this example:

- The outer frame and inner panel are separate reusable surfaces.
- The header has a flexible text column and a content-sized badge column.
- The notice has its own semantic surface instead of being simulated with
  margins on a paragraph.
- The control row stacks on narrow screens and becomes two columns only when
  enough space exists.
- The main button is full width within its column.
- The timer has reserved height so its appearance does not shift the panel.
- The panel uses content-driven height rather than a fixed mockup height.

## Mandatory Live2D Character View

Ma'am Clara's canonical model, crop, asset, and runtime requirements are
defined in `READIRECT_REVAMP_CLARA_LIVE2D_SPECIFICATION.md`. That specification
takes precedence for every Ma'am Clara implementation.

Every learner-facing Live2D character view must use a consistent passport-style
composition. This is a hard visual and structural rule for the frontend, not a
page-level preference.

- The character viewport must always use a `1 / 1` square aspect ratio.
- Frame the character like a passport portrait: keep the face, hair, shoulders,
  and upper torso visible as the main composition.
- Keep the face centered horizontally and within the upper-middle portion of
  the square.
- Do not default to a distant full-body view or allow large unused areas below
  the character.
- Do not stretch or distort the model to fill the square. Scale and reposition
  the model while preserving its original proportions.
- Reserve enough internal safe space for normal hair, head, breathing, and
  expression movement without clipping.
- The fixed CSS loading reveal originates from the center of the model's
  canonical square viewport but must not resize, reposition, or replace that
  viewport, so the ready state causes no layout shift.
- Clara voice preparation must use the shared fixed-viewport TTS cube loader.
  It stays centered on the screen, dims the interface by 20%, blocks input,
  and fades away when the requested speech is ready.
- The Clara model wave/reveal always outranks the TTS loader. A page must never
  display both loaders at once; TTS may warm in parallel while its loader stays
  suppressed behind the model loader.
- Character stages must not include circular platforms, pedestals, ground
  ellipses, or similar decorations below the character.
- Keep the character background transparent or use the page's plain solid
  surface. Do not introduce gradients, scenery, or textured character frames.
- Size the square responsively with CSS. Never replace the square with a tall
  or wide character viewport at another breakpoint.
- Use the canonical `ClaraStage` runtime on every page containing Ma'am Clara.
  Its viewport-wide mouse/pen following and swipe-or-hold touch following are
  global character behavior, not page-specific effects. Ordinary mobile taps
  must not activate tracking.
- Pointer following may change only Clara's eye, head-angle, and slight
  body-angle parameters. It must never translate, scale, or reposition the
  stage, canvas, model matrix, or approved passport crop.

Reference structure:

```tsx
<figure className="aspect-square w-full max-w-[26rem] overflow-hidden">
  <canvas className="size-full" aria-hidden="true" />
  <figcaption className="sr-only">Ma'am Clara</figcaption>
</figure>
```

The model projection must provide the passport crop. Cropping the DOM container
alone is not sufficient if it cuts through the face, hair, or shoulders.

## Responsive Rules

The required primary implementation viewport remains `390 x 844`.

### Mobile base

- Use one content column.
- Use full-width primary actions.
- Keep page gutters between `12px` and `16px`.
- Reduce decorative frame padding before reducing content padding.
- Allow header badges to wrap below the title if text becomes crowded.
- Stack control groups when either column would become narrower than its
  content.
- Avoid fixed widths copied from desktop mockups.
- Avoid horizontal scrolling.

### Tablet enhancement

- Increase panel padding and whitespace.
- Allow related controls to share a row.
- Keep the task order identical to mobile.
- Do not fill the entire tablet width with a short prompt.

### Desktop enhancement

- Center short activity panels within a larger stage.
- Character and activity regions may be placed side by side.
- Do not enlarge a panel indefinitely; preserve readable line lengths.
- Do not introduce required hover-only controls.

### Responsive pattern

Use mobile styles by default and `min-width` enhancements:

```tsx
<section
  className="grid w-full grid-cols-1 gap-5
    md:grid-cols-[minmax(16rem,0.8fr)_minmax(22rem,1.2fr)]
    md:items-center md:gap-8
    lg:gap-12"
>
  <CharacterRegion />
  <ActivityContainer />
</section>
```

Avoid using JavaScript viewport checks for layout decisions that CSS can make.
This prevents duplicated responsive logic and reduces layout flicker.

## Motion And Feedback

Motion should confirm an action or state change. It must not compete with the
learning task.

Recommended limits:

- Button press: `100ms` to `160ms`.
- Badge or notice entrance: `140ms` to `220ms`.
- Panel transition: `180ms` to `260ms`.
- Celebration motion may last longer but must remain dismissible or finite.
- Do not use continuous floating motion on buttons.
- Do not animate large layout distances for routine state changes.
- Respect `prefers-reduced-motion`.

### Intro reveal sequence

The intro uses one fixed upper focal point so its elements do not jump as the
sequence advances. This anchor sits at the end of the top content region rather
than at the exact center of the viewport:

1. `ReaDirect` fades in at the intro's upper focal anchor.
2. The title remains stationary for `2000ms`.
3. The title moves upward by `80px` over `650ms` using the
   `[0.16, 1, 0.3, 1]` ease-out curve.
4. The shared primary button fades into the focal point vacated by the title.
5. The button remains disabled and outside the accessibility interaction flow
   until its reveal begins.

Do not animate the parent brand container. The title and action animate
independently over the same fixed grid cell. Ma'am Clara's stage also remains
positionally fixed and uses opacity-only entrance motion. With reduced motion,
show the final title and button positions immediately.

### Link-start route transition

The intro-to-home handoff uses the shared `LinkStartTransition`. It is inspired
by the sensation of entering a colorful light tunnel, but it must remain an
original ReaDirect implementation and follow the vector-like visual rules in
this guide.

`READIRECT_REVAMP_MAIN_TRANSITION_STANDARD.md` is the canonical specification
for its exact timing, cylinder generation, responsive density, route lifecycle,
fixed-palette contract, accessibility behavior, approved placements, and tests. This
section is only a design-system summary and must not override that standard.

- The pressed button must finish its `180ms` commit state before the route
  transition begins.
- The complete light-tunnel animation runs for `3000ms`. Its ignition, streak
  acceleration, cover, route swap, and reveal must be distributed across that
  duration; do not finish the visual effect early and leave an artificial wait.
- The tunnel must use a dense field of long, thick, round-ended rods rather
  than a sparse set of short speed lines. These rods remain moving and visible
  through most of the three-second sequence before the solid cover completes.
- Generate successive rod waves continuously at a fixed cadence so the tunnel
  never empties during the cover expansion. Do not limit the effect to a fixed
  number of waves. Rod rendering stops only on the frame where the solid cover
  has completely filled the viewport; rods must not disappear during a
  partially covered frame.
- Render flat, solid radial streaks with rounded ends from one stable vanishing
  point. Do not use gradients, photographic bloom, raster video, or blur
  filters.
- Use the fixed kaleidoscope cylinder palette: hot pink, citrus yellow,
  crimson, violet, coral, and pale reflective glass. Learner themes must not
  alter these colors.
- Expand a solid fixed-color cover from the vanishing point. Change routes
  only after that cover fills the viewport, then clear the cover to reveal the
  destination already mounted underneath.
- Preload the destination's responsive, theme-selected background while the
  source page is idle. Preload only the asset matching the active viewport.
- The transition must be a shared application-level overlay rather than
  page-local markup. It must survive the route change without remounting or
  flashing between page backgrounds.
- Canvas colors must be resolved from semantic CSS custom properties. Canvas
  rendering code must not contain literal colors.
- Use a deterministic streak field, cap canvas pixel density, and reduce the
  streak count on mobile. Rendering must stop when the one-shot transition
  finishes.
- The overlay must block repeated input while active, remain decorative to
  assistive technology, and transfer focus to the destination route after it
  clears.
- With reduced motion enabled, skip the light tunnel and navigate immediately.

Required semantic roles:

```css
--color-link-start-fixed-core
--color-link-start-fixed-cover
--color-link-start-fixed-prism-pink
--color-link-start-fixed-prism-yellow
--color-link-start-fixed-prism-crimson
--color-link-start-fixed-prism-violet
--color-link-start-fixed-prism-coral
--color-link-start-fixed-prism-glass
```

These values live in `packages/design-tokens/src/effects.css`, which must be
imported after every theme stylesheet. Theme files must not redeclare them.

The same fixed-token rule applies to the shared unavailable-button roles:

```css
--color-button-unavailable-surface
--color-button-unavailable-border
--color-button-unavailable-depth
--color-button-unavailable-text
```

Motion for React reference:

```tsx
import { motion, useReducedMotion } from "motion/react";

export function FeedbackNotice({ children }: React.PropsWithChildren) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
    >
      <Surface kind="notice" padding="normal">
        {children}
      </Surface>
    </motion.div>
  );
}
```

Do not wrap every container in `motion`. Only animate the element that
communicates the change.

## Icons And Illustrations

- Use SVG for interface icons.
- Use solid fills and strokes; gradients are prohibited.
- Use separate flat shapes when an icon needs highlights or darker areas.
- Keep icon stroke weight visually compatible with the rounded typography.
- Use `currentColor` so icons inherit button or text color.
- Decorative SVGs must use `aria-hidden="true"`.
- Meaningful icon-only controls require an accessible name.
- Do not mix unrelated filled, outlined, and cartoon icon styles on one screen.
- Learner buttons should normally include both an icon and a text label.
- Keep large illustrations outside the primary text reading area.

SVG component reference:

```tsx
export function MicrophoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3" />
    </svg>
  );
}
```

## Accessibility Requirements

- Use semantic HTML before adding ARIA.
- Maintain at least `44px` by `44px` touch targets; learner primary actions
  should be larger.
- Provide a visible focus indicator on every interactive control.
- Never rely on color alone for meaning.
- Never rely on hover for required information.
- Keep instructional text readable at 200% zoom.
- Use native buttons, links, inputs, headings, lists, and landmarks.
- Ensure status changes have an appropriate accessible announcement when
  implemented.
- Do not announce rapidly changing decorative values on every visual update.
- Validate normal, hover, focus, pressed, disabled, and feedback contrast.
- Respect reduced motion.
- Keep required controls reachable without precise pointer input.

## Content Rules

Learner-facing copy must be:

- Short.
- Direct.
- Positive.
- Verb-first for actions.
- Free from technical terms where possible.
- Consistent across screens.

Preferred:

```text
Start recording
Try again
Hear the word
Choose an answer
Great job!
```

Avoid:

```text
Initiate audio capture
Submit response payload
Invalid input detected
Click here to continue
```

Do not place several instructions in one paragraph. Divide a complex activity
into sequential learner steps.

## Component Organization

Shared primitives belong in a stable design-system area. Feature composition
belongs with the feature.

```text
apps/web/src/
|-- components/
|   \-- ui/
|       |-- BigButton.tsx
|       |-- PageShell.tsx
|       |-- Surface.tsx
|       |-- StatusBadge.tsx
|       \-- FeedbackNotice.tsx
|-- features/
|   \-- recording/
|       |-- components/
|       |   |-- RecordingPanelView.tsx
|       |   |-- AudioActivityGraphic.tsx
|       |   \-- InteractionHint.tsx
|       \-- recording.types.ts
\-- styles/
    |-- fonts.css
    \-- theme.css
```

Rules:

- A shared UI component must not contain assessment or lesson-specific text.
- Feature components may compose shared primitives and provide feature labels.
- Do not turn every wrapper into a React component.
- Create a shared component when it has a stable visual contract and is reused
  or clearly intended for reuse.
- Prefer explicit variants over unrestricted styling flags.
- Keep complete Tailwind classes in source code so they are discoverable.
- Avoid accepting raw color names as component props.

## Testing Reference

### Component behavior

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("BigButton", () => {
  it("uses a native button and exposes its label", () => {
    render(<BigButton>Continue</BigButton>);

    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("disables the button while busy", () => {
    render(
      <BigButton busy busyLabel="Saving">
        Continue
      </BigButton>,
    );

    const button = screen.getByRole("button", { name: "Saving" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
```

### Responsive screenshot coverage

Playwright screenshot tests must cover the mandatory viewport list from the
viewport standard:

```ts
const learnerViewports = [
  { name: "mobile-small", width: 360, height: 800 },
  { name: "mobile-primary", width: 390, height: 844 },
  { name: "mobile-large", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1366, height: 768 },
  { name: "desktop-large", width: 1920, height: 1080 },
] as const;
```

For each important learner panel, validate:

- No horizontal overflow.
- No clipped text.
- No overlapping controls.
- No hidden main action.
- Stable button width during label changes.
- Readable text at mobile size.
- Correct stacked and wide control arrangements.
- Visible keyboard focus.
- Usability with reduced motion.

## Prohibited Practices

Do not:

- Copy fixed pixel dimensions directly from a mockup.
- Create desktop-first learner components.
- Use tiny buttons to fit more actions in one row.
- Put several equally dominant buttons in one panel.
- Use all caps for paragraphs or long button labels.
- Use decorative fonts for passages or dense instructions.
- Use light grey text on cream without checking contrast.
- Create a clickable `div` instead of a semantic button or link.
- Use hover-only instructions.
- Use continuous bounce or pulse animation on the primary action.
- Use CSS gradients or SVG linear, radial, or mesh gradients.
- Use blurred ambient shadows for learner-facing buttons or activity frames.
- Use glassmorphism, glossy reflections, realistic bevels, or photographic
  textures in interface chrome.
- Use inconsistent fake-shadow directions or depths.
- Use a non-square learner-facing Live2D viewport.
- Show a distant full-body character when the required passport crop applies.
- Place a platform, pedestal, or ground ellipse below a Live2D character.
- Remove the solid fake depth from primary learner buttons or main activity
  frames.
- Use `transition-all` when only specific properties change.
- Build dynamic partial Tailwind class names.
- Add a third-party UI or icon library without approval.
- Load runtime fonts from a third-party CDN.
- Hide required controls at smaller viewport sizes.
- Create nested horizontal or vertical scroll regions for short activities.

## Acceptance Criteria

A learner-facing frontend component is complete only when:

1. It follows the mandatory vector game language.
2. It uses solid fills and contains no gradients or realistic surface effects.
3. Its main activity frame and primary button use consistent solid fake depth.
4. It uses the approved typography and semantic design tokens.
5. It has one clear visual priority.
6. Its primary action is large, labeled, and at least `60px` high where the
   activity layout permits.
7. Its containers follow the defined hierarchy without unnecessary nesting.
8. It works at all mandatory viewports.
9. It does not clip, overlap, or create horizontal scrolling.
10. It uses semantic HTML and visible focus states.
11. It remains understandable without hover, animation, or color alone.
12. It respects reduced-motion preferences.
13. It passes component tests and Playwright screenshot review.
14. Every Live2D character view uses the mandatory square passport framing and
    contains no platform or pedestal decoration.
