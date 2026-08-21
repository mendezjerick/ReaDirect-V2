# ReaDirect Landing Design System

## Scope

This design system applies only to `/landing`. It must not change learner, staff, portal, game, home, theme, or legal interfaces.

## Product and audience

ReaDirect is an elementary reading companion for learners, families, teachers, and schools. The landing page should feel welcoming to young readers without becoming childish, and trustworthy enough for educators.

## Primary visual source

The supplied low-poly alpine backgrounds are the single source of truth:

- Desktop: `apps/web/public/assets/backgrounds/Ldesktop.png`
- Mobile: `apps/web/public/assets/backgrounds/Lmobile.png`

Every surface, border, accent, shadow, and illustration must be traceable to the background's sky, mountains, forest, meadow, coral trees, gold trees, cabin, or mist. Do not introduce beige, purple, neon, generic blue, pure-grey glass, or unrelated gradients.

## Pixel × low-poly blend

- Jersey 20 provides pixel typography and PixelIcon supplies utility glyphs.
- Pixel utility glyphs remain for arrows, links, email, globe, progress, and status.
- Decorative and feature symbols become low-poly vector thumbnails, not icons.
- Accepted artwork style: simple low-poly vector art built from clean polygon facets, no photo textures, 3D rendering, cartoons, emoji, glossy gradients, or mixed illustration styles.
- Thumbnail subjects:
  - Speak with confidence: a learner reading aloud with coral sound facets
  - Learn with Clara: a warm mentor/Clara reading beside a small cabin-book motif
  - Keep your momentum: a meadow path climbing toward a gold flag and mountain
  - Offline preview: a compact cabin/device scene, not a generic robot icon

## Color system

- Ink: `#12324a`
- Mountain deep: `#173f4d`
- Forest deep: `#174f49`
- Forest: `#2e6f61`
- Sky: `#87cedc`
- Sky light: `#ace7f3`
- Meadow: `#bcdd8b`
- Meadow shadow: `#75995f`
- Coral: `#f06f67`
- Gold: `#f4b957`
- Cabin: `#704846`
- Mist: `#eaf7ee`
- Text on dark: `#f5fbef`

All translucent surfaces must use tints of sky, forest, meadow, or mist. Every text/surface pairing must preserve accessible contrast.

## Geometry and component language

- Large surfaces: faceted corners using clip-path polygons or stepped pixel notches.
- Cards: angular low-poly silhouettes with one dominant edge and a restrained forest-colored shadow.
- Controls: pixel-stepped or modestly rounded; primary actions use coral or forest, secondary actions use mist.
- Avoid large 18–25px rounded white cards.
- Section transitions should echo mountains, meadow ridges, or angled paper cuts.
- Keep the real ReaDirect logo unchanged in header and footer.

## Layout

- Preserve all current content, routes, action semantics, accessibility roles, and scroll progress.
- Hero keeps the background visible and uses a compact contrast panel or localized text scrim rather than washing the entire image.
- Offline, about, features, CTA, and footer form distinct landscape-inspired bands.
- Desktop: balanced two-column compositions where useful, readable maximum line lengths, feature cards in three columns.
- Tablet: two-column where safe, otherwise stacked with deliberate alternation.
- Mobile: one column, no oversized empty hero space, buttons stack cleanly, thumbnails maintain a 4:3 or 16:10 crop, no horizontal overflow.

## Motion

- Subtle 160–240ms transitions.
- Hover/focus may lift a facet by 2–4px or shift its forest shadow.
- Respect reduced motion.
- No parallax that harms readability.

## Strict constraints

- Landing route only.
- Do not change copy or destination routes unless needed to remove an actual duplicate.
- Do not replace the real logo.
- Do not generate or use raster/photo artwork for feature thumbnails.
- Use only the fonts, colors, spacing, and component styles defined here.
