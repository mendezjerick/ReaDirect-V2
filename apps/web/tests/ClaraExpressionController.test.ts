import type { CubismModel } from "@cubism-framework/model/cubismmodel";
import { describe, expect, it } from "vitest";

import {
  CLARA_TEACHING_PARAMETER_IDS,
  ClaraExpressionController,
  normalizeClaraEyeOpenness,
} from "../src/features/intro/live2d/ClaraExpressionController";
import type { ClaraPresentationState } from "../src/features/intro/live2d/ClaraPresentation";

const PARAMETER_IDS = CLARA_TEACHING_PARAMETER_IDS;

function presentation(
  overrides: Partial<ClaraPresentationState> = {},
): ClaraPresentationState {
  return {
    emotion: "default",
    behavior: "neutral",
    cue: "none",
    speaking: false,
    ...overrides,
  };
}

function createController() {
  const values = new Float32Array(PARAMETER_IDS.length);
  const defaults = PARAMETER_IDS.map((parameterId) =>
    parameterId === "ParamEyeLOpen" || parameterId === "ParamEyeROpen" ? 1 : 0,
  );
  values.set(defaults);
  const coreModel = {
    parameters: {
      ids: [...PARAMETER_IDS],
      minimumValues: new Float32Array(
        PARAMETER_IDS.map((parameterId) =>
          parameterId === "ParamEyeLOpen" ||
          parameterId === "ParamEyeROpen" ||
          parameterId === "ParamEyeLSmile" ||
          parameterId === "ParamEyeRSmile" ||
          parameterId === "ParamMouthOpenY" ||
          parameterId === "Param22" ||
          parameterId === "Param24"
            ? 0
            : -1,
        ),
      ),
      defaultValues: new Float32Array(defaults),
      maximumValues: new Float32Array(
        PARAMETER_IDS.map((parameterId) =>
          parameterId === "ParamEyeLOpen" || parameterId === "ParamEyeROpen"
            ? 1.2
            : 1,
        ),
      ),
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

    controller.apply(presentation({ emotion: "happy" }), 0, 0, false);

    expect(value("ParamEyeLOpen")).toBe(0);
    expect(value("ParamEyeROpen")).toBe(0);
    expect(value("ParamEyeLSmile")).toBe(1);
    expect(value("ParamEyeRSmile")).toBe(1);
    expect(value("ParamMouthForm")).toBe(1);
  });

  it("constructs thinking with closed eyes and the default mouth", () => {
    const { controller, value } = createController();

    controller.apply(presentation({ emotion: "thinking" }), 0, 0, false);

    expect(value("ParamEyeLOpen")).toBe(0);
    expect(value("ParamEyeROpen")).toBe(0);
    expect(value("ParamEyeLSmile")).toBe(0);
    expect(value("ParamEyeRSmile")).toBe(0);
    expect(value("ParamMouthForm")).toBe(0);
  });

  it("uses Clara's exported question-mark toggle for confused", () => {
    const { controller, value } = createController();

    controller.apply(presentation({ emotion: "confused" }), 0, 0, false);

    expect(value("Param24")).toBe(1);
  });

  it("layers normalized mouth opening over every emotion", () => {
    const { controller, value } = createController();

    controller.apply(
      presentation({ emotion: "happy", speaking: true }),
      0.65,
      0,
      false,
    );

    expect(value("ParamMouthForm")).toBe(1);
    expect(value("ParamMouthOpenY")).toBeCloseTo(0.65);
  });

  it("constructs safe teaching behaviors without negative-expression toggles", () => {
    const { controller, value } = createController();

    controller.apply(
      presentation({ behavior: "gentle_correction", speaking: true }),
      0.4,
      0,
      false,
    );

    expect(value("ParamBrowLY")).toBeGreaterThan(0);
    expect(value("ParamBrowRY")).toBeGreaterThan(0);
    expect(value("ParamMouthForm")).toBeLessThan(0);
    expect(value("ParamMouthOpenY")).toBeCloseTo(0.4);
  });

  it("keeps blush disabled while retaining the animated celebration", () => {
    const { controller, value } = createController();

    controller.apply(
      presentation({ emotion: "happy", behavior: "celebrating" }),
      0,
      0.25,
      true,
    );
    controller.apply(
      presentation({ emotion: "happy", behavior: "celebrating" }),
      0,
      0.25,
      true,
    );

    expect(value("Param22")).toBe(0);
    expect(value("ParamCheek")).toBe(0);
    expect(value("ParamEyeLSmile")).toBeGreaterThan(0);
    expect(Math.abs(value("Param4"))).toBeGreaterThan(0);
    expect(Math.abs(value("Param6"))).toBeGreaterThan(0);

    controller.apply(
      presentation({ emotion: "happy", behavior: "celebrating" }),
      0,
      0,
      false,
    );

    expect(value("Param4")).toBe(0);
    expect(value("Param6")).toBe(0);
  });
});
