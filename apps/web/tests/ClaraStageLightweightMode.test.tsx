import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { Capacitor } from "@capacitor/core";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";

import { ThemeProvider } from "../src/features/theme/ThemeProvider";
import { ClaraStage } from "../src/features/intro/ClaraStage";
import {
  LearnerExperienceProvider,
  useLearnerExperience,
} from "../src/features/learner-auth/LearnerExperienceProvider";
import {
  saveLearnerSession,
  type LearnerSession,
} from "../src/features/learner-auth/learnerApi";
import { setNativeSessionCache } from "../src/app/nativeSecureSession";

afterEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test("uses bundled themed Clara immediately on native startup without API settings", () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  window.localStorage.setItem("readirect.theme", "t8");
  const fetchMock = vi.fn().mockRejectedValue(new Error("API unavailable"));
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

  const stage = container.querySelector(".clara-stage");
  expect(stage).toHaveAttribute("data-clara-display-mode", "static");
  expect(stage).not.toHaveAttribute("data-live2d-model");
  expect(container.querySelector(".clara-stage__static-image")).toHaveAttribute(
    "src",
    "/assets/live2d/clara/stills/clara-t8.png",
  );
  expect(container.querySelector(".clara-stage__canvas")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("keeps native startup static when the API is available", () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        revision: "setting-1-1",
        display_mode: "live2d",
        speech_mode: "hybrid",
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

  expect(container.querySelector(".clara-stage")).toHaveAttribute(
    "data-clara-display-mode",
    "static",
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test("uses the shared learner experience settings for native online learning", async () => {
  const nativeSession = {
    token: "native-online-token",
    learner: {
      id: 4,
      learner_code: "ON004",
      full_name: "Online Learner",
      first_name: "Online",
      account_purpose: "standard",
      speech_language: "en",
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
  } as unknown as LearnerSession & { token: string };
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  setNativeSessionCache(
    "readirect.learner-session",
    JSON.stringify(nativeSession),
  );
  window.localStorage.setItem("readirect.learner.clara-display-mode", "static");
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        revision: "native-online-1",
        display_mode: "static",
        speech_mode: "hybrid",
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  const { container } = render(
    <MemoryRouter initialEntries={["/learner/dashboard"]}>
      <ThemeProvider>
        <LearnerExperienceProvider>
          <ClaraStage />
        </LearnerExperienceProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.readirect.org/api/learners/experience/settings",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer native-online-token",
        }),
      }),
    ),
  );
  expect(container.querySelector(".clara-stage")).toHaveAttribute(
    "data-clara-display-mode",
    "static",
  );
});

test("preserves an explicitly saved native full-mode override", () => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  window.localStorage.setItem("readirect.learner.clara-display-mode", "live2d");

  const { findByText } = render(
    <MemoryRouter initialEntries={["/learner/login"]}>
      <LearnerExperienceProvider>
        <DisplayModeProbe />
      </LearnerExperienceProvider>
    </MemoryRouter>,
  );

  return expect(findByText("live2d")).resolves.toBeVisible();
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
      speech_language: "en",
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

test("uses the dawn static Clara portrait without mounting Live2D", async () => {
  window.localStorage.setItem("readirect.theme", "t3");
  saveLearnerSession({
    token: "learner-dawn-token",
    learner: {
      id: 3,
      learner_code: "DW003",
      full_name: "Dawn Learner",
      first_name: "Dawn",
      account_purpose: "standard",
      speech_language: "en",
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

  expect(container.querySelector(".clara-stage__static-image")).toHaveAttribute(
    "src",
    "/assets/live2d/clara/stills/clara-t3.png",
  );
  expect(container.querySelector(".clara-stage__canvas")).toBeNull();
});

test("uses the desert static Clara portrait without mounting Live2D", async () => {
  window.localStorage.setItem("readirect.theme", "t4");
  saveLearnerSession({
    token: "learner-desert-token",
    learner: {
      id: 4,
      learner_code: "DS004",
      full_name: "Desert Learner",
      first_name: "Desert",
      account_purpose: "standard",
      speech_language: "en",
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

  expect(container.querySelector(".clara-stage__static-image")).toHaveAttribute(
    "src",
    "/assets/live2d/clara/stills/clara-t4.png",
  );
  expect(container.querySelector(".clara-stage__canvas")).toBeNull();
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

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/experience/intro/settings",
    expect.objectContaining({ headers: { Accept: "application/json" } }),
  );
  expect(container.querySelector(".clara-stage__canvas")).toBeNull();
  expect(container.querySelector(".clara-stage")).not.toHaveAttribute(
    "data-live2d-model",
  );
});

test("falls back to the bundled static Clara view when intro settings stall", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockImplementation(
    (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Aborted", "AbortError")),
          { once: true },
        );
      }),
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

  await act(async () => {
    await vi.advanceTimersByTimeAsync(12_000);
  });

  expect(container.querySelector(".clara-stage")).toHaveAttribute(
    "data-clara-display-mode",
    "static",
  );
  expect(container.querySelector(".clara-stage__canvas")).toBeNull();
  expect(fetchMock).toHaveBeenCalledOnce();
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
      speech_language: "en",
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
