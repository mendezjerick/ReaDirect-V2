# ReaDirect Web Delay and Navigation Analysis

> Read-only investigation performed on August 23, 2026.
>
> Repository branch: `playstore/bugfixing`  
> Repository revision: `1d91937`

## 1. Executive summary

ReaDirect does have user-visible delays, but they are not spread evenly across the web application. Ordinary guest navigation after the learner dashboard has loaded is generally fast. The most significant delays are concentrated in the introductory Clara screen, the animated transition from the intro to the home screen, API availability checks, and potentially the system-administrator overview.

The strongest measured findings are:

- The production intro button took approximately **12.5 to 17.6 seconds** to become usable in normal test runs.
- The production intro-to-home transition took approximately **3.0 seconds**, primarily because the application intentionally runs a 2.6-second route swap inside a 3-second transition.
- A cold intro can request approximately **26.24 MiB** of images and Live2D assets.
- The selected Live2D texture is an **8192 x 8192** image. Its decoded RGBA representation can occupy approximately **256 MiB of GPU memory**, excluding other model and rendering resources.
- Two independent providers request the same intro-settings endpoint during startup. Their different 5-second and 12-second timeouts can make one slow connection appear as multiple availability failures.
- Browser connections to the API were intermittent during testing: direct requests were often around 0.5 seconds, while some browser connections took approximately 21 seconds to establish. The client timeouts convert those slow connections into fallback or unavailable states.
- Once the learner dashboard was available, measured navigation to Journey, Games, Learn with Clara, and Words was normally between **0.1 and 0.5 seconds**.

This evidence indicates that the perceived “delayed buttons” problem is mainly caused by startup work, intentionally long animations, large media assets, duplicated requests, and timeout behavior. It is not primarily a React Router or general button-handler failure.

## 2. Scope and safety boundary

This investigation focused on:

- Web button response and route-transition timing.
- Intro, home, learner dashboard, Learn with Clara, Journey, and Games navigation.
- Client-side API timeout and connectivity behavior.
- Asset and bundle sizes that affect initial interaction readiness.
- Static inspection of staff overview requests that can block on service health checks.

The investigation was read-only. It did **not** modify application source code, tests, dependencies, the SQLite database, build configuration, deployment settings, or live infrastructure.

Authenticated staff flows were not freshly executed because authentication can create session records. Staff delay observations in this report are therefore based on static code analysis unless stated otherwise.

## 3. Relevant system path

The delay-sensitive web flow is:

```text
Browser opens ReaDirect
  -> React providers mount
  -> connectivity and experience settings are requested
  -> theme preview images are loaded
  -> Clara static or Live2D presentation initializes
  -> intro button becomes available
  -> animated route transition runs
  -> home / guest selection
  -> learner dashboard
  -> learner feature route
```

The most relevant implementation points are:

- Route graph and lazy-loaded pages: [`apps/web/src/App.tsx`](../apps/web/src/App.tsx)
- Query defaults: [`apps/web/src/app/queryClient.ts`](../apps/web/src/app/queryClient.ts)
- API timeout policy: [`apps/web/src/lib/apiUrl.ts`](../apps/web/src/lib/apiUrl.ts)
- Connectivity probe: [`apps/web/src/features/connectivity/connectivityProbe.ts`](../apps/web/src/features/connectivity/connectivityProbe.ts)
- Learner experience settings: [`apps/web/src/features/learner-auth/LearnerExperienceProvider.tsx`](../apps/web/src/features/learner-auth/LearnerExperienceProvider.tsx)
- Button press commit hook: [`apps/web/src/components/ui/useButtonCommit.ts`](../apps/web/src/components/ui/useButtonCommit.ts)
- Route transition provider: [`apps/web/src/components/transitions/RouteTransitionProvider.tsx`](../apps/web/src/components/transitions/RouteTransitionProvider.tsx)
- Intro link transition: [`apps/web/src/components/transitions/LinkStartTransition.tsx`](../apps/web/src/components/transitions/LinkStartTransition.tsx)
- Clara stage: [`apps/web/src/features/intro/ClaraStage.tsx`](../apps/web/src/features/intro/ClaraStage.tsx)
- Intro animations and theme selector: [`apps/web/src/styles/index.css`](../apps/web/src/styles/index.css)
- Theme image variables: [`packages/design-tokens/src/colors.css`](../packages/design-tokens/src/colors.css)
- Staff overview aggregation: [`apps/api/app/Services/SystemAdminOverviewService.php`](../apps/api/app/Services/SystemAdminOverviewService.php)

## 4. Measurement results

### 4.1 End-to-end guest navigation

The following measurements were collected with a real Playwright-controlled Chromium browser. They represent observed elapsed time, not a guaranteed service-level objective.

| Interaction | Local | Production | Interpretation |
| --- | ---: | ---: | --- |
| Intro DOM available | 0.837 s | 4.210 s | Production startup varied significantly between runs. |
| Intro DOM to enabled button | 5.071 s | 15.810 s | Main user-visible startup delay. |
| Tap to continue -> home | 2.980 s | 2.968 s | Closely matches the intentional transition duration. |
| Continue as guest -> dashboard | 1.004 s | 0.955 s | Acceptable relative to intro delays. |
| Dashboard -> Learn with Clara | 0.493 s | 0.348 s | Fast after startup. |
| Clara dashboard -> Words | 0.112 s | 0.163 s | Fast after startup. |
| Dashboard -> Journey | 0.323 s | 0.295 s | Fast after startup. |
| Dashboard -> Games | 0.357 s | 0.325 s | Fast after startup. |

No console errors or non-2xx application responses were observed during these completed guest flows.

### 4.2 Reduced-motion comparison

With reduced motion enabled in the browser, production navigation improved substantially:

| Interaction | Production with reduced motion |
| --- | ---: |
| Intro DOM available | 0.807 s |
| Intro button enabled | 12.479 s |
| Tap to continue -> home | 0.100 s |
| Continue as guest -> dashboard | 0.339 s |
| Dashboard -> Learn with Clara | 0.241 s |
| Clara dashboard -> Words | 0.158 s |
| Dashboard -> Journey | 0.209 s |
| Dashboard -> Games | 0.166 s |

This comparison confirms that the approximately 3-second intro-to-home delay is primarily an intentional animation cost. Reduced motion does not remove the heavier intro initialization work.

### 4.3 Public endpoint timing

Three direct requests to each public endpoint produced the following approximate ranges:

| Endpoint | Observed range |
| --- | ---: |
| `https://readirect.org/` | 0.286-0.393 s |
| `https://app.readirect.org/` | 0.318-0.362 s |
| `https://app.readirect.org/home` | 0.325-0.355 s |
| `https://api.readirect.org/up` | 0.542-0.747 s |
| `https://api.readirect.org/api/experience/intro/settings` | 0.505-0.588 s |

These direct measurements show that the API is often responsive. However, separate browser traces intermittently showed approximately **21 seconds** in TCP connection establishment to the same API address. This is a network-path observation, not proof of slow Laravel processing.

Because the application cancels normal requests after 12 seconds and connectivity probes after 5 seconds, a 21-second browser connection cannot complete inside either client deadline. The resulting UI can therefore report an unavailable service even though the network and API later recover.

## 5. Detailed findings

### Finding 1: The intro waits for heavy presentation work

**Severity:** High  
**Confidence:** High

The intro readiness delay correlates with Live2D initialization and large asset downloads. In a controlled browser diagnostic where the settings response was supplied immediately:

- Static Clara became ready in approximately **7.15 seconds**.
- Desktop Live2D became ready in approximately **18.76 to 19.35 seconds**.
- Mobile Live2D became ready in approximately **15.96 seconds** on a cold load and **11.31 seconds** with a warm browser cache.

The principal Live2D texture was 13,258,373 bytes, while its model file was 1,353,472 bytes. The texture dimensions are 8192 x 8192. Decoding that texture to four-channel color requires about 256 MiB before counting mipmaps, intermediate buffers, the model, the canvas, theme images, or other page resources.

**User effect:** The intro button appears delayed or unresponsive even though the application is still initializing presentation assets.

### Finding 2: Theme choices use full-size backgrounds as thumbnails

**Severity:** High  
**Confidence:** High

The theme selector exposes eight preview backgrounds through CSS variables in [`colors.css`](../packages/design-tokens/src/colors.css). The browser loads all eight full-size mobile theme images to display the preview choices.

Measured asset totals:

| Asset group | Approximate transfer size |
| --- | ---: |
| Eight mobile theme preview images | 10.95 MiB |
| Selected desktop background | 1.36 MiB |
| Live2D texture and model | 13.93 MiB |
| Combined cold intro media | 26.24 MiB |

**User effect:** The first interactive screen performs work disproportionate to the small theme swatches visible on screen. Slower phones and networks are affected most.

### Finding 3: The intro route transition intentionally lasts about three seconds

**Severity:** Medium  
**Confidence:** High

[`LinkStartTransition.tsx`](../apps/web/src/components/transitions/LinkStartTransition.tsx) defines a 2,600 ms route swap inside a 3,000 ms transition. The corresponding CSS also contains 3,000 ms reveal and canvas-switch animations.

The measured Tap-to-home time of approximately 2.97-2.98 seconds aligns with these constants. With reduced motion, the same action completed in approximately 0.10 seconds.

**User effect:** A successful tap can feel ignored because navigation is deliberately postponed while the animation completes.

### Finding 4: The same intro settings are requested by two providers

**Severity:** High  
**Confidence:** High

The global connectivity provider probes `/api/experience/intro/settings`, while the learner experience provider also requests the intro settings. A production trace captured both calls being aborted independently:

- Connectivity probe aborted at approximately 5 seconds.
- Experience settings request aborted at approximately 12 seconds.

The standard API timeout is 12 seconds and the connectivity probe timeout is 5 seconds. TanStack Query also retries failed queries once by default.

**User effect:** One slow browser connection can produce duplicated traffic, delayed fallback, repeated loading states, or an incorrect “unavailable” message.

### Finding 5: Experience settings are keyed by navigation history

**Severity:** Medium  
**Confidence:** High

For authenticated learners, [`LearnerExperienceProvider.tsx`](../apps/web/src/features/learner-auth/LearnerExperienceProvider.tsx) includes `location.key` in the query key. React Router changes that key as navigation entries change, so moving between learner pages can create a new cache entry and request experience settings again even when the authenticated user and configuration have not changed.

**User effect:** Navigation that should be client-only may trigger avoidable network work and loading-state churn.

### Finding 6: The shared button hook introduces a small deliberate delay

**Severity:** Low  
**Confidence:** High

[`useButtonCommit.ts`](../apps/web/src/components/ui/useButtonCommit.ts) uses a 180 ms press-commit duration and is referenced throughout many web components. The route transition provider uses a similar 180 ms press state.

This delay is small by itself and can provide useful press feedback. It becomes noticeable when combined with route animations, API requests, lazy imports, or disabled/loading states.

**User effect:** Buttons can feel slightly heavy, but this hook is not the main cause of the multi-second delays.

### Finding 7: The system-admin overview performs sequential service checks

**Severity:** Medium to high for staff pages  
**Confidence:** High from code; runtime timing not freshly authenticated

[`SystemAdminOverviewService.php`](../apps/api/app/Services/SystemAdminOverviewService.php) checks ASR health and then TTS health synchronously while constructing the overview. Each health request permits approximately two seconds. If both speech services are sleeping or unreachable, those checks can add roughly four seconds before the overview response is returned.

**User effect:** The whole system-admin overview can wait for operational service checks that are not essential to rendering its core data.

## 6. Bundle findings

Measured production JavaScript and CSS assets included:

| Bundle | Approximate transfer size |
| --- | ---: |
| Main JavaScript | 424 KiB |
| Main CSS | 319 KiB |
| Game One host chunk | 498 KiB |
| Game Two chunk | 206 KiB |
| Game Alpha chunk | 59 KiB |
| Most lazy route chunks | 3-18 KiB each |

The application already lazy-loads major routes. Bundle size still matters, particularly for games, but the measurements do not identify it as the leading cause of the intro and navigation delays. Media initialization, repeated requests, and transition duration have stronger evidence.

## 7. Root-cause priority matrix

| Priority | Cause | Evidence | Expected benefit if addressed |
| ---: | --- | --- | --- |
| 1 | Live2D blocks intro readiness | 11-19 s readiness; 8192 texture | Very high improvement to first interaction. |
| 2 | Full theme images used as previews | 10.95 MiB for eight swatches | High improvement on cold/mobile loads. |
| 3 | Duplicate intro-settings requests and short probe timeout | Same endpoint aborted at 5 s and 12 s | Fewer false unavailable states and less duplicate traffic. |
| 4 | Three-second route animation | Measured 2.97-2.98 s; reduced motion 0.10 s | Immediate improvement to perceived button response. |
| 5 | Experience query keyed by `location.key` | New cache identity per history entry | Less route-to-route refetching. |
| 6 | Sequential ASR/TTS overview checks | Up to about 4 s combined timeout | Faster and more resilient staff overview. |
| 7 | Global 180 ms press commit | Present across many controls | Small responsiveness improvement; preserve feedback carefully. |

## 8. Recommended remediation order

No remediation was implemented during this investigation. The safest order for later implementation is:

1. **Make the intro usable before Live2D is ready.** Render the static Clara state immediately, enable the primary action, and enhance to Live2D asynchronously when initialization succeeds.
2. **Create dedicated theme thumbnails.** Use small, optimized preview assets instead of loading every full-screen background for the selector.
3. **Shorten or decouple the intro transition.** Navigate promptly after the press is acknowledged and allow non-blocking visual effects to finish independently.
4. **Deduplicate intro settings.** Use one shared query/result for connectivity and experience configuration, and distinguish a slow API from a truly offline device.
5. **Stabilize the experience query key.** Cache by authenticated learner/session identity and relevant configuration version, not by `location.key`.
6. **Move speech health checks out of the blocking overview path.** Cache them, run them concurrently with a strict aggregate budget, or load service health after the main overview renders.
7. **Reduce Live2D texture dimensions.** Validate visual quality at 4096 x 4096 or lower and measure device memory again.
8. **Add real navigation telemetry.** Record click acknowledgement, route request, route commit, API duration, and first usable render so production regressions can be separated by cause.

## 9. Verification plan for future fixes

Each future change should be validated independently so improvements can be attributed correctly.

### Intro targets

- Primary intro action visibly acknowledges a tap within 100 ms.
- Primary intro action is usable within 2 seconds on a warm load and within 4 seconds on a representative cold mobile load.
- Live2D failure or timeout never blocks entering the application.
- Only the selected full background and lightweight theme thumbnails are requested.

### Navigation targets

- Ordinary in-app route changes commit within 500 ms when no data mutation is required.
- A button remains visibly pressed/disabled only while a real transition or mutation is pending.
- Reduced-motion and normal-motion modes use the same route hierarchy and final destination.
- Back navigation follows the intended product parent page rather than replaying unrelated practice history.

### Connectivity targets

- Only one intro-settings request is active per session/configuration identity.
- Offline, API waking, API unavailable, and request timeout states have distinct UI messages.
- A slow health probe does not overwrite the state of a page that has already navigated away.

### Staff overview targets

- Core overview data renders without waiting for ASR or TTS health.
- Speech service health can time out without delaying unrelated administrator controls.

### Regression coverage

- Run existing Vitest and Playwright suites for intro, guest entry, learner navigation, Clara modules, Journey, Games, and staff overview.
- Add browser timing assertions with generous CI-safe thresholds and capture a trace when a threshold fails.
- Test cold cache, warm cache, reduced motion, constrained network, phone portrait, phone landscape, tablet, and desktop viewports.

## 10. Limitations

- Production network timing is inherently variable and represents the test window on August 23, 2026.
- A 21-second browser connection delay establishes that the network path can be slow; it does not identify the responsible network intermediary.
- Staff pages were reviewed statically during this pass because creating an authenticated session would violate the read-only boundary.
- Controlled request fulfillment was used only to isolate client-side presentation cost. It did not mutate the production service.
- Transfer sizes and filenames can change after a new build or asset revision.

## 11. Conclusion

The ordinary ReaDirect learner route system is responsive after startup. The largest user-facing delay is the intro gate, where heavyweight Live2D and theme media, duplicated settings requests, timeout behavior, and a deliberately long transition accumulate before or immediately after a button press.

The first implementation effort should therefore target intro readiness and request deduplication, not broad routing rewrites. After those changes, production timing instrumentation should be used to determine whether any remaining delays originate in the API, the browser-network path, individual route data loaders, or device rendering capacity.

