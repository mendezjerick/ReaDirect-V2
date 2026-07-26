export const GAME_CONFIG = {
  id: "chronicles-of-the-lost-kingdom",
  title: "Chronicles of the Lost Kingdom",
  description: "A short ReaDirect reading adventure foundation.",
  logicalWidth: 1280,
  logicalHeight: 720,
  cameraZoom: 2,
  backgroundColor: "#173326",
  canvasLabel: "Chronicles of the Lost Kingdom game canvas",
  development: {
    showFoundationStatus: true
  }
} as const;

export type GameConfig = typeof GAME_CONFIG;
