# ReaDirect Revamp Frontend Design System

Purpose: define the visual language, reusable frontend surfaces, typography,
buttons, responsive behavior, and reference component patterns for ReaDirect-V2.

This guide applies to learner-facing React interfaces. Staff dashboards may use
denser tables and controls, but they must reuse the same colors, typography,
focus treatment, and component foundations.

This guide complements:

- `READIRECT_REVAMP_TECH_STACK.md`
- `READIRECT_REVAMP_PROJECT_STRUCTURE.md`
- `READIRECT_REVAMP_VIEWPORT_STANDARD.md`
- `READIRECT_REVAMP_MAIN_TRANSITION_STANDARD.md`

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
- Chunky headings and large button labels.
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

## Typography

### Font families

Use the following font pairing:

- **Fredoka** for display headings, short learner prompts, badges, and large
  button labels.
- **Lexend** for instructions, passages, form labels, helper text, dashboard
  content, and longer reading text.
- `ui-rounded`, `system-ui`, and `sans-serif` as fallbacks.

Fredoka supplies the friendly, rounded personality. Lexend supplies a calmer
reading face for longer content. Do not use Fredoka for passages or dense staff
tables.

Both families are available in the Google Fonts repository under the SIL Open
Font License 1.1:

- <https://github.com/google/fonts/tree/main/ofl/fredoka>
- <https://github.com/google/fonts/tree/main/ofl/lexend>

Font files must be self-hosted. Runtime pages must not depend on a third-party
font CDN.

Store browser-ready files in:

```text
apps/web/public/assets/fonts/
|-- fredoka-variable.woff2
\-- lexend-variable.woff2
```

Keep original font packages and license records in the top-level asset library:

```text
assets/fonts/
|-- fredoka/
\-- lexend/

assets/licenses/fonts/
|-- fredoka-ofl.txt
\-- lexend-ofl.txt
```

### Font loading reference

```css
@font-face {
  font-family: "Fredoka";
  src: url("/assets/fonts/fredoka-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}

@font-face {
  font-family: "Lexend";
  src: url("/assets/fonts/lexend-variable.woff2") format("woff2");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}
```

Preload only the font files needed above the fold. Avoid loading separate files
for many weights when a validated variable font is available.

### Type scale

Learner typography uses fluid sizes with conservative limits:

| Token            | Mobile size | Large-screen size | Font            | Intended use                      |
| ---------------- | ----------: | ----------------: | --------------- | --------------------------------- |
| `display`        |        36px |              52px | Fredoka 700     | Celebration or major lesson title |
| `page-title`     |        30px |              40px | Fredoka 700     | Screen title                      |
| `panel-title`    |        24px |              30px | Fredoka 650-700 | Main panel heading                |
| `learner-prompt` |        21px |              26px | Fredoka 600-700 | Short task prompt                 |
| `button-large`   |        19px |              22px | Fredoka 650-700 | Primary learner action            |
| `body-large`     |        18px |              20px | Lexend 500-600  | Learner instruction               |
| `body`           |        16px |              18px | Lexend 400-500  | General content                   |
| `support`        |        14px |              16px | Lexend 500-600  | Noncritical supporting text       |

Critical instructions must never use the `support` size.

Recommended fluid values:

```css
:root {
  --font-display: clamp(2.25rem, 1.8rem + 2vw, 3.25rem);
  --font-page-title: clamp(1.875rem, 1.6rem + 1.2vw, 2.5rem);
  --font-panel-title: clamp(1.5rem, 1.35rem + 0.7vw, 1.875rem);
  --font-learner-prompt: clamp(1.3125rem, 1.18rem + 0.5vw, 1.625rem);
  --font-button-large: clamp(1.1875rem, 1.08rem + 0.4vw, 1.375rem);
  --font-body-large: clamp(1.125rem, 1.06rem + 0.25vw, 1.25rem);
  --font-body: clamp(1rem, 0.96rem + 0.2vw, 1.125rem);
}
```

### Typography rules

- Use sentence case for buttons and headings.
- Do not write long instructions in all caps.
- Use all caps only for very short status badges when useful.
- Use a minimum body line height of `1.5`.
- Use heading line heights between `1.1` and `1.25`.
- Avoid very tight letter spacing in learner content.
- Keep text left-aligned unless a short prompt is intentionally centered.
- Never place important text directly over a detailed illustration.
- Do not justify passages.

## Design Tokens

Tokens must use semantic names. Components should reference roles such as
`action-primary` or `surface-panel`, not raw color names such as `orange-500`.

### Mandatory theme-ready visual rule

Every frontend color must come from a semantic CSS custom property. This is a
hard architectural rule so that future themes can replace the palette without
rewriting components.

- Literal color values may appear only inside theme-definition files in
  `packages/design-tokens/`.
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
- A theme change must update every visible color, including custom cursors,
  particle effects, loading fallbacks, and theme-aware character overrides.
- Theme-specific artwork must also come from semantic CSS custom properties.
  Responsive background pairs use separate mobile and desktop asset tokens so
  that a theme can replace both compositions without editing page components.
- Page and component styles must reference asset roles such as
  `var(--asset-home-background-mobile)`, never a theme filename such as
  `T1mobile.png` directly.

The canonical default theme is
`packages/design-tokens/src/colors.css`. Additional themes must provide the
same semantic variable names under a theme selector or stylesheet.

The following values are the starting palette. They may be tuned after visual
and contrast testing, but their semantic roles must remain stable.

```css
:root {
  /* Theme artwork */
  --asset-home-background-mobile: url("/assets/backgrounds/T1mobile.png");
  --asset-home-background-desktop: url("/assets/backgrounds/T1desktop.png");

  /* Font families */
  --font-display-family: "Fredoka", ui-rounded, system-ui, sans-serif;
  --font-reading-family: "Lexend", system-ui, sans-serif;

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
- Minimum text size: `19px`.
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
through opacity alone; also remove the press shadow and use an appropriate
cursor.

### Typed button reference

```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "quiet";
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
- The loading fallback and the rendered model must use the same square framing
  so that the transition does not cause a layout shift.
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
theme contract, accessibility behavior, approved placements, and tests. This
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
- Expand a solid theme-colored cover from the vanishing point. Change routes
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
--color-transition-link-core
--color-transition-link-cover
--color-transition-link-primary
--color-transition-link-secondary
--color-transition-link-accent
--color-transition-link-shadow
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
