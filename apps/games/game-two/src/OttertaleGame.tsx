import React, { useEffect, useRef, useState, useCallback } from "react";
import { Application, extend, useTick } from "@pixi/react";
import {
  Graphics,
  Sprite,
  AnimatedSprite,
  TilingSprite,
  Assets,
  Texture,
  Rectangle,
  TextStyle,
  Container,
} from "pixi.js";
import * as PIXI from "pixi.js";

// 1. Register Pixi.js classes
extend({
  Graphics,
  Sprite,
  AnimatedSprite,
  TilingSprite,
  Text: PIXI.Text,
  Container,
});

// --- Force Pixel Art Scaling ---
PIXI.TextureStyle.defaultOptions.scaleMode = "nearest";

// --- Sound Effects Setup ---
const sfx = {
  coin: new Audio("/assets/coin.wav"),
  explosion: new Audio("/assets/explosion.wav"),
  hurt: new Audio("/assets/hurt.wav"),
  jump: new Audio("/assets/jump.wav"),
  powerUp: new Audio("/assets/power_up.wav"),
  tap: new Audio("/assets/tap.wav"),
};

Object.values(sfx).forEach((audio) => {
  audio.volume = 0.5;
});

const playSFX = (name: keyof typeof sfx) => {
  sfx[name].currentTime = 0;
  sfx[name].play().catch(() => {});
};

// --- Unified Input Handling Hook ---
const useGameInput = () => {
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const setVirtualKey = (code: string, isDown: boolean) => {
    keys.current[code] = isDown;
  };

  return { keys, setVirtualKey };
};

const MobileButton = ({
  onDown,
  onUp,
  label,
}: {
  onDown: () => void;
  onUp: () => void;
  label: string;
}) => (
  <button
    className="mobile-btn"
    onPointerDown={(e) => {
      e.preventDefault();
      onDown();
    }}
    onPointerUp={(e) => {
      e.preventDefault();
      onUp();
    }}
    onPointerLeave={(e) => {
      e.preventDefault();
      onUp();
    }}
    onPointerCancel={(e) => {
      e.preventDefault();
      onUp();
    }}
  >
    {label}
  </button>
);

const extractFrames = (
  baseTexture: PIXI.Texture,
  w: number,
  h: number,
  count: number,
  startX: number = 0,
  startY: number = 0,
) => {
  const frames = [];
  for (let i = 0; i < count; i++) {
    const x = startX + i * w;
    if (x + w > baseTexture.source.width) break;
    const rect = new Rectangle(x, startY, w, h);
    frames.push(new Texture({ source: baseTexture.source, frame: rect }));
  }
  return frames.length > 0 ? frames : [baseTexture];
};

const extractFramesTrimmed = (
  texture: PIXI.Texture,
  frameW: number,
  frameH: number,
  count: number,
  gridStartX: number,
  gridStartY: number,
  trimOffsetX: number,
  trimOffsetY: number,
  trimmedW: number,
  trimmedH: number,
) => {
  const frames: PIXI.Texture[] = [];
  for (let i = 0; i < count; i++) {
    const origX = gridStartX + i * frameW;
    const origY = gridStartY;
    const x = origX - trimOffsetX;
    const y = origY - trimOffsetY;
    const clippedX = Math.max(0, x);
    const clippedY = Math.max(0, y);
    const clippedW = Math.min(frameW - (clippedX - x), trimmedW - clippedX);
    const clippedH = Math.min(frameH - (clippedY - y), trimmedH - clippedY);
    if (clippedW <= 0 || clippedH <= 0) continue;
    frames.push(
      new Texture({
        source: texture.source,
        frame: new Rectangle(clippedX, clippedY, clippedW, clippedH),
      }),
    );
  }
  return frames.length > 0 ? frames : [texture];
};

const cropTexture = (
  texture: PIXI.Texture,
  x: number,
  y: number,
  w: number,
  h: number,
) => new Texture({ source: texture.source, frame: new Rectangle(x, y, w, h) });

const PLAYER_FOOT_OFFSET = 8;
const PLAYER_HEAD_OFFSET = 28;
const SLIME_FOOT_OFFSET = 2;

const Coin = ({
  textures,
  x,
  y,
  collected,
}: {
  textures: Texture[];
  x: number;
  y: number;
  collected: boolean;
  onCollect: () => void;
}) => {
  const ref = useRef<PIXI.AnimatedSprite>(null);
  useEffect(() => {
    if (ref.current) ref.current.play();
  }, []);
  if (collected) return null;
  return (
    <pixiAnimatedSprite
      ref={ref}
      textures={textures}
      x={x}
      y={y}
      anchor={0.5}
      scale={{ x: 2, y: 2 }}
      animationSpeed={0.15}
    />
  );
};

const Fruit = ({
  texture,
  x,
  y,
  collected,
}: {
  texture: Texture;
  x: number;
  y: number;
  collected: boolean;
  onCollect: () => void;
}) => {
  if (collected) return null;
  return (
    <pixiSprite
      texture={texture}
      x={x}
      y={y}
      anchor={0.5}
      scale={{ x: 2.2, y: 2.2 }}
    />
  );
};

const FinishLine = ({ x, y }: { x: number; y: number }) => {
  const draw = useCallback((g: PIXI.Graphics) => {
    g.clear();
    g.beginFill(0xffd700, 0.4);
    g.lineStyle(4, 0xffffff, 1);
    g.drawRect(0, 0, 80, 300);
    g.endFill();
  }, []);
  return <pixiGraphics draw={draw} x={x} y={y} />;
};

const Slime = ({
  textures,
  slime,
  onUpdatePosition,
  isPaused,
}: {
  textures: Texture[];
  slime: {
    id: number;
    x: number;
    y: number;
    alive: boolean;
    direction: number;
    minX: number;
    maxX: number;
  };
  onUpdatePosition: (id: number, newX: number, newDir: number) => void;
  isPaused: boolean;
}) => {
  const ref = useRef<PIXI.AnimatedSprite>(null);

  useEffect(() => {
    if (ref.current) ref.current.play();
  }, []);

  useTick(() => {
    if (!slime.alive || isPaused) {
      if (ref.current && ref.current.playing && isPaused) ref.current.stop();
      return;
    }

    if (ref.current && !ref.current.playing) ref.current.play();

    let newX = slime.x + 1 * slime.direction;
    let newDir = slime.direction;

    if (newX > slime.maxX) newDir = -1;
    if (newX < slime.minX) newDir = 1;

    onUpdatePosition(slime.id, newX, newDir);
    if (ref.current) {
      ref.current.x = newX;
      ref.current.scale.x = newDir > 0 ? 2 : -2;
    }
  });

  if (!slime.alive) return null;

  return (
    <pixiAnimatedSprite
      ref={ref}
      textures={textures}
      x={slime.x}
      y={slime.y}
      anchor={0.5}
      scale={{ x: 2, y: 2 }}
      animationSpeed={0.1}
    />
  );
};

const Player = ({
  assets,
  coins,
  onCollectCoin,
  fruits,
  onCollectFruit,
  slimes,
  onHitSlime,
  onKillSlime,
  onMove,
  onReachFinish,
  resetTrigger,
  isDead,
  inputKeys,
  isPaused,
  activeBuff,
  stageConfig,
}: {
  assets: any;
  coins: { id: number; x: number; y: number; collected: boolean }[];
  onCollectCoin: (id: number) => void;
  fruits: { id: number; x: number; y: number; collected: boolean }[];
  onCollectFruit: (id: number) => void;
  slimes: {
    id: number;
    x: number;
    y: number;
    alive: boolean;
    direction: number;
    minX: number;
    maxX: number;
  }[];
  onHitSlime: () => void;
  onKillSlime: (id: number) => void;
  onMove: (x: number) => void;
  onReachFinish: () => void;
  resetTrigger: number;
  isDead: boolean;
  inputKeys: React.MutableRefObject<{ [key: string]: boolean }>;
  isPaused: boolean;
  activeBuff: { type: "speed" | "invincibility" | null; until: number };
  stageConfig: any;
}) => {
  const spriteRef = useRef<PIXI.AnimatedSprite>(null);
  const currentAnim = useRef<"idle" | "run">("idle");
  const facingRight = useRef<boolean>(true);

  useEffect(() => {
    if (spriteRef.current) spriteRef.current.play();
  }, []);

  const physics = useRef({
    x: 100,
    y: 200,
    velocityX: 0,
    velocityY: 0,
    isGrounded: false,
  });
  const playerRenderSize = 64;

  useEffect(() => {
    physics.current.x = 100;
    physics.current.y = 200;
    physics.current.velocityX = 0;
    physics.current.velocityY = 0;
  }, [resetTrigger]);

  useTick(() => {
    if (!spriteRef.current || isDead || isPaused) {
      if (spriteRef.current && spriteRef.current.playing && isPaused)
        spriteRef.current.stop();
      return;
    }

    const p = physics.current;
    const k = inputKeys.current;

    const isBuffed = Date.now() < activeBuff.until;
    const buffType = isBuffed ? activeBuff.type : null;

    const moveSpeed = buffType === "speed" ? 7.0 : 3.5;
    const jumpPower = buffType === "speed" ? -10.5 : -8.5;

    if (buffType === "speed") spriteRef.current.tint = 0x4488ff;
    else if (buffType === "invincibility") spriteRef.current.tint = 0xff4444;
    else spriteRef.current.tint = 0xffffff;

    p.velocityX = 0;
    let isMoving = false;

    if (k["ArrowLeft"] || k["KeyA"]) {
      p.velocityX = -moveSpeed;
      isMoving = true;
      facingRight.current = false;
    }
    if (k["ArrowRight"] || k["KeyD"]) {
      p.velocityX = moveSpeed;
      isMoving = true;
      facingRight.current = true;
    }

    const nextAnim = isMoving && p.isGrounded ? "run" : "idle";
    if (nextAnim !== currentAnim.current) {
      spriteRef.current.textures =
        nextAnim === "run" ? assets.playerRun : assets.playerIdle;
      spriteRef.current.animationSpeed = nextAnim === "run" ? 0.25 : 0.2;
      spriteRef.current.play();
      currentAnim.current = nextAnim;
    } else if (!spriteRef.current.playing) {
      spriteRef.current.play();
    }

    spriteRef.current.scale.x = facingRight.current ? 2 : -2;

    if ((k["ArrowUp"] || k["KeyW"] || k["Space"]) && p.isGrounded) {
      p.velocityY = jumpPower;
      p.isGrounded = false;
      playSFX("jump");
    }
    p.velocityY += 0.35;

    p.x += p.velocityX;
    if (p.x < playerRenderSize / 2) p.x = playerRenderSize / 2;
    if (p.x > stageConfig.worldWidth - playerRenderSize / 2)
      p.x = stageConfig.worldWidth - playerRenderSize / 2;

    p.y += p.velocityY;
    p.isGrounded = false;

    const playerBox = {
      left: p.x - 20,
      right: p.x + 20,
      top: p.y - PLAYER_HEAD_OFFSET,
      bottom: p.y + PLAYER_FOOT_OFFSET,
    };

    const floorLevel = 500;
    if (
      playerBox.bottom >= floorLevel &&
      p.velocityY >= 0 &&
      playerBox.top < floorLevel
    ) {
      p.y = floorLevel - PLAYER_FOOT_OFFSET;
      p.velocityY = 0;
      p.isGrounded = true;
    }

    // Dynamic Platforms
    stageConfig.platforms.forEach((plat: any) => {
      if (
        p.velocityY > 0 &&
        playerBox.right > plat.left &&
        playerBox.left < plat.right &&
        playerBox.bottom >= plat.top &&
        playerBox.top <= plat.top + 12
      ) {
        p.y = plat.top - PLAYER_FOOT_OFFSET;
        p.velocityY = 0;
        p.isGrounded = true;
      }
    });

    coins.forEach((coin) => {
      if (!coin.collected) {
        const dx = p.x - coin.x;
        const dy = p.y - coin.y;
        if (Math.sqrt(dx * dx + dy * dy) < 35) onCollectCoin(coin.id);
      }
    });

    fruits.forEach((fruit) => {
      if (!fruit.collected) {
        const dx = p.x - fruit.x;
        const dy = p.y - fruit.y;
        if (Math.sqrt(dx * dx + dy * dy) < 35) onCollectFruit(fruit.id);
      }
    });

    slimes.forEach((slime) => {
      if (!slime.alive) return;
      const slimeKillBox = {
        left: slime.x - 24,
        right: slime.x + 24,
        top: slime.y - 24,
        bottom: slime.y + SLIME_FOOT_OFFSET,
      };
      const slimeDamageBox = {
        left: slime.x - 14,
        right: slime.x + 14,
        top: slime.y - 10,
        bottom: slime.y + SLIME_FOOT_OFFSET,
      };

      if (
        playerBox.right > slimeKillBox.left &&
        playerBox.left < slimeKillBox.right &&
        playerBox.bottom > slimeKillBox.top &&
        playerBox.top < slimeKillBox.bottom
      ) {
        if (p.velocityY > 0 && playerBox.bottom <= slimeKillBox.top + 20) {
          onKillSlime(slime.id);
          p.velocityY = -6.5;
        } else if (
          playerBox.right > slimeDamageBox.left &&
          playerBox.left < slimeDamageBox.right &&
          playerBox.bottom > slimeDamageBox.top &&
          playerBox.top < slimeDamageBox.bottom
        ) {
          if (buffType === "invincibility") {
            onKillSlime(slime.id);
          } else {
            onHitSlime();
          }
        }
      }
    });

    if (p.x > stageConfig.finishLineX) {
      onReachFinish();
    }

    spriteRef.current.x = p.x;
    spriteRef.current.y = p.y;
    onMove(p.x);
  });

  return (
    <pixiAnimatedSprite
      ref={spriteRef}
      textures={assets.playerIdle}
      anchor={0.5}
      animationSpeed={0.2}
    />
  );
};

const spellingWords = [
  { word: "apple", wrong: "aple" },
  { word: "banana", wrong: "bannana" },
  { word: "cherry", wrong: "chery" },
  { word: "orange", wrong: "oranje" },
  { word: "strawberry", wrong: "strawbery" },
  { word: "grape", wrong: "grappe" },
  { word: "lemon", wrong: "lemmon" },
];

// --- Playable Tutorial Stage ---
const TUTORIAL_STAGE = {
  id: 0,
  name: "TUTORIAL",
  word: "TUTORIAL",
  worldWidth: 3400,
  finishLineX: 3200,
  platforms: [
    { left: 700, right: 847, top: 350, bottom: 360 },
    { left: 1600, right: 1747, top: 380, bottom: 390 },
  ],
  coins: [
    { id: 1, x: 400, y: 450, collected: false },
    { id: 2, x: 500, y: 450, collected: false },
    { id: 3, x: 775, y: 250, collected: false },
    { id: 4, x: 1200, y: 450, collected: false },
    { id: 5, x: 1675, y: 280, collected: false },
    { id: 6, x: 2100, y: 450, collected: false },
    { id: 7, x: 2600, y: 450, collected: false },
    { id: 8, x: 2900, y: 450, collected: false },
  ],
  fruits: [{ id: 1, x: 1300, y: 450, collected: false }],
  slimes: [
    {
      id: 1,
      x: 2300,
      y: 500 - SLIME_FOOT_OFFSET,
      alive: true,
      direction: 1,
      minX: 2100,
      maxX: 2500,
      color: "green" as const,
    },
  ],
  texts: [
    { text: "Welcome! Use ARROWS or A/D to move.", x: 200, y: 350 },
    { text: "Press SPACE or UP to JUMP over obstacles.", x: 600, y: 200 },
    { text: "Collect COINS to spell the word above!", x: 950, y: 350 },
    { text: "Grab FRUITS and spell correctly for BUFFS!", x: 1300, y: 250 },
    { text: "Watch out! Jump ON SLIMES to defeat them.", x: 2200, y: 350 },
    { text: "Reach the FINISH LINE with all letters to win!", x: 2800, y: 350 },
  ],
};

// --- Standard Stages Configuration ---
const STAGES = [
  {
    id: 1,
    name: "STAGE 1",
    word: "APPLE",
    worldWidth: 2000,
    finishLineX: 1800,
    platforms: [
      { left: 200, right: 347, top: 400, bottom: 410 },
      { left: 500, right: 647, top: 320, bottom: 330 },
      { left: 800, right: 947, top: 250, bottom: 260 },
      { left: 1100, right: 1247, top: 380, bottom: 390 },
      { left: 1400, right: 1547, top: 280, bottom: 290 },
    ],
    coins: [
      { id: 1, x: 270, y: 350, collected: false },
      { id: 2, x: 570, y: 270, collected: false },
      { id: 3, x: 870, y: 200, collected: false },
      { id: 4, x: 1170, y: 330, collected: false },
      { id: 5, x: 1470, y: 230, collected: false },
    ],
    fruits: [{ id: 1, x: 1000, y: 450, collected: false }],
    slimes: [
      {
        id: 1,
        x: 600,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: 1,
        minX: 400,
        maxX: 800,
        color: "green" as const,
      },
      {
        id: 2,
        x: 1200,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: -1,
        minX: 1000,
        maxX: 1400,
        color: "purple" as const,
      },
    ],
    texts: [],
  },
  {
    id: 2,
    name: "STAGE 2",
    word: "ORANGE",
    worldWidth: 2600,
    finishLineX: 2400,
    platforms: [
      { left: 150, right: 297, top: 380, bottom: 390 },
      { left: 400, right: 547, top: 280, bottom: 290 },
      { left: 700, right: 847, top: 200, bottom: 210 },
      { left: 1000, right: 1147, top: 320, bottom: 330 },
      { left: 1400, right: 1547, top: 380, bottom: 390 },
      { left: 1700, right: 1847, top: 280, bottom: 290 },
      { left: 2000, right: 2147, top: 200, bottom: 210 },
    ],
    coins: [
      { id: 1, x: 220, y: 330, collected: false },
      { id: 2, x: 470, y: 230, collected: false },
      { id: 3, x: 770, y: 150, collected: false },
      { id: 4, x: 1070, y: 270, collected: false },
      { id: 5, x: 1470, y: 330, collected: false },
      { id: 6, x: 1770, y: 230, collected: false },
    ],
    fruits: [
      { id: 1, x: 900, y: 450, collected: false },
      { id: 2, x: 1900, y: 450, collected: false },
    ],
    slimes: [
      {
        id: 1,
        x: 400,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: 1,
        minX: 300,
        maxX: 600,
        color: "green" as const,
      },
      {
        id: 2,
        x: 900,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: -1,
        minX: 700,
        maxX: 1100,
        color: "purple" as const,
      },
      {
        id: 3,
        x: 1500,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: 1,
        minX: 1300,
        maxX: 1700,
        color: "green" as const,
      },
      {
        id: 4,
        x: 2000,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: -1,
        minX: 1800,
        maxX: 2200,
        color: "purple" as const,
      },
    ],
    texts: [],
  },
  {
    id: 3,
    name: "STAGE 3",
    word: "STRAWBERRIES",
    worldWidth: 3600,
    finishLineX: 3350,
    platforms: [
      { left: 150, right: 297, top: 400, bottom: 410 },
      { left: 350, right: 497, top: 280, bottom: 290 },
      { left: 600, right: 747, top: 350, bottom: 360 },
      { left: 850, right: 997, top: 240, bottom: 250 },
      { left: 1000, right: 1147, top: 410, bottom: 420 },
      { left: 1300, right: 1447, top: 350, bottom: 360 },
      { left: 1550, right: 1697, top: 260, bottom: 270 },
      { left: 1800, right: 1947, top: 380, bottom: 390 },
      { left: 2100, right: 2247, top: 300, bottom: 310 },
      { left: 2400, right: 2547, top: 220, bottom: 230 },
      { left: 2700, right: 2847, top: 350, bottom: 360 },
      { left: 3000, right: 3147, top: 280, bottom: 290 },
    ],
    coins: [
      { id: 1, x: 220, y: 350, collected: false },
      { id: 2, x: 420, y: 230, collected: false },
      { id: 3, x: 670, y: 300, collected: false },
      { id: 4, x: 920, y: 190, collected: false },
      { id: 5, x: 1080, y: 360, collected: false },
      { id: 6, x: 1370, y: 300, collected: false },
      { id: 7, x: 1620, y: 210, collected: false },
      { id: 8, x: 1870, y: 330, collected: false },
      { id: 9, x: 2170, y: 250, collected: false },
      { id: 10, x: 2470, y: 170, collected: false },
      { id: 11, x: 2770, y: 300, collected: false },
      { id: 12, x: 3070, y: 230, collected: false },
    ],
    fruits: [
      { id: 1, x: 780, y: 420, collected: false },
      { id: 2, x: 1550, y: 200, collected: false },
      { id: 3, x: 2350, y: 420, collected: false },
      { id: 4, x: 3200, y: 250, collected: false },
    ],
    slimes: [
      {
        id: 1,
        x: 500,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: 1,
        minX: 420,
        maxX: 620,
        color: "green" as const,
      },
      {
        id: 2,
        x: 950,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: -1,
        minX: 880,
        maxX: 1150,
        color: "purple" as const,
      },
      {
        id: 3,
        x: 380,
        y: 280 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: 1,
        minX: 350,
        maxX: 480,
        color: "purple" as const,
      },
      {
        id: 4,
        x: 1500,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: 1,
        minX: 1350,
        maxX: 1700,
        color: "green" as const,
      },
      {
        id: 5,
        x: 2000,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: -1,
        minX: 1900,
        maxX: 2250,
        color: "purple" as const,
      },
      {
        id: 6,
        x: 2650,
        y: 500 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: 1,
        minX: 2550,
        maxX: 2850,
        color: "green" as const,
      },
      {
        id: 7,
        x: 2170,
        y: 300 - SLIME_FOOT_OFFSET,
        alive: true,
        direction: 1,
        minX: 2130,
        maxX: 2280,
        color: "purple" as const,
      },
    ],
    texts: [],
  },
];

type GameState = "lobby" | "stageSelect" | "playing";

export type OttertaleProgressSummary = {
  completedStageIds: number[];
  bestScoresByStage: Record<string, number>;
};

export type OttertaleStageCompletion = {
  stageId: number;
  score: number;
};

export function OttertaleGame({
  onExitToLobby,
  progress,
  onStageComplete,
}: {
  onExitToLobby?: () => void;
  progress?: OttertaleProgressSummary;
  onStageComplete?: (completion: OttertaleStageCompletion) => void;
}) {
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [stageConfig, setStageConfig] = useState<any>(STAGES[0]);

  const [isMenuPaused, setIsMenuPaused] = useState<boolean>(false);
  const [hasWon, setHasWon] = useState<boolean>(false);

  const [assets, setAssets] = useState<any>(null);
  const [assetError, setAssetError] = useState(false);
  const [score, setScore] = useState<number>(0);
  const [cameraX, setCameraX] = useState<number>(0);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [isDead, setIsDead] = useState<boolean>(false);

  const [quiz, setQuiz] = useState<{ word: string; options: string[] } | null>(
    null,
  );
  const [activeBuff, setActiveBuff] = useState<{
    type: "speed" | "invincibility" | null;
    until: number;
  }>({ type: null, until: 0 });
  const [collectedLetters, setCollectedLetters] = useState<number[]>([]);

  // Fixed Type Mismatches
  const [coins, setCoins] = useState<any[]>(stageConfig.coins);
  const [fruits, setFruits] = useState<any[]>(stageConfig.fruits);
  const [slimes, setSlimes] = useState<any[]>(stageConfig.slimes);
  const completionReportedRef = useRef(false);

  const isPaused = !!quiz || isMenuPaused || gameState !== "playing" || hasWon;

  const { keys, setVirtualKey } = useGameInput();

  const bgmRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bgmRef.current = new Audio("/assets/time_for_adventure.mp3");
    bgmRef.current.loop = true;
    bgmRef.current.volume = 0.4;

    return () => {
      if (bgmRef.current) {
        bgmRef.current.pause();
        bgmRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!bgmRef.current) return;

    if (gameState === "playing" && !isPaused && !isDead) {
      bgmRef.current
        .play()
        .catch((e) => console.warn("Browser prevented audio autoplay:", e));
    } else {
      bgmRef.current.pause();
    }
  }, [gameState, isPaused, isDead]);

  useEffect(() => {
    const loadEverything = async () => {
      try {
        const [
          knightTex,
          tilesetTex,
          coinTex,
          slimeGreenTex,
          slimePurpleTex,
          platTex,
          fruitTex,
        ] = await Promise.all([
          Assets.load("/assets/knight.png"),
          Assets.load("/assets/world_tileset.png"),
          Assets.load("/assets/coin.png"),
          Assets.load("/assets/slime_green.png"),
          Assets.load("/assets/slime_purple.png"),
          Assets.load("/assets/platforms.png"),
          Assets.load("/assets/fruit.png"),
        ]);

        setAssets({
          playerIdle: extractFrames(knightTex, 32, 32, 4, 0, 0),
          playerRun: extractFrames(knightTex, 32, 32, 8, 0, 64),
          groundTop: cropTexture(tilesetTex, 0, 0, 16, 16),
          groundDirt: cropTexture(tilesetTex, 0, 16, 16, 16),
          coin: extractFramesTrimmed(coinTex, 16, 16, 12, 0, 0, 2, 2, 187, 12),
          slimeGreen: extractFramesTrimmed(
            slimeGreenTex,
            24,
            24,
            4,
            0,
            0,
            4,
            11,
            88,
            61,
          ),
          slimePurple: extractFramesTrimmed(
            slimePurpleTex,
            24,
            24,
            4,
            0,
            0,
            4,
            11,
            88,
            61,
          ),
          platform: cropTexture(platTex, 0, 0, 49, 10),
          fruitA: cropTexture(fruitTex, 2, 3, 11, 13),
          fruitB: cropTexture(fruitTex, 20, 17, 9, 17),
          fruitC: cropTexture(fruitTex, 34, 34, 11, 15),
        });
      } catch (err) {
        console.error("Failed to load assets:", err);
        setAssetError(true);
      }
    };
    loadEverything();
  }, []);

  const handleStartStage = (config: any) => {
    setStageConfig(config);

    setScore(0);
    setCoins(config.coins.map((c: any) => ({ ...c, collected: false })));
    setFruits(config.fruits.map((f: any) => ({ ...f, collected: false })));
    setSlimes(config.slimes.map((s: any) => ({ ...s, alive: true })));

    setCollectedLetters([]);
    setCameraX(0);
    setIsDead(false);
    setHasWon(false);
    setActiveBuff({ type: null, until: 0 });
    setQuiz(null);
    setIsMenuPaused(false);
    setResetTrigger((prev) => prev + 1);
    completionReportedRef.current = false;
    setGameState("playing");

    if (bgmRef.current) bgmRef.current.currentTime = 0;
  };

  const handleExitToMenu = (destination: GameState) => {
    playSFX("tap");
    if (destination === "lobby" && onExitToLobby) {
      onExitToLobby();
      return;
    }
    setHasWon(false);
    setIsDead(false);
    setIsMenuPaused(false);
    setQuiz(null);
    setGameState(destination);

    if (bgmRef.current) {
      bgmRef.current.pause();
      bgmRef.current.currentTime = 0;
    }
  };

  const handleCollectCoin = (id: number) => {
    if (isDead || isPaused) return;
    setCoins((prevCoins) => {
      const next = prevCoins.map((coin) => {
        if (coin.id === id && !coin.collected) {
          setScore((s) => s + 1);
          playSFX("coin");
          return { ...coin, collected: true };
        }
        return coin;
      });

      setCollectedLetters((prevLetters) => {
        const uncollectedIndices = stageConfig.word
          .split("")
          .map((_: string, i: number) => i)
          .filter((i: number) => !prevLetters.includes(i));
        if (
          uncollectedIndices.length > 0 &&
          prevLetters.length < next.filter((c) => c.collected).length
        ) {
          const randomIdx =
            uncollectedIndices[
              Math.floor(Math.random() * uncollectedIndices.length)
            ];
          return [...prevLetters, randomIdx];
        }
        return prevLetters;
      });

      return next;
    });
  };

  const handleCollectFruit = (id: number) => {
    if (isDead || isPaused) return;
    setFruits((prev) =>
      prev.map((fruit) => {
        if (fruit.id === id && !fruit.collected) {
          const question =
            spellingWords[Math.floor(Math.random() * spellingWords.length)];
          const isFirstCorrect = Math.random() > 0.5;
          setQuiz({
            word: question.word,
            options: isFirstCorrect
              ? [question.word, question.wrong]
              : [question.wrong, question.word],
          });
          return { ...fruit, collected: true };
        }
        return fruit;
      }),
    );
  };

  const handleQuizAnswer = (answer: string) => {
    if (quiz && answer === quiz.word) {
      setScore((s) => s + 5);
      const isSpeed = Math.random() > 0.5;
      setActiveBuff({
        type: isSpeed ? "speed" : "invincibility",
        until: Date.now() + 8000,
      });
      playSFX("powerUp");
    } else {
      playSFX("tap");
    }
    setQuiz(null);
  };

  const handleHitSlime = () => {
    if (isPaused) return;
    setIsDead(true);
    playSFX("hurt");
  };

  const handleReachFinish = () => {
    if (!hasWon && !completionReportedRef.current) {
      completionReportedRef.current = true;
      setHasWon(true);
      onStageComplete?.({ stageId: stageConfig.id, score });
      playSFX("powerUp");
    }
  };

  const handleKillSlime = (id: number) => {
    if (isDead || isPaused) return;
    setSlimes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, alive: false } : s)),
    );
    setScore((s) => s + 2);
    playSFX("explosion");
  };

  const handleUpdateSlimePos = (id: number, newX: number, newDir: number) => {
    if (isPaused) return;
    setSlimes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, x: newX, direction: newDir } : s)),
    );
  };

  const handlePlayerMove = (playerX: number) => {
    let targetCamX = playerX - 400;
    if (targetCamX < 0) targetCamX = 0;
    if (targetCamX > stageConfig.worldWidth - 800)
      targetCamX = stageConfig.worldWidth - 800;
    setCameraX(targetCamX);
  };

  if (assetError) {
    return (
      <div className="game-two-ottertale game-two__asset-error" role="alert">
        <p>OtterTale could not start on this device.</p>
        <button type="button" onClick={onExitToLobby}>
          Back to game lobby
        </button>
      </div>
    );
  }
  if (!assets) {
    return (
      <div className="game-two-ottertale game-two__asset-loading" role="status">
        Preparing OtterTale…
      </div>
    );
  }

  return (
    <div className="game-two-ottertale">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .game-two-ottertale { background-color: #111; overflow: hidden; font-family: 'Press Start 2P', monospace; }
        
        .game-wrapper { position: relative; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; }
        .game-wrapper canvas { max-width: 100%; max-height: 100%; object-fit: contain; image-rendering: pixelated; }
        .controls-container { position: fixed; bottom: 30px; left: 0; width: 100vw; padding: 0 40px; box-sizing: border-box; display: flex; justify-content: space-between; pointer-events: none; z-index: 100; }
        @media (hover: hover) and (pointer: fine) { .controls-container { display: none !important; } }
        .control-group { pointer-events: auto; display: flex; gap: 20px; }
        
        .mobile-btn { 
          width: 64px; height: 64px; 
          background-color: rgba(255, 255, 255, 0.4); 
          border: 4px solid #fff; border-radius: 0; 
          color: #000; font-size: 10px; font-weight: bold; 
          font-family: 'Press Start 2P', monospace;
          user-select: none; touch-action: none; display: flex; align-items: center; justify-content: center; cursor: pointer; 
          -webkit-tap-highlight-color: transparent; backdrop-filter: blur(4px); 
          box-shadow: 4px 4px 0px #000; 
        }
        .mobile-btn:active { background-color: rgba(255, 255, 255, 0.8); transform: translate(2px, 2px); box-shadow: 2px 2px 0px #000; }
        
        @media (orientation: portrait) {
          .controls-container { bottom: 60px; padding: 0 20px; }
          .mobile-btn { width: 75px; height: 75px; font-size: 12px; }
          .game-wrapper { align-items: flex-start; padding-top: 10vh; box-sizing: border-box; }
        }

        button.retro-btn {
          font-family: 'Press Start 2P', monospace;
          text-transform: uppercase;
          border-radius: 0 !important;
          border: 4px solid #fff !important;
          box-shadow: 6px 6px 0px #000 !important;
          transition: transform 0.1s, box-shadow 0.1s;
        }
        button.retro-btn:active {
          transform: translate(3px, 3px) !important;
          box-shadow: 3px 3px 0px #000 !important;
        }
      `}</style>

      <div className="game-wrapper">
        <Application width={800} height={600} background={0x808080}>
          <pixiContainer x={-cameraX} y={0}>
            <pixiTilingSprite
              texture={assets.groundTop}
              x={0}
              y={500}
              width={stageConfig.worldWidth}
              height={16}
              tileScale={{ x: 3, y: 3 }}
            />
            <pixiTilingSprite
              texture={assets.groundDirt}
              x={0}
              y={516}
              width={stageConfig.worldWidth}
              height={84}
              tileScale={{ x: 3, y: 3 }}
            />

            {/* --- Tutorial Tooltips Render Loop --- */}
            {stageConfig.texts &&
              stageConfig.texts.map((t: any, i: number) => (
                <pixiText
                  key={`text-${i}`}
                  text={t.text}
                  x={t.x}
                  y={t.y}
                  style={
                    new TextStyle({
                      fontFamily: '"Press Start 2P", Courier, monospace',
                      fontSize: 14,
                      fill: "#ffffff",
                      stroke: { color: "#000000", width: 4 },
                      wordWrap: true,
                      wordWrapWidth: 350,
                      align: "center",
                    })
                  }
                />
              ))}

            {stageConfig.platforms.map((plat: any, i: number) => (
              <pixiSprite
                key={i}
                texture={assets.platform}
                x={plat.left}
                y={plat.top}
                scale={{ x: 3, y: 3 }}
              />
            ))}

            <FinishLine x={stageConfig.finishLineX} y={200} />

            {coins.map((coin: any) => (
              <Coin
                key={coin.id}
                textures={assets.coin}
                x={coin.x}
                y={coin.y}
                collected={coin.collected}
                onCollect={() => handleCollectCoin(coin.id)}
              />
            ))}

            {fruits.map((fruit: any, i: number) => (
              <Fruit
                key={fruit.id}
                texture={[assets.fruitA, assets.fruitB, assets.fruitC][i % 3]}
                x={fruit.x}
                y={fruit.y}
                collected={fruit.collected}
                onCollect={() => handleCollectFruit(fruit.id)}
              />
            ))}

            {slimes.map((slime: any) => (
              <Slime
                key={slime.id}
                textures={
                  slime.color === "purple"
                    ? assets.slimePurple
                    : assets.slimeGreen
                }
                slime={slime}
                onUpdatePosition={handleUpdateSlimePos}
                isPaused={isPaused}
              />
            ))}

            <Player
              assets={assets}
              coins={coins}
              onCollectCoin={handleCollectCoin}
              fruits={fruits}
              onCollectFruit={handleCollectFruit}
              slimes={slimes}
              onHitSlime={handleHitSlime}
              onKillSlime={handleKillSlime}
              onMove={handlePlayerMove}
              onReachFinish={handleReachFinish}
              resetTrigger={resetTrigger}
              isDead={isDead}
              inputKeys={keys}
              isPaused={isPaused}
              activeBuff={activeBuff}
              stageConfig={stageConfig}
            />
          </pixiContainer>

          <pixiText
            text={`SCORE: ${score}`}
            x={20}
            y={20}
            style={
              new TextStyle({
                fontFamily: '"Press Start 2P", Courier, monospace',
                fontSize: 16,
                fill: "#ffffff",
                stroke: { color: "#000000", width: 4 },
              })
            }
          />

          <pixiContainer x={400} y={20}>
            {stageConfig.word.split("").map((letter: string, i: number) => {
              const isFilled = collectedLetters.includes(i);
              return (
                <pixiText
                  key={i}
                  text={letter}
                  x={(i - stageConfig.word.length / 2) * 20}
                  style={
                    new TextStyle({
                      fontFamily: '"Press Start 2P", Courier, monospace',
                      fontSize: 20,
                      fontWeight: "normal",
                      fill: isFilled ? "#FFD700" : "#888888",
                      stroke: { color: "#000000", width: 4 },
                      dropShadow: {
                        color: "#000000",
                        alpha: 1,
                        blur: 0,
                        distance: 3,
                      },
                    })
                  }
                />
              );
            })}
          </pixiContainer>
        </Application>
      </div>

      {gameState === "playing" &&
        !isDead &&
        !quiz &&
        !isMenuPaused &&
        !hasWon && (
          <button
            className="retro-btn"
            onClick={() => {
              playSFX("tap");
              setIsMenuPaused(true);
            }}
            style={{
              position: "fixed",
              top: "20px",
              right: "20px",
              padding: "10px 16px",
              fontSize: "12px",
              backgroundColor: "#333",
              color: "white",
              cursor: "pointer",
              zIndex: 100,
            }}
          >
            PAUSE
          </button>
        )}

      {gameState === "playing" && !isPaused && !isDead && !hasWon && (
        <div className="controls-container">
          <div className="control-group">
            <MobileButton
              onDown={() => setVirtualKey("ArrowLeft", true)}
              onUp={() => setVirtualKey("ArrowLeft", false)}
              label="<"
            />
            <MobileButton
              onDown={() => setVirtualKey("ArrowRight", true)}
              onUp={() => setVirtualKey("ArrowRight", false)}
              label=">"
            />
          </div>
          <div className="control-group">
            <MobileButton
              onDown={() => setVirtualKey("ArrowUp", true)}
              onUp={() => setVirtualKey("ArrowUp", false)}
              label="^"
            />
          </div>
        </div>
      )}

      {/* --- Lobby Screen --- */}
      {gameState === "lobby" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "#111",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            zIndex: 200,
            textAlign: "center",
            padding: "20px",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              marginBottom: "40px",
              textShadow: "4px 4px 0px #000",
              lineHeight: "1.5",
            }}
          >
            OtterTale
          </h1>
          <div
            style={{ display: "flex", gap: "20px", flexDirection: "column" }}
          >
            <button
              className="retro-btn"
              onClick={() => {
                playSFX("tap");
                setGameState("stageSelect");
              }}
              style={{
                padding: "16px 24px",
                fontSize: "16px",
                backgroundColor: "#4CAF50",
                color: "white",
                cursor: "pointer",
              }}
            >
              PLAY GAME
            </button>
            <button
              className="retro-btn"
              onClick={() => {
                playSFX("tap");
                handleStartStage(TUTORIAL_STAGE);
              }}
              style={{
                padding: "16px 24px",
                fontSize: "16px",
                backgroundColor: "#2196F3",
                color: "white",
                cursor: "pointer",
              }}
            >
              TUTORIAL
            </button>
            {/* 
              TODO: EXIT BUTTON PLACEHOLDER
              Future coder: Insert route/quit logic in the onClick handler below.
            */}
            <button
              className="retro-btn"
              onClick={() => {
                playSFX("tap");
                console.log("Exit game triggered (Placeholder)");
              }}
              style={{
                padding: "16px 24px",
                fontSize: "16px",
                backgroundColor: "#9e9e9e",
                color: "white",
                cursor: "pointer",
              }}
            >
              EXIT
            </button>
          </div>
        </div>
      )}

      {/* --- Stage Select Screen --- */}
      {gameState === "stageSelect" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "#111",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            zIndex: 200,
            textAlign: "center",
            padding: "20px",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              marginBottom: "40px",
              textShadow: "4px 4px 0px #000",
            }}
          >
            SELECT STAGE
          </h1>
          <div
            style={{
              display: "flex",
              gap: "20px",
              flexDirection: "column",
              marginBottom: "40px",
            }}
          >
            {STAGES.map((stage, index) => (
              <button
                key={stage.id}
                className="retro-btn"
                onClick={() => {
                  playSFX("tap");
                  handleStartStage(STAGES[index]);
                }}
                style={{
                  padding: "16px 24px",
                  fontSize: "16px",
                  backgroundColor: "#9C27B0",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {stage.name} - "{stage.word}"
                {progress?.completedStageIds.includes(stage.id)
                  ? ` · COMPLETED · BEST: ${progress.bestScoresByStage[String(stage.id)] ?? 0}`
                  : ""}
              </button>
            ))}
          </div>
          <button
            className="retro-btn"
            onClick={() => handleExitToMenu("lobby")}
            style={{
              padding: "12px 20px",
              fontSize: "12px",
              backgroundColor: "#f44336",
              color: "white",
              cursor: "pointer",
            }}
          >
            BACK TO LOBBY
          </button>
        </div>
      )}

      {/* --- Pause Menu --- */}
      {isMenuPaused && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            zIndex: 150,
          }}
        >
          <h2
            style={{
              fontSize: "32px",
              marginBottom: "40px",
              textShadow: "4px 4px 0px #000",
            }}
          >
            PAUSED
          </h2>
          <div
            style={{ display: "flex", gap: "20px", flexDirection: "column" }}
          >
            <button
              className="retro-btn"
              onClick={() => {
                playSFX("tap");
                setIsMenuPaused(false);
              }}
              style={{
                padding: "16px 24px",
                fontSize: "14px",
                backgroundColor: "#2196F3",
                color: "white",
                cursor: "pointer",
              }}
            >
              RESUME
            </button>
            <button
              className="retro-btn"
              onClick={() => handleExitToMenu("lobby")}
              style={{
                padding: "16px 24px",
                fontSize: "14px",
                backgroundColor: "#f44336",
                color: "white",
                cursor: "pointer",
              }}
            >
              QUIT
            </button>
          </div>
        </div>
      )}

      {/* --- Quiz Overlay --- */}
      {quiz && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            zIndex: 150,
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              marginBottom: "40px",
              textShadow: "4px 4px 0px #000",
              textAlign: "center",
              padding: "0 20px",
              lineHeight: "1.5",
            }}
          >
            WHAT IS THE CORRECT SPELLING?
          </h2>
          <div
            style={{ display: "flex", gap: "20px", flexDirection: "column" }}
          >
            {quiz.options.map((opt: string) => (
              <button
                key={opt}
                className="retro-btn"
                onClick={() => {
                  handleQuizAnswer(opt);
                }}
                style={{
                  padding: "16px 24px",
                  fontSize: "14px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* --- Victory Screen / Performance Review --- */}
      {hasWon && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 100, 0, 0.9)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            zIndex: 200,
          }}
        >
          <h1
            style={{
              fontSize: "40px",
              marginBottom: "20px",
              textShadow: "4px 4px 0px #000",
              textAlign: "center",
            }}
          >
            {stageConfig.name === "TUTORIAL"
              ? "TUTORIAL COMPLETE!"
              : "LEVEL CLEARED!"}
          </h1>

          <div
            style={{
              backgroundColor: "#111",
              padding: "20px",
              border: "4px solid #fff",
              boxShadow: "8px 8px 0px #000",
              textAlign: "center",
              marginBottom: "40px",
              minWidth: "300px",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                margin: "0 0 20px 0",
                color: "#FFD700",
              }}
            >
              PERFORMANCE
            </h2>
            <p style={{ fontSize: "14px", margin: "10px 0" }}>SCORE: {score}</p>

            <div style={{ margin: "20px 0" }}>
              <p style={{ fontSize: "12px", marginBottom: "15px" }}>
                WORD PROGRESS:
              </p>
              <p
                style={{
                  fontSize: "16px",
                  letterSpacing: "2px",
                  color: "#aaa",
                }}
              >
                {stageConfig.word
                  .split("")
                  .map((char: string, i: number) =>
                    collectedLetters.includes(i) ? char : "_",
                  )
                  .join("")}
              </p>

              {collectedLetters.length >= stageConfig.word.length ? (
                <p
                  style={{
                    color: "#4CAF50",
                    fontSize: "12px",
                    marginTop: "20px",
                  }}
                >
                  PERFECT!
                </p>
              ) : (
                <p
                  style={{
                    color: "#FF9800",
                    fontSize: "12px",
                    marginTop: "20px",
                  }}
                >
                  MISSED {stageConfig.word.length - collectedLetters.length}{" "}
                  LETTERS
                </p>
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "20px",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <button
              className="retro-btn"
              onClick={() => {
                playSFX("tap");
                handleStartStage(stageConfig);
              }}
              style={{
                padding: "16px 24px",
                fontSize: "14px",
                backgroundColor: "#2196F3",
                color: "white",
                cursor: "pointer",
              }}
            >
              PLAY AGAIN
            </button>
            <button
              className="retro-btn"
              onClick={() => handleExitToMenu("stageSelect")}
              style={{
                padding: "16px 24px",
                fontSize: "14px",
                backgroundColor: "#9C27B0",
                color: "white",
                cursor: "pointer",
              }}
            >
              STAGES
            </button>
            <button
              className="retro-btn"
              onClick={() => handleExitToMenu("lobby")}
              style={{
                padding: "16px 24px",
                fontSize: "14px",
                backgroundColor: "#f44336",
                color: "white",
                cursor: "pointer",
              }}
            >
              LOBBY
            </button>
          </div>
        </div>
      )}

      {/* --- Lose Screen --- */}
      {isDead && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "#8b0000",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            zIndex: 200,
          }}
        >
          <h1
            style={{
              fontSize: "48px",
              marginBottom: "20px",
              textShadow: "4px 4px 0px #000",
              textAlign: "center",
            }}
          >
            YOU LOSE!
          </h1>
          <p style={{ fontSize: "16px", marginBottom: "40px" }}>
            SCORE: {score}
          </p>
          <div
            style={{ display: "flex", gap: "20px", flexDirection: "column" }}
          >
            <button
              className="retro-btn"
              onClick={() => {
                playSFX("tap");
                handleStartStage(stageConfig);
              }}
              style={{
                padding: "16px 24px",
                fontSize: "14px",
                backgroundColor: "#4CAF50",
                color: "white",
                cursor: "pointer",
              }}
            >
              RETRY
            </button>
            <button
              className="retro-btn"
              onClick={() => handleExitToMenu("lobby")}
              style={{
                padding: "16px 24px",
                fontSize: "14px",
                backgroundColor: "#f44336",
                color: "white",
                cursor: "pointer",
              }}
            >
              LOBBY
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
