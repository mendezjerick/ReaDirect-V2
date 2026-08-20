import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tokenRoot = resolve(process.cwd(), "../../packages/design-tokens/src");

function readTokenFile(path: string) {
  return readFileSync(resolve(tokenRoot, path), "utf8");
}

describe("fixed semantic design tokens", () => {
  it("keeps status, focus, info, skip, and disabled aliases out of theme palettes", () => {
    const forbiddenOverrides = [
      "--color-info:",
      "--color-info-soft:",
      "--color-result-label-surface:",
      "--color-result-label-border:",
      "--color-result-label-depth:",
      "--color-result-label-text:",
      "--color-success:",
      "--color-success-strong:",
      "--color-success-soft:",
      "--color-warning:",
      "--color-warning-soft:",
      "--color-danger:",
      "--color-danger-soft:",
      "--color-focus:",
      "--color-action-skip-surface:",
      "--color-action-skip-hover:",
      "--color-action-skip-pressed:",
      "--color-action-skip-border:",
      "--color-action-skip-depth:",
      "--color-staff-sidebar-disabled:",
    ];

    for (const themeId of ["t2", "t3", "t4", "t5", "t6", "t7", "t8"]) {
      const stylesheet = readTokenFile(`themes/${themeId}.css`);
      for (const token of forbiddenOverrides) {
        expect(stylesheet, `${themeId} must not override ${token}`).not.toContain(
          token,
        );
      }
    }
  });

  it("defines the shared semantic palette and disabled alias", () => {
    const colors = readTokenFile("colors.css");
    expect(colors).toContain("--color-info: #2d7184;");
    expect(colors).toContain("--color-success-strong: #185c3d;");
    expect(colors).toContain(
      "--color-staff-sidebar-disabled: var(--color-button-unavailable-surface);",
    );
  });

  it("only gives T7 and T8 distinct unavailable palettes", () => {
    const effects = readTokenFile("effects.css");
    expect(effects).toContain(':root[data-theme="t7"]');
    expect(effects).toContain("--color-button-unavailable-surface: #5b7394;");
    expect(effects).toContain(':root[data-theme="t8"]');
    expect(effects).toContain("--color-button-unavailable-surface: #665b7d;");
    expect(effects.match(/data-theme=/g)).toHaveLength(2);
  });
});
