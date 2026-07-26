import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const gameOneCss = readFileSync(
  resolve(
    process.cwd(),
    "../games/game-one/src/styles/game-one.css",
  ),
  "utf8",
);

describe("Game One style boundary", () => {
  it("keeps every selector scoped beneath .game-route", () => {
    const selectors = collectSelectors(gameOneCss);
    const unscoped = selectors.filter(
      (selector) => !selector.startsWith(".game-route"),
    );

    expect(selectors.length).toBeGreaterThan(0);
    expect(unscoped).toEqual([]);
  });

  it("does not install Tailwind or a global reset", () => {
    expect(gameOneCss).not.toMatch(/@(?:import|use)\s+[^;]*tailwind/i);
    expect(gameOneCss).not.toMatch(/@tailwind\b/i);
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
        ...prelude
          .split(",")
          .map((selector) => selector.trim())
          .filter(Boolean),
      );
    }

    cursor = close + 1;
  }

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
