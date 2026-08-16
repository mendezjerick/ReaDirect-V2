import kaplay from "kaplay";
import { GAME_ASSETS } from "../assets/assetRegistry";
import { createGameInputState, directionForKey, type Direction } from "../input/gameInput";
import {
  getBaseFrameForFacing,
  getFacingFromInput,
  getSpriteFlipXForFacing,
  getWalkFrameForFacing,
  movePlayer,
  PLAYER_CONFIG,
  type Facing
} from "../player/playerMovement";
import {
  getPlayableCharacter,
  getPlayableCharacterRenderOffsetY,
  type PlayableCharacter,
  type PlayableCharacterId
} from "../player/playableCharacters";
import {
  isShopExit,
  SHOP_INTERIOR_COLLISION_MAP,
  SHOP_INTERIOR_FIXTURES,
  SHOP_INTERIOR_HEIGHT,
  SHOP_INTERIOR_SPAWN,
  SHOP_INTERIOR_WIDTH,
  type ShopFixture
} from "./shopInteriorMap";
import type { Point } from "../physics/collision";
import {
  getNearestShopInteractionTarget,
  type ShopInteractionId,
  type ShopInteractionTarget
} from "./shopTask";

type ShopRuntime = {
  quit?: () => void;
  add?: (components: unknown[]) => unknown;
  loadSprite?: (name: string, source: string, options?: Record<string, unknown>) => unknown;
  sprite?: (name: string, options?: Record<string, unknown>) => unknown;
  rect?: (width: number, height: number) => unknown;
  text?: (content: string, options?: Record<string, unknown>) => unknown;
  pos?: (x: number, y: number) => unknown;
  color?: (...rgb: number[]) => unknown;
  scale?: (amount: number) => unknown;
  anchor?: (value: string) => unknown;
  outline?: (width: number, color?: unknown) => unknown;
  z?: (value: number) => unknown;
  onUpdate?: (callback: () => void) => { cancel?: () => void };
  dt?: () => number;
};

type ShopCanvasOptions = {
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

export type ShopKaplayFactory = (options: ShopCanvasOptions) => ShopRuntime;

export type ShopInteriorGameController = {
  canvas: HTMLCanvasElement;
  setTouchDirection: (direction: Direction, active: boolean) => void;
  setAnalogVector: (vector: Point) => void;
  setInputEnabled: (enabled: boolean) => void;
  interact: () => boolean;
  clearInput: () => void;
  destroy: () => void;
};

type CreateShopInteriorGameOptions = {
  onExit: () => void;
  characterId?: PlayableCharacterId;
  onMovementAudioState?: (state: { moving: boolean }) => void;
  onKeyboardDirectionChange?: (direction: Direction, active: boolean) => void;
  onInteractionTargetChange?: (target: ShopInteractionTarget | null) => void;
  onInteract?: (targetId: ShopInteractionId) => void;
  kaplayFactory?: ShopKaplayFactory;
};

export function createShopInteriorGame(
  container: HTMLElement,
  options: CreateShopInteriorGameOptions
): ShopInteriorGameController {
  if (container.querySelector("canvas[data-shop-map='true']")) {
    throw new Error("A shop map canvas is already mounted in this container.");
  }

  const canvas = document.createElement("canvas");
  canvas.dataset.shopMap = "true";
  canvas.setAttribute("aria-label", "Walkable River Market interior");
  canvas.width = SHOP_INTERIOR_WIDTH;
  canvas.height = SHOP_INTERIOR_HEIGHT;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.objectFit = "contain";
  canvas.style.imageRendering = "pixelated";
  canvas.style.touchAction = "none";

  const input = createGameInputState();
  const runtimeFactory = options.kaplayFactory ?? (kaplay as unknown as ShopKaplayFactory);
  let runtime: ShopRuntime | null = null;
  let updateController: { cancel?: () => void } | undefined;
  let destroyed = false;
  let inputEnabled = true;
  let activeInteraction: ShopInteractionTarget | null = null;
  const playerCharacter = getPlayableCharacter(options.characterId);

  try {
    container.replaceChildren(canvas);
    runtime = runtimeFactory({
      canvas,
      width: SHOP_INTERIOR_WIDTH,
      height: SHOP_INTERIOR_HEIGHT,
      global: false,
      background: "#2c2b2a",
      letterbox: true,
      crisp: true,
      pixelDensity: 1,
      texFilter: "nearest"
    });
    loadShopSprites(runtime, playerCharacter);
    renderShopInterior(runtime);
    updateController = renderShopPlayer(
      runtime,
      input,
      options.onExit,
      options.onMovementAudioState,
      playerCharacter,
      (target) => {
        activeInteraction = target;
        options.onInteractionTargetChange?.(target);
      }
    );
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseInput);
    document.addEventListener("visibilitychange", onVisibilityChange);
  } catch (error) {
    runtime?.quit?.();
    canvas.remove();
    throw error;
  }

  return {
    canvas,
    setTouchDirection: (direction, active) => input.setTouchDirection(direction, active),
    setAnalogVector: (vector) => input.setAnalogVector(vector),
    setInputEnabled: (enabled) => {
      inputEnabled = enabled;
      input.setEnabled(enabled);
      if (!enabled) releaseKeyboardDirections();
    },
    interact: activateInteraction,
    clearInput: releaseInput,
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseInput);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      updateController?.cancel?.();
      input.releaseAll();
      options.onInteractionTargetChange?.(null);
      runtime?.quit?.();
      canvas.remove();
    }
  };

  function onKeyDown(event: KeyboardEvent) {
    if (inputEnabled && isInteractionKey(event)) {
      event.preventDefault();
      if (!event.repeat) activateInteraction();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      options.onExit();
      return;
    }
    const key = directionForKey(event.code) ? event.code : event.key;
    if (input.setKeyboardKey(key, true)) {
      event.preventDefault();
      const direction = directionForKey(key);
      if (direction && !event.repeat) options.onKeyboardDirectionChange?.(direction, true);
    }
  }

  function onKeyUp(event: KeyboardEvent) {
    const key = directionForKey(event.code) ? event.code : event.key;
    if (input.setKeyboardKey(key, false)) {
      event.preventDefault();
      const direction = directionForKey(key);
      if (direction) options.onKeyboardDirectionChange?.(direction, false);
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") releaseInput();
  }

  function releaseInput() {
    input.releaseAll();
    releaseKeyboardDirections();
  }

  function releaseKeyboardDirections() {
    for (const direction of ["up", "down", "left", "right"] as const) {
      options.onKeyboardDirectionChange?.(direction, false);
    }
  }

  function activateInteraction() {
    if (!inputEnabled || !activeInteraction) return false;
    options.onInteract?.(activeInteraction.id);
    return true;
  }
}

function isInteractionKey(event: KeyboardEvent) {
  return event.code === "KeyF"
    || event.code === "KeyE"
    || event.code === "Space"
    || event.key === "Enter";
}

function loadShopSprites(runtime: ShopRuntime, playerCharacter: PlayableCharacter) {
  const learner = GAME_ASSETS[playerCharacter.assetKey];
  const vendor = GAME_ASSETS.npcMarketVendor;
  runtime.loadSprite?.(learner.key, learner.path, {
    sliceX: learner.metadata.columns,
    sliceY: learner.metadata.rows
  });
  runtime.loadSprite?.(vendor.key, vendor.path, {
    sliceX: vendor.metadata.columns,
    sliceY: vendor.metadata.rows
  });
}

function renderShopInterior(runtime: ShopRuntime) {
  if (!runtime.add || !runtime.rect || !runtime.pos || !runtime.color || !runtime.z) return;

  addBlock(runtime, 32, 24, 576, 424, "#a96d43", 0);
  for (let y = 72; y < 448; y += 16) {
    addBlock(runtime, 32, y, 576, 2, y % 32 === 0 ? "#77452f" : "#8f5839", 1);
  }
  for (let row = 0; row < 12; row += 1) {
    const y = 76 + row * 32;
    const offset = row % 2 === 0 ? 0 : 32;
    for (let x = 64 + offset; x < 600; x += 64) {
      addBlock(runtime, x, y, 2, 16, "#835035", 1);
    }
  }

  SHOP_INTERIOR_FIXTURES.forEach((fixture) => renderFixture(runtime, fixture));
  renderWallDetails(runtime);
  renderVendor(runtime);
  renderExitRug(runtime);
}

function renderFixture(runtime: ShopRuntime, fixture: ShopFixture) {
  if (fixture.kind === "wall") {
    addBlock(runtime, fixture.x, fixture.y, fixture.width, fixture.height, "#5b3828", 4);
    if (fixture.id === "north-wall") {
      addBlock(runtime, fixture.x, fixture.y + fixture.height - 9, fixture.width, 9, "#2d211c", 5);
    }
    return;
  }

  if (fixture.kind === "counter") {
    addBlock(runtime, fixture.x, fixture.y, fixture.width, fixture.height, "#6a3b28", 30);
    addBlock(runtime, fixture.x - 4, fixture.y, fixture.width + 8, 12, "#d29255", 31);
    addBlock(runtime, fixture.x + 12, fixture.y + 24, fixture.width - 24, 7, "#3c281f", 31);
    addLabel(runtime, fixture.label ?? "", fixture.x + fixture.width / 2, fixture.y + 49, 8, 32);
    return;
  }

  const baseColor = fixture.kind === "table" ? "#d2a06a" : "#583528";
  addBlock(runtime, fixture.x, fixture.y, fixture.width, fixture.height, baseColor, 18);
  addBlock(runtime, fixture.x + 5, fixture.y + 5, fixture.width - 10, 8, "#d8a265", 19);
  if (fixture.kind === "table") {
    addBlock(runtime, fixture.x + 18, fixture.y + 20, fixture.width - 36, 28, "#f0dfb8", 20);
    addBlock(runtime, fixture.x + fixture.width / 2 - 2, fixture.y + 20, 4, 28, "#b99b70", 21);
  } else {
    renderDisplayItems(runtime, fixture);
  }
  addLabel(runtime, fixture.label ?? "", fixture.x + fixture.width / 2, fixture.y + fixture.height - 12, 7, 22);
}

function renderDisplayItems(runtime: ShopRuntime, fixture: ShopFixture) {
  const color = fixture.accent ?? "#d5b157";
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = fixture.x + 12 + column * 21;
      const y = fixture.y + 22 + row * 18;
      addBlock(runtime, x, y, 13, 11, color, 20);
      addBlock(runtime, x + 3, y - 3, 5, 4, "#315b39", 21);
    }
  }
}

function renderWallDetails(runtime: ShopRuntime) {
  addBlock(runtime, 94, 34, 108, 28, "#2d211c", 7);
  addBlock(runtime, 438, 34, 108, 28, "#2d211c", 7);
  addBlock(runtime, 104, 41, 88, 4, "#69b8c7", 8);
  addBlock(runtime, 448, 41, 88, 4, "#69b8c7", 8);
  addLabel(runtime, "RIVER MARKET", 320, 48, 15, 9);
  addBlock(runtime, 286, 75, 68, 28, "#efe2b9", 8);
  addLabel(runtime, "READ • FIND • RETURN", 320, 88, 6, 9, "#6f3328");
}

function renderVendor(runtime: ShopRuntime) {
  if (!runtime.add || !runtime.sprite || !runtime.pos || !runtime.anchor || !runtime.scale || !runtime.z) return;
  runtime.add([
    runtime.sprite(GAME_ASSETS.npcMarketVendor.key, { frame: 0 }),
    runtime.pos(320, 105),
    runtime.anchor("center"),
    runtime.scale(3),
    runtime.z(26)
  ]);
}

function renderExitRug(runtime: ShopRuntime) {
  addBlock(runtime, 278, 396, 84, 52, "#efe1c2", 3);
  addBlock(runtime, 288, 404, 64, 36, "#f8efd8", 4);
  addLabel(runtime, "EXIT", 320, 437, 8, 5, "#67412f");
}

function renderShopPlayer(
  runtime: ShopRuntime,
  input: ReturnType<typeof createGameInputState>,
  onExit: () => void,
  onMovementAudioState: ((state: { moving: boolean }) => void) | undefined,
  playerCharacter: PlayableCharacter,
  onInteractionTargetChange: (target: ShopInteractionTarget | null) => void
) {
  if (!runtime.add || !runtime.sprite || !runtime.pos || !runtime.anchor || !runtime.scale || !runtime.z) return;
  let position: Point = { ...SHOP_INTERIOR_SPAWN };
  let facing: Facing = "up";
  let animationClock = 0;
  let exiting = false;
  let previousTargetId: ShopInteractionId | null = null;
  const player = runtime.add([
    runtime.sprite(GAME_ASSETS[playerCharacter.assetKey].key, {
      frame: getBaseFrameForFacing(facing, playerCharacter.spriteLayout)
    }),
    runtime.pos(position.x, position.y + getPlayableCharacterRenderOffsetY(playerCharacter, facing)),
    runtime.anchor("center"),
    runtime.scale(playerCharacter.spriteScale),
    runtime.z(position.y + getPlayableCharacterRenderOffsetY(playerCharacter, facing) + 40)
  ]) as {
    pos?: { x: number; y: number };
    frame?: number;
    z?: number;
    flipX?: boolean;
  } | undefined;

  return runtime.onUpdate?.(() => {
    if (exiting) return;
    const deltaSeconds = Math.min(runtime.dt?.() ?? 1 / 60, 0.05);
    const vector = input.getVector();
    const moving = vector.x !== 0 || vector.y !== 0;
    if (moving) {
      facing = getFacingFromInput(vector, facing);
      animationClock += deltaSeconds;
      position = movePlayer({
        position,
        input: vector,
        deltaSeconds,
        map: SHOP_INTERIOR_COLLISION_MAP,
        radius: PLAYER_CONFIG.radius
      });
    } else {
      animationClock = 0;
    }

    if (player?.pos) {
      player.pos.x = position.x;
      player.pos.y = position.y + getPlayableCharacterRenderOffsetY(playerCharacter, facing);
    }
    if (player) {
      player.z = position.y + getPlayableCharacterRenderOffsetY(playerCharacter, facing) + 40;
      player.frame = moving
        ? getWalkFrameForFacing(facing, Math.floor(animationClock * 8), playerCharacter.spriteLayout)
        : getBaseFrameForFacing(facing, playerCharacter.spriteLayout);
      player.flipX = getSpriteFlipXForFacing(facing, playerCharacter.spriteLayout);
    }
    onMovementAudioState?.({ moving });

    const nearbyTarget = getNearestShopInteractionTarget(position);
    if (nearbyTarget?.id !== previousTargetId) {
      previousTargetId = nearbyTarget?.id ?? null;
      onInteractionTargetChange(nearbyTarget);
    }

    if (isShopExit(position)) {
      exiting = true;
      input.releaseAll();
      onExit();
    }
  });
}

function addBlock(
  runtime: ShopRuntime,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  depth: number
) {
  if (!runtime.add || !runtime.rect || !runtime.pos || !runtime.color || !runtime.z) return;
  runtime.add([
    runtime.rect(width, height),
    runtime.pos(x, y),
    runtime.color(...hexToRgb(color)),
    runtime.z(depth)
  ]);
}

function addLabel(
  runtime: ShopRuntime,
  content: string,
  x: number,
  y: number,
  size: number,
  depth: number,
  color = "#fff3d1"
) {
  if (!runtime.add || !runtime.text || !runtime.pos || !runtime.color || !runtime.anchor || !runtime.z) return;
  runtime.add([
    runtime.text(content, { size }),
    runtime.pos(x, y),
    runtime.color(...hexToRgb(color)),
    runtime.anchor("center"),
    runtime.z(depth)
  ]);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16)
  ];
}
