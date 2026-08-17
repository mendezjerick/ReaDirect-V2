# Offline APK intro, dashboard, and Journey

The first successful device setup opens main's cream ReaDirect intro with its
theme selector and the device-approved Static or Dynamic Clara. Continue stays
unavailable until Clara is visibly ready. Continuing saves `introCompletedAt`
in the private local learner record before the fixed Link Start transition.
Later launches still warm the native components, then skip the completed intro
and open the dashboard directly.

The offline dashboard uses main's learner dashboard presentation and contains:

- the primary `Your Reading Journey` card and `Open Journey` action;
- completed-lesson and journey status;
- the eight Reading Journey achievements tied to those completions; and
- the confirmed reset-progress control at the very bottom.

`Open Journey` leads to main's Reading Journey page. That page contains the
theme selector, English/Filipino control, Diagnostic, prominent skip
confirmation, Lessons 1-6, and Final Assessment. All lessons become
independently selectable after the Diagnostic is completed or skipped.

The current APK contains the English pre-generated TTS catalog. The same main
English/Filipino control remains visible, but Filipino is disabled until a
Filipino offline catalog is bundled; English audio is never labeled Filipino.

The APK removes only login, learner code, logout, games, Learn with Clara,
network queries, and online account actions. It does not replace main's learner
layout or its responsive behavior.

The eight achievement icons are fixed in
`apps/web/offline-journey-assets.json`. Main's backgrounds, fonts, Journey book
icon, and themed Clara stills are fixed in
`apps/web/offline-main-ui-assets.json`. Both manifests are checksum-verified
and explicitly emitted because the offline target does not copy the public
directory.
