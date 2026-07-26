export const MANG_YATO_ASSET_KEY = "npc-mang-yato";
export const FARM_FENCE_ASSET_KEY = "farm-fence";
export const GENERATED_CHARACTER_FRAMES = 4;
export const FARM_FENCE_FRAMES = 8;
export const GENERATED_TILE_SIZE = 16;

export function createMangYatoSpriteSheet() {
  const canvas = document.createElement("canvas");
  canvas.width = GENERATED_TILE_SIZE * GENERATED_CHARACTER_FRAMES;
  canvas.height = GENERATED_TILE_SIZE;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  for (let frame = 0; frame < GENERATED_CHARACTER_FRAMES; frame += 1) {
    drawMangYato(context, frame * GENERATED_TILE_SIZE, frame);
  }
  return canvas;
}

export function createFarmFenceTileset() {
  const canvas = document.createElement("canvas");
  canvas.width = GENERATED_TILE_SIZE * FARM_FENCE_FRAMES;
  canvas.height = GENERATED_TILE_SIZE;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  drawHorizontalFence(context, 0);
  drawVerticalFence(context, 1);
  drawCornerFence(context, 2, "top-left");
  drawCornerFence(context, 3, "top-right");
  drawCornerFence(context, 4, "bottom-right");
  drawCornerFence(context, 5, "bottom-left");
  drawVerticalCap(context, 6, "bottom");
  drawVerticalCap(context, 7, "top");
  return canvas;
}

export function createFarmFenceLayer() {
  const atlas = createFarmFenceTileset();
  const canvas = document.createElement("canvas");
  canvas.width = GENERATED_TILE_SIZE * 16;
  canvas.height = GENERATED_TILE_SIZE * 10;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  const drawTile = (tileX: number, tileY: number, frame: number) => {
    context.drawImage(
      atlas,
      frame * GENERATED_TILE_SIZE,
      0,
      GENERATED_TILE_SIZE,
      GENERATED_TILE_SIZE,
      tileX * GENERATED_TILE_SIZE,
      tileY * GENERATED_TILE_SIZE,
      GENERATED_TILE_SIZE,
      GENERATED_TILE_SIZE
    );
  };

  drawTile(0, 0, 2);
  drawTile(15, 0, 3);
  drawTile(15, 9, 4);
  drawTile(0, 9, 5);
  for (let x = 1; x < 15; x += 1) {
    drawTile(x, 0, 0);
    drawTile(x, 9, 0);
  }
  for (let y = 1; y < 9; y += 1) drawTile(15, y, 1);
  drawTile(0, 1, 1);
  drawTile(0, 2, 6);
  drawTile(0, 6, 7);
  drawTile(0, 7, 1);
  drawTile(0, 8, 1);
  return canvas;
}

function drawMangYato(context: CanvasRenderingContext2D, offsetX: number, frame: number) {
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  const blink = frame === 3;
  context.fillStyle = "#332c24";
  context.fillRect(offsetX + 2, 1 + bob, 12, 3);
  context.fillRect(offsetX + 1, 4 + bob, 14, 2);
  context.fillStyle = "#d9a441";
  context.fillRect(offsetX + 3, 1 + bob, 10, 2);
  context.fillRect(offsetX + 1, 3 + bob, 14, 2);
  context.fillStyle = "#f0a66d";
  context.fillRect(offsetX + 3, 5 + bob, 10, 5);
  context.fillRect(offsetX + 2, 7 + bob, 1, 2);
  context.fillRect(offsetX + 13, 7 + bob, 1, 2);
  context.fillStyle = "#253529";
  context.fillRect(offsetX + 5, 7 + bob, 1, blink ? 1 : 2);
  context.fillRect(offsetX + 10, 7 + bob, 1, blink ? 1 : 2);
  context.fillStyle = "#35634a";
  context.fillRect(offsetX + 2, 10 + bob, 12, 4);
  context.fillRect(offsetX + 1, 11 + bob, 2, 3);
  context.fillRect(offsetX + 13, 11 + bob, 2, 3);
  context.fillStyle = "#f1d36f";
  context.fillRect(offsetX + 4, 10 + bob, 8, 1);
  context.fillStyle = "#4e7890";
  context.fillRect(offsetX + 5, 11 + bob, 6, 4);
  context.fillStyle = "#d8e5df";
  context.fillRect(offsetX + 7, 12 + bob, 2, 2);
  context.fillStyle = "#27362e";
  context.fillRect(offsetX + 3, 14 + bob, 4, 2);
  context.fillRect(offsetX + 9, 14 + bob, 4, 2);
}

function drawHorizontalFence(context: CanvasRenderingContext2D, frame: number) {
  const x = frame * GENERATED_TILE_SIZE;
  drawPost(context, x + 1, 3);
  drawPost(context, x + 12, 3);
  drawRail(context, x, 5, GENERATED_TILE_SIZE);
  drawRail(context, x, 10, GENERATED_TILE_SIZE);
}

function drawVerticalFence(context: CanvasRenderingContext2D, frame: number) {
  const x = frame * GENERATED_TILE_SIZE;
  drawPost(context, x + 6, 1);
  drawRail(context, x + 3, 4, 10);
  drawRail(context, x + 3, 11, 10);
}

function drawCornerFence(
  context: CanvasRenderingContext2D,
  frame: number,
  corner: "top-left" | "top-right" | "bottom-right" | "bottom-left"
) {
  const x = frame * GENERATED_TILE_SIZE;
  const right = corner.includes("right");
  const bottom = corner.includes("bottom");
  const postX = x + (right ? 10 : 3);
  const postY = bottom ? 9 : 2;
  drawPost(context, postX, postY);
  drawRail(context, right ? x : postX, postY + 2, right ? postX - x + 2 : GENERATED_TILE_SIZE - (postX - x));
  context.fillStyle = "#8a4f2b";
  context.fillRect(postX + 2, bottom ? 0 : postY + 2, 3, bottom ? postY + 4 : GENERATED_TILE_SIZE - postY - 2);
  context.fillStyle = "#d89a50";
  context.fillRect(postX + 2, bottom ? 0 : postY + 2, 1, bottom ? postY + 4 : GENERATED_TILE_SIZE - postY - 2);
}

function drawVerticalCap(context: CanvasRenderingContext2D, frame: number, cap: "top" | "bottom") {
  const x = frame * GENERATED_TILE_SIZE;
  const y = cap === "top" ? 7 : 1;
  drawPost(context, x + 6, y);
  context.fillStyle = "#8a4f2b";
  context.fillRect(x + 8, cap === "top" ? y + 3 : 0, 3, cap === "top" ? 6 : y + 3);
  context.fillStyle = "#d89a50";
  context.fillRect(x + 8, cap === "top" ? y + 3 : 0, 1, cap === "top" ? 6 : y + 3);
}

function drawPost(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = "#56351f";
  context.fillRect(x, y + 1, 5, 12);
  context.fillStyle = "#a85e31";
  context.fillRect(x + 1, y, 3, 12);
  context.fillStyle = "#e0a45a";
  context.fillRect(x + 1, y + 1, 1, 9);
}

function drawRail(context: CanvasRenderingContext2D, x: number, y: number, width: number) {
  context.fillStyle = "#56351f";
  context.fillRect(x, y + 1, width, 4);
  context.fillStyle = "#a85e31";
  context.fillRect(x, y, width, 3);
  context.fillStyle = "#e0a45a";
  context.fillRect(x, y, width, 1);
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}
