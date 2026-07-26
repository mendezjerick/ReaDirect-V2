import type { GameLanguage } from "../localization/language";
import { TILE_SIZE } from "../map/prototypeMap";
import type { Point } from "../physics/collision";
import type { Facing } from "../player/playerMovement";

export type FishingSpotId = "east-river-bank";
export type FishingResultId = "message-bottle" | "silver-fish";

export type FishingSpot = {
  id: FishingSpotId;
  labels: Record<GameLanguage, string>;
  interactionPosition: Point;
  markerPosition: Point;
  requiredFacing: Facing;
  available: boolean;
};

export type FishingProximity = "hidden" | "nearby" | "face-water" | "ready" | "unavailable";

export const FISHING_SPOTS: readonly FishingSpot[] = [
  {
    id: "east-river-bank",
    labels: { en: "East River Fishing Spot", fil: "Pangisdaan sa Silangang Ilog" },
    interactionPosition: tileCenter(40, 11),
    markerPosition: tileCenter(40, 10),
    requiredFacing: "up",
    available: true
  }
];

export const FISHING_DISCOVERY_RADIUS = 176;
export const FISHING_NEARBY_RADIUS = 104;
export const FISHING_ACTION_RADIUS = 58;

export function getFishingProximity(
  playerPosition: Point,
  facing: Facing,
  spot: FishingSpot,
  overlayOpen = false
): FishingProximity {
  if (overlayOpen) return "hidden";
  const distance = pointDistance(playerPosition, spot.interactionPosition);
  if (distance > FISHING_DISCOVERY_RADIUS) return "hidden";
  if (!spot.available) return "unavailable";
  if (distance > FISHING_NEARBY_RADIUS) return "hidden";
  if (distance > FISHING_ACTION_RADIUS) return "nearby";
  return facing === spot.requiredFacing ? "ready" : "face-water";
}

export function getDiscoveredFishingSpotIds(playerPosition: Point) {
  return FISHING_SPOTS
    .filter((spot) => pointDistance(playerPosition, spot.interactionPosition) <= FISHING_DISCOVERY_RADIUS)
    .map((spot) => spot.id);
}

export type FishingStage = "instructions" | "waiting" | "bite" | "story" | "question" | "feedback" | "complete";

export type FishingSession = {
  stage: FishingStage;
  resultId: FishingResultId | null;
  selectedChoiceId: string | null;
  answerCorrect: boolean | null;
  attempts: number;
};

export type FishingEvent =
  | { type: "CAST" }
  | { type: "BITE" }
  | { type: "PULL"; resultId: FishingResultId }
  | { type: "READ_STORY" }
  | { type: "ANSWER"; choiceId: string; correctChoiceId: string }
  | { type: "TRY_AGAIN" }
  | { type: "FINISH" };

export function createFishingSession(): FishingSession {
  return { stage: "instructions", resultId: null, selectedChoiceId: null, answerCorrect: null, attempts: 0 };
}

export function fishingReducer(state: FishingSession, event: FishingEvent): FishingSession {
  switch (event.type) {
    case "CAST":
      return state.stage === "instructions" ? { ...state, stage: "waiting" } : state;
    case "BITE":
      return state.stage === "waiting" ? { ...state, stage: "bite" } : state;
    case "PULL":
      return state.stage === "bite" ? { ...state, stage: "story", resultId: event.resultId } : state;
    case "READ_STORY":
      return state.stage === "story" ? { ...state, stage: "question" } : state;
    case "ANSWER":
      if (state.stage !== "question") return state;
      return {
        ...state,
        stage: "feedback",
        selectedChoiceId: event.choiceId,
        answerCorrect: event.choiceId === event.correctChoiceId,
        attempts: state.attempts + 1
      };
    case "TRY_AGAIN":
      return state.stage === "feedback" && state.answerCorrect === false
        ? { ...state, stage: "question", selectedChoiceId: null, answerCorrect: null }
        : state;
    case "FINISH":
      return state.stage === "feedback" && state.answerCorrect === true ? { ...state, stage: "complete" } : state;
  }
}

export function chooseFishingResult(caughtResultIds: readonly FishingResultId[], random = Math.random): FishingResultId {
  if (!caughtResultIds.includes("message-bottle")) return "message-bottle";
  return random() < 0.8 ? "silver-fish" : "message-bottle";
}

function pointDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function tileCenter(tileX: number, tileY: number) {
  return { x: (tileX + 0.5) * TILE_SIZE, y: (tileY + 0.5) * TILE_SIZE };
}
