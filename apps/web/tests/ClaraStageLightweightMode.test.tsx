import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";

import { ThemeProvider } from "../src/features/theme/ThemeProvider";
import { ClaraStage } from "../src/features/intro/ClaraStage";
import {
  LearnerExperienceProvider,
  useLearnerExperience,
} from "../src/features/learner-auth/LearnerExperienceProvider";
import { saveLearnerSession } from "../src/features/learner-auth/learnerApi";

afterEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

test("uses the theme-specific static Clara portrait without mounting Live2D", async () => {
  window.localStorage.setItem("readirect.theme", "t2");
  saveLearnerSession({
    token: "learner-lightweight-token",
    learner: {
      id: 1,
      learner_code: "LW001",
      full_name: "Lightweight Learner",
      first_name: "Lightweight",
      account_purpose: "standard",
      school: null,
      grade_level: null,
      section: null,
      progress: {
        stage: "required_lessons",
        current_required_lesson_order: 1,
      },
      achievement_keys: [],
    },
    session: { expires_at: "2026-08-02T00:00:00Z" },
  });
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        revision: "setting-1-1",
        display_mode: "static",
        speech_mode: "published_only",
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(
    <MemoryRouter initialEntries={["/learner/assessment/part-one"]}>
      <ThemeProvider>
        <LearnerExperienceProvider>
          <ClaraStage />
        </LearnerExperienceProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(container.querySelector(".clara-stage")).toHaveAttribute(
      "data-clara-display-mode",
      "static",
    );
  });

  const portrait = container.querySelector(".clara-stage__static-image");
  expect(portrait).toHaveAttribute(
    "src",
    "/assets/live2d/clara/stills/clara-t2.png",
  );
  expect(container.querySelector(".clara-stage__canvas")).toBeNull();
  expect(container.querySelector(".clara-stage")).not.toHaveAttribute(
    "data-live2d-model",
  );

  fireEvent.load(portrait as HTMLImageElement);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test("uses the public intro contract before mounting Clara on the landing page", async () => {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        revision: "setting-1-1",
        display_mode: "static",
        speech_mode: "published_only",
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(
    <MemoryRouter initialEntries={["/"]}>
      <ThemeProvider>
        <LearnerExperienceProvider>
          <ClaraStage />
        </LearnerExperienceProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(container.querySelector(".clara-stage")).toHaveAttribute(
      "data-clara-display-mode",
      "static",
    );
  });

  expect(fetchMock).toHaveBeenCalledWith("/api/experience/intro/settings", {
    headers: { Accept: "application/json" },
  });
  expect(container.querySelector(".clara-stage__canvas")).toBeNull();
  expect(container.querySelector(".clara-stage")).not.toHaveAttribute(
    "data-live2d-model",
  );
});

function DisplayModeProbe() {
  const { displayMode } = useLearnerExperience();

  return <output>{displayMode ?? "resolving"}</output>;
}

test("uses a saved device renderer choice over the effective system renderer", async () => {
  window.localStorage.setItem("readirect.learner.clara-display-mode", "live2d");
  saveLearnerSession({
    token: "learner-device-choice-token",
    learner: {
      id: 2,
      learner_code: "LW002",
      full_name: "Device Choice Learner",
      first_name: "Device",
      account_purpose: "standard",
      school: null,
      grade_level: null,
      section: null,
      progress: {
        stage: "required_lessons",
        current_required_lesson_order: 1,
      },
      achievement_keys: [],
    },
    session: { expires_at: "2026-08-02T00:00:00Z" },
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          revision: "setting-1-1",
          display_mode: "static",
          speech_mode: "published_only",
        }),
        { status: 200 },
      ),
    ),
  );

  const { findByText } = render(
    <MemoryRouter initialEntries={["/learner/dashboard"]}>
      <LearnerExperienceProvider>
        <DisplayModeProbe />
      </LearnerExperienceProvider>
    </MemoryRouter>,
  );

  expect(await findByText("live2d")).toBeVisible();
});
