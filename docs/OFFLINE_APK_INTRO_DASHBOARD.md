# Offline APK intro and dashboard

The first successful device setup opens the cream ReaDirect intro with the device-approved Static or Dynamic Clara. The continue action is unavailable until Clara is visibly ready. Continuing saves `introCompletedAt` in the private local learner record before the fixed three-second Link Start transition begins. The dashboard appears at the transition's approved route-swap point. Later app launches still warm up the native components but skip the completed intro and open the dashboard directly.

The offline dashboard reads only the local learner journey. It contains:

- Diagnostic Assessment;
- Lessons 1–6 in the required order;
- Final Assessment;
- status, current-step, and completed-lesson indicators; and
- the eight Reading Journey achievements tied to those same completions.

It contains no login, learner code, logout, games, Learn with Clara, network query, or renderer preference control. A dashboard-bottom reset section can clear only local journey progress after explicit confirmation while preserving device setup and the reader profile.

The eight achievement icons are fixed in `apps/web/offline-journey-assets.json` and are checksum-verified and explicitly emitted because the offline Vite target does not copy the public directory.
