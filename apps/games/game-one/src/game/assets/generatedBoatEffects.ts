export const BOAT_WAKE_ASSET_KEY = "boat-wake";
export const BOAT_WAKE_FRAME_WIDTH = 80;
export const BOAT_WAKE_FRAME_HEIGHT = 40;
export const BOAT_WAKE_FRAMES = 4;
export const BOAT_OAR_ASSET_KEY = "boat-oar";

export type BoatAnimationState = {
  bobOffset: number;
  oarAngle: number;
  wakeFrame: number;
  wakeVisible: boolean;
};

export function getBoatAnimationState(
  animationClock: number,
  moving: boolean,
  reducedMotion: boolean
): BoatAnimationState {
  if (reducedMotion) {
    return {
      bobOffset: 0,
      oarAngle: 0,
      wakeFrame: 0,
      wakeVisible: moving
    };
  }

  const stroke = Math.sin(animationClock * 7.5);
  return {
    bobOffset: Math.sin(animationClock * 3.2) * 1.5,
    oarAngle: moving ? stroke * 22 : Math.sin(animationClock * 2.2) * 3,
    wakeFrame: Math.floor(animationClock * 8) % BOAT_WAKE_FRAMES,
    wakeVisible: moving
  };
}

export function createBoatWakeSpriteSheet() {
  const canvas = document.createElement("canvas");
  canvas.width = BOAT_WAKE_FRAME_WIDTH * BOAT_WAKE_FRAMES;
  canvas.height = BOAT_WAKE_FRAME_HEIGHT;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  for (let frame = 0; frame < BOAT_WAKE_FRAMES; frame += 1) {
    drawWakeFrame(context, frame * BOAT_WAKE_FRAME_WIDTH, frame);
  }
  return canvas;
}

export function createBoatOarSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 40;
  canvas.height = 8;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  context.fillStyle = "#38291f";
  context.fillRect(2, 2, 29, 4);
  context.fillRect(29, 1, 9, 6);
  context.fillStyle = "#b7783f";
  context.fillRect(3, 3, 27, 2);
  context.fillStyle = "#d59a55";
  context.fillRect(30, 2, 7, 4);
  return canvas;
}

function drawWakeFrame(
  context: CanvasRenderingContext2D,
  offsetX: number,
  frame: number
) {
  const shift = frame * 2;
  context.fillStyle = "rgba(232, 251, 255, 0.9)";
  context.fillRect(offsetX + 2 + shift, 18, 15, 3);
  context.fillRect(offsetX + 8 + shift, 10, 20, 2);
  context.fillRect(offsetX + 8 + shift, 28, 20, 2);
  context.fillRect(offsetX + 21 + shift, 7, 18, 2);
  context.fillRect(offsetX + 21 + shift, 31, 18, 2);

  context.fillStyle = "rgba(89, 187, 215, 0.85)";
  context.fillRect(offsetX + 1 + shift, 22, 12, 2);
  context.fillRect(offsetX + 14 + shift, 13, 18, 2);
  context.fillRect(offsetX + 14 + shift, 25, 18, 2);
  context.fillRect(offsetX + 34 + shift, 10, 14, 2);
  context.fillRect(offsetX + 34 + shift, 28, 14, 2);
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}
