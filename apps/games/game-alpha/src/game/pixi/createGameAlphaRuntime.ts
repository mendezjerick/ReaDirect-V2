import { Application, Container, Graphics, Text, type Ticker } from "pixi.js";

import { GameAudio } from "../audio/GameAudio";
import { GameAlphaModel } from "../GameAlphaModel";
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type AlphabetAllyState,
  type EnemyKind,
  type EnemyState,
  type GameSnapshot,
  type ProjectileState,
} from "../types";

const FIXED_STEP_MS = 1_000 / 60;

export interface GameAlphaRuntimeOptions {
  host: HTMLElement;
  signal?: AbortSignal;
  soundEnabled: boolean;
  highScore?: number;
  onGameOver?: (snapshot: GameSnapshot) => void;
}

export interface GameAlphaRuntime {
  setMoveDirection(direction: -1 | 0 | 1): void;
  setFiring(firing: boolean): void;
  movePlayerTo(x: number): void;
  togglePause(): boolean;
  restart(): void;
  setSoundEnabled(enabled: boolean): void;
  resumeAudio(): Promise<void>;
  getSnapshot(): GameSnapshot;
  destroy(): Promise<void>;
}

interface EnemyDisplay {
  container: Container;
  renderKey: string;
}

interface StarDisplay {
  graphic: Graphics;
  speed: number;
  y: number;
}

export async function createGameAlphaRuntime(
  options: GameAlphaRuntimeOptions,
): Promise<GameAlphaRuntime> {
  const app = new Application();
  await app.init({
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
    backgroundColor: 0x030711,
    antialias: false,
    roundPixels: true,
    resolution: 1,
    autoDensity: false,
  });

  if (options.signal?.aborted) {
    app.destroy(
      { removeView: true },
      { children: true, texture: true, textureSource: true },
    );
    throw new DOMException("Game Alpha startup was cancelled.", "AbortError");
  }

  const canvas = app.canvas as HTMLCanvasElement;
  canvas.className = "game-alpha__canvas";
  canvas.setAttribute("aria-label", "Alphabet Defender gameplay stage");
  canvas.setAttribute("role", "img");
  options.host.replaceChildren(canvas);

  const model = new GameAlphaModel({ highScore: options.highScore });
  const audio = new GameAudio();
  audio.setMuted(!options.soundEnabled);

  const backgroundLayer = new Container();
  const beamLayer = new Container();
  const entityLayer = new Container();
  const projectileLayer = new Container();
  const hudLayer = new Container();
  app.stage.addChild(
    backgroundLayer,
    beamLayer,
    entityLayer,
    projectileLayer,
    hudLayer,
  );

  const stars = createStars(backgroundLayer);
  const beamGraphic = new Graphics();
  beamLayer.addChild(beamGraphic);
  const enemyDisplays = new Map<number, EnemyDisplay>();
  const projectileDisplays = new Map<number, Graphics>();
  let allyDisplay: Container | null = null;
  let allyRenderKey = "";
  let playerDisplay = createPlayerGraphic(false);
  entityLayer.addChild(playerDisplay);

  const scoreText = createHudText(8, 5, 10, 0xf7fbff);
  const highScoreText = createHudText(STAGE_WIDTH / 2, 5, 9, 0x8be9ff, 0.5);
  const stageText = createHudText(STAGE_WIDTH - 8, 5, 10, 0xffe66d, 1);
  const heartsText = createHudText(8, 20, 10, 0xff668c);
  const challengeText = createHudText(STAGE_WIDTH - 8, 20, 9, 0xbafc8b, 1);
  const messageText = new Text({
    text: "",
    style: {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: 18,
      fill: 0xf7fbff,
      align: "center",
      stroke: { color: 0x07122d, width: 4 },
    },
  });
  messageText.anchor.set(0.5);
  messageText.position.set(STAGE_WIDTH / 2, STAGE_HEIGHT / 2);
  hudLayer.addChild(
    scoreText,
    highScoreText,
    stageText,
    heartsText,
    challengeText,
    messageText,
  );

  let destroyed = false;
  let accumulator = 0;
  let firing = false;
  let dragging = false;
  let gameOverNotified = false;
  const pressedKeys = new Set<string>();

  const updateMoveFromKeyboard = () => {
    const left = pressedKeys.has("ArrowLeft") || pressedKeys.has("KeyA");
    const right = pressedKeys.has("ArrowRight") || pressedKeys.has("KeyD");
    model.setMoveDirection(left === right ? 0 : left ? -1 : 1);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (
      ["ArrowLeft", "ArrowRight", "KeyA", "KeyD", "Space"].includes(event.code)
    ) {
      event.preventDefault();
      pressedKeys.add(event.code);
      updateMoveFromKeyboard();
      if (event.code === "Space") {
        firing = true;
        void audio.resume();
      }
    }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(event.code);
    updateMoveFromKeyboard();
    if (event.code === "Space") firing = false;
  };
  const moveFromPointer = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    const x =
      ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * STAGE_WIDTH;
    model.movePlayerTo(x);
  };
  const onPointerDown = (event: PointerEvent) => {
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    moveFromPointer(event);
    void audio.resume();
  };
  const onPointerMove = (event: PointerEvent) => {
    if (dragging) moveFromPointer(event);
  };
  const onPointerUp = (event: PointerEvent) => {
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  };
  const clearInput = () => {
    pressedKeys.clear();
    firing = false;
    dragging = false;
    model.setMoveDirection(0);
  };
  const onVisibilityChange = () => {
    if (document.hidden) {
      clearInput();
      model.setPaused(true);
    }
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearInput);
  document.addEventListener("visibilitychange", onVisibilityChange);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  const tick = (ticker: Ticker) => {
    if (destroyed) return;
    accumulator += Math.min(ticker.deltaMS, 100);
    while (accumulator >= FIXED_STEP_MS) {
      if (firing) model.fire();
      model.update(FIXED_STEP_MS);
      audio.handleCues(model.drainAudioCues());
      accumulator -= FIXED_STEP_MS;
    }

    const snapshot = model.getSnapshot();
    updateStars(stars, ticker.deltaMS, snapshot.paused);
    syncSnapshot(snapshot);
    if (snapshot.phase === "game-over" && !gameOverNotified) {
      gameOverNotified = true;
      options.onGameOver?.(snapshot);
    }
  };

  function syncSnapshot(snapshot: GameSnapshot): void {
    syncPlayer(snapshot);
    syncEnemies(snapshot.enemies);
    syncAlly(snapshot.ally);
    syncProjectiles(snapshot.projectiles);
    syncBeam(snapshot);
    scoreText.text = `SCORE ${snapshot.score.toString().padStart(6, "0")}`;
    highScoreText.text = `HIGH ${snapshot.highScore.toString().padStart(6, "0")}`;
    stageText.text = `STAGE ${snapshot.stage}`;
    heartsText.text = `HEARTS ${"♥".repeat(snapshot.hearts)}`;
    challengeText.text = snapshot.challenge
      ? `HITS ${snapshot.challengeHits}/40`
      : "";
    messageText.text = messageFor(snapshot);
    messageText.visible = messageText.text.length > 0;
  }

  function syncPlayer(snapshot: GameSnapshot): void {
    const expectedKey = snapshot.player.dual ? "dual" : "single";
    if (playerDisplay.label !== expectedKey) {
      entityLayer.removeChild(playerDisplay);
      playerDisplay.destroy({ children: true });
      playerDisplay = createPlayerGraphic(snapshot.player.dual);
      entityLayer.addChild(playerDisplay);
    }
    playerDisplay.position.set(
      Math.round(snapshot.player.x),
      Math.round(snapshot.player.y),
    );
    playerDisplay.visible =
      snapshot.player.visible &&
      (snapshot.player.invulnerableMs <= 0 ||
        Math.floor(snapshot.player.invulnerableMs / 90) % 2 === 0);
  }

  function syncEnemies(enemies: readonly Readonly<EnemyState>[]): void {
    const liveIds = new Set<number>();
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      liveIds.add(enemy.id);
      const renderKey = `${enemy.kind}:${enemy.hp}:${enemy.capturedFighter}`;
      let display = enemyDisplays.get(enemy.id);
      if (!display || display.renderKey !== renderKey) {
        if (display) {
          entityLayer.removeChild(display.container);
          display.container.destroy({ children: true });
        }
        const container = createEnemyGraphic(enemy);
        display = { container, renderKey };
        enemyDisplays.set(enemy.id, display);
        entityLayer.addChild(container);
      }
      display.container.position.set(Math.round(enemy.x), Math.round(enemy.y));
    }
    for (const [id, display] of enemyDisplays) {
      if (liveIds.has(id)) continue;
      entityLayer.removeChild(display.container);
      display.container.destroy({ children: true });
      enemyDisplays.delete(id);
    }
  }

  function syncAlly(ally: Readonly<AlphabetAllyState>): void {
    const renderKey = `${ally.id}:${ally.letter}`;
    if (!ally.active) {
      if (allyDisplay) {
        entityLayer.removeChild(allyDisplay);
        allyDisplay.destroy({ children: true });
        allyDisplay = null;
      }
      return;
    }
    if (!allyDisplay || allyRenderKey !== renderKey) {
      if (allyDisplay) {
        entityLayer.removeChild(allyDisplay);
        allyDisplay.destroy({ children: true });
      }
      allyDisplay = createAllyGraphic(ally.letter);
      allyRenderKey = renderKey;
      entityLayer.addChild(allyDisplay);
    }
    allyDisplay.position.set(Math.round(ally.x), Math.round(ally.y));
  }

  function syncProjectiles(
    projectiles: readonly Readonly<ProjectileState>[],
  ): void {
    const liveIds = new Set<number>();
    for (const projectile of projectiles) {
      if (!projectile.active) continue;
      liveIds.add(projectile.id);
      let display = projectileDisplays.get(projectile.id);
      if (!display) {
        display = new Graphics()
          .rect(0, 0, projectile.width, projectile.height)
          .fill(
            projectile.owner === "player"
              ? 0xfff27a
              : projectile.charged
                ? 0xff4fd8
                : 0xff5d73,
          );
        projectileDisplays.set(projectile.id, display);
        projectileLayer.addChild(display);
      }
      display.position.set(Math.round(projectile.x), Math.round(projectile.y));
    }
    for (const [id, display] of projectileDisplays) {
      if (liveIds.has(id)) continue;
      projectileLayer.removeChild(display);
      display.destroy();
      projectileDisplays.delete(id);
    }
  }

  function syncBeam(snapshot: GameSnapshot): void {
    beamGraphic.clear();
    const tractor = snapshot.enemies.find(
      (enemy) =>
        enemy.active &&
        enemy.mode === "tractor" &&
        enemy.diveProgress >= 0.28 &&
        enemy.diveProgress < 0.72,
    );
    if (!tractor) return;
    beamGraphic
      .poly([
        tractor.x - 5,
        tractor.y + tractor.height,
        tractor.x + tractor.width + 5,
        tractor.y + tractor.height,
        tractor.x + tractor.width + 24,
        STAGE_HEIGHT - 36,
        tractor.x - 24,
        STAGE_HEIGHT - 36,
      ])
      .fill({ color: 0x68f7ff, alpha: 0.2 });
  }

  syncSnapshot(model.getSnapshot());
  app.ticker.add(tick);

  return {
    setMoveDirection(direction) {
      model.setMoveDirection(direction);
      if (direction !== 0) void audio.resume();
    },
    setFiring(value) {
      firing = value;
      if (value) void audio.resume();
    },
    movePlayerTo(x) {
      model.movePlayerTo(x);
    },
    togglePause() {
      const paused = model.togglePause();
      if (paused) {
        firing = false;
        audio.stop("tractor-loop");
      }
      return paused;
    },
    restart() {
      gameOverNotified = false;
      firing = false;
      audio.stopAll();
      model.restart();
    },
    setSoundEnabled(enabled) {
      audio.setMuted(!enabled);
      if (enabled) void audio.resume();
    },
    resumeAudio() {
      return audio.resume();
    },
    getSnapshot() {
      return model.getSnapshot();
    },
    async destroy() {
      if (destroyed) return;
      destroyed = true;
      clearInput();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearInput);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      app.ticker.remove(tick);
      app.ticker.stop();
      await audio.destroy();
      app.destroy(
        { removeView: true },
        { children: true, texture: true, textureSource: true },
      );
    },
  };
}

function createHudText(
  x: number,
  y: number,
  fontSize: number,
  fill: number,
  anchorX = 0,
): Text {
  const text = new Text({
    text: "",
    style: {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize,
      fill,
    },
  });
  text.anchor.set(anchorX, 0);
  text.position.set(x, y);
  return text;
}

function createStars(layer: Container): StarDisplay[] {
  const colors = [0xffffff, 0x72e4ff, 0xffdc72];
  return Array.from({ length: 54 }, (_, index) => {
    const size = index % 11 === 0 ? 2 : 1;
    const graphic = new Graphics()
      .rect(0, 0, size, size)
      .fill(colors[index % colors.length]);
    const star = {
      graphic,
      speed: 8 + (index % 4) * 7,
      y: (index * 83) % STAGE_HEIGHT,
    };
    graphic.position.set((index * 47 + 19) % STAGE_WIDTH, star.y);
    graphic.alpha = 0.35 + (index % 5) * 0.13;
    layer.addChild(graphic);
    return star;
  });
}

function updateStars(
  stars: StarDisplay[],
  deltaMs: number,
  paused: boolean,
): void {
  if (paused) return;
  for (const star of stars) {
    star.y += (star.speed * Math.min(deltaMs, 100)) / 1_000;
    if (star.y > STAGE_HEIGHT) star.y = -2;
    star.graphic.y = Math.round(star.y);
  }
}

function createPlayerGraphic(dual: boolean): Container {
  const container = new Container();
  container.label = dual ? "dual" : "single";
  const offsets = dual ? [0, 14] : [0];
  for (const offset of offsets) {
    const ship = new Graphics()
      .rect(offset + 8, 0, 4, 3)
      .rect(offset + 5, 3, 10, 3)
      .rect(offset + 2, 6, 16, 4)
      .rect(offset, 10, 6, 3)
      .rect(offset + 14, 10, 6, 3)
      .fill(0x8be9ff)
      .rect(offset + 8, 4, 4, 6)
      .fill(0xfff27a);
    container.addChild(ship);
  }
  return container;
}

function createEnemyGraphic(enemy: Readonly<EnemyState>): Container {
  const container = new Container();
  const colors: Record<EnemyKind, number> = {
    scout: 0x5be37d,
    striker: 0xff6978,
    commander: enemy.hp < enemy.maxHp ? 0x68a8ff : 0xffd166,
    morph: 0xd875ff,
  };
  const body = new Graphics()
    .rect(0, 0, enemy.width, enemy.height)
    .fill(colors[enemy.kind]);

  if (enemy.kind === "scout") {
    body.rect(3, 3, enemy.width - 6, enemy.height - 6).fill(0x17351f);
  } else if (enemy.kind === "striker") {
    body
      .rect(2, enemy.height / 2 - 1, enemy.width - 4, 2)
      .rect(enemy.width / 2 - 1, 2, 2, enemy.height - 4)
      .fill(0x42121b);
  } else if (enemy.kind === "commander") {
    body
      .rect(3, 3, enemy.width - 6, enemy.height - 6)
      .fill(0x4b3510)
      .rect(enemy.width / 2 - 2, enemy.height / 2 - 2, 4, 4)
      .fill(0xffffff);
  } else {
    body
      .poly([
        enemy.width / 2,
        2,
        enemy.width - 2,
        enemy.height / 2,
        enemy.width / 2,
        enemy.height - 2,
        2,
        enemy.height / 2,
      ])
      .fill(0x401156);
  }
  container.addChild(body);

  if (enemy.capturedFighter) {
    const fighter = new Graphics()
      .rect(enemy.width / 2 - 2, enemy.height + 2, 4, 2)
      .rect(enemy.width / 2 - 6, enemy.height + 4, 12, 4)
      .fill(0x8be9ff);
    container.addChild(fighter);
  }
  return container;
}

function createAllyGraphic(letter: string): Container {
  const container = new Container();
  const frame = new Graphics()
    .rect(0, 0, 16, 16)
    .stroke({ color: 0xf7fbff, width: 1 })
    .rect(1, 1, 2, 2)
    .rect(13, 13, 2, 2)
    .fill(0x68f7ff);
  const glyph = new Text({
    text: letter,
    style: {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: 14,
      fontWeight: "700",
      fill: 0xffffff,
    },
  });
  glyph.anchor.set(0.5);
  glyph.position.set(8, 7.5);
  container.addChild(frame, glyph);
  return container;
}

function messageFor(snapshot: GameSnapshot): string {
  if (snapshot.paused) return "PAUSED";
  if (snapshot.phase === "wave-intro") {
    return `${snapshot.challenge ? "CHALLENGE" : `STAGE ${snapshot.stage}`}\nPROTECT ${snapshot.protectedLetter}`;
  }
  if (snapshot.phase === "player-death") return "SHIP LOST";
  if (snapshot.phase === "wave-clear") {
    return snapshot.challenge
      ? `CHALLENGE COMPLETE\n${snapshot.challengeHits}/40 HITS`
      : "WAVE CLEAR";
  }
  if (snapshot.phase === "game-over") {
    return `GAME OVER\nSCORE ${snapshot.score}`;
  }
  return "";
}
