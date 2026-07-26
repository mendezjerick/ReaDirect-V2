import { FISHING_SPOTS, type FishingResultId, type FishingSpotId } from "../fishing/fishingSystem";
import { PROTOTYPE_MAP } from "../map/prototypeMap";
import { canOccupy, type Point } from "../physics/collision";
import { PLAYER_CONFIG } from "../player/playerMovement";
import { getWorldRegionAtPoint, type WorldRegionId } from "./worldRegions";
import { NPCS } from "../content/npcs";

export const EXPLORATION_PROGRESS_KEY = "readirect-rpg:exploration-progress:v1";

export type ExplorationProgress = {
  version: 1;
  currentRegionId: WorldRegionId;
  safePosition: Point;
  discoveredFishingSpotIds: readonly FishingSpotId[];
  completedInteractionIds: readonly string[];
  fishingParticipation: number;
  fishingAttempts: number;
  caughtResultIds: readonly FishingResultId[];
};

export function createInitialExplorationProgress(): ExplorationProgress {
  return {
    version: 1,
    currentRegionId: getWorldRegionAtPoint(PROTOTYPE_MAP.startPosition).id,
    safePosition: { ...PROTOTYPE_MAP.startPosition },
    discoveredFishingSpotIds: [],
    completedInteractionIds: [],
    fishingParticipation: 0,
    fishingAttempts: 0,
    caughtResultIds: []
  };
}

export function restoreExplorationProgress(value: unknown): ExplorationProgress | null {
  if (!value || typeof value !== "object") return null;
  const stored = value as Partial<ExplorationProgress>;
  if (stored.version !== 1 || !isSafeExplorationPosition(stored.safePosition)) return null;
  const fallback = createInitialExplorationProgress();
  const knownSpotIds = new Set(FISHING_SPOTS.map(({ id }) => id));
  return {
    ...fallback,
    ...stored,
    safePosition: { ...stored.safePosition },
    currentRegionId: getWorldRegionAtPoint(stored.safePosition).id,
    discoveredFishingSpotIds: (stored.discoveredFishingSpotIds ?? []).filter((id): id is FishingSpotId => knownSpotIds.has(id as FishingSpotId)),
    completedInteractionIds: uniqueStrings(stored.completedInteractionIds),
    fishingParticipation: Math.max(0, Math.floor(stored.fishingParticipation ?? 0)),
    fishingAttempts: Math.max(0, Math.floor(stored.fishingAttempts ?? 0)),
    caughtResultIds: (stored.caughtResultIds ?? []).filter((id): id is FishingResultId => id === "message-bottle" || id === "silver-fish")
  };
}

export function isSafeExplorationPosition(position: unknown): position is Point {
  if (!position || typeof position !== "object") return false;
  const point = position as Partial<Point>;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const collision = [
    ...PROTOTYPE_MAP.collision,
    ...NPCS.map((npc) => ({ id: `npc-${npc.id}-safe-position`, ...npc.collisionBase }))
  ];
  return canOccupy(point as Point, PLAYER_CONFIG.radius, { ...PROTOTYPE_MAP, collision });
}

function uniqueStrings(values: unknown) {
  return Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === "string"))] : [];
}
