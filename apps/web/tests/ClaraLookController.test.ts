import type { CubismModel } from "@cubism-framework/model/cubismmodel";
import { describe, expect, it } from "vitest";

import {
  ClaraLookController,
  resolveClaraLookOffset,
} from "../src/features/intro/live2d/ClaraLookController";

const PARAMETER_IDS = [
  "ParamEyeBallX",
  "ParamEyeBallY",
  "ParamAngleX",
  "ParamAngleY",
  "ParamBodyAngleX",
  "ParamBodyAngleY",
] as const;

function createController() {
  const values = new Float32Array(PARAMETER_IDS.length);
  const coreModel = {
    parameters: {
      ids: [...PARAMETER_IDS],
      minimumValues: new Float32Array([-1, -1, -30, -30, -10, -10]),
      defaultValues: new Float32Array([0, 0, 0, 0, 0, 0]),
      maximumValues: new Float32Array([1, 1, 30, 30, 10, 10]),
    },
  };
  const model = {
    getModel: () => coreModel,
    addParameterValueByIndex: (index: number, value: number) => {
      values[index] += value;
    },
  } as unknown as CubismModel;

  return {
    controller: new ClaraLookController(model),
    value(parameterId: (typeof PARAMETER_IDS)[number]) {
      return values[PARAMETER_IDS.indexOf(parameterId)];
    },
  };
}

describe("ClaraLookController", () => {
  it("maps the pointer to strong eye movement, gentle head movement, and slight body sway", () => {
    const { controller, value } = createController();

    controller.apply({ active: true, x: 1, y: -1 }, 0, false);

    expect(value("ParamEyeBallX")).toBeCloseTo(0.82);
    expect(value("ParamEyeBallY")).toBeCloseTo(-0.82);
    expect(value("ParamAngleX")).toBeCloseTo(6.6);
    expect(value("ParamAngleY")).toBeCloseTo(-4.8);
    expect(value("ParamBodyAngleX")).toBeCloseTo(1);
    expect(value("ParamBodyAngleY")).toBeCloseTo(-0.6);
  });

  it("returns a neutral target to the model's existing pose", () => {
    const { controller, value } = createController();

    controller.apply({ active: false, x: 1, y: 1 }, 0, false);

    for (const parameterId of PARAMETER_IDS) {
      expect(value(parameterId)).toBe(0);
    }
  });

  it("uses each side of an asymmetric parameter range and clamps input", () => {
    expect(resolveClaraLookOffset(2, -10, 2, 6, 0.5)).toBe(2);
    expect(resolveClaraLookOffset(-2, -10, 2, 6, 0.5)).toBe(-6);
  });
});
