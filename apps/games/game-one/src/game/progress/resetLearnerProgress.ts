import { MISSION_PROGRESS_KEY } from "../mission/missionPersistence";
import { NARRATION_MUTED_KEY } from "../narration/useNarration";
import { TYPEWRITER_ENABLED_KEY } from "../narration/useTypewriterText";
import { TUTORIAL_PROGRESS_KEY } from "../tutorial/tutorialState";
import { AUDIO_PREFERENCES_KEY } from "../audio/rpgAudioManager";
import { EXPLORATION_PROGRESS_KEY } from "../world/explorationPersistence";

export const RESET_PROGRESS_PARAMETER = "resetProgress";

export function resetLearnerProgress(storage: Storage = window.localStorage) {
  for (const key of [MISSION_PROGRESS_KEY, TUTORIAL_PROGRESS_KEY, NARRATION_MUTED_KEY, TYPEWRITER_ENABLED_KEY, AUDIO_PREFERENCES_KEY, EXPLORATION_PROGRESS_KEY]) {
    storage.removeItem(key);
  }
}

export function consumeProgressResetRequest() {
  const url = new URL(window.location.href);
  if (url.searchParams.get(RESET_PROGRESS_PARAMETER) !== "all") return false;
  resetLearnerProgress();
  url.searchParams.delete(RESET_PROGRESS_PARAMETER);
  window.history.replaceState(window.history.state, "", url);
  return true;
}
