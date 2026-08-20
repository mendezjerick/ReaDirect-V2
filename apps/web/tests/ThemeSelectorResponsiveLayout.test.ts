import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("theme selector responsive layout", () => {
  it("uses four columns on narrow screens and a compact row in short landscape", () => {
    const stylesheet = readFileSync(
      resolve(process.cwd(), "src/styles/index.css"),
      "utf8",
    );

    expect(stylesheet).toContain("@media (max-width: 47.999rem)");
    expect(stylesheet).toContain(
      "grid-template-columns: repeat(4, var(--theme-choice-size));",
    );
    expect(stylesheet).toContain(
      "var(--theme-choice-size) + var(--theme-choice-size) + 1.3rem",
    );
    expect(stylesheet).toContain(
      "@media (max-height: 40rem) and (orientation: landscape)",
    );
    expect(stylesheet).toContain(
      "--theme-choice-size: clamp(2rem, 6.5vw, 2.75rem);",
    );
  });
});
