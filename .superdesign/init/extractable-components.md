# Extractable Components

The `/landing` route is intentionally self-contained. No shared application shell should be extracted into the redesign.

## PixelIcon

- Source: `apps/web/src/components/ui/PixelIcon.tsx`
- Category: basic
- Description: Shared pixel utility glyph renderer
- Extractable props: `name`, `title`
- Hardcoded: SVG view boxes and pixel path geometry
- Redesign rule: retain for arrows, links, mail, globe, status, and other utility actions; do not use as feature artwork

## Landing-only layout note

The browser landing navigation and footer are page-specific, are not reused by
other routes, and should remain inline in the landing draft. There are no
shared layout components to extract for this target.
