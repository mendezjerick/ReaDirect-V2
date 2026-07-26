export const FRUIT_TREE_ASSET_KEY = "fruit-tree";
export const FRUIT_TREE_FRAME_SIZE = 32;
export const FRUIT_TREE_FRAMES = 4;

export type FruitTreeKind = "apple" | "orange" | "lemon" | "plum";

const FRUIT_TREE_FRAME: Record<FruitTreeKind, number> = {
  apple: 0,
  orange: 1,
  lemon: 2,
  plum: 3
};

const FRUIT_PALETTE: Record<FruitTreeKind, { shadow: string; base: string; highlight: string }> = {
  apple: { shadow: "#9f2935", base: "#e5483f", highlight: "#ff8a58" },
  orange: { shadow: "#b84d20", base: "#f1882d", highlight: "#ffc15a" },
  lemon: { shadow: "#b69a22", base: "#f2d33c", highlight: "#fff38a" },
  plum: { shadow: "#5f3b83", base: "#9461ba", highlight: "#d69be0" }
};

export function getFruitTreeFrame(kind: FruitTreeKind) {
  return FRUIT_TREE_FRAME[kind];
}

export function createFruitTreeSpriteSheet() {
  const canvas = document.createElement("canvas");
  canvas.width = FRUIT_TREE_FRAME_SIZE * FRUIT_TREE_FRAMES;
  canvas.height = FRUIT_TREE_FRAME_SIZE;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  (Object.keys(FRUIT_TREE_FRAME) as FruitTreeKind[]).forEach((kind) => {
    drawFruitTree(context, FRUIT_TREE_FRAME[kind] * FRUIT_TREE_FRAME_SIZE, kind);
  });
  return canvas;
}

function drawFruitTree(context: CanvasRenderingContext2D, offsetX: number, kind: FruitTreeKind) {
  drawTrunk(context, offsetX);
  drawCanopy(context, offsetX);
  drawFruit(context, offsetX, kind);
}

function drawTrunk(context: CanvasRenderingContext2D, offsetX: number) {
  context.fillStyle = "#3c2b24";
  context.fillRect(offsetX + 12, 20, 9, 11);
  context.fillRect(offsetX + 9, 29, 15, 2);
  context.fillStyle = "#815139";
  context.fillRect(offsetX + 14, 19, 6, 11);
  context.fillStyle = "#bd7950";
  context.fillRect(offsetX + 15, 20, 2, 8);
}

function drawCanopy(context: CanvasRenderingContext2D, offsetX: number) {
  context.fillStyle = "#10291f";
  context.fillRect(offsetX + 9, 1, 14, 2);
  context.fillRect(offsetX + 5, 3, 22, 3);
  context.fillRect(offsetX + 3, 6, 27, 14);
  context.fillRect(offsetX + 5, 20, 23, 4);
  context.fillRect(offsetX + 9, 24, 15, 3);

  context.fillStyle = "#2f6945";
  context.fillRect(offsetX + 8, 4, 17, 3);
  context.fillRect(offsetX + 5, 7, 23, 12);
  context.fillRect(offsetX + 8, 19, 17, 5);

  context.fillStyle = "#4e8b4e";
  context.fillRect(offsetX + 10, 3, 12, 3);
  context.fillRect(offsetX + 7, 7, 18, 7);
  context.fillRect(offsetX + 5, 10, 4, 7);

  context.fillStyle = "#72aa55";
  context.fillRect(offsetX + 11, 4, 8, 2);
  context.fillRect(offsetX + 8, 7, 8, 3);
  context.fillRect(offsetX + 6, 11, 3, 4);
}

function drawFruit(context: CanvasRenderingContext2D, offsetX: number, kind: FruitTreeKind) {
  const palette = FRUIT_PALETTE[kind];
  const fruitPositions = [
    [10, 10],
    [19, 8],
    [24, 13],
    [14, 16],
    [7, 18],
    [20, 20]
  ] as const;

  for (const [x, y] of fruitPositions) {
    context.fillStyle = "#193a25";
    context.fillRect(offsetX + x, y - 2, 1, 2);
    context.fillStyle = palette.shadow;
    context.fillRect(offsetX + x - 1, y, 4, 4);
    context.fillStyle = palette.base;
    context.fillRect(offsetX + x, y, 3, 3);
    context.fillStyle = palette.highlight;
    context.fillRect(offsetX + x, y, 1, 1);
  }
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}
