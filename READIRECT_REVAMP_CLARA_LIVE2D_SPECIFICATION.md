# ReaDirect Revamp Ma'am Clara Live2D Specification

## Document Authority

This document is the source of truth for Ma'am Clara's Live2D identity,
assets, viewport, approved crop, and frontend presentation in ReaDirect-V2.

If another document, mockup, component, or implementation conflicts with this
specification, this specification takes precedence for Ma'am Clara. The crop
defined here is approved and must not be changed without explicit design
approval from the project owner.

Approval status: **Approved**  
Approved crop date: **July 18, 2026**  
Viewport priority: **Mobile first**

## Character Identity

| Property                   | Required value                                         |
| -------------------------- | ------------------------------------------------------ |
| Learner-facing name        | Ma'am Clara                                            |
| Internal component name    | Clara                                                  |
| Exported Live2D model name | CherryGoth                                             |
| Character technology       | Live2D Cubism for Web                                  |
| Primary presentation       | Square passport-style portrait                         |
| Background                 | Transparent canvas over the page's plain light surface |
| Choker accessory           | Removed; the `collar` drawable must remain hidden      |
| Glasses                    | Enabled; solid black                                   |
| Hair                       | Meadow green                                           |
| Primary skin tone          | Warm orange `#ffa461`                                  |
| Skin-tone shade            | Deep warm brown `#cf7442`                              |
| Hoodie                     | Black                                                  |
| Hoodie strings             | Beige                                                  |

`CherryGoth` is the legacy exported model identifier. It may remain in asset
file names, but all learner-facing UI, accessibility text, code comments, and
product copy must call the character **Ma'am Clara**.

## Approved Crop: Hard Rule

Ma'am Clara's approved crop is the exact result produced by these model-matrix
values:

```ts
const PASSPORT_FRAME_HEIGHT = 4.55;
const PASSPORT_FRAME_X = 0;
const PASSPORT_FRAME_Y = -1.28015625;

const modelMatrix = this.getModelMatrix();
modelMatrix.setHeight(PASSPORT_FRAME_HEIGHT);
modelMatrix.setPosition(PASSPORT_FRAME_X, PASSPORT_FRAME_Y);
```

These values are mandatory for the standard Clara portrait and must remain
identical at every responsive breakpoint.

| Constant                | Approved value | Purpose                                                     |
| ----------------------- | -------------: | ----------------------------------------------------------- |
| `PASSPORT_FRAME_HEIGHT` |         `4.55` | Approved model zoom; 30% closer than the earlier `3.5` crop |
| `PASSPORT_FRAME_X`      |            `0` | Keeps Clara centered on her native horizontal origin        |
| `PASSPORT_FRAME_Y`      |  `-1.28015625` | Lowers Clara by 9px in the canonical 512px capture          |
| Viewport aspect ratio   |        `1 / 1` | Maintains the passport-style square                         |

The crop must show Clara's head, hair, shoulders, and the approved amount of
upper torso. The lower body is intentionally outside the viewport.

The vertical value is derived from a `9px` downward correction in the canonical
`512 x 512` CSS capture: `9 / 512 x 2 = 0.03515625` model-position units. The
previous `-1.245` value minus that correction produces `-1.28015625`. This
leaves intentional breathing room above Clara's hair while preserving the
square crop and scaling the composition proportionally at other viewport sizes.

## Approved Appearance Override

Ma'am Clara must never display the original choker accessory. The choker is the
compiled Live2D drawable with the exact ID `collar`.

The renderer must resolve this drawable once during initialization and force
its opacity to `0` after every model update:

```ts
const HIDDEN_DRAWABLE_IDS = ["collar"] as const;

const drawableIndex = model.getDrawableIndex(
  CubismFramework.getIdManager().getId("collar"),
);

model.getModel().drawables.opacities[drawableIndex] = 0;
```

The opacity override must run after `_model.update()` because Cubism can
recalculate drawable opacities during an update. Do not hide the entire `body`
part and do not use `Param19`; `Param19` is the exported `string` customization
parameter and is not the choker.

This is a non-destructive runtime presentation override. Do not erase the
choker from the `8192 x 8192` texture atlas, modify the compiled `.moc3`, or
alter the original files under `assets/live2d/source/clara/`.

### Approved Theme-Aware Colors

Clara's approved colors must be supplied by the shared theme tokens. The
renderer must never duplicate these values as TypeScript color literals.

| Character region | Semantic variable                | Default theme value |
| ---------------- | -------------------------------- | ------------------- |
| Main hair        | `--color-clara-hair`             | Meadow green        |
| Hair outline     | `--color-clara-hair-outline`     | Dark meadow green   |
| Hair highlight   | `--color-clara-hair-highlight`   | Light meadow green  |
| Hair shadow      | `--color-clara-hair-shadow`      | Dark meadow green   |
| Deep hair shadow | `--color-clara-hair-deep-shadow` | Deeper meadow green |
| Glasses          | `--color-clara-glasses`          | Black               |
| Primary skin     | `--color-clara-skin-primary`     | `#ffa461`           |
| Skin shade       | `--color-clara-skin-shade`       | `#cf7442`           |
| Hoodie           | `--color-clara-hoodie`           | Black               |
| Hoodie strings   | `--color-clara-strings`          | Beige               |
| Canvas clear     | `--color-live2d-canvas-clear`    | Transparent         |
| Recolor base     | `--color-live2d-recolor-base`    | Neutral black       |

The canonical default values live in
`packages/design-tokens/src/colors.css`. Theme selectors may override these
variables. Clara's renderer must re-read them when the document theme changes.

Approved drawable groups:

```text
Main hair:
  ArtMesh13, ArtMesh14, ArtMesh15, ArtMesh18, ArtMesh21

Hair outline:
  ArtMesh11, ArtMesh12, ArtMesh16,
  ArtMesh17, ArtMesh19, ArtMesh20, ArtMesh84

Hair highlight:
  ArtMesh8

Hair shadow:
  ArtMesh85, ArtMesh55, ArtMesh96, ArtMesh100,
  ArtMesh58, ArtMesh70

Deep hair shadow:
  ArtMesh10, ArtMesh22,
  ArtMesh51, ArtMesh52, ArtMesh53, ArtMesh54,
  ArtMesh56, ArtMesh57, ArtMesh68, ArtMesh72,
  ArtMesh94, ArtMesh95, ArtMesh97, ArtMesh98

Always-black accessories:
  ArtMesh6, ArtMesh30

Primary skin:
  ArtMesh59, ArtMesh77, ArtMesh83, ArtMesh99

Skin shade:
  nose2, ArtMesh69, ArtMesh71, ArtMesh74,
  ArtMesh82, ArtMesh90, ArtMesh91, ArtMesh92

Hoodie:
  hoodie

Hoodie strings:
  ArtMesh86, ArtMesh89
```

`ArtMesh16` and `ArtMesh19` are the rear hair outline shells. They pair with
the main-hair fill meshes `ArtMesh18` and `ArtMesh21`, respectively, and must
always use `--color-clara-hair-outline` rather than the main hair color.

`ArtMesh84` is the narrow lower outline drawn over the back-hair base
`ArtMesh85`. It has no parent part in the exported model, but it is hair artwork
and must always use `--color-clara-hair-outline` rather than its black source
texture color.

The exported glasses selector is `Param18`, whose range is `0` through `10`.
The approved default must force it to exactly `1`, which enables `ArtMesh6`.
Values `2` through `10` select alternate or exported color variants and must
not be used for the default presentation. `ArtMesh6` must then receive
`--color-clara-glasses`. Every theme must define that token as black; Clara's
glasses must not change color with the rest of her theme palette.

`ArtMesh30` is the question mark shown by the confused expression. It must use
the same always-black `--color-clara-glasses` token in every theme.

The primary skin meshes are the visible light face and neck bases. The skin
shade group contains the corresponding nose, lower-face, neck, and eye-area
shade artwork. Do not recolor `ArtMesh75`, `ArtMesh73`, `ArtMesh59`, or
`ArtMesh99`; these contain facial outlines, mouth artwork, or eye artwork rather
than skin fill. Do not enable the hidden alternate skin layers `ArtMesh76`,
`ArtMesh80`, `ArtMesh81`, or `ArtMesh93` for the default presentation.

`ArtMesh59` and its mirrored equivalent `ArtMesh99` are the large white circular
overlays inside Clara's eyes. They are intentionally assigned to
`--color-clara-skin-primary` so they do not remain visible when her eyes close.
The sclera meshes `ArtMesh50` and `ArtMesh67`, and the catchlights `ArtMesh47`
and `ArtMesh65`, remain unchanged.

Use Cubism's per-drawable multiply and screen color overrides so the source
texture remains unchanged. A missing expected drawable is an asset-contract
error and must fail clearly instead of silently recoloring the wrong region.

### Placement Method

Always use `setPosition(x, y)` after `setHeight(height)`.

Do not use either of these methods for Clara's standard portrait:

```ts
modelMatrix.centerX(0);
modelMatrix.top(1);
```

Clara's native Cubism canvas origin is already centered. `centerX(0)` treats
the coordinate space as though the model begins at its left edge and shifts
Clara approximately half a model width off-screen. `top()` applies an absolute
translation and does not represent the desired visual crop.

### Native Model Measurements

The compiled Clara model reports the following Cubism canvas information:

| Measurement               |                               Value |
| ------------------------- | ----------------------------------: |
| Native canvas             |                       `6000 x 8000` |
| Canvas origin             |                        `3000, 4000` |
| Pixels per unit           |                              `6000` |
| Model-space canvas width  |                                 `1` |
| Model-space canvas height |                      `1.3333333333` |
| Default drawable X bounds | approximately `-0.2830` to `0.2795` |
| Default drawable Y bounds | approximately `-0.3394` to `0.6399` |

At the approved `4.55` frame height, the effective model scale is `3.4125`.
The visible horizontal drawable bounds are approximately `-0.966` to `0.954`,
which keeps Clara centered while using nearly the full width of the square.
The lower portion is deliberately clipped to create the approved close
portrait.

## Viewport Contract

The standard learner-facing Clara stage must:

- Use a strict `1 / 1` aspect ratio.
- Remain square at every viewport width and orientation.
- Use a square inner viewport with `overflow: hidden` to enforce the approved
  crop while allowing the fixed loader overlay to cover the screen.
- Place the WebGL canvas edge-to-edge with `inset: 0`.
- Give the canvas `width: 100%` and `height: 100%`.
- Keep the Live2D matrix values unchanged when the CSS box resizes.
- Preserve Clara's proportions; never stretch X and Y independently.
- Use a transparent WebGL clear color.
- Contain no platform, pedestal, floor ellipse, scenery, or gradient.

Reference structure:

```tsx
<figure className="clara-stage" aria-label="Ma'am Clara">
  <div className="clara-stage__loader" aria-hidden="true">
    <span className="clara-stage__loader-wave" />
    <span className="clara-stage__loader-cover" />
  </div>
  <div className="clara-stage__viewport">
    <canvas className="clara-stage__canvas" aria-hidden="true" />
  </div>
  <span className="visually-hidden" role="status" />
</figure>
```

Reference CSS:

```css
.clara-stage {
  position: relative;
  width: min(100%, 26rem);
  aspect-ratio: 1;
  overflow: visible;
  margin: 0;
}

.clara-stage__viewport {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.clara-stage__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

Current responsive stage widths:

| Context                               | Stage width        |
| ------------------------------------- | ------------------ |
| Mobile/default                        | `min(100%, 26rem)` |
| Viewport at least `48rem` wide        | `min(46vw, 28rem)` |
| Short landscape, at most `40rem` high | `min(72vh, 17rem)` |

Only the square's CSS size may change between breakpoints. The approved model
zoom and position must not change.

## Asset Source of Truth

### Original Source Drop

```text
assets/live2d/source/clara/
```

This directory preserves the supplied model export. Do not destructively
modify or replace these files during runtime optimization.

### Repository Runtime Copy

```text
assets/live2d/runtime/clara/
```

### Browser Runtime Copy

```text
apps/web/public/assets/live2d/clara/
```

The frontend currently loads:

```text
/assets/live2d/clara/CherryGoth.model3.json
```

### Model Files

| File                                 | Purpose                           | Current use                      |
| ------------------------------------ | --------------------------------- | -------------------------------- |
| `CherryGoth.model3.json`             | Runtime manifest                  | Required                         |
| `CherryGoth.moc3`                    | Compiled Cubism model             | Required                         |
| `CherryGoth.8192/texture_00.png`     | `8192 x 8192` texture atlas       | Required                         |
| `CherryGoth.physics3.json`           | Physics configuration             | Required                         |
| `CherryGoth.cdi3.json`               | Display and parameter metadata    | Available                        |
| `Icon.png`                           | Legacy supplied icon              | Preserved, not used              |
| `stills/clara-default.png`           | Retired crop-regression artifact  | Preserved, not used              |
| `Angry.exp3.json`                    | Angry expression                  | Available, outside approved set  |
| `Blush.exp3.json`                    | Blush expression                  | Available, outside approved set  |
| `Dizzy.exp3.json`                    | Dizzy expression                  | Available, outside approved set  |
| `Huh.exp3.json`                      | Confused/questioning reference    | Runtime uses `Param24` directly  |
| `Sad.exp3.json`                      | Sad expression                    | Available, outside approved set  |
| `EditColourAndAccessories.exp3.json` | Exported customization expression | Prohibited at runtime            |
| `CherryGoth.vtube.json`              | External VTube configuration      | Not required by the web renderer |
| `items_pinned_to_model.json`         | External pinned-item metadata     | Not required by the web renderer |

No editable `.cmo3` Cubism project is currently present. The `.moc3` file is a
compiled runtime model and cannot be used for a true Cubism Editor re-export.
Texture optimization must create a separate runtime derivative and must leave
the original `assets/live2d/source/clara/` files untouched.

### Retired Generated PNG Fallback

The generated PNG fallback is retired and is no longer rendered by the shared
Clara stage. Existing PNG files may remain as crop-comparison and regression
artifacts, but learner-facing runtime code must use the CSS loading transition
defined below. The remaining material in this subsection is historical
reproduction documentation only and does not authorize restoring the PNG as a
runtime fallback.

The approved fallback alignment is the finalized
`clara-live2d-mimic-crop-raised-18px-preview.png`. Both active fallback copies
must remain byte-identical to this asset. The additional `18px` upward framing
correction applies only to the PNG; the approved Live2D matrix and runtime
behavior remain unchanged.

The default fallback is a deterministic `1024 x 1024` transparent PNG derived
from a wider render of the real model. It uses the default theme's Clara color
variables, the hidden `collar` drawable, and a stable pose with breathing and
physics disabled. The wider source prevents the passport viewport from clipping
model pixels before the fallback crop is selected.

#### Finalized fallback crop logic

The fallback is produced in two stages. These values are exact and must not be
estimated by eye.

1. Render a `512 x 512` CSS stage at device scale `2`, producing a
   `1024 x 1024` transparent source image.
2. For this capture only, use model frame height `2.45`, X position `0`, and Y
   position `-0.28`. These preview values reveal Clara's full visible exported
   artwork and must never replace the runtime passport matrix.
3. Crop a `552 x 552` square from source coordinate `x = 236`, `y = 37`.
4. Resize that crop to `1024 x 1024` with Lanczos resampling and preserve RGBA
   transparency.
5. Copy the finalized PNG byte-for-byte to both active fallback locations.

The unadjusted Live2D-mimic crop begins at `x = 236`, `y = 27`. The final crop
increases source Y by `10px`, moving the visible character upward. Because the
`552px` source crop is enlarged to `1024px`, the visible correction is:

```text
10 x (1024 / 552) = 18.5507 output pixels
```

This is the approved approximately `18px` raised fallback. Do not apply an
additional CSS translation to the portrait wrapper or canvas.

Final alignment source:

```text
assets/live2d/previews/clara-live2d-mimic-crop-raised-18px-preview.png
```

Canonical generated copy:

```text
assets/live2d/runtime/clara/stills/clara-default.png
```

Browser copy:

```text
apps/web/public/assets/live2d/clara/stills/clara-default.png
```

Regenerate the wider source after any approved crop, model, drawable
visibility, or default Clara palette change:

```powershell
$env:CLARA_PREVIEW_OUTPUT = 'assets/live2d/previews/clara-full-model-square-preview.png'
$env:CLARA_PREVIEW_FRAME_HEIGHT = '2.45'
$env:CLARA_PREVIEW_FRAME_Y = '-0.28'
corepack pnpm --filter @readirect/web live2d:generate-fallback

Remove-Item Env:CLARA_PREVIEW_OUTPUT
Remove-Item Env:CLARA_PREVIEW_FRAME_HEIGHT
Remove-Item Env:CLARA_PREVIEW_FRAME_Y
```

Apply the exact crop and copy it to both fallback locations:

```powershell
ffmpeg -y `
  -i '.\assets\live2d\previews\clara-full-model-square-preview.png' `
  -vf 'crop=552:552:236:37,scale=1024:1024:flags=lanczos,format=rgba' `
  -frames:v 1 -update 1 `
  '.\assets\live2d\previews\clara-live2d-mimic-crop-raised-18px-preview.png'

Copy-Item `
  '.\assets\live2d\previews\clara-live2d-mimic-crop-raised-18px-preview.png' `
  '.\assets\live2d\runtime\clara\stills\clara-default.png' -Force

Copy-Item `
  '.\assets\live2d\previews\clara-live2d-mimic-crop-raised-18px-preview.png' `
  '.\apps\web\public\assets\live2d\clara\stills\clara-default.png' -Force
```

The generator is `apps/web/scripts/generate-clara-fallback.mjs`. It uses
reduced motion for a stable pose and captures without a page background. The
unparameterized generator creates the direct runtime capture and therefore is
not the final approved fallback workflow. Do not replace the finalized PNG with
a screenshot of the surrounding page.

A raster fallback cannot inherit CSS color variables. Every future theme that
changes Clara's palette must provide its own generated fallback and select it
with the same theme state. The default asset must not be shown as the fallback
for a differently colored Clara theme.

## Renderer Contract

Core implementation files:

```text
apps/web/src/features/intro/live2d/ClaraWebGLRenderer.ts
apps/web/src/features/intro/live2d/ClaraPresentation.ts
apps/web/src/features/intro/live2d/ClaraExpressionController.ts
apps/web/src/features/intro/live2d/ClaraInteractionTracker.ts
apps/web/src/features/intro/live2d/ClaraLookController.ts
```

Required renderer behavior:

- Prefer WebGL 2 and fall back to WebGL 1.
- Use an alpha-enabled, antialiased context.
- Use premultiplied alpha in the Cubism renderer and texture upload.
- Resolve the transparent canvas clear color from
  `--color-live2d-canvas-clear`.
- Cap rendering density at device pixel ratio `2`.
- Resize the backing canvas with `ResizeObserver`.
- Preserve the square projection.
- Load Cubism shaders from `/assets/live2d/shaders/`.
- Release textures and Cubism resources during component cleanup.
- Stop continuous animation while the page is hidden.
- Limit unusually large frame deltas to `1 / 15` second.
- Resolve the `collar` drawable during initialization and fail clearly if a
  replacement model no longer contains the expected drawable.
- Force the `collar` drawable opacity to `0` after every `_model.update()`.
- Resolve Clara's hair, hoodie, and string colors from the shared CSS variables
  and apply them only to the approved drawable groups.
- Force `Param18` to `1` before every model update so glasses remain enabled.
- Resolve Clara's glasses and skin colors from the shared CSS variables and
  apply them only to the approved drawable groups.
- Refresh theme-aware drawable colors when the document theme changes.

The square viewport is part of the rendering contract. Avoid projection code
that calls `setWidth(2)` for Clara's standard square stage, because that would
replace the approved `4.55` model scale.

## Motion and Physics

Clara currently uses the supplied physics file plus subtle procedural
breathing. The approved breathing configuration is:

| Parameter         | Offset |  Peak |  Cycle | Weight |
| ----------------- | -----: | ----: | -----: | -----: |
| `ParamAngleX`     |    `0` |   `4` |  `6.5` |  `0.3` |
| `ParamAngleY`     |    `0` |   `2` |  `3.5` |  `0.3` |
| `ParamBodyAngleX` |    `0` |   `2` | `15.5` | `0.25` |
| `ParamBreath`     |  `0.5` | `0.5` |  `3.2` |  `0.8` |

Motion must remain gentle and must not move Clara's face outside the safe
portrait area. Large body translation, bouncing, rotation, or zoom that breaks
the approved crop is prohibited.

When `prefers-reduced-motion: reduce` is active, render Clara in a stable state
without continuous animation. Physics and procedural breathing must not run
continuously in reduced-motion mode.

## Global Pointer and Touch Following

Pointer following is part of the canonical `ClaraStage` behavior. Every page
that contains Ma'am Clara must receive it through the shared Clara runtime; a
page must not create a competing pointer listener or separate tracking
amplitudes.

The viewport target is normalized to `-1` through `1` on each axis. The target
may affect only these internal rig parameters:

| Rig response | Parameters                           | Maximum range share |
| ------------ | ------------------------------------ | ------------------: |
| Eye tracking | `ParamEyeBallX`, `ParamEyeBallY`     |               `82%` |
| Head follow  | `ParamAngleX`, `ParamAngleY`         |    `22% X`, `16% Y` |
| Body sway    | `ParamBodyAngleX`, `ParamBodyAngleY` |     `10% X`, `6% Y` |

The percentages are applied to the available distance from each parameter's
exported default value toward its minimum or maximum. The runtime must read
those bounds from the compiled model rather than hard-coding Cubism angles.

Interaction rules:

- Mouse and pen hover follow the pointer anywhere inside the viewport.
- Leaving the viewport, window blur, page hiding, touch release, and touch
  cancellation return the target to neutral.
- A primary touch swipe activates after `12px` of movement.
- A primary stationary touch activates after a deliberate `220ms` hold.
- A touch released before either threshold is an ordinary tap and must never
  activate or update Clara's tracking target.
- Touch tracking must remain passive and must not suppress scrolling or normal
  control activation.
- Active tracking uses a gentle smoothed response. Returning to neutral is
  slower than target acquisition so Clara settles instead of snapping.
- Under reduced motion, do not start a continuous tracking loop. Apply only
  direct, user-driven target and return-to-neutral updates.

The interaction must never change `PASSPORT_FRAME_HEIGHT`,
`PASSPORT_FRAME_X`, `PASSPORT_FRAME_Y`, the projection matrix, canvas CSS
position, stage dimensions, scale, or crop. Head follow and body follow are
internal parameter rotations only. Body response must read as a slight sway
inside the fixed passport frame; it must never translate Clara toward the
pointer.

## Layered Teaching Presentation and Speaking

Clara has one base emotion at a time:

```ts
type ClaraEmotion = "default" | "happy" | "thinking" | "confused";
```

The approved base states are constructed directly from compiled model
parameters:

| State | Required parameter behavior |
| --- | --- |
| `default` | Restore every controlled expression parameter to model defaults |
| `happy` | Close both eyes, enable both eye smiles, and use smiling mouth form |
| `thinking` | Close both eyes while keeping eye smiles and mouth form at defaults |
| `confused` | Use questioning brows, a gentle head tilt, and question-mark artwork |

Base emotion is only the first layer. The complete state is:

```text
base emotion
    + teaching behavior
    + optional approved cue
    + speaking overlay
```

The approved teaching behavior values are:

```ts
type ClaraTeachingBehavior =
  | "neutral"
  | "listening"
  | "encouraging"
  | "gentle_correction"
  | "demonstrating"
  | "celebrating";
```

| Teaching behavior | Runtime presentation |
| --- | --- |
| `neutral` | No teaching-specific override |
| `listening` | Open attentive face, closed mouth, and subtly raised brows |
| `encouraging` | Soft smile, raised brows, and a small cheek response |
| `gentle_correction` | Calm mouth and concerned but non-negative brows |
| `demonstrating` | Attentive face with teaching gaze directed toward the item |
| `celebrating` | Closed-eye smile with optional blush and restrained bounce |

Approved optional cues are `none`, `question_mark`, and `blush`. The question
mark is reserved for genuine confusion. Blush is reserved for positive
celebration. `Param20` (sad), `Param21` (angry), and `Param23` (dizzy) are not
part of the controlled parameter contract and must never react to learner
evidence.

Controlled expression parameters:

| Parameter group | Parameters | Runtime responsibility |
| --- | --- | --- |
| Eyes | `ParamEyeLOpen`, `ParamEyeROpen`, `ParamEyeLSmile`, `ParamEyeRSmile` | Attentive, happy, and thinking eye states |
| Brows | `ParamBrowLY`, `ParamBrowRY`, `ParamBrowLAngle`, `ParamBrowRAngle`, `ParamBrowLForm`, `ParamBrowRForm` | Encouragement, attention, and gentle correction |
| Mouth | `ParamMouthForm`, `ParamMouthOpenY` | Expression mouth form plus independent speaking |
| Cheek | `ParamCheek` | Restrained positive response |
| Head | `ParamAngleZ` | Small questioning tilt only |
| Bounce | `Param4`, `Param6` | Positive celebration motion only |
| Cues | `Param22`, `Param24` | Blush and question-mark artwork |

The runtime implementation is
`apps/web/src/features/intro/live2d/ClaraPresentation.ts` plus
`ClaraExpressionController.ts`. The controller must read the model's own
minimum, default, and maximum values rather than duplicating numeric bounds
throughout the frontend. Facial transitions ease between targets.
Reduced-motion mode applies the communicative face immediately and removes
celebration bounce.

`ClaraModelTeachingParameterContract.test.ts` verifies that every controlled
teaching parameter remains present in Clara's exported display metadata and
that sad, angry, and dizzy remain excluded. The runtime constructor performs
the final required-parameter validation against the loaded compiled model.

### Teaching Gaze Priority

Pointer and touch tracking remain the default global gaze source. While the
active behavior is `demonstrating`, the shared presentation controller
temporarily supplies a fixed gaze toward the lesson item. The fixed crop,
canvas, scale, and CSS position never move. When demonstration ends, the
existing look controller smoothly resumes the current pointer or touch target.

Under reduced motion, teaching gaze still changes the eyes and head because it
communicates instructional focus; continuous bounce and physics remain off.

Lesson 1 currently maps presentation deterministically:

| Lesson state | Clara presentation |
| --- | --- |
| Mission guidance | `default + demonstrating` |
| Waiting for learner response | `default + listening` |
| ASR processing | `thinking + neutral` |
| Correct committed response | `default + encouraging` |
| Needs-support committed response | `default + gentle_correction` |
| Lesson completion | `happy + celebrating + blush` |

### Eye Catchlight Visibility

The catchlights must follow their corresponding eye-open parameters:

| Catchlight  | Eye parameter   |
| ----------- | --------------- |
| `ArtMesh47` | `ParamEyeROpen` |
| `ArtMesh65` | `ParamEyeLOpen` |

At the eye parameter's minimum value, the catchlight drawable opacity must be
`0`. Between the minimum and default eye-open values, its opacity must scale
proportionally; at or above the default value, it must remain fully visible.
This prevents catchlights from floating over closed eyelids in `happy`,
`thinking`, and natural blink states.

### Speaking Is an Independent Overlay

Speaking is not a base emotion. It controls only `ParamMouthOpenY`, after the
base emotion and teaching behavior have selected their facial state. This
allows Clara to speak while retaining her current base emotion, teaching
behavior, and approved cue.

`ClaraStage` accepts:

```tsx
<ClaraStage
  emotion="happy"
  speaking={isNoxPlaying}
  speechLevel={normalizedNoxAudioLevel}
/>
```

- `speechLevel` is optional and is normalized to `0` through `1`.
- Values outside that interval must be clamped by the expression controller.
- When `speaking` is `true` and an audio level is supplied, the mouth must
  follow that level.
- When `speaking` is `true` without an audio level, the renderer may use its
  gentle procedural mouth cycle as a boolean-only fallback.
- When `speaking` becomes `false`, the mouth-open parameter must immediately
  return to its model default without changing the active emotion.
- Under reduced motion, boolean-only speaking uses one stable partially open
  mouth. Supplied audio-level changes may still update the mouth without
  enabling breathing or physics.

The active TTS adapter, currently backed by VoxCPM2, owns playback state and
audio-envelope extraction.
When Ma'am Clara says an isolated A-Z letter, the active TTS adapter must use
`READIRECT_REVAMP_ISOLATED_LETTER_PRONUNCIATION_STANDARD.md`; Clara's expression
or speaking animation must never determine the letter pronunciation.
It must send `speaking=true` only during audible playback and should update
`speechLevel` from the actual output signal. It must not directly write eye,
mouth-form, confused, glasses, color, or drawable parameters.

### Lesson Intro Speech Gate

Every dashboard primary reading action enters the shared Lesson Intro before
an assessment or lesson. Lesson Intro keeps Clara in the `happy` base emotion
and applies the independent `speaking` overlay only while its approved,
published catalog line is audibly playing. Fixed Lesson Intro and assessment
speech must never invoke runtime synthesis.

The browser must derive `speechLevel` from the actual playback signal when the
Web Audio API is available. Catalog fetch completion, any separate runtime TTS
preparation, and audio decoding do not count as completed speech. The
`Continue` button remains disabled until the playback source emits its terminal
`ended` event. If preparation or playback fails, Continue remains disabled and
the learner is offered a retry.

The initial Lesson Intro line uses the semantic `lesson-intro` speech key from
the published `clara-sh-v1` catalog. Catalog paths stay server-owned; React
requests a named speech key and never selects a filesystem path.

### Global Live2D-Ready Speech Gate

This is a hard rule for every page that contains Ma'am Clara: TTS playback must
not begin while Clara's Live2D model is loading. The currently mounted shared
`ClaraStage` must explicitly report `ready` before an audio source may start.

Speech fetching, synthesis, caching, and audio decoding may run in parallel
with model loading. Only audible playback is gated. The required order is:

```text
prepare Clara speech + initialize Live2D in parallel
                         |
wait until speech is prepared AND ClaraStage is ready
                         |
start playback -> set speaking=true -> drive speechLevel
```

- Showing the CSS loading pulse or reveal cover does not satisfy the gate.
- A previous page's ready state does not satisfy the gate. Every newly mounted
  Clara stage begins as not ready.
- `loading`, `revealing`, and `error` must all block playback.
- `speaking` remains `false` and `speechLevel` remains `0` while waiting.
- A prepared line must remain queued rather than being regenerated solely
  because Clara is still loading.
- Pages must consume the readiness signal exposed by the shared `ClaraStage`;
  they must not infer readiness from a timer, animation duration, canvas
  presence, loader animation phase, or network completion.
- The shared Clara playback helper requires the current model state and must
  reject playback unless that state is exactly `ready`.

Do not load `EditColourAndAccessories.exp3.json` as an emotion. It conflicts
with the approved theme variables, glasses selector, skin palette, and hidden
accessory rules.

### Intro Expression Cycle

The intro screen must cycle Clara's base emotion every `2000ms` in this exact
repeating order:

```text
default -> happy -> confused -> thinking -> default
```

The sequence begins at `default` when the intro mounts. It must use a fixed
ordered list and modulo advancement; random selection and shuffled expressions
are prohibited. The interval must be cleared when the intro unmounts. When
reduced motion is requested, the interval must not run and Clara must remain on
`default`.

## Loading, Reveal Transition, and Accessibility

The stage has four visual runtime states:

| State       | Presentation                                                    |
| ----------- | --------------------------------------------------------------- |
| `loading`   | Show the centered CSS wave while Live2D initializes invisibly   |
| `revealing` | Expand the wave core into the full-screen hair-color transition |
| `ready`     | Hide the transition and show the first-rendered Live2D canvas   |
| `error`     | Keep a static muted CSS core and continue blocking Clara speech |

The loading indicator is CSS-only. Its solid core is `40px` (`2.5rem`), which
is 200% of the original `20px` indicator. Two circular outline waves expand
from that core on a `1500ms` loop; the second wave starts `600ms` after the
first. The waves must be made with the core element's `::before` and `::after`
pseudo-elements. It must not use a PNG, GIF, video, encoded SVG, canvas
animation, or third-party loader package. Both `--color-clara-loader-wave` and
`--color-clara-loader-cover` must resolve to `--color-clara-hair`, so the wave
and complete viewport cover always match Clara's theme-aware primary hair
color.

The wave origin is the measured center of Clara's canonical square stage, not
the center of the screen. The shared stage must update this origin when its
square or the viewport resizes. The loader is portaled to the document body so
its full-screen cover cannot be trapped beneath the Clara dock, activity
controls, or another local stacking context.

The renderer must draw one complete Live2D frame while its canvas is still
hidden. Only after that successful first render may it report renderer-ready
and start this exact `3000ms` visual sequence:

```text
0ms    wave core begins expanding from the center of Clara's square
2000ms hair-color cover fills the viewport; reveal Live2D underneath
2200ms full-cover hold ends
3000ms cover reaches zero opacity; stage reports ready
```

The cover must use the same `220vmax` circle, expansion ratios, and
`cubic-bezier(0.2, 0.8, 0.2, 1)` flow as the canonical white transition. The
expansion itself lasts two seconds. At `66.6667%` of the complete three-second
sequence, the viewport is fully covered and the already rendered Live2D canvas
becomes visible beneath it. The cover remains opaque through `73.3333%`, then
uses the final `800ms` for a slower seamless fade.

The external Clara readiness gate must remain closed for both `loading` and
`revealing`. It changes to `ready` only after the complete three-second reveal,
so TTS cannot begin behind the active cover. Under `prefers-reduced-motion`, skip
the wave and cover animation, reveal the first-rendered canvas immediately,
and then report ready.

The loader is a fixed viewport overlay and temporarily blocks pointer and touch
interaction while Clara initializes or reveals. It must appear above ordinary
page content but below an active route-level Link Start transition. It must not
change the Clara canvas dimensions, model matrix, crop, placement, scale, or
motion behavior.

### TTS Warm-Up Loader and Loader Priority

Every learner flow that prepares Clara speech must use the shared
`ClaraSpeechWarmupLoader`. This second loader represents voice preparation
only; it must never be used as a substitute for the Live2D wave and reveal.

The loading hierarchy is mandatory:

```text
route-level transition
  > Clara Live2D wave and reveal
  > Clara TTS warm-up cube
  > interactive page
```

The TTS request may continue in parallel while Live2D loads, but the cube must
not render until `ClaraStage` reports `ready`. If the voice is ready before the
model reveal finishes, the cube is skipped completely. If the model becomes
unready while the cube is present, remove the cube immediately so its exit fade
cannot overlap the higher-priority model loader.

While visible, the TTS loader must:

- use a fixed viewport overlay and remain centered on the screen, independent
  of Clara's stage position;
- block pointer and touch input;
- dim the page by exactly 20% through
  `--color-clara-speech-loader-scrim`;
- render the shared CSS-only wireframe cube using
  `--color-clara-speech-loader-line` and
  `--color-clara-speech-loader-glow`;
- rotate on a continuous `2000ms` linear loop;
- fade in and out over `420ms` with an ease-in-out curve;
- fade away as soon as the requested speech blob is ready, before ordinary
  learner interaction becomes available; and
- disable cube rotation and remove fade duration under
  `prefers-reduced-motion`.

The cube, glow, and scrim colors must remain semantic design tokens. Page
components may not hard-code loader colors or create private TTS spinners.

Accessibility requirements:

- The figure must use `aria-label="Ma'am Clara"`.
- The canvas must use `aria-hidden="true"` because the figure supplies the
  accessible name.
- The visual wave and cover must use `aria-hidden="true"`.
- The TTS cube itself must be hidden from assistive technology while its fixed
  overlay exposes one polite `status` named `Preparing Ma'am Clara's voice`.
- Loading, error, and ready states must be announced through one visually
  hidden status region owned by the shared Clara stage.
- The canvas must not accept pointer events.

## Visual Prohibitions

Never:

- Change the approved crop per route or breakpoint.
- Show Clara as a distant full-body character in the standard portrait stage.
- Add a circular platform, pedestal, ground ellipse, or floor shadow below her.
- Use a non-square learner-facing Clara portrait.
- Stretch, squash, rotate, or mirror the canvas to make it fit.
- Place gradients, scenery, textures, or decorative clutter behind the model.
- Apply CSS `object-fit` rules to the WebGL canvas as a substitute for the
  approved model matrix.
- Use `centerX()` or `top()` to recreate the approved crop.
- Rename Ma'am Clara to CherryGoth in learner-facing content.
- Display Clara's original choker or substitute another neck accessory without
  explicit design approval.
- Reintroduce pink hair or pink hoodie strings in the standard Ma'am Clara
  presentation.
- Recolor Clara's hoodie away from its approved black without explicit design
  approval.
- Hard-code Clara's colors in TypeScript, the renderer, or a page component.

## Change Control

Any proposed crop change must be treated as a visual-design change, not a
responsive implementation detail. It requires:

1. Explicit approval from the project owner.
2. A screenshot comparison against the currently approved crop.
3. Verification on mobile portrait, tablet/desktop, and short landscape.
4. Updating the constants and numerical table in this document.
5. Updating every Clara renderer that does not import the canonical values.
6. Running formatting, type checks, tests, and a production build.

Without explicit approval, implementations must use:

```text
Height: 4.55
X:      0
Y:     -1.28015625
Ratio:  1 / 1
```

## Acceptance Checklist

A Ma'am Clara implementation is compliant only when:

- [ ] The stage is a responsive square.
- [ ] The matrix values are exactly `4.55`, `0`, and `-1.28015625`.
- [ ] Clara is horizontally centered.
- [ ] The approved head-and-upper-torso crop matches the intro page.
- [ ] The top of her hair remains inside the square during idle motion.
- [ ] The `collar` drawable is hidden and no choker is visible.
- [ ] Clara has meadow-green hair, black glasses, warm orange skin, a black
      hoodie, and beige hoodie strings.
- [ ] The secondary and deep hair meshes remain darker than her main hair.
- [ ] Clara's colors are read from semantic theme variables.
- [ ] No platform or ground decoration is present.
- [ ] The background remains transparent and visually minimal.
- [ ] The CSS wave and three-second hair-color reveal replace the raster
      fallback.
- [ ] Ready is reported only after the first frame and reveal both complete.
- [ ] TTS warm-up uses the centered shared cube only after Clara is ready.
- [ ] The model wave and TTS cube never appear simultaneously.
- [ ] Reduced-motion behavior is respected.
- [ ] Mouse and pen hover drive Clara's eyes, gentle head follow, and slight
      body sway without moving the fixed crop.
- [ ] Touch tracking starts only after the approved swipe or hold threshold;
      ordinary taps do not move Clara.
- [ ] Default, happy, thinking, and confused remain mutually exclusive base
      emotions.
- [ ] Teaching behavior and approved cues layer over the base emotion instead
      of replacing it.
- [ ] Demonstration gaze temporarily overrides pointer tracking and releases
      control smoothly afterward.
- [ ] Sad, angry, and dizzy never react to learner evidence.
- [ ] Reduced motion preserves communicative facial states without celebration
      bounce.
- [ ] Speaking changes only mouth opening and can layer over every base emotion.
- [ ] The UI calls her Ma'am Clara.
- [ ] No page implements a separate Clara pointer tracker or changes the
      canonical tracking amplitudes.
