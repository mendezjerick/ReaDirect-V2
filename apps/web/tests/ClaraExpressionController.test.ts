import type { CubismModel } from "@cubism-framework/model/cubismmodel";
import { describe, expect, it } from "vitest";

import {
  ClaraExpressionController,
  normalizeClaraEyeOpenness,
} from "../src/features/intro/live2d/ClaraExpressionController";

const PARAMETER_IDS = [
  "ParamEyeLOpen",
  "ParamEyeROpen",
  "ParamEyeLSmile",
  "ParamEyeRSmile",
  "ParamMouthForm",
  "ParamMouthOpenY",
  "Param24",
] as const;

function createController() {
  const values = new Float32Array([1, 1, 0, 0, 0, 0, 0]);
  const coreModel = {
    parameters: {
      ids: [...PARAMETER_IDS],
      minimumValues: new Float32Array([0, 0, 0, 0, -1, 0, 0]),
      defaultValues: new Float32Array([1, 1, 0, 0, 0, 0, 0]),
      maximumValues: new Float32Array([1.2, 1.2, 1, 1, 1, 1, 1]),
    },
  };
  const model = {
    getModel: () => coreModel,
    setParameterValueByIndex: (index: number, value: number) => {
      values[index] = value;
    },
  } as unknown as CubismModel;

  return {
    controller: new ClaraExpressionController(model),
    value(parameterId: (typeof PARAMETER_IDS)[number]) {
      return values[PARAMETER_IDS.indexOf(parameterId)];
    },
  };
}

describe("ClaraExpressionController", () => {
  it("normalizes catchlight visibility from closed to the default eye opening", () => {
    expect(normalizeClaraEyeOpenness(0, 0, 1)).toBe(0);
    expect(normalizeClaraEyeOpenness(0.5, 0, 1)).toBe(0.5);
    expect(normalizeClaraEyeOpenness(1, 0, 1)).toBe(1);
    expect(normalizeClaraEyeOpenness(1.2, 0, 1)).toBe(1);
  });

  it("constructs the closed-eye happy expression", () => {
    const { controller, value } = createController();

    controller.apply("happy", 0);

    expect(value("ParamEyeLOpen")).toBe(0);
    expect(value("ParamEyeROpen")).toBe(0);
    expect(value("ParamEyeLSmile")).toBe(1);
    expect(value("ParamEyeRSmile")).toBe(1);
    expect(value("ParamMouthForm")).toBe(1);
  });

  it("constructs thinking with closed eyes and the default mouth", () => {
    const { controller, value } = createController();

    controller.apply("thinking", 0);

    expect(value("ParamEyeLOpen")).toBe(0);
    expect(value("ParamEyeROpen")).toBe(0);
    expect(value("ParamEyeLSmile")).toBe(0);
    expect(value("ParamEyeRSmile")).toBe(0);
    expect(value("ParamMouthForm")).toBe(0);
  });

  it("uses Clara's exported question-mark toggle for confused", () => {
    const { controller, value } = createController();

    controller.apply("confused", 0);

    expect(value("Param24")).toBe(1);
  });

  it("layers normalized mouth opening over every emotion", () => {
    const { controller, value } = createController();

    controller.apply("happy", 0.65);

    expect(value("ParamMouthForm")).toBe(1);
    expect(value("ParamMouthOpenY")).toBeCloseTo(0.65);
  });
});
