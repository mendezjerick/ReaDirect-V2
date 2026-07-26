import { NPCS, type NpcId } from "../content/npcs";
import type { CollisionMap, Point, Rectangle } from "../physics/collision";

export type InteractionTarget = {
  id: string;
  kind: "npc";
  label: string;
  description: string;
  position: Point;
  indicatorPosition?: Point;
  enabled: boolean;
  npcId: NpcId;
};

export const INTERACTION_RADIUS = 58;
export const INTERACTION_EXIT_RADIUS = 72;

export function getInteractionTargets(): readonly InteractionTarget[] {
  return NPCS.map((npc) => ({
    id: `npc:${npc.id}`,
    kind: "npc" as const,
    label: npc.interactionLabel,
    description: `${npc.interactionLabel}.`,
    position: npc.interactionPosition,
    indicatorPosition: npc.position,
    npcId: npc.id,
    enabled: true
  }));
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
      .filter((target) => target.enabled && (settings.allowedNpcId === undefined || target.npcId === settings.allowedNpcId))
      .map((target) => ({
        target,
        distance: Math.hypot(target.position.x - playerPosition.x, target.position.y - playerPosition.y)
      }))
      .filter(({ target, distance }) => {
        const threshold = target.id === settings.activeTargetId ? exitRadius : enterRadius;
        return distance <= threshold && (!settings.collisionMap || hasClearInteractionPath(playerPosition, target.position, settings.collisionMap));
      })
      .sort((a, b) => a.distance - b.distance || a.target.id.localeCompare(b.target.id))[0]?.target ?? null
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
