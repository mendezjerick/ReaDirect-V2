import type {
  OfflinePackListEntry,
  OfflinePackRecord,
  OfflinePracticeCategoryKey,
} from "./offlinePracticeSchemas";

export const OFFLINE_PRACTICE_CATEGORIES: readonly {
  key: OfflinePracticeCategoryKey;
  title: string;
  description: string;
}[] = [
  {
    key: "letters",
    title: "Letters & Sounds",
    description: "Practice letter names with Clara.",
  },
  {
    key: "words",
    title: "Word Reading",
    description: "Read short words from the saved practice sets.",
  },
  {
    key: "phrases",
    title: "Phrase Reading",
    description: "Read small groups of words together.",
  },
  {
    key: "sentences",
    title: "Sentence Reading",
    description: "Practice reading complete sentences.",
  },
  {
    key: "passages",
    title: "Passage Reading",
    description: "Read a short passage at your own pace.",
  },
  {
    key: "comprehension",
    title: "Reading Comprehension",
    description: "Read and think about a practice question.",
  },
] as const;

const categoryByModuleKey: Record<string, OfflinePracticeCategoryKey> = {
  letters: "letters",
  words: "words",
  phrases: "phrases",
  sentences: "sentences",
  passages: "passages",
  comprehension: "comprehension",
};

export function categoryForPack(
  pack: Pick<
    OfflinePackListEntry | OfflinePackRecord,
    "categoryKey" | "moduleKey"
  >,
): OfflinePracticeCategoryKey | null {
  return pack.categoryKey ?? categoryByModuleKey[pack.moduleKey] ?? null;
}

export function categoryTitle(categoryKey: OfflinePracticeCategoryKey): string {
  return (
    OFFLINE_PRACTICE_CATEGORIES.find((category) => category.key === categoryKey)
      ?.title ?? "Offline Practice"
  );
}

export function categoryDescription(
  categoryKey: OfflinePracticeCategoryKey,
): string {
  return (
    OFFLINE_PRACTICE_CATEGORIES.find((category) => category.key === categoryKey)
      ?.description ?? "Practice at your own pace."
  );
}
