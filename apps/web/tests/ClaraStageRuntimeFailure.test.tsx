import { render, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("../src/features/learner-auth/LearnerExperienceProvider", () => ({
  useLearnerExperience: () => ({
    state: "ready",
    displayMode: "live2d",
  }),
}));

vi.mock("../src/features/theme/themeContext", () => ({
  useTheme: () => ({ theme: "t1" }),
}));

vi.mock("../src/features/intro/live2d/ClaraLive2DCanvas", () => {
  throw new Error("Live2DCubismCore is not defined");
});

import { ClaraStage } from "../src/features/intro/ClaraStage";

test("keeps the learner screen mounted and uses static Clara when the Live2D module fails", async () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  const { container } = render(
    <main data-testid="learner-screen">
      <ClaraStage />
    </main>,
  );

  await waitFor(() => {
    expect(container.querySelector("[data-testid='learner-screen']")).not.toBeNull();
    expect(container.querySelector(".clara-stage")).toHaveAttribute(
      "data-clara-display-mode",
      "static",
    );
  });

  expect(container.querySelector(".clara-stage__static-image")).toHaveAttribute(
    "src",
    "/assets/live2d/clara/stills/clara-default.png",
  );
  consoleError.mockRestore();
});
