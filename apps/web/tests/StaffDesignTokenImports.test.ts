import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("staff and learner design-token stylesheet foundation", () => {
  it("keeps the required Tailwind and ReaDirect token imports", () => {
    const stylesheet = readFileSync(
      resolve(process.cwd(), "src/styles/index.css"),
      "utf8",
    );

    expect(stylesheet).toContain('@import "tailwindcss";');
    expect(stylesheet).toContain(
      '@import "@readirect/design-tokens/colors.css";',
    );
    expect(stylesheet).toContain(
      '@import "@readirect/design-tokens/themes/t2.css";',
    );
    expect(stylesheet).toContain(
      '@import "@readirect/design-tokens/effects.css";',
    );
  });
});
