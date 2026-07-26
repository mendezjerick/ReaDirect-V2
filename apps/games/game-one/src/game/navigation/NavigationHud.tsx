import { useEffect, useId, useState } from "react";
import { getMission, MISSIONS } from "../content/missions";
import { getNpc, type NpcId } from "../content/npcs";
import { getCurrentObjective, type MissionState } from "../mission/missionState";
import { getTileKind, getWorldSize, PROTOTYPE_MAP, TILE_SIZE, type TileKind } from "../map/prototypeMap";
import type { Facing } from "../player/playerMovement";
import { facingAngle, getCircularMinimapMarker, getGuideProgress, getNavigationDirection, getSafeGuidePoints, MINIMAP_CENTER, MINIMAP_VIEW_SIZE, MINIMAP_WORLD_SCALE, shouldShowGuideDots } from "./navigationModel";
import { getUiCopy } from "../localization/language";
import { FISHING_SPOTS, type FishingSpotId } from "../fishing/fishingSystem";
import { getWorldRegionLabel, type WorldRegionId } from "../world/worldRegions";

export type PlayerNavigationState = {
  position: { x: number; y: number };
  facing: Facing;
};

type NavigationHudProps = {
  missionState: MissionState;
  player: PlayerNavigationState;
  mapOpen: boolean;
  showPath: boolean;
  interactionAvailable?: boolean;
  currentRegionId?: WorldRegionId;
  discoveredFishingSpotIds?: readonly FishingSpotId[];
  onOpenMap: () => void;
  onCloseMap: () => void;
  onTogglePath: () => void;
};

const WORLD = getWorldSize();
const TERRAIN_PATHS = buildTerrainPaths();
const BLOCKED_PATH = PROTOTYPE_MAP.visualObjects
  .filter((object) => object.blocksMovement && object.hitbox)
  .map(({ hitbox }) => rectanglePath(hitbox!.x, hitbox!.y, hitbox!.width, hitbox!.height))
  .join("");

export function NavigationHud({
  missionState,
  player,
  mapOpen,
  showPath,
  interactionAvailable = false,
  currentRegionId = "village",
  discoveredFishingSpotIds = [],
  onOpenMap,
  onCloseMap,
  onTogglePath
}: NavigationHudProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [targetSelected, setTargetSelected] = useState(false);
  const copy = getUiCopy(missionState.language);
  const mission = getMission(missionState.missionId, missionState.language);
  const objective = getCurrentObjective(missionState);
  const target = missionState.stage === "approachStoryCharacter" && !missionState.activityCompleted
    ? getNpc(mission.npcId)
    : null;
  const direction = target ? getNavigationDirection(player.position, target.interactionPosition) : null;
  const showGuideDots = Boolean(
    showPath && target && shouldShowGuideDots(player.position, target.interactionPosition)
  );
  const guideProgress = target ? getGuideProgress(player.position, target.interactionPosition) : 0;

  useEffect(() => {
    if (!mapOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseMap();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mapOpen, onCloseMap]);

  return (
    <>
      <aside className={`navigation-hud ${collapsed ? "is-collapsed" : ""}`} aria-label={missionState.language === "fil" ? "Gabay sa misyon at mapa" : "Mission navigation and map"}>
        <section className="mission-objective navigation-mission-panel" data-tutorial="mission-panel" aria-label={copy.currentObjective}>
          <div className="navigation-mission-copy">
            <p className="navigation-mission-progress">{copy.mission} {missionState.missionIndex + 1} {copy.of} {MISSIONS.length}</p>
            {!collapsed && <p className="navigation-objective">{objective.label}</p>}
          </div>
          {target && direction && (
            <div className={`mission-direction ${direction.nearby ? "is-nearby" : ""}`} data-tutorial="direction-arrow">
              {direction.nearby ? (
                <span className="nearby-indicator" aria-label={`${copy.nearby}: ${target.displayName}`}>{interactionAvailable ? copy.interact : missionState.language === "fil" ? "Malapit na!" : "You're near!"}</span>
              ) : (
                <span
                  className="pixel-direction-arrow"
                  role="img"
                  aria-label={missionState.language === "fil" ? `Direksiyon papunta kay ${target.displayName}` : `Direction to ${target.displayName}`}
                  style={{ transform: `rotate(${direction.angle}deg)` }}
                />
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={!collapsed}
            aria-label={collapsed ? copy.expandObjective : copy.collapseObjective}
            className="navigation-collapse"
          >
            {collapsed ? "+" : "-"}
          </button>
          {!collapsed && target && showGuideDots && (
            <div className="navigation-trail-guide" data-tutorial="navigation-trail" aria-label={copy.followDots}>
              <div className="navigation-guide-heading"><strong>{copy.followDots}</strong><span>{guideProgress}%</span></div>
              <div className="navigation-proximity-meter" role="progressbar" aria-label={missionState.language === "fil" ? `Lapit kay ${target.displayName}` : `Progress toward ${target.displayName}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={guideProgress}>
                {Array.from({ length: 5 }, (_, index) => <span key={index} className={guideProgress >= (index + 1) * 20 ? "is-filled" : ""} />)}
              </div>
            </div>
          )}
        </section>

        <button type="button" className="minimap-shell" data-tutorial="minimap" onClick={onOpenMap} aria-label={copy.openMap}>
          <span className="minimap-title"><strong>{copy.map}<small>{getWorldRegionLabel(currentRegionId, missionState.language)}</small></strong><span aria-label={missionState.language === "fil" ? "Hilaga" : "North"}>N</span></span>
          <MiniMap missionState={missionState} player={player} targetId={target?.id ?? null} showLabels={false} showPath={showPath} discoveredFishingSpotIds={discoveredFishingSpotIds} />
          <span className="minimap-open-label">{copy.openMap}</span>
        </button>
      </aside>

      {mapOpen && (
        <div className="map-overlay">
          <section role="dialog" aria-modal="true" aria-labelledby="expanded-map-title" className="expanded-map-panel">
            <header>
              <div><p className="story-eyebrow">{missionState.language === "fil" ? "Narito ka" : "You are here"}</p><h2 id="expanded-map-title">{missionState.language === "fil" ? "Mapa ng Nayon" : "Village Map"}</h2></div>
              <button type="button" onClick={onCloseMap} autoFocus aria-label={copy.closeMap}>X</button>
            </header>
            <p className="expanded-map-objective">{objective.label}</p>
            <WorldMap missionState={missionState} player={player} targetId={target?.id ?? null} showPath={showPath} discoveredFishingSpotIds={discoveredFishingSpotIds} />
            {target && (
              <button type="button" onClick={() => setTargetSelected(true)} className={`expanded-map-target ${targetSelected ? "is-selected" : ""}`}>
                <span>{missionState.language === "fil" ? "Kasalukuyang pupuntahan" : "Active destination"}</span><strong>{target.displayName}</strong>
              </button>
            )}
            {targetSelected && <p className="expanded-map-target-objective" role="status">{objective.label}</p>}
            <footer className="expanded-map-actions">
              <button type="button" onClick={onTogglePath} className="map-path-toggle">{showPath ? (missionState.language === "fil" ? "Itago ang Gabay" : "Hide Guide") : (missionState.language === "fil" ? "Ipakita ang Gabay" : "Show Guide")}</button>
              <button type="button" onClick={onCloseMap} className="map-return-button">{missionState.language === "fil" ? "Bumalik sa Laro" : "Return to Game"}</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function MiniMap({
  missionState,
  player,
  targetId,
  showLabels,
  showPath,
  discoveredFishingSpotIds
}: {
  missionState: MissionState;
  player: PlayerNavigationState;
  targetId: string | null;
  showLabels: boolean;
  showPath: boolean;
  discoveredFishingSpotIds: readonly FishingSpotId[];
}) {
  const filipino = missionState.language === "fil";
  const clipId = useId().replace(/:/g, "");
  const target = targetId ? getNpc(targetId as NpcId) : null;
  const unlocked = uniqueUnlockedNpcs(missionState.missionIndex);
  const routePoints = target ? [player.position, ...getSafeGuidePoints(player.position, target.interactionPosition)] : [];
  const terrainTransform = `translate(${MINIMAP_CENTER - player.position.x * MINIMAP_WORLD_SCALE} ${MINIMAP_CENTER - player.position.y * MINIMAP_WORLD_SCALE}) scale(${MINIMAP_WORLD_SCALE})`;
  const targetMarker = target ? getCircularMinimapMarker(player.position, target.position) : null;
  const direction = target ? getNavigationDirection(player.position, target.interactionPosition) : null;
  return (
    <svg className="minimap circular-minimap" viewBox={`0 0 ${MINIMAP_VIEW_SIZE} ${MINIMAP_VIEW_SIZE}`} role="img" aria-label={filipino ? "Mapa na nagpapakita ng iyong lugar at layunin" : "Player-centered map showing your position and current mission target"}>
      <title>{filipino ? "Mapa ng nayon na nakaturo sa hilaga" : "North-up village map"}</title>
      <defs><clipPath id={clipId}><circle cx={MINIMAP_CENTER} cy={MINIMAP_CENTER} r="108" /></clipPath></defs>
      <g clipPath={`url(#${clipId})`} className="minimap-clipped-content">
        <g className="minimap-panning-world" transform={terrainTransform}>
          <rect width={WORLD.width} height={WORLD.height} className="minimap-grass" />
          {TERRAIN_PATHS.map(({ kind, path }) => <path key={kind} d={path} className={`minimap-${kind}`} />)}
          <path d={BLOCKED_PATH} className="minimap-blocked" />
          {showPath && routePoints.length > 1 && <polyline points={routePoints.map((point) => `${point.x},${point.y}`).join(" ")} className="minimap-route" />}
          {unlocked.map((npc) => npc.id === targetId ? null : <circle key={npc.id} cx={npc.position.x} cy={npc.position.y} r="10" className="minimap-location" />)}
          {FISHING_SPOTS.filter((spot) => discoveredFishingSpotIds.includes(spot.id)).map((spot) => <rect key={spot.id} x={spot.markerPosition.x - 8} y={spot.markerPosition.y - 8} width="16" height="16" className="minimap-fishing-spot" />)}
        </g>
        {targetMarker && <path d="M 0 -10 L 9 0 L 0 10 L -9 0 Z" transform={`translate(${targetMarker.x} ${targetMarker.y}) rotate(${targetMarker.clamped ? targetMarker.angle + 45 : 0})`} className={`minimap-target ${direction?.nearby ? "is-nearby" : ""} ${targetMarker.clamped ? "is-edge" : ""}`} />}
        <path d="M 0 -12 L 9 10 L 0 6 L -9 10 Z" transform={`translate(${MINIMAP_CENTER} ${MINIMAP_CENTER}) rotate(${facingAngle(player.facing) + 90})`} className="minimap-player" />
      </g>
      <circle cx={MINIMAP_CENTER} cy={MINIMAP_CENTER} r="109" className="minimap-border" />
      {showLabels && <text x={MINIMAP_CENTER} y="224" textAnchor="middle">{filipino ? "Narito ka" : "You are here"}</text>}
    </svg>
  );
}

function WorldMap({ missionState, player, targetId, showPath, discoveredFishingSpotIds }: { missionState: MissionState; player: PlayerNavigationState; targetId: string | null; showPath: boolean; discoveredFishingSpotIds: readonly FishingSpotId[] }) {
  const filipino = missionState.language === "fil";
  const target = targetId ? getNpc(targetId as NpcId) : null;
  const unlocked = uniqueUnlockedNpcs(missionState.missionIndex);
  const routePoints = target ? [player.position, ...getSafeGuidePoints(player.position, target.interactionPosition)] : [];
  return (
    <svg className="expanded-world-map" viewBox={`0 0 ${WORLD.width} ${WORLD.height}`} role="img" aria-label={filipino ? "Malaking mapa ng nayon" : "Expanded village map"}>
      <rect width={WORLD.width} height={WORLD.height} className="minimap-grass" />
      {TERRAIN_PATHS.map(({ kind, path }) => <path key={kind} d={path} className={`minimap-${kind}`} />)}
      <path d={BLOCKED_PATH} className="minimap-blocked" />
      {showPath && routePoints.length > 1 && <polyline points={routePoints.map((point) => `${point.x},${point.y}`).join(" ")} className="minimap-route" />}
      {unlocked.map((npc) => <g key={npc.id}><circle cx={npc.position.x} cy={npc.position.y} r="12" className="minimap-location" /><text x={npc.position.x + 20} y={npc.position.y - 12}>{npc.displayName}</text></g>)}
      {FISHING_SPOTS.filter((spot) => discoveredFishingSpotIds.includes(spot.id)).map((spot) => <g key={spot.id}><rect x={spot.markerPosition.x - 10} y={spot.markerPosition.y - 10} width="20" height="20" className="minimap-fishing-spot" /><text x={spot.markerPosition.x + 18} y={spot.markerPosition.y + 8}>{spot.labels[missionState.language]}</text></g>)}
      {target && <path d="M 0 -18 L 18 0 L 0 18 L -18 0 Z" transform={`translate(${target.position.x} ${target.position.y})`} className="minimap-target" />}
      <path d="M 0 -18 L 14 15 L 0 9 L -14 15 Z" transform={`translate(${player.position.x} ${player.position.y}) rotate(${facingAngle(player.facing) + 90})`} className="minimap-player" />
      <text x={player.position.x + 22} y={player.position.y + 8}>{filipino ? "Narito ka" : "You are here"}</text>
    </svg>
  );
}

function buildTerrainPaths() {
  const paths = new Map<TileKind, string>();
  for (let tileY = 0; tileY < PROTOTYPE_MAP.rows; tileY += 1) {
    let start = 0;
    let kind = getTileKind(0, tileY);
    for (let tileX = 1; tileX <= PROTOTYPE_MAP.columns; tileX += 1) {
      const next = tileX < PROTOTYPE_MAP.columns ? getTileKind(tileX, tileY) : null;
      if (next !== kind) {
        const x = start * TILE_SIZE;
        const y = tileY * TILE_SIZE;
        const width = (tileX - start) * TILE_SIZE;
        if (kind !== "grass") {
          paths.set(kind, `${paths.get(kind) ?? ""}${rectanglePath(x, y, width, TILE_SIZE)}`);
        }
        start = tileX;
        if (next) kind = next;
      }
    }
  }
  return Array.from(paths, ([kind, path]) => ({ kind, path }));
}

function rectanglePath(x: number, y: number, width: number, height: number) {
  return `M${x} ${y}h${width}v${height}h-${width}z`;
}

function uniqueUnlockedNpcs(missionIndex: number) {
  return Array.from(
    new Map(
      MISSIONS.slice(0, missionIndex + 1).map((mission) => {
        const npc = getNpc(mission.npcId);
        return [npc.id, npc] as const;
      })
    ).values()
  );
}
