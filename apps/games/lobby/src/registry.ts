import ottertaleThumbnail from "./assets/thumbnails/ottertale.png";
import readscapeThumbnail from "./assets/thumbnails/readscape.jpg";
import spaceLetterThumbnail from "./assets/thumbnails/space-letter.png";

/**
 * The owner-controlled learner registry. Game Zero is intentionally absent.
 * Persistence keys remain stable even where the lobby uses friendlier labels.
 */
export const registeredGames = [
  {
    key: "game-alpha",
    title: "Space Letter",
    description: "Defend the alphabet in a fast pixel-space battle.",
    label: "Arcade",
    route: "/learner/games/game-alpha",
    accessibleName: "Open Space Letter",
    thumbnail: spaceLetterThumbnail,
  },
  {
    key: "chronicles-of-the-lost-kingdom",
    title: "Readscape",
    description: "Spot the letters and keep your streak going.",
    label: "Letters",
    route: "/learner/games/game-one",
    accessibleName: "Open Readscape",
    thumbnail: readscapeThumbnail,
  },
  {
    key: "ottertale",
    title: "Ottertale",
    description: "Follow the river and practice simple words.",
    label: "Words",
    route: "/learner/games/game-two",
    accessibleName: "Open Ottertale",
    thumbnail: ottertaleThumbnail,
  },
] as const;

export type RegisteredGame = (typeof registeredGames)[number];
