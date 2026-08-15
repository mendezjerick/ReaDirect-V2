import { FISHING_SPOTS, type FishingResultId, type FishingSpotId } from "../fishing/fishingSystem";
import { PROTOTYPE_MAP } from "../map/prototypeMap";
import { canOccupy, type Point } from "../physics/collision";
import { PLAYER_CONFIG } from "../player/playerMovement";
import { getWorldRegionAtPoint, type WorldRegionId } from "./worldRegions";
import { STATIONARY_NPCS } from "../content/npcs";

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

export function loadExplorationProgress(storage: Storage = window.localStorage): ExplorationProgress {
  const fallback = createInitialExplorationProgress();
  try {
    const raw = storage.getItem(EXPLORATION_PROGRESS_KEY);
    if (!raw) return fallback;
    const stored = JSON.parse(raw) as Partial<ExplorationProgress>;
    if (stored.version !== 1 || !isSafeExplorationPosition(stored.safePosition)) return fallback;
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
  } catch {
    return fallback;
  }
}

export function saveExplorationProgress(progress: ExplorationProgress, storage: Storage = window.localStorage) {
  try {
    storage.setItem(EXPLORATION_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Exploration remains available when storage is blocked.
  }
}

export function clearExplorationProgress(storage: Storage = window.localStorage) {
  try {
    storage.removeItem(EXPLORATION_PROGRESS_KEY);
  } catch {
    // Nothing else is required when storage is unavailable.
  }
}

export function isSafeExplorationPosition(position: unknown): position is Point {
  if (!position || typeof position !== "object") return false;
  const point = position as Partial<Point>;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const collision = [
    ...PROTOTYPE_MAP.collision,
    ...STATIONARY_NPCS.map((npc) => ({ id: `npc-${npc.id}-safe-position`, ...npc.collisionBase }))
  ];
  return canOccupy(point as Point, PLAYER_CONFIG.radius, { ...PROTOTYPE_MAP, collision });
}

function uniqueStrings(values: unknown) {
  return Array.isArray(values) ? [...new Set(values.filter((value): value is string => typeof value === "string"))] : [];
}
