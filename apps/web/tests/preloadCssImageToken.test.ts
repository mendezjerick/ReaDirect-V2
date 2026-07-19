import { afterEach, describe, expect, it } from "vitest";

import { getCssImageTokenUrl } from "../src/utils/preloadCssImageToken";

describe("CSS image token preloading", () => {
  afterEach(() => {
    document.documentElement.style.removeProperty("--test-background-asset");
  });

  it("extracts a theme asset URL without hard-coding the asset path", () => {
    document.documentElement.style.setProperty(
      "--test-background-asset",
      'url("/assets/backgrounds/theme-mobile.png")',
    );

    expect(getCssImageTokenUrl("--test-background-asset")).toBe(
      "/assets/backgrounds/theme-mobile.png",
    );
  });

  it("returns null when the theme token is unavailable", () => {
    expect(getCssImageTokenUrl("--test-background-asset")).toBeNull();
  });
});
