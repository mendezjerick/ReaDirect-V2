# Page Dependency Trees

## /landing — Browser landing page

Entry: `apps/web/src/features/landing/BrowserLandingPage.tsx`

Dependencies:

- `apps/web/src/features/landing/BrowserLandingPage.tsx`
  - `apps/web/src/features/landing/browser-landing.css`
  - `apps/web/src/components/ui/PixelIcon.tsx`
  - `apps/web/src/deployment/productionDomains.ts`
- Global styling:
  - `apps/web/src/styles/index.css`
  - `packages/design-tokens/src/colors.css`
- Content imagery:
  - `apps/web/public/assets/backgrounds/Ldesktop.png`
  - `apps/web/public/assets/backgrounds/Lmobile.png`
- Brand:
  - `apps/web/public/assets/icons/icon.png`
  - `apps/web/public/assets/fonts/jersey-20-regular.woff2`

## /home — Entry page

Entry: `apps/web/src/features/home/HomePage.tsx`

Dependencies:

- `apps/web/src/components/ui/BigButton.tsx`
- `apps/web/src/components/ui/PixelIcon.tsx`
- `apps/web/src/components/ui/useButtonCommit.ts`
- `apps/web/src/features/theme/ThemeSelector.tsx`
- `apps/web/src/features/home/AboutReaDirectDialog.tsx`

## /learner/dashboard — Learner dashboard

Entry: `apps/web/src/features/learner-dashboard/LearnerDashboardPage.tsx`

Dependencies:

- `apps/web/src/components/ui/BigButton.tsx`
- `apps/web/src/components/ui/PixelIcon.tsx`
- `apps/web/src/components/ui/Surface.tsx`
- `apps/web/src/features/learner-dashboard/learner-dashboard.css`
- achievement and learner-experience modules

## /learner/lesson-intro — Journey page

Entry: `apps/web/src/features/lesson-intro/LessonIntroPage.tsx`

Dependencies:

- `apps/web/src/components/ui/BigButton.tsx`
- `apps/web/src/components/ui/PixelIcon.tsx`
- `apps/web/src/components/ui/Surface.tsx`
- `apps/web/src/features/theme/ThemeSelector.tsx`
- `apps/web/src/features/lesson-intro/lesson-intro.css`

## /learner/lessons/1 — First reading lesson

Entry: `apps/web/src/features/lesson/LessonOnePage.tsx`

Dependencies:

- learner activity shell and result components
- Clara speech preparation and presentation modules
- assessment recorder modules
- `apps/web/src/features/lesson/lesson.css`
- `apps/web/src/features/assessment/assessment.css`
