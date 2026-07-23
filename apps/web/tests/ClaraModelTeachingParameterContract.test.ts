import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CLARA_TEACHING_PARAMETER_IDS } from "../src/features/intro/live2d/ClaraExpressionController";

interface ClaraDisplayInfo {
  Parameters: Array<{ Id: string; Name: string }>;
}

describe("Clara teaching parameter contract", () => {
  it("keeps every runtime teaching control present in Clara's exported metadata", () => {
    const path = resolve(
      process.cwd(),
      "public/assets/live2d/clara/CherryGoth.cdi3.json",
    );
    const metadata = JSON.parse(readFileSync(path, "utf8")) as ClaraDisplayInfo;
    const parameterIds = new Set(
      metadata.Parameters.map((parameter) => parameter.Id),
    );

    for (const parameterId of CLARA_TEACHING_PARAMETER_IDS) {
      expect(parameterIds.has(parameterId), parameterId).toBe(true);
    }
  });

  it("never controls Clara's sad, angry, or dizzy toggles", () => {
    expect(CLARA_TEACHING_PARAMETER_IDS).not.toContain("Param20");
    expect(CLARA_TEACHING_PARAMETER_IDS).not.toContain("Param21");
    expect(CLARA_TEACHING_PARAMETER_IDS).not.toContain("Param23");
  });
});
