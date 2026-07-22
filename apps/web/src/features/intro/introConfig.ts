import { ROUTE_TRANSITION_PRESS_COMMIT_MS } from "../../components/transitions/RouteTransitionProvider";
import type { ClaraEmotion } from "./live2d/ClaraExpressionController";

export const INTRO_EXPRESSION_SEQUENCE = [
  "default",
  "happy",
  "confused",
  "thinking",
] as const satisfies readonly ClaraEmotion[];

export const INTRO_CENTER_HOLD_MS = 2000;
export const INTRO_ACTION_COMMIT_DELAY_MS = ROUTE_TRANSITION_PRESS_COMMIT_MS;
