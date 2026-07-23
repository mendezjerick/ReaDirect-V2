import { describe, expect, it } from "vitest";

import {
  DEFAULT_CLARA_PRESENTATION,
  resolveClaraPresentationLookTarget,
} from "../src/features/intro/live2d/ClaraPresentation";

describe("ClaraPresentation", () => {
  it("lets a demonstration gaze temporarily override pointer tracking", () => {
    const pointer = { active: true, x: -0.8, y: -0.5 };
    const result = resolveClaraPresentationLookTarget(
      {
        ...DEFAULT_CLARA_PRESENTATION,
        behavior: "demonstrating",
      },
      pointer,
    );

    expect(result).toEqual({ active: true, x: 0.58, y: 0.62 });
  });

  it("returns control to the interaction tracker outside demonstrations", () => {
    const pointer = { active: true, x: -0.8, y: -0.5 };

    expect(
      resolveClaraPresentationLookTarget(
        {
          ...DEFAULT_CLARA_PRESENTATION,
          behavior: "listening",
        },
        pointer,
      ),
    ).toBe(pointer);
  });
});
