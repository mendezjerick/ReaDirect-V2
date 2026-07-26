import kaplay from "kaplay";
import { getCameraCenter } from "../camera/cameraFollow";
import { GAME_CONFIG, type GameConfig } from "../config/gameConfig";
import { loadGameAssets } from "../assets/loadGameAssets";
import { GAME_ASSETS } from "../assets/assetRegistry";
import {
  createFarmFenceLayer,
  createMangYatoSpriteSheet,
  FARM_FENCE_ASSET_KEY,
  GENERATED_CHARACTER_FRAMES,
  MANG_YATO_ASSET_KEY
} from "../assets/generatedFarmAssets";
import {
  createFruitTreeSpriteSheet,
  FRUIT_TREE_ASSET_KEY,
  FRUIT_TREE_FRAMES
} from "../assets/generatedOrchardAssets";
import {
  createRoamingAnimalSpriteSheet,
  getRoamingAnimalFrame,
  ROAMING_ANIMAL_ASSET_KEY,
  ROAMING_ANIMAL_FRAMES
} from "../assets/generatedAnimalAssets";
import { createGameInputState, directionForKey, type Direction } from "../input/gameInput";
import {
  getAnimatedWaterFrame,
  getMapAreaAtPoint,
  getTerrainAtPoint,
  getTerrainSprite,
  getTileKind,
  PROTOTYPE_MAP,
  TILE_SIZE,
  WATER_ANIMATION_PHASES,
  type TileKind
} from "../map/prototypeMap";
import {
  getBaseFrameForFacing,
  getFacingFromInput,
  getWalkFrameForFacing,
  movePlayer,
  PLAYER_CONFIG,
  type Facing
} from "../player/playerMovement";
import {
  CONNECTED_TALL_GRASS_ASSET_KEY,
  createConnectedTallGrassTileset,
  getTallGrassFrame,
  getTallGrassMotion,
  getTallGrassTileKey,
  getTouchingTallGrassPatches,
  GRASS_CONTACT_POOL_SIZE,
  GRASS_REACTION_SECONDS,
  GRASS_UPDATE_INTERVAL,
  isTallGrassTile,
  TALL_GRASS_ATLAS_COLUMNS,
  TALL_GRASS_FOREGROUND_FRAME,
  TALL_GRASS_SOURCE_TILE_SIZE
} from "../player/connectedTallGrass";
import { NPCS, type NpcId } from "../content/npcs";
import { getSafeGuidePoints, shouldShowGuideDots } from "../navigation/navigationModel";
import { FISHING_SPOTS, type FishingSpot } from "../fishing/fishingSystem";
import { createCollisionLookup, type Point } from "../physics/collision";
import {
  createInteractionGuard,
  getInteractionTargets,
  selectClosestInteraction,
  type InteractionTarget
} from "../interactions/interactionSystem";
import { advanceRoamingAnimal, createRoamingAnimalStates } from "../world/roamingAnimals";

const IS_DEVELOPMENT =
  (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;
const NAVIGATION_UPDATE_DISTANCE = 32;
const INTERACTION_PROMPT_UPDATE_INTERVAL = 0.1;
const RENDER_PIXEL_BUDGET = 960 * 540;

const MISSION_COLLISION = [
  ...PROTOTYPE_MAP.collision,
  ...NPCS.map((npc) => ({
    id: `npc-${npc.id}-base`,
    ...npc.collisionBase
  }))
];

const MISSION_COLLISION_MAP = {
  ...PROTOTYPE_MAP,
  collision: MISSION_COLLISION,
  getNearbyCollision: createCollisionLookup(MISSION_COLLISION, TILE_SIZE * 2)
};

type KaplayCanvasOptions = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  global: false;
  background: string;
  letterbox: true;
  crisp: true;
  pixelDensity: number;
  texFilter: "nearest";
};

type KaplayRuntime = {
  quit?: () => void;
  debug?: {
    paused: boolean;
  };
  paused?: boolean;
  add?: (components: unknown[]) => unknown;
  loadSprite?: (name: string | null, source: string | TexImageSource, options?: Record<string, unknown>) => unknown;
  sprite?: (name: string, options?: Record<string, unknown>) => unknown;
  rect?: (width: number, height: number) => unknown;
  text?: (content: string, options?: Record<string, unknown>) => unknown;
  pos?: (x: number, y: number) => unknown;
  color?: (...rgb: number[]) => unknown;
  scale?: (scale: number) => unknown;
  anchor?: (anchor: string) => unknown;
  outline?: (width: number, color?: unknown) => unknown;
  rotate?: (angle: number) => unknown;
  z?: (value: number) => unknown;
  onUpdate?: (callback: () => void) => { cancel?: () => void };
  dt?: () => number;
  setCamPos?: (x: number, y: number) => void;
  setCamScale?: (x: number, y: number) => void;
  width?: () => number;
  height?: () => number;
  vec2?: (x: number, y: number) => unknown;
  quad?: (x: number, y: number, width: number, height: number) => unknown;
  drawSprite?: (options: {
    sprite: string;
    frame?: number;
    pos: unknown;
    width: number;
    height: number;
    fixed?: boolean;
  }) => void;
};

export type KaplayFactory = (options: KaplayCanvasOptions) => KaplayRuntime;

export type KaplayGameController = {
  canvas: HTMLCanvasElement;
  pause: () => void;
  resume: () => void;
  setTouchDirection: (direction: Direction, active: boolean) => void;
  setAnalogVector: (vector: Point) => void;
  interact: () => boolean;
  setFishingInteraction: (spot: FishingSpot | null) => void;
  setMissionState: (state: {
    activityCompleted: boolean;
    targetNpcId?: NpcId | null;
    showPath?: boolean;
  }) => void;
  resetMission: () => void;
  clearInput: () => void;
  destroy: () => void;
};

export type CreateKaplayGameOptions = {
  config?: GameConfig;
  kaplayFactory?: KaplayFactory;
  initialPosition?: Point;
  onInteractionTargetChange?: (target: InteractionTarget | null) => void;
  onInteractionPromptPosition?: (position: { x: number; y: number } | null) => void;
  onPlayerNavigationChange?: (state: {
    position: { x: number; y: number };
    facing: Facing;
    terrain: ReturnType<typeof getTerrainAtPoint>;
    area: ReturnType<typeof getMapAreaAtPoint>;
  }) => void;
  onMovementAudioState?: (state: {
    moving: boolean;
    terrain: ReturnType<typeof getTerrainAtPoint>;
    area: ReturnType<typeof getMapAreaAtPoint>;
  }) => void;
  onKeyboardDirectionChange?: (direction: Direction, active: boolean) => void;
  onInteract?: (target: InteractionTarget) => void;
  onFish?: (spot: FishingSpot) => void;
};

export function createKaplayGame(
  container: HTMLElement,
  options: CreateKaplayGameOptions = {}
): KaplayGameController {
  if (container.querySelector("canvas[data-kaplay-foundation='true']")) {
    throw new Error("A KAPLAY canvas is already mounted in this container.");
  }

  const config = options.config ?? GAME_CONFIG;
  const canvas = document.createElement("canvas");
  canvas.dataset.kaplayFoundation = "true";
  canvas.setAttribute("aria-label", config.canvasLabel);
  canvas.width = config.logicalWidth;
  canvas.height = config.logicalHeight;
  canvas.style.display = "block";
  canvas.style.maxWidth = "100%";
  canvas.style.maxHeight = "100%";
  canvas.style.touchAction = "none";
  canvas.style.userSelect = "none";
  canvas.style.imageRendering = "pixelated";

  let runtime: KaplayRuntime | null = null;
  let resizeObserver: ResizeObserver | undefined;
  let updateController: { cancel?: () => void } | undefined;
  let sceneController: ReturnType<typeof renderPrototypeScene> | undefined;
  const input = createGameInputState();
  let interactionEnabled = true;
  let activeInteraction: InteractionTarget | null = null;
  let activeFishingSpot: FishingSpot | null = null;
  const interactionGuard = createInteractionGuard();
  const resize = () => fitCanvasToContainer(canvas, container);

  try {
    container.replaceChildren(canvas);
    fitCanvasToContainer(canvas, container);

    const factory = options.kaplayFactory ?? (kaplay as unknown as KaplayFactory);
    const pixelDensity = getRenderPixelDensity(container);
    runtime = factory({
      canvas,
      width: config.logicalWidth,
      height: config.logicalHeight,
      global: false,
      background: config.backgroundColor,
      letterbox: true,
      crisp: true,
      pixelDensity,
      texFilter: "nearest"
    });

    loadGameAssets(runtime);
    sceneController = renderPrototypeScene(runtime, config, input, {
      onInteractionTargetChange: (target) => {
        activeInteraction = target;
        options.onInteractionTargetChange?.(target);
      },
      onInteractionPromptPosition: options.onInteractionPromptPosition,
      onPlayerNavigationChange: options.onPlayerNavigationChange,
      onMovementAudioState: options.onMovementAudioState,
      onPlayerPositionChange: IS_DEVELOPMENT
        ? (position) => {
            canvas.dataset.playerX = String(Math.round(position.x));
            canvas.dataset.playerY = String(Math.round(position.y));
          }
        : undefined
    }, options.initialPosition ?? PROTOTYPE_MAP.startPosition);
    updateController = sceneController.updateController;

    resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
    resizeObserver?.observe(container);
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("orientationchange", onWindowBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
  } catch (error) {
    runtime?.quit?.();
    input.releaseAll();
    canvas.remove();
    if (container.childElementCount === 0) {
      container.textContent = "";
    }
    throw error;
  }

  let destroyed = false;

  return {
    canvas,
    pause: () => {
      interactionEnabled = false;
      releaseInput();
      input.setEnabled(false);
      setRuntimePaused(runtime, true);
    },
    resume: () => {
      interactionEnabled = true;
      input.setEnabled(true);
      setRuntimePaused(runtime, false);
    },
    setTouchDirection: (direction, active) => {
      input.setTouchDirection(direction, active);
    },
    setAnalogVector: (vector) => {
      input.setAnalogVector(vector);
    },
    interact: () => activateInteraction(),
    setFishingInteraction: (spot) => {
      activeFishingSpot = spot;
    },
    setMissionState: (state) => {
      sceneController?.setMissionState(state);
    },
    resetMission: () => {
      releaseInput();
      activeInteraction = null;
      activeFishingSpot = null;
      sceneController?.reset();
    },
    clearInput: () => {
      releaseInput();
    },
    destroy: () => {
      if (destroyed) {
        return;
      }

      destroyed = true;
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("orientationchange", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver?.disconnect();
      updateController?.cancel?.();
      input.releaseAll();
      runtime.quit?.();
      canvas.remove();
      if (container.childElementCount === 0) {
        container.textContent = "";
      }
    }
  };

  function onKeyDown(event: KeyboardEvent) {
    const isInteractionKey = ["KeyF", "KeyE", "Enter", "Space", "f", "F", "e", "E", " "].includes(
      event.code || event.key
    ) || ["Enter", " ", "f", "F", "e", "E"].includes(event.key);
    if (isInteractionKey && !event.repeat) {
      event.preventDefault();
      activateInteraction();
      return;
    }

    const key = directionForKey(event.code) ? event.code : event.key;
    const direction = directionForKey(key);
    const handled = input.setKeyboardKey(key, true);
    if (handled) {
      event.preventDefault();
      if (direction && !event.repeat) options.onKeyboardDirectionChange?.(direction, true);
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    const key = directionForKey(event.code) ? event.code : event.key;
    const direction = directionForKey(key);
    const handled = input.setKeyboardKey(key, false);
    if (handled) {
      event.preventDefault();
      if (direction) options.onKeyboardDirectionChange?.(direction, false);
    }
  }

  function onWindowBlur() {
    releaseInput();
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") releaseInput();
  }

  function releaseInput() {
    input.releaseAll();
    for (const direction of ["up", "down", "left", "right"] as const) {
      options.onKeyboardDirectionChange?.(direction, false);
    }
  }

  function activateInteraction() {
    if (!interactionEnabled || (!activeInteraction && !activeFishingSpot)) {
      return false;
    }

    return interactionGuard.activate(() => {
      if (activeInteraction) options.onInteract?.(activeInteraction);
      else if (activeFishingSpot) options.onFish?.(activeFishingSpot);
    });
  }
}

function setRuntimePaused(runtime: KaplayRuntime, paused: boolean) {
  if (runtime.debug) {
    runtime.debug.paused = paused;
  }

  runtime.paused = paused;
}

function fitCanvasToContainer(
  canvas: HTMLCanvasElement,
  container: HTMLElement
) {
  const bounds = container.getBoundingClientRect();
  const availableWidth = Math.max(bounds.width, 1);
  const availableHeight = Math.max(bounds.height, 1);
  canvas.style.width = `${Math.floor(availableWidth)}px`;
  canvas.style.height = `${Math.floor(availableHeight)}px`;
  canvas.style.margin = "0";
}

export function getRenderPixelDensity(container: HTMLElement) {
  const bounds = container.getBoundingClientRect();
  const pixelArea = Math.max(bounds.width, 1) * Math.max(bounds.height, 1);
  return Math.min(1, Math.sqrt(RENDER_PIXEL_BUDGET / pixelArea));
}

function renderPrototypeScene(
  runtime: KaplayRuntime,
  config: GameConfig,
  input: ReturnType<typeof createGameInputState>,
  callbacks: {
    onInteractionTargetChange?: (target: InteractionTarget | null) => void;
    onInteractionPromptPosition?: (position: { x: number; y: number } | null) => void;
    onPlayerNavigationChange?: CreateKaplayGameOptions["onPlayerNavigationChange"];
    onMovementAudioState?: CreateKaplayGameOptions["onMovementAudioState"];
    onPlayerPositionChange?: (position: { x: number; y: number }) => void;
  },
  initialPosition: Point
) {
  const initialViewport = getRuntimeViewport(runtime, config);
  const reducedMotion = typeof window !== "undefined"
    && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  runtime.loadSprite?.(
    CONNECTED_TALL_GRASS_ASSET_KEY,
    createConnectedTallGrassTileset(),
    { sliceX: TALL_GRASS_ATLAS_COLUMNS, sliceY: 1 }
  );
  runtime.loadSprite?.(
    FARM_FENCE_ASSET_KEY,
    createFarmFenceLayer()
  );
  runtime.loadSprite?.(
    MANG_YATO_ASSET_KEY,
    createMangYatoSpriteSheet(),
    { sliceX: GENERATED_CHARACTER_FRAMES, sliceY: 1 }
  );
  runtime.loadSprite?.(
    FRUIT_TREE_ASSET_KEY,
    createFruitTreeSpriteSheet(),
    { sliceX: FRUIT_TREE_FRAMES, sliceY: 1 }
  );
  runtime.loadSprite?.(
    ROAMING_ANIMAL_ASSET_KEY,
    createRoamingAnimalSpriteSheet(),
    { sliceX: ROAMING_ANIMAL_FRAMES, sliceY: 1 }
  );
  const terrainView = {
    camera: getCameraCenter({
      target: initialPosition,
      viewportWidth: initialViewport.width,
      viewportHeight: initialViewport.height
    }),
    zoom: config.cameraZoom,
    fallbackWidth: config.logicalWidth,
    fallbackHeight: config.logicalHeight,
    animationClock: 0,
    reducedMotion
  };
  const mapRenderer = renderPrototypeMap(runtime, terrainView);
  renderFishingLandmark(runtime);
  runtime.setCamScale?.(config.cameraZoom, config.cameraZoom);

  if (!runtime.add || !runtime.sprite || !runtime.pos || !runtime.scale || !runtime.anchor || !runtime.z) {
    renderFoundationScene(runtime, config);
    return {
      setMissionState: () => undefined,
      reset: () => undefined
    };
  }

  const missionObjects = renderMissionObjects(runtime);
  const roamingAnimals = renderRoamingAnimals(runtime, reducedMotion);

  let position = { ...initialPosition };
  let facing: Facing = "down";
  let animationClock = 0;
  let worldAnimationClock = 0;
  let grassUpdateAccumulator = GRASS_UPDATE_INTERVAL;
  let npcAnimationAccumulator = 0.25;
  let lastGrassTileKey: string | null = null;
  let lastNavigationPosition = { ...position };
  let lastNavigationFacing: Facing = facing;
  let lastGuidePosition = { ...position };
  let lastCullPosition = { ...position };
  let lastViewport = { ...initialViewport };
  let lastCameraPosition = { ...terrainView.camera };
  let lastMovementAudioKey = "";
  let lastInteractionKey = "";
  let lastPromptUpdateAt = -Infinity;
  let activeTargetNpcId: NpcId | null = null;
  let activeGrassPatches: ReturnType<typeof getTouchingTallGrassPatches> = [];
  const grassReactionEnds = new Map<string, number>();
  const interactionTargets = getInteractionTargets();
  const player = runtime.add([
    runtime.sprite("learner-walk", { frame: getBaseFrameForFacing(facing) }),
    runtime.pos(position.x, position.y),
    runtime.anchor("center"),
    runtime.scale(2),
    runtime.z(position.y)
  ]) as {
    pos?: { x: number; y: number };
    frame?: number;
    z?: number;
  } | undefined;
  const grassPool = Array.from({ length: GRASS_CONTACT_POOL_SIZE }, () => {
    const grass = runtime.add!([
      runtime.sprite!(CONNECTED_TALL_GRASS_ASSET_KEY, { frame: TALL_GRASS_FOREGROUND_FRAME }),
      runtime.pos!(0, 0),
      runtime.anchor!("center"),
      runtime.scale!(2),
      runtime.rotate?.(0),
      runtime.z!(0)
    ]) as {
      hidden?: boolean;
      pos?: { x: number; y: number };
      angle?: number;
      z?: number;
    } | undefined;
    if (grass) grass.hidden = true;
    return grass;
  });

  const updateController = runtime.onUpdate?.(() => {
    const dt = Math.min(runtime.dt?.() ?? 1 / 60, 0.05);
    worldAnimationClock += dt;
    terrainView.animationClock = worldAnimationClock;
    grassUpdateAccumulator += dt;
    npcAnimationAccumulator += dt;
    const vector = input.getVector();
    const isMoving = vector.x !== 0 || vector.y !== 0;

    if (isMoving) {
      facing = getFacingFromInput(vector, facing);
      animationClock += dt;
    } else {
      animationClock = 0;
    }

    const previousPosition = position;
    if (isMoving) {
      position = movePlayer({
        position,
        input: vector,
        deltaSeconds: dt,
        map: MISSION_COLLISION_MAP,
        radius: PLAYER_CONFIG.radius
      });
    }
    const actuallyMoving = Math.hypot(position.x - previousPosition.x, position.y - previousPosition.y) > 0.01;
    const terrain = getTerrainAtPoint(position);
    const area = getMapAreaAtPoint(position);
    const movementAudioKey = `${actuallyMoving}:${terrain.id}:${area.key}`;
    if (movementAudioKey !== lastMovementAudioKey) {
      lastMovementAudioKey = movementAudioKey;
      callbacks.onMovementAudioState?.({ moving: actuallyMoving, terrain, area });
    }
    if (Math.hypot(position.x - lastNavigationPosition.x, position.y - lastNavigationPosition.y) >= NAVIGATION_UPDATE_DISTANCE || facing !== lastNavigationFacing) {
      lastNavigationPosition = { ...position };
      lastNavigationFacing = facing;
      callbacks.onPlayerNavigationChange?.({ position: { ...position }, facing, terrain, area });
      callbacks.onPlayerPositionChange?.(position);
    }

    if (player?.pos) {
      player.pos.x = position.x;
      player.pos.y = position.y;
    }
    if (player) {
      player.z = position.y;
      player.frame = actuallyMoving
        ? getWalkFrameForFacing(facing, Math.floor(animationClock * 8))
        : getBaseFrameForFacing(facing);
    }
    const grassTileKey = getTallGrassTileKey(position);
    const enteredGrass = actuallyMoving && grassTileKey !== null && grassTileKey !== lastGrassTileKey;
    if (enteredGrass) {
      grassReactionEnds.set(grassTileKey, worldAnimationClock + GRASS_REACTION_SECONDS);
    }
    lastGrassTileKey = grassTileKey;
    if (enteredGrass || grassUpdateAccumulator >= GRASS_UPDATE_INTERVAL) {
      grassUpdateAccumulator = 0;
      activeGrassPatches = getTouchingTallGrassPatches(position, PLAYER_CONFIG.radius);
      if (enteredGrass) {
        activeGrassPatches.forEach(({ key }) => {
          grassReactionEnds.set(key, worldAnimationClock + GRASS_REACTION_SECONDS);
        });
      }
      const nearbyKeys = new Set(activeGrassPatches.map(({ key }) => key));
      grassReactionEnds.forEach((reactionEndsAt, key) => {
        if (reactionEndsAt <= worldAnimationClock || !nearbyKeys.has(key)) grassReactionEnds.delete(key);
      });
    }
    grassPool.forEach((grass, index) => {
      if (!grass) return;
      const patch = activeGrassPatches[index];
      grass.hidden = !patch;
      if (!patch) return;
      const motion = getTallGrassMotion(
        patch,
        worldAnimationClock,
        grassReactionEnds.get(patch.key) ?? 0,
        reducedMotion
      );
      if (grass.pos) {
        grass.pos.x = patch.x + motion.swayX;
        grass.pos.y = patch.y;
      }
      grass.angle = motion.angle;
      grass.z = patch.y + TILE_SIZE / 2 + 1;
    });
    if (npcAnimationAccumulator >= 0.25) {
      npcAnimationAccumulator = 0;
      missionObjects.updateAnimation(worldAnimationClock, reducedMotion);
    }
    roamingAnimals.update(dt, worldAnimationClock, position);

    const interaction = selectClosestInteraction(
      position,
      interactionTargets,
      {
        activeTargetId: lastInteractionKey === "none" ? null : lastInteractionKey.split(":").slice(0, 2).join(":"),
        collisionMap: PROTOTYPE_MAP
      }
    );
    const interactionKey = interaction ? `${interaction.id}:${interaction.enabled}` : "none";
    const interactionChanged = interactionKey !== lastInteractionKey;
    if (interactionChanged) {
      lastInteractionKey = interactionKey;
      callbacks.onInteractionTargetChange?.(interaction);
      missionObjects.setInteractionTarget(interaction);
    }
    if (Math.hypot(position.x - lastGuidePosition.x, position.y - lastGuidePosition.y) >= NAVIGATION_UPDATE_DISTANCE) {
      lastGuidePosition = { ...position };
      missionObjects.updateNavigation(position);
    }

    const viewport = getRuntimeViewport(runtime, config);
    const camera = getCameraCenter({
      target: position,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height
    });
    const viewportChanged = viewport.width !== lastViewport.width || viewport.height !== lastViewport.height;
    const cameraChanged = camera.x !== lastCameraPosition.x || camera.y !== lastCameraPosition.y;
    lastViewport = viewport;
    terrainView.camera = camera;
    if (cameraChanged) {
      lastCameraPosition = camera;
      runtime.setCamPos?.(camera.x, camera.y);
    }
    if (viewportChanged || Math.hypot(position.x - lastCullPosition.x, position.y - lastCullPosition.y) >= 48) {
      lastCullPosition = { ...position };
      lastMovementAudioKey = "";
      mapRenderer.updateVisibility(camera, viewport);
      missionObjects.updateVisibility(camera, viewport);
      roamingAnimals.updateVisibility(camera, viewport);
    }
    if (
      interactionChanged
      || viewportChanged
      || (
        interaction !== null
        && cameraChanged
        && worldAnimationClock - lastPromptUpdateAt >= INTERACTION_PROMPT_UPDATE_INTERVAL
      )
    ) {
      lastPromptUpdateAt = worldAnimationClock;
      callbacks.onInteractionPromptPosition?.(getInteractionPromptPosition(interaction, camera, viewport));
    }
  });

  runtime.setCamPos?.(terrainView.camera.x, terrainView.camera.y);
  mapRenderer.updateVisibility(terrainView.camera, initialViewport);
  missionObjects.updateVisibility(terrainView.camera, initialViewport);
  roamingAnimals.updateVisibility(terrainView.camera, initialViewport);

  return {
    updateController,
    setMissionState: (state: { activityCompleted: boolean; targetNpcId?: NpcId | null; showPath?: boolean }) => {
      const nextTargetNpcId = state.activityCompleted ? null : state.targetNpcId ?? null;
      if (nextTargetNpcId !== activeTargetNpcId) {
        activeTargetNpcId = nextTargetNpcId;
        lastInteractionKey = "";
        callbacks.onInteractionTargetChange?.(null);
        callbacks.onInteractionPromptPosition?.(null);
        missionObjects.setInteractionTarget(null);
      }
      missionObjects.setMissionState(state);
      missionObjects.updateNavigation(position);
    },
    reset: () => {
      position = { ...PROTOTYPE_MAP.startPosition };
      facing = "down";
      animationClock = 0;
      worldAnimationClock = 0;
      grassUpdateAccumulator = GRASS_UPDATE_INTERVAL;
      npcAnimationAccumulator = 0.25;
      lastGrassTileKey = null;
      activeGrassPatches = [];
      lastNavigationPosition = { ...position };
      lastNavigationFacing = facing;
      lastGuidePosition = { ...position };
      lastCullPosition = { ...position };
      lastViewport = getRuntimeViewport(runtime, config);
      lastCameraPosition = getCameraCenter({
        target: position,
        viewportWidth: lastViewport.width,
        viewportHeight: lastViewport.height
      });
      terrainView.camera = lastCameraPosition;
      runtime.setCamPos?.(lastCameraPosition.x, lastCameraPosition.y);
      mapRenderer.updateVisibility(lastCameraPosition, lastViewport);
      lastInteractionKey = "";
      activeTargetNpcId = null;
      if (player?.pos) {
        player.pos.x = position.x;
        player.pos.y = position.y;
      }
      if (player) player.frame = getBaseFrameForFacing(facing);
      grassReactionEnds.clear();
      grassPool.forEach((grass) => { if (grass) grass.hidden = true; });
      missionObjects.reset();
      roamingAnimals.reset();
      missionObjects.updateVisibility(lastCameraPosition, lastViewport);
      roamingAnimals.updateVisibility(lastCameraPosition, lastViewport);
      callbacks.onInteractionTargetChange?.(null);
      callbacks.onInteractionPromptPosition?.(null);
      callbacks.onPlayerPositionChange?.(position);
    }
  };
}

function renderRoamingAnimals(runtime: KaplayRuntime, reducedMotion: boolean) {
  type AnimalNode = {
    hidden?: boolean;
    pos?: { x: number; y: number };
    z?: number;
    frame?: number;
  };
  let states = createRoamingAnimalStates();
  const nodes = states.map((state) => runtime.add?.([
    runtime.sprite!(ROAMING_ANIMAL_ASSET_KEY, {
      frame: getRoamingAnimalFrame(state.kind, state.facing, false, 0)
    }),
    runtime.pos!(state.position.x, state.position.y),
    runtime.anchor!("center"),
    runtime.scale!(2),
    runtime.z!(state.position.y)
  ]) as AnimalNode | undefined);

  const syncNodes = (animationClock: number) => {
    states.forEach((state, index) => {
      const node = nodes[index];
      if (!node) return;
      if (node.pos) {
        node.pos.x = state.position.x;
        node.pos.y = state.position.y;
      }
      node.z = state.position.y;
      node.frame = getRoamingAnimalFrame(
        state.kind,
        state.facing,
        state.moving && !reducedMotion,
        animationClock
      );
    });
  };

  return {
    update(deltaSeconds: number, elapsedSeconds: number, playerPosition: Point) {
      const adjustedDelta = reducedMotion ? deltaSeconds * 0.5 : deltaSeconds;
      states = states.map((state) => advanceRoamingAnimal(
        state,
        adjustedDelta,
        elapsedSeconds,
        MISSION_COLLISION_MAP,
        playerPosition
      ));
      syncNodes(elapsedSeconds);
    },
    updateVisibility(camera: Point, viewport: { width: number; height: number }) {
      const margin = TILE_SIZE * 2;
      nodes.forEach((node, index) => {
        if (!node) return;
        const state = states[index];
        node.hidden = state.position.x < camera.x - viewport.width / 2 - margin
          || state.position.x > camera.x + viewport.width / 2 + margin
          || state.position.y < camera.y - viewport.height / 2 - margin
          || state.position.y > camera.y + viewport.height / 2 + margin;
      });
    },
    reset() {
      states = createRoamingAnimalStates();
      syncNodes(0);
    }
  };
}

export function getInteractionPromptPosition(
  target: InteractionTarget | null,
  camera: { x: number; y: number },
  viewport: { width: number; height: number }
) {
  if (!target) return null;
  const marker = target.indicatorPosition ?? target.position;
  return {
    x: (marker.x + 30 - camera.x + viewport.width / 2) / viewport.width,
    y: (marker.y - 28 - camera.y + viewport.height / 2) / viewport.height
  };
}

function renderPrototypeMap(
  runtime: KaplayRuntime,
  view: {
    camera: { x: number; y: number };
    zoom: number;
    fallbackWidth: number;
    fallbackHeight: number;
    animationClock: number;
    reducedMotion: boolean;
  }
) {
  type RenderedMapObject = {
    node: { hidden?: boolean };
    bounds: { x: number; y: number; width: number; height: number };
  };
  const renderedObjects: RenderedMapObject[] = [];
  const visibilityController = {
    updateVisibility(camera: { x: number; y: number }, viewport: { width: number; height: number }) {
      for (const rendered of renderedObjects) {
        rendered.node.hidden = !isWorldBoundsVisible(rendered.bounds, camera, viewport, 96);
      }
    }
  };

  if (!runtime.add || !runtime.rect || !runtime.pos || !runtime.color || !runtime.z) {
    return visibilityController;
  }

  if (runtime.drawSprite && runtime.vec2) {
    runtime.add([
      runtime.rect(PROTOTYPE_MAP.columns * TILE_SIZE, PROTOTYPE_MAP.rows * TILE_SIZE),
      runtime.pos(0, 0),
      runtime.color(173, 188, 58),
      runtime.z(-1)
    ]);
    const terrain = Array.from({ length: PROTOTYPE_MAP.rows }, (_, y) =>
      Array.from({ length: PROTOTYPE_MAP.columns }, (_, x) => getTerrainSprite(x, y))
    );
    let terrainCacheReady = false;
    let disposed = false;

    if (runtime.loadSprite && supportsTerrainCache()) {
      void createTerrainCache(terrain)
        .then((canvas) => {
          if (disposed) return;
          const asset = runtime.loadSprite!("village-terrain-cache", canvas, {
            filter: "nearest"
          }) as { onLoad?: (callback: () => void) => unknown } | undefined;
          if (asset?.onLoad) {
            asset.onLoad(() => {
              if (!disposed) terrainCacheReady = true;
            });
          } else {
            terrainCacheReady = true;
          }
        })
        .catch(() => {
          terrainCacheReady = false;
        });
    }

    runtime.add([
      {
        id: "terrain-layer",
        draw: () => {
          const viewportWidth = (runtime.width?.() ?? view.fallbackWidth) / view.zoom;
          const viewportHeight = (runtime.height?.() ?? view.fallbackHeight) / view.zoom;
          const left = Math.max(0, Math.floor((view.camera.x - viewportWidth / 2) / TILE_SIZE) - 1);
          const right = Math.min(
            PROTOTYPE_MAP.columns - 1,
            Math.ceil((view.camera.x + viewportWidth / 2) / TILE_SIZE) + 1
          );
          const top = Math.max(0, Math.floor((view.camera.y - viewportHeight / 2) / TILE_SIZE) - 1);
          const bottom = Math.min(
            PROTOTYPE_MAP.rows - 1,
            Math.ceil((view.camera.y + viewportHeight / 2) / TILE_SIZE) + 1
          );

          if (terrainCacheReady) {
            runtime.drawSprite!({
              sprite: "village-terrain-cache",
              pos: runtime.vec2!(0, 0),
              width: PROTOTYPE_MAP.columns * TILE_SIZE,
              height: PROTOTYPE_MAP.rows * TILE_SIZE
            });
          } else {
            for (let y = top; y <= bottom; y += 1) {
              for (let x = left; x <= right; x += 1) {
                const tile = terrain[y][x];
                const usesBaseGrass = tile.assetKey === "tileset-floor" && tile.frame === 264;
                if (!usesBaseGrass) {
                  runtime.drawSprite!({
                    sprite: tile.assetKey,
                    frame: tile.frame,
                    pos: runtime.vec2!(x * TILE_SIZE, y * TILE_SIZE),
                    width: TILE_SIZE,
                    height: TILE_SIZE
                  });
                }
                if (isTallGrassTile(x, y)) {
                  runtime.drawSprite!({
                    sprite: CONNECTED_TALL_GRASS_ASSET_KEY,
                    frame: getTallGrassFrame(x, y),
                    pos: runtime.vec2!(x * TILE_SIZE, y * TILE_SIZE),
                    width: TILE_SIZE,
                    height: TILE_SIZE
                  });
                }
              }
            }
          }

          if (!view.reducedMotion) {
            const phase = Math.floor(view.animationClock / 0.4) % WATER_ANIMATION_PHASES;
            for (let y = top; y <= bottom; y += 1) {
              for (let x = left; x <= right; x += 1) {
                const frame = getAnimatedWaterFrame(x, y, phase);
                if (frame === null) continue;
                runtime.drawSprite!({
                  sprite: "tileset-water",
                  frame,
                  pos: runtime.vec2!(x * TILE_SIZE, y * TILE_SIZE),
                  width: TILE_SIZE,
                  height: TILE_SIZE
                });
              }
            }
          }
        },
        destroy: () => {
          disposed = true;
        }
      },
      runtime.z(0)
    ]);
  } else {
    renderTerrainFallback(runtime);
  }

  for (const object of PROTOTYPE_MAP.visualObjects) {
    if (runtime.sprite && runtime.scale) {
      const asset = Object.values(GAME_ASSETS).find(({ key }) => key === object.assetKey);
      const region = asset && "region" in asset ? asset.region : undefined;
      const spriteOptions: Record<string, unknown> = {};
      if (object.frame !== undefined) spriteOptions.frame = object.frame;
      if (region && runtime.quad) {
        spriteOptions.quad = runtime.quad(
          region.x / region.sourceWidth,
          region.y / region.sourceHeight,
          region.width / region.sourceWidth,
          region.height / region.sourceHeight
        );
        spriteOptions.width = region.width;
        spriteOptions.height = region.height;
      }
      const node = runtime.add([
        runtime.sprite(object.assetKey, Object.keys(spriteOptions).length > 0 ? spriteOptions : undefined),
        runtime.pos(object.x, object.y),
        runtime.scale(2),
        runtime.z(object.depthY)
      ]) as { hidden?: boolean } | undefined;
      if (node) renderedObjects.push({ node, bounds: object });
    } else {
      const node = runtime.add([
        runtime.rect(object.width, object.height),
        runtime.pos(object.x, object.y),
        runtime.color(62, 96, 71),
        runtime.z(object.blocksMovement ? 20 : 5)
      ]) as { hidden?: boolean } | undefined;
      if (node) renderedObjects.push({ node, bounds: object });
    }
  }

  return visibilityController;
}

export function isWorldBoundsVisible(
  bounds: { x: number; y: number; width: number; height: number },
  camera: { x: number; y: number },
  viewport: { width: number; height: number },
  margin = 0
) {
  const left = camera.x - viewport.width / 2 - margin;
  const top = camera.y - viewport.height / 2 - margin;
  const right = camera.x + viewport.width / 2 + margin;
  const bottom = camera.y + viewport.height / 2 + margin;
  return bounds.x < right && bounds.x + bounds.width > left && bounds.y < bottom && bounds.y + bounds.height > top;
}

function renderFishingLandmark(runtime: KaplayRuntime) {
  if (!runtime.add || !runtime.rect || !runtime.pos || !runtime.color || !runtime.z) return;
  const spot = FISHING_SPOTS[0];
  const x = spot.markerPosition.x;
  const y = spot.markerPosition.y;
  const parts: Array<[number, number, number, number, [number, number, number], number]> = [
    [x - 24, y - 5, 48, 14, [155, 104, 66], y + 1],
    [x - 18, y - 5, 3, 14, [255, 177, 82], y + 2],
    [x - 4, y - 5, 3, 14, [255, 177, 82], y + 2],
    [x + 10, y - 5, 3, 14, [255, 177, 82], y + 2],
    [x + 23, y - 20, 4, 28, [93, 83, 54], y + 3],
    [x + 15, y - 27, 20, 12, [250, 204, 21], y + 4],
    [x + 20, y - 23, 10, 4, [54, 139, 184], y + 5]
  ];
  for (const [partX, partY, width, height, color, depth] of parts) {
    runtime.add([
      runtime.rect(width, height),
      runtime.pos(partX, partY),
      runtime.color(...color),
      runtime.z(depth)
    ]);
  }
}

function renderTerrainFallback(runtime: KaplayRuntime) {
  for (let y = 0; y < PROTOTYPE_MAP.rows; y += 1) {
    for (let x = 0; x < PROTOTYPE_MAP.columns; x += 1) {
      const tile = getTileKind(x, y);
      if (runtime.sprite && runtime.scale) {
        const terrain = getTerrainSprite(x, y);
        runtime.add!([
          runtime.sprite(terrain.assetKey, { frame: terrain.frame }),
          runtime.pos!(x * TILE_SIZE, y * TILE_SIZE),
          runtime.scale(2),
          runtime.z!(0)
        ]);
      } else {
        runtime.add!([
          runtime.rect!(TILE_SIZE, TILE_SIZE),
          runtime.pos!(x * TILE_SIZE, y * TILE_SIZE),
          runtime.color!(...tileColor(tile)),
          runtime.z!(0)
        ]);
      }
    }
  }
}

function getRuntimeViewport(runtime: KaplayRuntime, config: GameConfig) {
  return {
    width: (runtime.width?.() ?? config.logicalWidth) / config.cameraZoom,
    height: (runtime.height?.() ?? config.logicalHeight) / config.cameraZoom
  };
}

function supportsTerrainCache() {
  return typeof document !== "undefined" && typeof createImageBitmap === "function";
}

async function createTerrainCache(
  terrain: readonly (readonly ReturnType<typeof getTerrainSprite>[])[]
) {
  const [floorImage, waterImage] = await Promise.all([
    loadImageBitmap(GAME_ASSETS.tilesetFloor.path),
    loadImageBitmap(GAME_ASSETS.tilesetWater.path)
  ]);
  const tallGrassTileset = createConnectedTallGrassTileset();
  const canvas = document.createElement("canvas");
  canvas.width = PROTOTYPE_MAP.columns * TILE_SIZE;
  canvas.height = PROTOTYPE_MAP.rows * TILE_SIZE;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Unable to create the terrain cache.");
  context.imageSmoothingEnabled = false;

  for (let y = 0; y < PROTOTYPE_MAP.rows; y += 1) {
    for (let x = 0; x < PROTOTYPE_MAP.columns; x += 1) {
      const tile = terrain[y][x];
      const isFloor = tile.assetKey === "tileset-floor";
      const image = isFloor ? floorImage : waterImage;
      const columns = isFloor
        ? GAME_ASSETS.tilesetFloor.metadata.columns
        : GAME_ASSETS.tilesetWater.metadata.columns;
      const frameWidth = isFloor
        ? GAME_ASSETS.tilesetFloor.metadata.frameWidth
        : GAME_ASSETS.tilesetWater.metadata.frameWidth;
      const frameHeight = isFloor
        ? GAME_ASSETS.tilesetFloor.metadata.frameHeight
        : GAME_ASSETS.tilesetWater.metadata.frameHeight;
      const sourceX = (tile.frame % columns) * frameWidth;
      const sourceY = Math.floor(tile.frame / columns) * frameHeight;
      context.drawImage(
        image,
        sourceX,
        sourceY,
        frameWidth,
        frameHeight,
        x * TILE_SIZE,
        y * TILE_SIZE,
        TILE_SIZE,
        TILE_SIZE
      );
      if (isTallGrassTile(x, y)) {
        const tallGrassFrame = getTallGrassFrame(x, y);
        context.drawImage(
          tallGrassTileset,
          tallGrassFrame * TALL_GRASS_SOURCE_TILE_SIZE,
          0,
          TALL_GRASS_SOURCE_TILE_SIZE,
          TALL_GRASS_SOURCE_TILE_SIZE,
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }

  floorImage.close();
  waterImage.close();
  return canvas;
}

async function loadImageBitmap(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Unable to load terrain asset: ${path}`);
  return createImageBitmap(await response.blob());
}

function renderMissionObjects(runtime: KaplayRuntime) {
  type RenderObject = { hidden?: boolean; pos?: { x: number; y: number }; z?: number; angle?: number; frame?: number };
  const nameLabels = new Map<string, RenderObject>();
  const npcSprites = new Map<NpcId, RenderObject>();
  let targetNpcId: NpcId | null = null;
  let showPath = true;

  for (const npc of NPCS) {
    const sprite = runtime.add?.([
      runtime.sprite!(npc.assetKey, { frame: 0 }),
      runtime.pos!(npc.position.x, npc.position.y),
      runtime.anchor!("center"),
      runtime.scale!(2),
      runtime.z!(npc.renderDepth)
    ]) as RenderObject | undefined;
    if (sprite) npcSprites.set(npc.id, sprite);
    const nameLabel = runtime.add?.([
      runtime.text!(npc.displayName, { size: 10 }),
      runtime.pos!(npc.position.x, npc.position.y - 28),
      runtime.anchor!("center"),
      runtime.color!(255, 255, 255),
      runtime.outline?.(1),
      runtime.z!(1999)
    ]) as RenderObject | undefined;
    if (nameLabel) {
      nameLabel.hidden = true;
      nameLabels.set(npc.id, nameLabel);
    }
  }

  const storyCompleteMarker = runtime.add?.([
    runtime.text!("STORY COMPLETE", { size: 8 }),
    runtime.pos!(NPCS[0].position.x, NPCS[0].position.y - 42),
    runtime.anchor!("center"),
    runtime.color!(250, 204, 21),
    runtime.outline?.(2),
    runtime.z!(NPCS[0].position.y + 2)
  ]) as RenderObject | undefined;
  if (storyCompleteMarker) storyCompleteMarker.hidden = true;

  const missionBadge = runtime.add?.([
    runtime.rect!(12, 12),
    runtime.pos!(0, 0),
    runtime.anchor!("center"),
    runtime.rotate?.(45),
    runtime.color!(250, 204, 21),
    runtime.z!(2000)
  ]) as RenderObject | undefined;
  if (missionBadge) missionBadge.hidden = true;
  const missionBadgeGlyph = runtime.add?.([
    runtime.text!("!", { size: 11 }),
    runtime.pos!(0, 0),
    runtime.anchor!("center"),
    runtime.color!(19, 37, 29),
    runtime.z!(2001)
  ]) as RenderObject | undefined;
  if (missionBadgeGlyph) missionBadgeGlyph.hidden = true;

  const guideDots = Array.from({ length: 6 }, () => {
    const dot = runtime.add?.([
      runtime.rect!(5, 5),
      runtime.pos!(0, 0),
      runtime.anchor!("center"),
      runtime.color!(255, 239, 138),
      runtime.outline?.(1),
      runtime.z!(8)
    ]) as RenderObject | undefined;
    if (dot) dot.hidden = true;
    return dot;
  });

  const guideArrow = runtime.add?.([
    runtime.text!(">", { size: 15 }),
    runtime.pos!(0, 0),
    runtime.anchor!("center"),
    runtime.rotate?.(0),
    runtime.color!(250, 204, 21),
    runtime.outline?.(2),
    runtime.z!(9)
  ]) as RenderObject | undefined;
  if (guideArrow) guideArrow.hidden = true;

  return {
    updateVisibility(camera: { x: number; y: number }, viewport: { width: number; height: number }) {
      for (const npc of NPCS) {
        const sprite = npcSprites.get(npc.id);
        if (!sprite) continue;
        sprite.hidden = !isWorldBoundsVisible(
          { x: npc.position.x - 16, y: npc.position.y - 24, width: 32, height: 40 },
          camera,
          viewport,
          64
        );
      }
    },
    updateAnimation(clock: number, reducedMotion: boolean) {
      npcSprites.forEach((sprite, npcId) => {
        if (sprite.hidden) return;
        const phase = NPCS.findIndex((npc) => npc.id === npcId);
        sprite.frame = reducedMotion ? 0 : Math.floor(clock * 2 + phase) % GENERATED_CHARACTER_FRAMES;
      });
    },
    setInteractionTarget(target: InteractionTarget | null) {
      nameLabels.forEach((label, npcId) => {
        label.hidden = target?.npcId !== npcId;
      });
    },
    setMissionState(state: { activityCompleted: boolean; targetNpcId?: NpcId | null; showPath?: boolean }) {
      if (storyCompleteMarker) storyCompleteMarker.hidden = !state.activityCompleted;
      targetNpcId = state.targetNpcId ?? null;
      showPath = state.showPath ?? true;
      const target = NPCS.find((npc) => npc.id === targetNpcId);
      if (missionBadge) {
        missionBadge.hidden = !target;
        if (target && missionBadge.pos) {
          missionBadge.pos.x = target.position.x;
          missionBadge.pos.y = target.position.y - 48;
        }
      }
      if (missionBadgeGlyph) {
        missionBadgeGlyph.hidden = !target;
        if (target && missionBadgeGlyph.pos) {
          missionBadgeGlyph.pos.x = target.position.x;
          missionBadgeGlyph.pos.y = target.position.y - 48;
        }
      }
      if (!target || !showPath) {
        guideDots.forEach((dot) => { if (dot) dot.hidden = true; });
        if (guideArrow) guideArrow.hidden = true;
      }
    },
    updateNavigation(playerPosition: { x: number; y: number }) {
      const target = NPCS.find((npc) => npc.id === targetNpcId);
      const points = target && showPath && shouldShowGuideDots(playerPosition, target.interactionPosition)
        ? getSafeGuidePoints(playerPosition, target.interactionPosition, MISSION_COLLISION_MAP)
        : [];
      guideDots.forEach((dot, index) => {
        if (!dot) return;
        const point = points[index];
        dot.hidden = !point;
        if (point && dot.pos) {
          dot.pos.x = point.x;
          dot.pos.y = point.y;
          dot.z = Math.max(2, point.y - 20);
        }
      });
      const arrowPoint = points.at(-1);
      if (guideArrow) {
        guideArrow.hidden = !arrowPoint || !target;
        if (arrowPoint && target && guideArrow.pos) {
          guideArrow.pos.x = arrowPoint.x;
          guideArrow.pos.y = arrowPoint.y;
          guideArrow.angle = Math.atan2(
            target.interactionPosition.y - arrowPoint.y,
            target.interactionPosition.x - arrowPoint.x
          ) * (180 / Math.PI);
          guideArrow.z = Math.max(3, arrowPoint.y - 19);
        }
      }
    },
    reset() {
      if (storyCompleteMarker) storyCompleteMarker.hidden = true;
      npcSprites.forEach((sprite) => {
        sprite.hidden = false;
        sprite.frame = 0;
      });
      if (missionBadge) missionBadge.hidden = true;
      if (missionBadgeGlyph) missionBadgeGlyph.hidden = true;
      guideDots.forEach((dot) => { if (dot) dot.hidden = true; });
      if (guideArrow) guideArrow.hidden = true;
      targetNpcId = null;
      nameLabels.forEach((label) => {
        label.hidden = true;
      });
    }
  };
}

function tileColor(tile: TileKind): [number, number, number] {
  return {
    grass: [157, 184, 48],
    path: [255, 190, 116],
    plaza: [249, 181, 103],
    market: [244, 140, 69],
    forest: [174, 185, 68],
    water: [54, 139, 184],
    bridge: [171, 112, 58]
  }[tile] as [number, number, number];
}

function renderFoundationScene(runtime: KaplayRuntime, config: GameConfig) {
  if (!runtime.add || !runtime.rect || !runtime.pos || !runtime.color) {
    return;
  }

  runtime.add([
    runtime.rect(config.logicalWidth, config.logicalHeight),
    runtime.pos(0, 0),
    runtime.color(23, 51, 38),
    runtime.z?.(0)
  ]);

  if (!runtime.text || !runtime.anchor) {
    return;
  }

  runtime.add([
    runtime.text(config.title, { size: 42 }),
    runtime.pos(config.logicalWidth / 2, config.logicalHeight / 2 - 28),
    runtime.anchor("center"),
    runtime.color(245, 255, 248),
    runtime.outline?.(4)
  ]);

  runtime.add([
    runtime.text("Phase 1 foundation ready", { size: 24 }),
    runtime.pos(config.logicalWidth / 2, config.logicalHeight / 2 + 36),
    runtime.anchor("center"),
    runtime.color(251, 191, 36)
  ]);
}
