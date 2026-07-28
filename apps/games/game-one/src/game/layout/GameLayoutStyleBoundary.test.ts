import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const responsiveLayoutPath = [
  resolve(process.cwd(), "../games/game-one/src/game/layout/game-layout.css"),
  resolve(process.cwd(), "src/game/layout/game-layout.css"),
].find((candidate) => existsSync(candidate));

if (!responsiveLayoutPath) {
  throw new Error("Game One responsive layout stylesheet was not found.");
}

const responsiveLayoutCss = readFileSync(
  responsiveLayoutPath,
  "utf8",
);

describe("Game One responsive style boundary", () => {
  it("keeps every responsive selector beneath .game-route", () => {
    const selectors = collectSelectors(responsiveLayoutCss);
    const unscoped = selectors.filter(
      (selector) => !selector.startsWith(".game-route"),
    );

    expect(selectors.length).toBeGreaterThan(0);
    expect(unscoped).toEqual([]);
  });

  it("does not style application ancestors while Game One is mounted", () => {
    expect(responsiveLayoutCss).not.toMatch(
      /(?:html|body|#root|:root):has\(\.game-route\)/,
    );
  });
});

function collectSelectors(source: string): string[] {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  return collectBlocks(css, true);
}

function collectBlocks(source: string, selectorsAllowed: boolean): string[] {
  const selectors: string[] = [];
  let cursor = 0;

  while (cursor < source.length) {
    const open = source.indexOf("{", cursor);
    if (open === -1) break;
    const prelude = source.slice(cursor, open).trim();
    const close = matchingBrace(source, open);
    if (close === -1) break;
    const body = source.slice(open + 1, close);

    if (prelude.startsWith("@")) {
      const nestedSelectors =
        /^@(media|supports|container|layer)\b/i.test(prelude);
      if (nestedSelectors) {
        selectors.push(...collectBlocks(body, true));
      }
    } else if (selectorsAllowed) {
      selectors.push(
        ...splitSelectors(prelude)
          .map((selector) => selector.trim())
          .filter(Boolean),
      );
    }

    cursor = close + 1;
  }

  return selectors;
}

function splitSelectors(prelude: string): string[] {
  const selectors: string[] = [];
  let start = 0;
  let roundDepth = 0;
  let squareDepth = 0;

  for (let index = 0; index < prelude.length; index += 1) {
    const character = prelude[index];
    if (character === "(") roundDepth += 1;
    if (character === ")") roundDepth -= 1;
    if (character === "[") squareDepth += 1;
    if (character === "]") squareDepth -= 1;
    if (character === "," && roundDepth === 0 && squareDepth === 0) {
      selectors.push(prelude.slice(start, index));
      start = index + 1;
    }
  }

  selectors.push(prelude.slice(start));
  return selectors;
}

function matchingBrace(source: string, open: number): number {
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== "\\") quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return index;
  }

  return -1;
}
