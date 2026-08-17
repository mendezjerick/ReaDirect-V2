# Offline APK progress reset

The offline dashboard ends with a dedicated `Reset progress` section. It remains visible when the journey is fresh but disables its action until there is local journey progress to remove.

Reset requires a separate confirmation step. The confirmation explicitly identifies the data that will be permanently removed:

- Diagnostic and Final Assessment answers and scores;
- all lesson responses and checkpoints; and
- every connected Reading Journey achievement.

The reset preserves the local reader ID and display name, the device-selected ASR tier and Clara mode, and completed onboarding and intro state. After a successful atomic repository write, the dashboard immediately shows a fresh journey summary and its `Open Journey` action leads to the available Diagnostic Assessment. The user is not returned to onboarding and no network operation is performed.

The section uses the cream dashboard surface, established type and spacing tokens, touch-sized controls, safe responsive wrapping, and a restrained destructive color reserved for the confirmed action.
