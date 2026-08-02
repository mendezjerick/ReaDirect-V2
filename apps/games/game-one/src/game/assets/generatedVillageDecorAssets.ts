export const VILLAGE_DECOR_ASSET_KEY = "village-decor";
export const VILLAGE_DECOR_TILE_SIZE = 16;

export const VILLAGE_DECOR_FRAME = {
  sign: 0,
  bench: 1,
  lantern: 2,
  redPlanter: 3,
  whitePlanter: 4,
  produceCrate: 5,
  stoneMarker: 6
} as const;

export const VILLAGE_DECOR_FRAMES = Object.keys(VILLAGE_DECOR_FRAME).length;

export function createVillageDecorSpriteSheet() {
  const canvas = document.createElement("canvas");
  canvas.width = VILLAGE_DECOR_TILE_SIZE * VILLAGE_DECOR_FRAMES;
  canvas.height = VILLAGE_DECOR_TILE_SIZE;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  drawSign(context, frameX(VILLAGE_DECOR_FRAME.sign));
  drawBench(context, frameX(VILLAGE_DECOR_FRAME.bench));
  drawLantern(context, frameX(VILLAGE_DECOR_FRAME.lantern));
  drawPlanter(context, frameX(VILLAGE_DECOR_FRAME.redPlanter), "#d84b45", "#ff8a63");
  drawPlanter(context, frameX(VILLAGE_DECOR_FRAME.whitePlanter), "#eef4df", "#ffffff");
  drawProduceCrate(context, frameX(VILLAGE_DECOR_FRAME.produceCrate));
  drawStoneMarker(context, frameX(VILLAGE_DECOR_FRAME.stoneMarker));
  return canvas;
}

function drawSign(context: CanvasRenderingContext2D, x: number) {
  context.fillStyle = "#49301f";
  context.fillRect(x + 7, 7, 3, 9);
  context.fillRect(x + 2, 3, 13, 8);
  context.fillStyle = "#9a5d31";
  context.fillRect(x + 3, 4, 11, 6);
  context.fillStyle = "#d99a4f";
  context.fillRect(x + 4, 4, 9, 2);
  context.fillStyle = "#f4d57a";
  context.fillRect(x + 5, 7, 7, 1);
}

function drawBench(context: CanvasRenderingContext2D, x: number) {
  context.fillStyle = "#4a3020";
  context.fillRect(x + 2, 5, 12, 3);
  context.fillRect(x + 3, 10, 10, 3);
  context.fillRect(x + 4, 12, 2, 4);
  context.fillRect(x + 10, 12, 2, 4);
  context.fillStyle = "#a76435";
  context.fillRect(x + 3, 5, 10, 2);
  context.fillRect(x + 4, 10, 8, 2);
  context.fillStyle = "#e1a353";
  context.fillRect(x + 4, 5, 8, 1);
}

function drawLantern(context: CanvasRenderingContext2D, x: number) {
  context.fillStyle = "#26372f";
  context.fillRect(x + 7, 2, 3, 14);
  context.fillRect(x + 4, 3, 9, 2);
  context.fillStyle = "#72502d";
  context.fillRect(x + 5, 5, 7, 7);
  context.fillStyle = "#f2c94c";
  context.fillRect(x + 6, 6, 5, 5);
  context.fillStyle = "#fff0a0";
  context.fillRect(x + 7, 6, 2, 4);
}

function drawPlanter(
  context: CanvasRenderingContext2D,
  x: number,
  flower: string,
  highlight: string
) {
  context.fillStyle = "#2d623f";
  context.fillRect(x + 4, 5, 8, 7);
  context.fillStyle = flower;
  context.fillRect(x + 2, 4, 4, 4);
  context.fillRect(x + 7, 2, 4, 4);
  context.fillRect(x + 11, 5, 4, 4);
  context.fillStyle = highlight;
  context.fillRect(x + 3, 4, 1, 1);
  context.fillRect(x + 8, 2, 1, 1);
  context.fillRect(x + 12, 5, 1, 1);
  context.fillStyle = "#6f472b";
  context.fillRect(x + 3, 11, 11, 4);
  context.fillStyle = "#c27a3d";
  context.fillRect(x + 4, 11, 9, 2);
}

function drawProduceCrate(context: CanvasRenderingContext2D, x: number) {
  context.fillStyle = "#4a3020";
  context.fillRect(x + 2, 5, 13, 10);
  context.fillStyle = "#a96736";
  context.fillRect(x + 3, 6, 11, 8);
  context.fillStyle = "#e0a151";
  context.fillRect(x + 4, 7, 9, 1);
  context.fillRect(x + 4, 12, 9, 1);
  context.fillStyle = "#d84b45";
  context.fillRect(x + 5, 3, 4, 4);
  context.fillStyle = "#f0b33f";
  context.fillRect(x + 9, 2, 4, 5);
  context.fillStyle = "#3c7548";
  context.fillRect(x + 7, 2, 2, 2);
  context.fillRect(x + 11, 1, 2, 2);
}

function drawStoneMarker(context: CanvasRenderingContext2D, x: number) {
  context.fillStyle = "#3b4f48";
  context.fillRect(x + 4, 5, 9, 11);
  context.fillRect(x + 3, 8, 11, 7);
  context.fillStyle = "#84978c";
  context.fillRect(x + 5, 4, 7, 10);
  context.fillRect(x + 4, 8, 9, 5);
  context.fillStyle = "#c5d0c3";
  context.fillRect(x + 6, 6, 4, 1);
  context.fillRect(x + 6, 9, 5, 1);
}

function frameX(frame: number) {
  return frame * VILLAGE_DECOR_TILE_SIZE;
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}
