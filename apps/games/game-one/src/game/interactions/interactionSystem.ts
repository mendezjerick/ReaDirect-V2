import { NPCS, type NpcId } from "../content/npcs";
import { LANDMARKS, type LandmarkId } from "../content/landmarks";
import { SHOPS, type ShopId } from "../content/shops";
import type { CollisionMap, Point, Rectangle } from "../physics/collision";

type InteractionTargetBase = {
  id: string;
  label: string;
  description: string;
  position: Point;
  indicatorPosition?: Point;
  enabled: boolean;
  optional?: boolean;
};

export type NpcInteractionTarget = InteractionTargetBase & {
  kind: "npc";
  npcId: NpcId;
};

export type LandmarkInteractionTarget = InteractionTargetBase & {
  kind: "landmark";
  landmarkId: LandmarkId;
  optional: true;
};

export type ShopInteractionTarget = InteractionTargetBase & {
  kind: "shop";
  shopId: ShopId;
  optional: true;
};

export type InteractionTarget = NpcInteractionTarget | LandmarkInteractionTarget | ShopInteractionTarget;

export const INTERACTION_RADIUS = 58;
export const INTERACTION_EXIT_RADIUS = 72;

export function getInteractionTargets(): readonly InteractionTarget[] {
  const npcTargets: readonly NpcInteractionTarget[] = NPCS.map((npc) => ({
    id: `npc:${npc.id}`,
    kind: "npc" as const,
    label: npc.interactionLabel,
    description: `${npc.interactionLabel}.`,
    position: npc.interactionPosition,
    indicatorPosition: npc.position,
    npcId: npc.id,
    optional: npc.movement === "ambient",
    enabled: true
  }));
  const landmarkTargets: readonly LandmarkInteractionTarget[] = LANDMARKS.map((landmark) => ({
    id: `landmark:${landmark.id}`,
    kind: "landmark" as const,
    label: landmark.interactionLabel,
    description: `${landmark.interactionLabel}.`,
    position: landmark.position,
    indicatorPosition: landmark.indicatorPosition,
    landmarkId: landmark.id,
    optional: true,
    enabled: true
  }));
  const shopTargets: readonly ShopInteractionTarget[] = SHOPS.map((shop) => ({
    id: `shop:${shop.id}`,
    kind: "shop" as const,
    label: shop.interactionLabel.en,
    description: shop.description.en,
    position: shop.entrancePosition,
    indicatorPosition: shop.indicatorPosition,
    shopId: shop.id,
    optional: true,
    enabled: true
  }));
  return [...npcTargets, ...landmarkTargets, ...shopTargets];
}

export function selectClosestInteraction(
  playerPosition: Point,
  targets: readonly InteractionTarget[],
  options: number | {
    radius?: number;
    exitRadius?: number;
    activeTargetId?: string | null;
    allowedNpcId?: NpcId | null;
    collisionMap?: CollisionMap;
  } = INTERACTION_RADIUS
) {
  const settings = typeof options === "number" ? { radius: options } : options;
  const enterRadius = settings.radius ?? INTERACTION_RADIUS;
  const exitRadius = settings.exitRadius ?? INTERACTION_EXIT_RADIUS;
  return (
    targets
      .filter((target) =>
        target.enabled
        && (
          settings.allowedNpcId === undefined
          || target.kind !== "npc"
          || target.npcId === settings.allowedNpcId
          || target.optional === true
        )
      )
      .map((target) => ({
        target,
        distance: Math.hypot(target.position.x - playerPosition.x, target.position.y - playerPosition.y)
      }))
      .filter(({ target, distance }) => {
        const threshold = target.id === settings.activeTargetId ? exitRadius : enterRadius;
        return distance <= threshold && (!settings.collisionMap || hasClearInteractionPath(playerPosition, target.position, settings.collisionMap));
      })
      .sort((a, b) => {
        const aPriority = settings.allowedNpcId && a.target.kind === "npc" && a.target.npcId === settings.allowedNpcId ? 0 : 1;
        const bPriority = settings.allowedNpcId && b.target.kind === "npc" && b.target.npcId === settings.allowedNpcId ? 0 : 1;
        return aPriority - bPriority
          || a.distance - b.distance
          || a.target.id.localeCompare(b.target.id);
      })[0]?.target ?? null
  );
}

export function hasClearInteractionPath(player: Point, target: Point, map: CollisionMap) {
  if (!map.isWalkablePoint && map.collision.length === 0) return true;
  const distance = Math.hypot(target.x - player.x, target.y - player.y);
  const steps = Math.max(2, Math.ceil(distance / 8));
  for (let step = 1; step < steps; step += 1) {
    const amount = step / steps;
    const point = {
      x: player.x + (target.x - player.x) * amount,
      y: player.y + (target.y - player.y) * amount
    };
    if (map.isWalkablePoint && !map.isWalkablePoint(point)) return false;
    if (map.collision.some((obstacle) => pointInsideRectangle(point, obstacle))) return false;
  }
  return true;
}

function pointInsideRectangle(point: Point, rectangle: Rectangle) {
  return point.x > rectangle.x && point.x < rectangle.x + rectangle.width &&
    point.y > rectangle.y && point.y < rectangle.y + rectangle.height;
}

export function createInteractionGuard(minimumIntervalMs = 180, now = () => Date.now()) {
  let lastActivation = Number.NEGATIVE_INFINITY;

  return {
    activate(callback: () => void) {
      const timestamp = now();
      if (timestamp - lastActivation < minimumIntervalMs) return false;
      lastActivation = timestamp;
      callback();
      return true;
    }
  };
}
