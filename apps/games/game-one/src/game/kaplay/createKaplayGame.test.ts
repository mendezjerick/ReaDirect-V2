import { describe, expect, it, vi } from "vitest";
import { GAME_ASSETS } from "../assets/assetRegistry";
import { NPCS } from "../content/npcs";
import { MAP_LANDMARKS } from "../map/prototypeMap";
import {
  createKaplayGame,
  getLogicalCanvasSize,
  getInteractionPromptPosition,
  getRenderPixelDensity,
  isWorldBoundsVisible,
  type KaplayFactory
} from "./createKaplayGame";

function makeFactory() {
  let update: (() => void) | undefined;
  const runtime = {
    quit: vi.fn(),
    debug: {
      paused: false
    },
    add: vi.fn(),
    loadSprite: vi.fn(),
    sprite: vi.fn((name: string, options?: Record<string, unknown>) => ({ kind: "sprite", name, options })),
    rect: vi.fn((width: number, height: number) => ({ kind: "rect", width, height })),
    text: vi.fn((content: string) => ({ kind: "text", content })),
    pos: vi.fn((x: number, y: number) => ({ kind: "pos", x, y })),
    color: vi.fn((red: number, green: number, blue: number) => ({ kind: "color", red, green, blue })),
    anchor: vi.fn((anchor: string) => ({ kind: "anchor", anchor })),
    scale: vi.fn((scale: number) => ({ kind: "scale", scale })),
    outline: vi.fn(() => ({ kind: "outline" })),
    z: vi.fn((value: number) => ({ kind: "z", value })),
    onUpdate: vi.fn((callback: () => void) => {
      update = callback;
      return { cancel: vi.fn() };
    }),
    dt: vi.fn(() => 1 / 60),
    setCamPos: vi.fn(),
    setCamScale: vi.fn(),
    width: vi.fn(() => 1280),
    height: vi.fn(() => 720),
    vec2: vi.fn((x: number, y: number) => ({ x, y })),
    quad: vi.fn((x: number, y: number, width: number, height: number) => ({ x, y, width, height })),
    drawSprite: vi.fn(),
    paused: false
  };

  const factory: KaplayFactory = vi.fn(() => runtime);
  return { factory, runtime, runUpdate: () => update?.() };
}

describe("createKaplayGame", () => {
  function setContainerSize(container: HTMLElement, width: number, height: number) {
    vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON: () => ({})
    });
  }

  it("creates exactly one canvas inside the provided container", () => {
    const container = document.createElement("div");
    const { factory, runtime } = makeFactory();

    createKaplayGame(container, { kaplayFactory: factory });

    expect(container.querySelectorAll("canvas")).toHaveLength(1);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({
        canvas: container.querySelector("canvas"),
        width: 1280,
        height: 720,
        global: false,
        stretch: true,
        letterbox: false,
        crisp: true,
        pixelDensity: 1,
        texFilter: "nearest"
      })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "learner-walk",
      GAME_ASSETS.learnerWalk.path,
      expect.objectContaining({ sliceX: 4, sliceY: 4 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "connected-tall-grass",
      expect.any(HTMLCanvasElement),
      { sliceX: 13, sliceY: 1 }
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "fruit-tree",
      expect.any(HTMLCanvasElement),
      { sliceX: 4, sliceY: 1 }
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "village-market-shop",
      GAME_ASSETS.villageMarketShop.path
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "ambient-miss-yuuri",
      GAME_ASSETS.ambientMissYuuri.path,
      expect.objectContaining({ sliceX: 4, sliceY: 4 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "ambient-mang-panda",
      GAME_ASSETS.ambientMangPanda.path,
      expect.objectContaining({ sliceX: 4, sliceY: 4 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "ambient-mr-kikushibu",
      GAME_ASSETS.ambientMrKikushibu.path,
      expect.objectContaining({ sliceX: 4, sliceY: 4 })
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "river-boat",
      GAME_ASSETS.riverBoat.path
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "roaming-animal",
      expect.any(HTMLCanvasElement),
      { sliceX: 12, sliceY: 1 }
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "boat-wake",
      expect.any(HTMLCanvasElement),
      { sliceX: 4, sliceY: 1 }
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "boat-oar",
      expect.any(HTMLCanvasElement)
    );
    expect(runtime.loadSprite).toHaveBeenCalledWith(
      "village-decor",
      expect.any(HTMLCanvasElement),
      { sliceX: 7, sliceY: 1 }
    );
    expect(runtime.sprite.mock.calls.filter(([name]) => name === "roaming-animal")).toHaveLength(5);
    expect(runtime.sprite.mock.calls.filter(([name]) => name === "ambient-miss-yuuri")).toHaveLength(1);
    expect(runtime.sprite.mock.calls.filter(([name]) => name === "ambient-mang-panda")).toHaveLength(1);
    expect(runtime.sprite.mock.calls.filter(([name]) => name === "ambient-mr-kikushibu")).toHaveLength(1);
    expect(runtime.sprite.mock.calls.filter(([name]) => name === "river-boat")).toHaveLength(1);
    expect(runtime.sprite.mock.calls.filter(([name]) => name === "boat-wake")).toHaveLength(1);
    expect(runtime.sprite.mock.calls.filter(([name]) => name === "boat-oar")).toHaveLength(2);
    expect(runtime.sprite).toHaveBeenCalledWith("connected-tall-grass", { frame: 12 });
    expect(runtime.sprite.mock.calls.filter(([name]) => name === "connected-tall-grass")).toHaveLength(5);
    expect(runtime.setCamScale).toHaveBeenCalledWith(2, 2);
    const terrainLayer = runtime.add.mock.calls
      .flatMap(([components]) => components as Array<{ id?: string; draw?: () => void }>)
      .find((component) => component.id === "terrain-layer");
    expect(terrainLayer).toBeDefined();
    terrainLayer?.draw?.();
    expect(runtime.drawSprite).toHaveBeenCalledWith(
      expect.objectContaining({ sprite: "tileset-floor", frame: expect.any(Number) })
    );
    expect(runtime.drawSprite).toHaveBeenCalledWith(
      expect.objectContaining({ sprite: "connected-tall-grass", frame: expect.any(Number) })
    );
    expect(runtime.drawSprite.mock.calls.length).toBeLessThan(500);
    expect(runtime.add.mock.calls.length).toBeLessThan(110);
    expect(runtime.sprite).toHaveBeenCalledWith(
      "village-learning-hall",
      expect.objectContaining({
        quad: {
          x: 192 / 528,
          y: 0,
          width: 64 / 528,
          height: 48 / 368
        },
        width: 64,
        height: 48
      })
    );

  });

  it.each([
    { label: "desktop", hostWidth: 1366, hostHeight: 768 },
    {
      label: "tablet landscape",
      hostWidth: 1024,
      hostHeight: 768
    },
    {
      label: "mobile landscape",
      hostWidth: 844,
      hostHeight: 390
    },
    {
      label: "mobile portrait",
      hostWidth: 390,
      hostHeight: 844
    }
  ])(
    "fills the responsive host and delegates aspect preservation to KAPLAY in a $label viewport",
    ({ hostWidth, hostHeight }) => {
      const container = document.createElement("div");
      setContainerSize(container, hostWidth, hostHeight);
      const { factory } = makeFactory();

      const game = createKaplayGame(container, { kaplayFactory: factory });

      expect(game.canvas.style.width).toBe(`${hostWidth}px`);
      expect(game.canvas.style.height).toBe(`${hostHeight}px`);
    }
  );

  it.each([
    { width: 1920, height: 800 },
    { width: 844, height: 390 },
    { width: 1024, height: 768 }
  ])("matches the logical canvas to a $width x $height host without letterbox bars", ({ width, height }) => {
    const container = document.createElement("div");
    setContainerSize(container, width, height);

    const logical = getLogicalCanvasSize(container);

    expect(logical.width / logical.height).toBeCloseTo(width / height, 3);
  });

  it("keeps standard desktop rendering sharp while capping very large buffers", () => {
    const container = document.createElement("div");
    setContainerSize(container, 1920, 1080);
    expect(getRenderPixelDensity(container)).toBeCloseTo(0.83, 2);

    setContainerSize(container, 844, 390);
    expect(getRenderPixelDensity(container)).toBe(1);
  });

  it("prevents duplicate canvas creation in the same container", () => {
    const container = document.createElement("div");
    const { factory } = makeFactory();

    createKaplayGame(container, { kaplayFactory: factory });

    expect(() => createKaplayGame(container, { kaplayFactory: factory })).toThrow(/already mounted/i);
  });

  it("projects the nearby NPC prompt beside the character", () => {
    expect(getInteractionPromptPosition(
      {
        id: "npc:miss-estelle",
        kind: "npc",
        label: "Talk to Miss Estelle",
        description: "Talk to Miss Estelle.",
        position: { x: 100, y: 100 },
        indicatorPosition: { x: 100, y: 100 },
        enabled: true,
        npcId: "miss-estelle"
      },
      { x: 100, y: 100 },
      { width: 200, height: 100 }
    )).toEqual({ x: 0.65, y: 0.22 });
  });

  it("uses F to interact with a nearby NPC in the browser", () => {
    const container = document.createElement("div");
    const onInteract = vi.fn();
    const { factory, runUpdate } = makeFactory();
    const game = createKaplayGame(container, { kaplayFactory: factory, onInteract });
    game.setMissionState({ activityCompleted: false, targetNpcId: "miss-estelle" });

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", key: "ArrowUp" }));
    for (let frame = 0; frame < 24; frame += 1) runUpdate();
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", key: "ArrowUp" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyF", key: "f" }));

    expect(onInteract).toHaveBeenCalledTimes(1);
    game.destroy();
  });

  it("opens the River Market when the player interacts with its doorway", () => {
    const container = document.createElement("div");
    const onEnterShop = vi.fn();
    const { factory, runUpdate } = makeFactory();
    const game = createKaplayGame(container, {
      kaplayFactory: factory,
      initialPosition: MAP_LANDMARKS.marketFront,
      onEnterShop
    });

    game.setMissionState({ activityCompleted: false, targetNpcId: "miss-estelle" });
    runUpdate();
    game.interact();

    expect(onEnterShop).toHaveBeenCalledWith("market-shop");
    game.destroy();
  });

  it("only offers interaction with the active mission NPC", () => {
    const container = document.createElement("div");
    const vendor = NPCS.find(({ id }) => id === "market-vendor")!;
    const onInteractionTargetChange = vi.fn();
    const { factory, runUpdate } = makeFactory();
    const game = createKaplayGame(container, {
      kaplayFactory: factory,
      initialPosition: vendor.interactionPosition,
      onInteractionTargetChange
    });

    game.setMissionState({ activityCompleted: false, targetNpcId: "miss-estelle" });
    onInteractionTargetChange.mockClear();
    runUpdate();

    expect(onInteractionTargetChange).toHaveBeenLastCalledWith(null);
    expect(onInteractionTargetChange.mock.calls.some(([target]) => target?.npcId === "market-vendor")).toBe(false);

    game.setMissionState({ activityCompleted: false, targetNpcId: "market-vendor" });
    onInteractionTargetChange.mockClear();
    runUpdate();

    expect(onInteractionTargetChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ npcId: "market-vendor" })
    );
    game.destroy();
  });

  it("reports keyboard direction state and clears it when movement locks", () => {
    const container = document.createElement("div");
    const onKeyboardDirectionChange = vi.fn();
    const { factory } = makeFactory();
    const game = createKaplayGame(container, { kaplayFactory: factory, onKeyboardDirectionChange });

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    expect(onKeyboardDirectionChange).toHaveBeenCalledWith("up", true);

    onKeyboardDirectionChange.mockClear();
    game.pause();
    expect(onKeyboardDirectionChange).toHaveBeenCalledWith("up", false);
    expect(onKeyboardDirectionChange).toHaveBeenCalledWith("down", false);
    expect(onKeyboardDirectionChange).toHaveBeenCalledWith("left", false);
    expect(onKeyboardDirectionChange).toHaveBeenCalledWith("right", false);

    game.destroy();
  });

  it("does not repeat idle camera, prompt, or interaction-label updates every frame", () => {
    const container = document.createElement("div");
    const target = NPCS.find(({ id }) => id === "miss-estelle")!;
    const onInteractionTargetChange = vi.fn();
    const onInteractionPromptPosition = vi.fn();
    const { factory, runtime, runUpdate } = makeFactory();
    const game = createKaplayGame(container, {
      kaplayFactory: factory,
      initialPosition: target.interactionPosition,
      onInteractionTargetChange,
      onInteractionPromptPosition
    });
    game.setMissionState({ activityCompleted: false, targetNpcId: "miss-estelle" });
    onInteractionTargetChange.mockClear();
    onInteractionPromptPosition.mockClear();
    runtime.setCamPos.mockClear();

    for (let frame = 0; frame < 60; frame += 1) runUpdate();

    expect(onInteractionTargetChange).toHaveBeenCalledTimes(1);
    expect(onInteractionPromptPosition).toHaveBeenCalledTimes(1);
    expect(runtime.setCamPos).not.toHaveBeenCalled();
    game.destroy();
  });

  it("reprojects a nearby interaction prompt after the viewport changes", () => {
    const container = document.createElement("div");
    const target = NPCS.find(({ id }) => id === "miss-estelle")!;
    const onInteractionPromptPosition = vi.fn();
    const { factory, runtime, runUpdate } = makeFactory();
    const game = createKaplayGame(container, {
      kaplayFactory: factory,
      initialPosition: target.interactionPosition,
      onInteractionPromptPosition
    });
    game.setMissionState({ activityCompleted: false, targetNpcId: "miss-estelle" });
    runUpdate();
    onInteractionPromptPosition.mockClear();

    runtime.width.mockReturnValue(844);
    runtime.height.mockReturnValue(390);
    runUpdate();

    expect(onInteractionPromptPosition).toHaveBeenCalledTimes(1);
    expect(onInteractionPromptPosition).toHaveBeenCalledWith(expect.objectContaining({
      x: expect.any(Number),
      y: expect.any(Number)
    }));
    game.destroy();
  });

  it("pauses, resumes, and destroys the runtime cleanly", () => {
    const container = document.createElement("div");
    const { factory, runtime } = makeFactory();
    const game = createKaplayGame(container, { kaplayFactory: factory });

    game.pause();
    expect(runtime.paused).toBe(true);
    expect(runtime.debug.paused).toBe(true);

    game.resume();
    expect(runtime.paused).toBe(false);
    expect(runtime.debug.paused).toBe(false);

    game.resetMission();
    game.setMissionState({
      activityCompleted: true
    });

    game.destroy();
    game.destroy();

    expect(runtime.quit).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll("canvas")).toHaveLength(0);
  });

  it("cleans up the canvas if runtime initialization fails", () => {
    const container = document.createElement("div");
    const factory: KaplayFactory = vi.fn(() => {
      throw new Error("init failed");
    });

    expect(() => createKaplayGame(container, { kaplayFactory: factory })).toThrow(/init failed/i);
    expect(container.querySelectorAll("canvas")).toHaveLength(0);
    expect(container.textContent).toBe("");
  });
});

describe("decorative object culling", () => {
  it("keeps nearby sprites active and hides distant sprites outside the camera margin", () => {
    const camera = { x: 640, y: 360 };
    const viewport = { width: 640, height: 360 };
    expect(isWorldBoundsVisible({ x: 620, y: 340, width: 64, height: 64 }, camera, viewport, 96)).toBe(true);
    expect(isWorldBoundsVisible({ x: 1500, y: 900, width: 64, height: 64 }, camera, viewport, 96)).toBe(false);
  });
});
