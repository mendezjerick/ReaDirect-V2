export const MANG_YATO_ASSET_KEY = "npc-mang-yato";
export const FARM_FENCE_ASSET_KEY = "farm-fence";
export const GARDEN_FENCE_ASSET_KEY = "garden-fence";
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

export function createGardenFenceLayer() {
  const canvas = document.createElement("canvas");
  canvas.width = GENERATED_TILE_SIZE * 10;
  canvas.height = GENERATED_TILE_SIZE * 8;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  for (let x = 0; x < 10; x += 1) {
    if (x !== 0 && x !== 9) {
      drawGardenRail(context, x * GENERATED_TILE_SIZE, 0, false);
      if (x < 3 || x > 6) drawGardenRail(context, x * GENERATED_TILE_SIZE, 7 * GENERATED_TILE_SIZE, false);
    }
  }
  for (let y = 1; y < 7; y += 1) {
    drawGardenRail(context, 0, y * GENERATED_TILE_SIZE, true);
    drawGardenRail(context, 9 * GENERATED_TILE_SIZE, y * GENERATED_TILE_SIZE, true);
  }

  drawGardenCorner(context, 0, 0, "top-left");
  drawGardenCorner(context, 9 * GENERATED_TILE_SIZE, 0, "top-right");
  drawGardenCorner(context, 0, 7 * GENERATED_TILE_SIZE, "bottom-left");
  drawGardenCorner(context, 9 * GENERATED_TILE_SIZE, 7 * GENERATED_TILE_SIZE, "bottom-right");
  drawGardenGate(context, 3 * GENERATED_TILE_SIZE, 7 * GENERATED_TILE_SIZE);
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

function drawGardenRail(context: CanvasRenderingContext2D, x: number, y: number, vertical: boolean) {
  context.fillStyle = "#233b2a";
  if (vertical) {
    context.fillRect(x + 5, y, 5, 16);
    context.fillStyle = "#5f8c45";
    context.fillRect(x + 6, y + 1, 2, 14);
    context.fillStyle = "#9bc85a";
    context.fillRect(x + 8, y + 3, 1, 8);
    return;
  }

  context.fillRect(x, y + 6, 16, 4);
  context.fillStyle = "#5f8c45";
  context.fillRect(x, y + 6, 16, 2);
  context.fillStyle = "#c7dd79";
  context.fillRect(x + 2, y + 6, 5, 1);
  if ((x / GENERATED_TILE_SIZE) % 2 === 0) {
    context.fillStyle = "#d8a34b";
    context.fillRect(x + 2, y + 1, 3, 7);
    context.fillStyle = "#f1ce70";
    context.fillRect(x + 3, y + 1, 1, 6);
  }
}

function drawGardenCorner(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  corner: "top-left" | "top-right" | "bottom-left" | "bottom-right"
) {
  const postX = corner.includes("right") ? x + 9 : x + 3;
  const postY = corner.includes("bottom") ? y + 7 : y + 1;
  context.fillStyle = "#233b2a";
  context.fillRect(postX, y, 5, 16);
  context.fillStyle = "#d8a34b";
  context.fillRect(postX + 1, y + 1, 3, 14);
  context.fillStyle = "#f1ce70";
  context.fillRect(postX + 2, y + 2, 1, 8);
  context.fillStyle = "#5f8c45";
  if (corner.includes("top")) context.fillRect(x, postY + 5, 16, 3);
  if (corner.includes("bottom")) context.fillRect(x, postY + 1, 16, 3);
  context.fillStyle = "#6fa34d";
  context.fillRect(x + (corner.includes("right") ? 1 : 11), y + (corner.includes("bottom") ? 2 : 11), 4, 3);
}

function drawGardenGate(context: CanvasRenderingContext2D, x: number, y: number) {
  context.clearRect(x, y, GENERATED_TILE_SIZE * 3, GENERATED_TILE_SIZE);
  context.fillStyle = "#6a3f26";
  context.fillRect(x + 5, y + 7, 22, 3);
  context.fillStyle = "#b6753b";
  context.fillRect(x + 6, y + 7, 20, 1);
  context.fillStyle = "#d8a34b";
  context.fillRect(x + 8, y + 1, 3, 8);
  context.fillRect(x + 20, y + 1, 3, 8);
  context.fillStyle = "#f1ce70";
  context.fillRect(x + 9, y + 1, 1, 6);
  context.fillRect(x + 21, y + 1, 1, 6);
  context.fillStyle = "#6fa34d";
  context.fillRect(x + 12, y + 2, 7, 2);
  context.fillRect(x + 14, y + 1, 3, 2);
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
