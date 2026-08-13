import bagAsset from "./assets/vocabulary/word-bag.webp";
import batAsset from "./assets/vocabulary/word-bat.webp";
import bedAsset from "./assets/vocabulary/word-bed.webp";
import bunAsset from "./assets/vocabulary/word-bun.webp";
import capAsset from "./assets/vocabulary/word-cap.webp";
import catAsset from "./assets/vocabulary/word-cat.webp";
import canAsset from "./assets/vocabulary/word-can.webp";
import denAsset from "./assets/vocabulary/word-den.webp";
import dogAsset from "./assets/vocabulary/word-dog.webp";
import dotAsset from "./assets/vocabulary/word-dot.webp";
import fanAsset from "./assets/vocabulary/word-fan.webp";
import finAsset from "./assets/vocabulary/word-fin.webp";
import gapAsset from "./assets/vocabulary/word-gap.webp";
import gumAsset from "./assets/vocabulary/word-gum.webp";
import hamAsset from "./assets/vocabulary/word-ham.webp";
import hatAsset from "./assets/vocabulary/word-hat.webp";
import henAsset from "./assets/vocabulary/word-hen.webp";
import hotAsset from "./assets/vocabulary/word-hot.webp";
import jamAsset from "./assets/vocabulary/word-jam.webp";
import jetAsset from "./assets/vocabulary/word-jet.webp";
import jogAsset from "./assets/vocabulary/word-jog.webp";
import jugAsset from "./assets/vocabulary/word-jug.webp";
import legAsset from "./assets/vocabulary/word-leg.webp";
import lidAsset from "./assets/vocabulary/word-lid.webp";
import logAsset from "./assets/vocabulary/word-log.webp";
import lipAsset from "./assets/vocabulary/word-lip.webp";
import mapAsset from "./assets/vocabulary/word-map.webp";
import matAsset from "./assets/vocabulary/word-mat.webp";
import mugAsset from "./assets/vocabulary/word-mug.webp";
import panAsset from "./assets/vocabulary/word-pan.webp";
import penAsset from "./assets/vocabulary/word-pen.webp";
import pigAsset from "./assets/vocabulary/word-pig.webp";
import potAsset from "./assets/vocabulary/word-pot.webp";
import {
  type WordRescueAssetReviewStatus,
  wordRescueAssetReview,
} from "./wordRescueAssetReview";

export type WordRescueAssetRecord = {
  readonly contentId: string;
  readonly targetWord: string;
  readonly visualKey: string;
  readonly visualKind: "image" | "icon";
  readonly src: string;
  readonly altText: string;
  readonly reviewStatus: WordRescueAssetReviewStatus;
};

export function createWordRescueAssetRegistry(
  entries: readonly WordRescueAssetRecord[],
): Record<string, WordRescueAssetRecord> {
  const registry: Record<string, WordRescueAssetRecord> = {};

  for (const entry of entries) {
    if (!/^word-[a-z]+$/.test(entry.visualKey)) {
      throw new Error(`Unsafe Word Rescue visual key: ${entry.visualKey}`);
    }
    if (registry[entry.visualKey]) {
      throw new Error(`Duplicate Word Rescue visual key: ${entry.visualKey}`);
    }
    if (
      Object.values(registry).some(
        (asset) => asset.contentId === entry.contentId,
      )
    ) {
      throw new Error(`Duplicate Word Rescue content ID: ${entry.contentId}`);
    }

    registry[entry.visualKey] = entry;
  }

  return registry;
}

const wordRescueAssetEntries = [
  {
    ...wordRescueAssetReview["word-bag"],
    src: bagAsset,
    altText: "A plain bag",
  },
  {
    ...wordRescueAssetReview["word-bat"],
    src: batAsset,
    altText: "A small flying animal bat",
  },
  {
    ...wordRescueAssetReview["word-bed"],
    src: bedAsset,
    altText: "A simple bed",
  },
  {
    ...wordRescueAssetReview["word-bun"],
    src: bunAsset,
    altText: "A plain bread bun",
  },
  {
    ...wordRescueAssetReview["word-cap"],
    src: capAsset,
    altText: "A simple brimmed cap",
  },
  {
    ...wordRescueAssetReview["word-cat"],
    src: catAsset,
    altText: "A single cat",
  },
  {
    ...wordRescueAssetReview["word-can"],
    src: canAsset,
    altText: "A plain tin can",
  },
  {
    ...wordRescueAssetReview["word-den"],
    src: denAsset,
    altText: "A fox den opening with one fox",
  },
  {
    ...wordRescueAssetReview["word-dog"],
    src: dogAsset,
    altText: "A single dog",
  },
  {
    ...wordRescueAssetReview["word-dot"],
    src: dotAsset,
    altText: "A single dot on a simple map",
  },
  {
    ...wordRescueAssetReview["word-fan"],
    src: fanAsset,
    altText: "A plain electric fan",
  },
  {
    ...wordRescueAssetReview["word-fin"],
    src: finAsset,
    altText: "A fish with one fin clearly visible",
  },
  {
    ...wordRescueAssetReview["word-gap"],
    src: gapAsset,
    altText: "A clear gap in a log",
  },
  {
    ...wordRescueAssetReview["word-gum"],
    src: gumAsset,
    altText: "A plain piece or pack of gum",
  },
  {
    ...wordRescueAssetReview["word-ham"],
    src: hamAsset,
    altText: "A simple slice of ham",
  },
  {
    ...wordRescueAssetReview["word-hat"],
    src: hatAsset,
    altText: "A simple hat",
  },
  {
    ...wordRescueAssetReview["word-hen"],
    src: henAsset,
    altText: "A single hen",
  },
  {
    ...wordRescueAssetReview["word-hot"],
    src: hotAsset,
    altText: "A warm bun with simple heat lines",
  },
  {
    ...wordRescueAssetReview["word-jam"],
    src: jamAsset,
    altText: "A plain jar of jam",
  },
  {
    ...wordRescueAssetReview["word-jet"],
    src: jetAsset,
    altText: "A single jet airplane silhouette",
  },
  {
    ...wordRescueAssetReview["word-jog"],
    src: jogAsset,
    altText: "An inclusive person jogging",
  },
  {
    ...wordRescueAssetReview["word-jug"],
    src: jugAsset,
    altText: "A plain handled jug",
  },
  {
    ...wordRescueAssetReview["word-leg"],
    src: legAsset,
    altText: "A simplified clothed leg",
  },
  {
    ...wordRescueAssetReview["word-lid"],
    src: lidAsset,
    altText: "A lid on a pot",
  },
  {
    ...wordRescueAssetReview["word-log"],
    src: logAsset,
    altText: "A single log in mud",
  },
  {
    ...wordRescueAssetReview["word-lip"],
    src: lipAsset,
    altText: "A simple lip shape",
  },
  {
    ...wordRescueAssetReview["word-map"],
    src: mapAsset,
    altText: "A folded map without readable labels",
  },
  {
    ...wordRescueAssetReview["word-mat"],
    src: matAsset,
    altText: "A plain floor mat",
  },
  {
    ...wordRescueAssetReview["word-mug"],
    src: mugAsset,
    altText: "A handled mug",
  },
  {
    ...wordRescueAssetReview["word-pan"],
    src: panAsset,
    altText: "A plain frying pan",
  },
  {
    ...wordRescueAssetReview["word-pen"],
    src: penAsset,
    altText: "A simple writing pen",
  },
  {
    ...wordRescueAssetReview["word-pig"],
    src: pigAsset,
    altText: "A single pig silhouette",
  },
  {
    ...wordRescueAssetReview["word-pot"],
    src: potAsset,
    altText: "A plain cooking pot",
  },
] satisfies readonly WordRescueAssetRecord[];

export const wordRescueAssetRegistry = createWordRescueAssetRegistry(
  wordRescueAssetEntries,
);

export function getWordRescueAsset(
  visualKey: string,
): WordRescueAssetRecord | null {
  if (
    !Object.prototype.hasOwnProperty.call(wordRescueAssetRegistry, visualKey)
  ) {
    return null;
  }

  return wordRescueAssetRegistry[
    visualKey as keyof typeof wordRescueAssetRegistry
  ];
}
