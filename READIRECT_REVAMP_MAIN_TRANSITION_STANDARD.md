# ReaDirect Revamp Main Transition Standard

This document is the source of truth for ReaDirect's main page transition.

The canonical transition is named:

```text
ReaDirect Link Start Transition
```

It is currently approved for the Intro to Home handoff. The project owner will
decide which additional route changes may use it. Do not add the transition to
another page merely because that page performs navigation.

## Core Rule

Every approved use must invoke the existing shared transition implementation.
Do not copy its markup, Canvas renderer, state logic, constants, CSS, or color
values into a page-specific implementation.

Canonical implementation:

```text
apps/web/src/components/transitions/LinkStartTransition.tsx
apps/web/src/components/transitions/RouteTransitionProvider.tsx
```

Pages request the transition through the shared controller:

```tsx
const { beginRouteTransition, isTransitioning } = useRouteTransition();

beginRouteTransition("/destination");
```

The application-level provider owns the overlay and navigation timing so the
effect remains mounted while the source route is replaced by the destination.

## Required Visual Language

The transition creates the sensation of moving through a colorful vector light
tunnel.

- Use a dense field of long, thick rods extending from one stable vanishing
  point.
- Rods must have round ends so they read as cylinders rather than thin rays.
- Generate new cylinder waves continuously while previous waves travel toward
  the viewport edges.
- Cylinder generation stops only when the solid cover has completely filled
  the viewport.
- The destination route appears underneath the fully opaque cover.
- The cover then clears to reveal the destination.
- Use flat semantic colors only.
- Do not use gradients, raster video, photographic bloom, motion-blur filters,
  or copied Sword Art Online branding and assets.
- The animation may be inspired by a light-tunnel effect, but its artwork and
  implementation must remain original to ReaDirect.

## Canonical Timeline

The button press occurs before the three-second transition timeline.

| Event                               |                      Time |
| ----------------------------------- | ------------------------: |
| Tactile button commit               | `180ms` before transition |
| Transition begins                   |                     `0ms` |
| Cylinder movement begins            |                   `120ms` |
| Per-cylinder stagger window         |                   `620ms` |
| Each cylinder travel window         |                  `2260ms` |
| New cylinder-wave cadence           |             Every `850ms` |
| Core ignition reaches full size     |                   `640ms` |
| Solid cover begins expanding        |                  `2200ms` |
| Solid cover fills the viewport      |                  `2525ms` |
| Destination route mounts underneath |                  `2600ms` |
| Cover reveal begins                 |                  `2700ms` |
| Transition completes                |                  `3000ms` |

Do not insert a stationary pause into this timeline. Cylinder layers continue
to spawn and move during every partially covered frame. The only intentional
fully covered hold is between cover completion and reveal.

Changing these values changes the main transition standard. Any approved timing
change must update the shared implementation, this document, the frontend
design-system summary, and the associated automated tests together.

## Responsive Density

The transition uses the same learner flow at every viewport while adjusting
rendering density:

| CSS viewport width  | Cylinder definitions per wave |
| ------------------- | ----------------------------: |
| Below `768px`       |                          `96` |
| `768px` to `1023px` |                         `140` |
| `1024px` and above  |                         `192` |

Additional rendering rules:

- Cap Canvas pixel density at `2`.
- Use the deterministic seed `20260719` so the composition remains stable.
- Keep the vanishing point at `50%` horizontal and `48%` vertical.
- Size travel from the viewport diagonal so portrait and landscape screens are
  completely covered.
- Recalculate Canvas dimensions and the deterministic cylinder field when the
  viewport changes.
- Stop `requestAnimationFrame` rendering when the transition unmounts.

## Canonical Cylinder Geometry

Each deterministic cylinder definition uses these ranges:

| Property                |                           Range |
| ----------------------- | ------------------------------: |
| Base length             |               `78px` to `338px` |
| Base width              |               `3.5px` to `15px` |
| Travel speed multiplier |                `0.80` to `1.22` |
| Starting radial offset  | `0` to `16%` of travel distance |

Length and width increase as a cylinder approaches the viewer. This perspective
change is required for the forward tunnel sensation.

## Theme Contract

Canvas code must resolve every color from these semantic CSS custom properties:

```css
--color-transition-link-core
--color-transition-link-cover
--color-transition-link-primary
--color-transition-link-secondary
--color-transition-link-accent
--color-transition-link-shadow
```

Literal colors are allowed only inside theme token files. Future themes must
provide all six roles. The cover role must be fully opaque so route replacement
cannot flash through it.

## Route and Asset Contract

- Keep `RouteTransitionProvider` above the route collection.
- Keep the transition overlay outside individual page components.
- Disable the initiating control for the entire transition.
- Ignore repeated transition requests while one is active.
- Swap routes only after the cover has filled the complete viewport.
- Preload the destination background selected by the current theme and
  responsive viewport before beginning the route handoff.
- Preload only the applicable responsive background rather than downloading
  every size.
- Mark the destination's focus target with `data-route-focus` and transfer focus
  after the overlay clears.
- The overlay must block pointer and touch input while active.
- The Canvas and overlay are decorative and must remain hidden from assistive
  technology.

## Reduced Motion

When `prefers-reduced-motion` is active:

- Do not render the light tunnel.
- Do not impose the `180ms` press delay.
- Navigate immediately.
- Preserve destination focus behavior where practical.

## Required Tests

Every change to the main transition must verify:

- Deterministic cylinder generation.
- Responsive cylinder counts.
- Continuous active waves until the full-cover frame.
- No active cylinder wave after the full-cover frame.
- Button commit occurs before the overlay appears.
- Navigation does not occur before the cover is complete.
- The overlay survives the route swap and clears afterward.
- Destination focus transfer.
- Reduced-motion bypass.
- No viewport overflow at all mandatory viewport sizes.
- Successful TypeScript checking and production build.

The Playwright viewport suite must continue to cover:

```text
360 x 800
390 x 844
412 x 915
768 x 1024
1366 x 768
1920 x 1080
```

## Prohibited Changes

Do not:

- Reimplement the transition inside a page.
- Create a visually similar transition with different timing.
- Add the transition to a new route without project-owner direction.
- Navigate before the screen cover is fully opaque.
- Stop cylinder generation during a partially covered frame.
- Hard-code Canvas colors.
- Replace the vector Canvas effect with a video or GIF.
- Increase mobile density without performance validation.
- Remove reduced-motion behavior.

## Current Approved Placement

```text
Intro page -> Home page
```

This list changes only when the project owner explicitly approves another
placement.
