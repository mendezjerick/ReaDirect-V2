export type PlaceholderAsset = {
  key: string;
  kind: "shape" | "metadata";
  description: string;
};

export const placeholderAssets: PlaceholderAsset[] = [
  {
    key: "foundation-background",
    kind: "shape",
    description: "KAPLAY-rendered placeholder background for Phase 1 only."
  }
];
