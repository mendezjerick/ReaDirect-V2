import type { RoamingAnimalKind } from "../world/roamingAnimals";

export const ROAMING_ANIMAL_ASSET_KEY = "roaming-animal";
export const ROAMING_ANIMAL_FRAME_SIZE = 16;
export const ROAMING_ANIMAL_FRAMES_PER_KIND = 4;
export const ROAMING_ANIMAL_FRAMES = 12;

const KIND_INDEX: Record<RoamingAnimalKind, number> = {
  rabbit: 0,
  chicken: 1,
  duck: 2
};

export function getRoamingAnimalFrame(
  kind: RoamingAnimalKind,
  facing: "left" | "right",
  moving: boolean,
  animationClock: number
) {
  const offset = KIND_INDEX[kind] * ROAMING_ANIMAL_FRAMES_PER_KIND;
  const facingOffset = facing === "right" ? 2 : 0;
  const walkOffset = moving && Math.floor(animationClock * 5) % 2 === 1 ? 1 : 0;
  return offset + facingOffset + walkOffset;
}

export function createRoamingAnimalSpriteSheet() {
  const canvas = document.createElement("canvas");
  canvas.width = ROAMING_ANIMAL_FRAME_SIZE * ROAMING_ANIMAL_FRAMES;
  canvas.height = ROAMING_ANIMAL_FRAME_SIZE;
  const context = getCanvasContext(canvas);
  if (!context) return canvas;
  context.imageSmoothingEnabled = false;

  (Object.keys(KIND_INDEX) as RoamingAnimalKind[]).forEach((kind) => {
    for (let facingIndex = 0; facingIndex < 2; facingIndex += 1) {
      for (let walkFrame = 0; walkFrame < 2; walkFrame += 1) {
        const frame = KIND_INDEX[kind] * ROAMING_ANIMAL_FRAMES_PER_KIND + facingIndex * 2 + walkFrame;
        drawAnimal(context, frame * ROAMING_ANIMAL_FRAME_SIZE, kind, facingIndex === 1, walkFrame);
      }
    }
  });
  return canvas;
}

function drawAnimal(
  context: CanvasRenderingContext2D,
  offsetX: number,
  kind: RoamingAnimalKind,
  facingRight: boolean,
  walkFrame: number
) {
  context.save();
  context.translate(offsetX + (facingRight ? 0 : ROAMING_ANIMAL_FRAME_SIZE), 0);
  context.scale(facingRight ? 1 : -1, 1);
  if (kind === "rabbit") drawRabbit(context, walkFrame);
  if (kind === "chicken") drawChicken(context, walkFrame);
  if (kind === "duck") drawDuck(context, walkFrame);
  context.restore();
}

function drawRabbit(context: CanvasRenderingContext2D, walkFrame: number) {
  const bob = walkFrame === 1 ? -1 : 0;
  context.fillStyle = "#28352f";
  context.fillRect(4, 2 + bob, 3, 6);
  context.fillRect(8, 1 + bob, 3, 7);
  context.fillRect(2, 8 + bob, 12, 6);
  context.fillStyle = "#d8d2c6";
  context.fillRect(5, 3 + bob, 1, 4);
  context.fillRect(9, 2 + bob, 1, 5);
  context.fillRect(3, 8 + bob, 10, 5);
  context.fillRect(11, 6 + bob, 4, 6);
  context.fillStyle = "#f4eee2";
  context.fillRect(4, 9 + bob, 5, 3);
  context.fillStyle = "#18221e";
  context.fillRect(13, 7 + bob, 1, 1);
  context.fillStyle = "#fff7d6";
  context.fillRect(1, 9 + bob, 2, 3);
  context.fillStyle = "#6f675f";
  context.fillRect(walkFrame === 0 ? 4 : 6, 14, 4, 2);
  context.fillRect(walkFrame === 0 ? 10 : 9, 14, 4, 2);
}

function drawChicken(context: CanvasRenderingContext2D, walkFrame: number) {
  const bob = walkFrame === 1 ? -1 : 0;
  context.fillStyle = "#26332d";
  context.fillRect(2, 7 + bob, 11, 7);
  context.fillRect(9, 4 + bob, 5, 7);
  context.fillStyle = "#f4eee2";
  context.fillRect(3, 7 + bob, 9, 6);
  context.fillRect(10, 5 + bob, 3, 6);
  context.fillStyle = "#d9cfbd";
  context.fillRect(4, 9 + bob, 5, 3);
  context.fillStyle = "#d94435";
  context.fillRect(10, 3 + bob, 2, 2);
  context.fillRect(12, 4 + bob, 2, 2);
  context.fillStyle = "#f3ad32";
  context.fillRect(13, 7 + bob, 3, 2);
  context.fillStyle = "#18221e";
  context.fillRect(12, 6 + bob, 1, 1);
  context.fillStyle = "#b96d28";
  context.fillRect(walkFrame === 0 ? 5 : 7, 14, 1, 2);
  context.fillRect(walkFrame === 0 ? 9 : 8, 14, 1, 2);
}

function drawDuck(context: CanvasRenderingContext2D, walkFrame: number) {
  const bob = walkFrame === 1 ? -1 : 0;
  context.fillStyle = "#24342d";
  context.fillRect(2, 8 + bob, 11, 6);
  context.fillRect(9, 4 + bob, 5, 7);
  context.fillStyle = "#8b623a";
  context.fillRect(3, 8 + bob, 9, 5);
  context.fillStyle = "#3f7d57";
  context.fillRect(10, 5 + bob, 3, 5);
  context.fillStyle = "#d8c89d";
  context.fillRect(4, 9 + bob, 5, 2);
  context.fillStyle = "#f0a135";
  context.fillRect(13, 7 + bob, 3, 2);
  context.fillStyle = "#101a16";
  context.fillRect(12, 6 + bob, 1, 1);
  context.fillStyle = "#d07b2d";
  context.fillRect(walkFrame === 0 ? 5 : 7, 14, 3, 2);
  context.fillRect(walkFrame === 0 ? 10 : 9, 14, 3, 2);
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  if (typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom")) return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
}
