# ReaDirect Revamp Viewport and Responsive Design Standard

This document defines the required viewport and responsive-design rules for ReaDirect-V2.

## Core Principle

ReaDirect must be designed and developed as a mobile-first application.

The mobile layout is the primary implementation target. Tablet and desktop layouts must adapt from the mobile experience without changing the learner flow, hiding required controls, or introducing a separate interaction pattern.

## Viewport Priority

Development must follow this order:

1. Mobile
2. Tablet
3. Desktop

The mobile layout must be completed and validated before desktop-specific enhancements are added.

## Mandatory Development Viewports

The following viewports must be tested throughout development:

| Viewport | Purpose |
|---|---|
| 360 x 800 | Small mobile baseline |
| 390 x 844 | Primary mobile development viewport |
| 412 x 915 | Large mobile viewport |
| 768 x 1024 | Tablet viewport |
| 1366 x 768 | Standard desktop viewport |
| 1920 x 1080 | Large desktop viewport |

The primary working viewport is:

```text
390 x 844
```

## Simultaneous Viewport Development

During frontend development, the mobile and desktop views must remain open and visible at the same time.

Recommended setup:

```text
Left window: 390 x 844 mobile viewport
Right window: 1366 x 768 desktop viewport
```

Every major interface change must be checked in both views before the task is considered complete.

## Mobile-First Implementation Rules

The default CSS must target mobile devices.

Desktop and tablet layouts must be added through progressive enhancement using responsive breakpoints.

Required approach:

```css
/* Mobile base styles */

@media (min-width: 768px) {
  /* Tablet enhancements */
}

@media (min-width: 1024px) {
  /* Desktop enhancements */
}
```

Do not create a desktop layout first and compress it for mobile.

## Learner Interface Rules

The learner interface must prioritize:

- One clear primary action at a time
- Large touch targets
- Minimal text
- Clear visual instructions
- Visible progress
- Stable placement of microphone controls
- Large agent and activity visuals
- No horizontal scrolling
- No hidden required controls
- No desktop-only interactions

The learner must not need hover, right-click, keyboard shortcuts, or precise mouse input.

## Touch Target Requirements

Interactive controls must be easy for young learners to press.

Minimum recommended touch size:

```text
44 x 44 CSS pixels
```

Primary actions should be larger than the minimum whenever possible.

Spacing between controls must prevent accidental presses.

## Mobile Layout Behavior

On mobile:

- The character must remain clearly visible.
- The current instruction or learning item must remain readable.
- The primary action must remain within easy thumb reach.
- The microphone control must remain prominent.
- Feedback must not cover the target word, answer choices, or microphone state.
- Popups must fit within the viewport.
- The interface must account for browser bars and device safe areas.
- Important controls must not be placed behind the on-screen keyboard.

## Desktop Layout Behavior

Desktop layouts may:

- Place the character and activity panel side by side
- Increase whitespace
- Display wider lesson cards
- Show additional teacher-facing information
- Increase the size of backgrounds and game effects

Desktop layouts must not:

- Change the order of the learner flow
- Add required controls that do not exist on mobile
- Remove mobile-required controls
- Create a separate desktop-only lesson design

## Orientation

Portrait orientation is the primary mobile experience.

Landscape orientation must remain usable, but it does not need a separate redesigned interface unless a specific activity requires it.

The application must not force landscape orientation for normal lessons.

## Responsive Character Rules

The Live2D character must scale according to the available viewport.

The character must:

- Stay inside its assigned container
- Preserve aspect ratio
- Avoid covering lesson controls
- Avoid being clipped during normal expressions and gestures
- Remain large enough for the learner to see facial reactions
- Reposition instead of shrinking excessively

Recommended behavior:

```text
Mobile:
Character above or beside the activity depending on available height

Tablet:
Character and activity may share a wider layout

Desktop:
Character and activity may use a side-by-side layout
```

## Background and Media Rules

Backgrounds, illustrations, videos, and animated effects must support mobile and desktop sizes.

Use responsive assets when needed:

```text
background-mobile.webp
background-tablet.webp
background-desktop.webp
```

Media must:

- Preserve readability
- Avoid excessive file sizes
- Avoid hiding controls
- Avoid causing layout shifts
- Avoid autoplaying audio
- Avoid unnecessary high-resolution downloads on mobile

## Typography

Text must remain readable without zooming.

Recommended minimums:

```text
Body text: 16px
Button text: 16px
Primary learner prompts: 20px or larger
```

Critical learner instructions must not be reduced solely to fit more content on screen.

Long content must be divided into smaller steps.

## Scrolling

Short learner activities should fit within one mobile viewport whenever practical.

When scrolling is necessary:

- The primary action must remain easy to find.
- The learner must not lose the current activity context.
- The page must not contain nested scroll containers.
- Horizontal scrolling is prohibited.

## Safe Areas

The interface must support device safe areas using:

```css
env(safe-area-inset-top)
env(safe-area-inset-right)
env(safe-area-inset-bottom)
env(safe-area-inset-left)
```

Fixed controls must not overlap phone notches, browser bars, or home indicators.

## Mobile Performance

Mobile performance has priority over decorative complexity.

Animations and game effects must:

- Remain smooth on supported devices
- Avoid blocking learner input
- Pause when not visible
- Avoid unnecessary continuous rendering
- Reduce particle counts on smaller devices when needed
- Respect reduced-motion preferences where applicable

## Testing Requirements

Every learner-facing screen must be tested in all mandatory viewports.

Required checks:

- No horizontal overflow
- No clipped text
- No overlapping controls
- No hidden primary action
- No unreadable text
- No off-screen modal
- No distorted Live2D character
- No broken PixiJS effects
- No microphone control obstruction
- No layout failure when the keyboard opens
- No layout failure during audio recording or playback
- No significant cumulative layout shift

Automated viewport testing must use Playwright.

## Screenshot Validation

Important screens must have reference screenshots for:

```text
360 x 800
390 x 844
412 x 915
768 x 1024
1366 x 768
1920 x 1080
```

Screenshots must be regenerated and reviewed after major layout changes.

## Required Screens for Viewport Testing

At minimum, test:

- Login or learner selection
- Home screen
- Tutorial
- Lesson introduction
- Listening state
- Recording state
- Processing state
- Correct feedback
- Almost-correct feedback
- Incorrect feedback
- Audio-problem feedback
- Reward or celebration screen
- Lesson completion
- Assessment activity
- Passage reading
- Task 3B Comprehension Check
- Teacher dashboard
- Modal dialogs
- Error and offline states

## Acceptance Criteria

A learner-facing feature is not complete unless:

1. It works correctly at 390 x 844.
2. It remains usable at 360 x 800.
3. It adapts correctly at 412 x 915.
4. It remains functional at tablet size.
5. It remains visually organized at desktop size.
6. The learner flow is identical across viewports.
7. No required control depends on desktop-only interaction.
8. The Live2D character and PixiJS effects remain correctly positioned.
9. The interface passes manual and automated viewport checks.

## Prohibited Practices

Do not:

- Build desktop first
- Use fixed desktop widths for learner screens
- Hide required functions on mobile
- Require hover interactions
- Use horizontal scrolling
- Shrink text below readable sizes
- Place important controls outside thumb reach
- Treat mobile as a compressed desktop layout
- Create separate mobile and desktop learner flows
- Approve a frontend task without testing both mobile and desktop
