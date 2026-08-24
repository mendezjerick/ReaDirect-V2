import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.hoisted(() => vi.fn(() => false));
const openNativeBrowser = vi.hoisted(() => vi.fn());
const nativeSecureSessionPlugin = vi.hoisted(() => ({
  get: vi.fn(async () => ({ value: null })),
  set: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
}));

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();

  return {
    ...actual,
    Capacitor: { ...actual.Capacitor, isNativePlatform },
    registerPlugin: () => nativeSecureSessionPlugin,
  };
});

vi.mock("@capacitor/browser", () => ({
  Browser: { open: openNativeBrowser },
}));

vi.mock("motion/react", async (importOriginal) => {
  const motion = await importOriginal<typeof import("motion/react")>();

  return {
    ...motion,
    useReducedMotion: () => false,
  };
});

import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { HomePage } from "../src/features/home/HomePage";
import { setNativeSessionCache } from "../src/app/nativeSecureSession";
import {
  enterGuestMode,
  loadLearnerSession,
  saveLearnerSession,
} from "../src/features/learner-auth/learnerApi";
import { CreditsLicensesPage } from "../src/features/legal/CreditsLicensesPage";
import { ThemeProvider } from "../src/features/theme/ThemeProvider";

const learnerSession = {
  token: "learner-token",
  learner: {
    id: 1,
    learner_code: "KW000",
    full_name: "Kristen Rhine Wright",
    first_name: "Kristen",
    account_purpose: "standard" as const,
    speech_language: "en" as const,
    school: null,
    grade_level: null,
    section: null,
    achievement_keys: [],
    progress: {
      stage: "before_diagnostic",
      current_required_lesson_order: null,
    },
  },
  session: { expires_at: "2026-12-31T12:00:00+00:00" },
};

afterEach(() => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  setNativeSessionCache("readirect.learner-session", null);
});

beforeEach(() => {
  isNativePlatform.mockReturnValue(false);
  openNativeBrowser.mockReset();
  openNativeBrowser.mockResolvedValue(undefined);
});

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/home"]}>
      <ThemeProvider>
        <Routes>
          <Route path="/home" element={<HomePage />} />
          <Route
            path="/learner/login"
            element={<div>Learner login route</div>}
          />
          <Route path="/staff/login" element={<div>Staff login route</div>} />
          <Route path="/credits-licenses" element={<CreditsLicensesPage />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  it("keeps the home hierarchy to learner, guest, and staff actions", () => {
    renderHome();

    expect(screen.getByRole("main")).toHaveClass("learner-flow-page");
    const actions = screen.getByRole("region", { name: "Home actions" });
    const buttons = within(actions).getAllByRole("button");

    expect(buttons).toHaveLength(3);
    expect(
      within(actions).getByRole("button", { name: "Let's Read!" }),
    ).toHaveClass("home-page__read-button");
    expect(
      within(actions).getByRole("button", { name: "Continue as Guest" }),
    ).toHaveClass("home-page__guest-button");
    expect(
      within(actions).getByRole("button", { name: "Staff login" }),
    ).toHaveClass("home-page__staff-button");
    expect(within(actions).queryByRole("link")).not.toBeInTheDocument();
  });

  it("starts a browser-local guest session and opens the dashboard directly", () => {
    render(
      <MemoryRouter initialEntries={["/home"]}>
        <ThemeProvider>
          <Routes>
            <Route path="/home" element={<HomePage />} />
            <Route
              path="/learner/dashboard"
              element={<div>Guest dashboard route</div>}
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue as Guest" }));

    expect(screen.getByText("Guest dashboard route")).toBeVisible();
    expect(
      JSON.parse(
        window.localStorage.getItem("readirect.guest-profile.v1") ?? "null",
      ),
    ).toMatchObject({ version: 1, active: true });
  });

  it("opens the supplied About ReaDirect content from the bottom action", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "About ReaDirect" }));

    const dialog = screen.getByRole("dialog", { name: "About ReaDirect" });
    expect(dialog).toBeVisible();
    expect(within(dialog).getByText("Mission")).toBeVisible();
    expect(within(dialog).getByText("Vision")).toBeVisible();
    expect(within(dialog).getByText("Jerick E. Mendez")).toBeVisible();
    expect(
      within(dialog).getByAltText("Nick Narry S. Mendoza"),
    ).toHaveAttribute("src", "/assets/profile/nick.png");
    expect(
      within(dialog).getByRole("heading", { name: "Credits & licences" }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("link", { name: "View credits and licences" }),
    ).toHaveAttribute("href", "/credits-licenses?returnTo=/home");

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Close About ReaDirect",
      }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("returns from Credits & licences to the switch-account lobby", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "About ReaDirect" }));
    fireEvent.click(
      screen.getByRole("link", { name: "View credits and licences" }),
    );
    fireEvent.click(screen.getByRole("link", { name: "Back to ReaDirect" }));

    expect(screen.getByRole("main", { name: "ReaDirect home" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Let's Read!" })).toBeVisible();
  });

  it("shows the staff button press before opening staff login", () => {
    vi.useFakeTimers();

    try {
      renderHome();
      const staffButton = screen.getByRole("button", { name: "Staff login" });

      fireEvent.click(staffButton);

      expect(staffButton).toBeDisabled();
      expect(staffButton).toHaveAttribute("data-press-state", "committing");
      expect(screen.queryByText("Staff login route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS - 1));
      expect(screen.queryByText("Staff login route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1));
      expect(screen.getByText("Staff login route")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits for the full staff button commit before opening the native browser", async () => {
    vi.useFakeTimers();
    isNativePlatform.mockReturnValue(true);

    try {
      renderHome();
      fireEvent.click(screen.getByRole("button", { name: "Staff login" }));

      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS - 1));
      expect(openNativeBrowser).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
        await Promise.resolve();
      });

      expect(openNativeBrowser).toHaveBeenCalledWith({
        url: "https://app.readirect.org/staff/login",
      });
      expect(screen.queryByText("Staff login route")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows a native staff portal retry after the browser launch fails", async () => {
    vi.useFakeTimers();
    isNativePlatform.mockReturnValue(true);
    openNativeBrowser
      .mockRejectedValueOnce(new Error("browser unavailable"))
      .mockResolvedValueOnce(undefined);

    try {
      renderHome();
      fireEvent.click(screen.getByRole("button", { name: "Staff login" }));

      await act(async () => {
        vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
        await Promise.resolve();
      });

      expect(screen.getByRole("alert")).toHaveTextContent(
        "We couldn't open staff access. Check your connection and try again.",
      );

      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      await act(async () => {
        await Promise.resolve();
      });

      expect(openNativeBrowser).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps browser staff login on the existing SPA route", () => {
    vi.useFakeTimers();

    try {
      renderHome();
      fireEvent.click(screen.getByRole("button", { name: "Staff login" }));
      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS));

      expect(screen.getByText("Staff login route")).toBeInTheDocument();
      expect(openNativeBrowser).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("confirms learner Switch account before returning to the public lobby", () => {
    vi.useFakeTimers();
    isNativePlatform.mockReturnValue(true);
    setNativeSessionCache(
      "readirect.learner-session",
      JSON.stringify(learnerSession),
    );

    try {
      renderHome();
      const switchAccount = screen.getByRole("button", {
        name: "Switch account",
      });

      fireEvent.click(switchAccount);
      const dialog = screen.getByRole("alertdialog", {
        name: "Switch account?",
      });
      expect(dialog).toHaveTextContent(
        "Are you sure you want to switch account? Your current session will be logged out.",
      );
      fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(loadLearnerSession()).not.toBeNull();

      fireEvent.click(switchAccount);
      const confirmDialog = screen.getByRole("alertdialog", {
        name: "Switch account?",
      });
      fireEvent.click(
        within(confirmDialog).getByRole("button", { name: "Switch account" }),
      );

      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS));

      expect(screen.getByRole("button", { name: "Let's Read!" })).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Continue as Guest" }),
      ).toBeVisible();
      expect(screen.getByRole("button", { name: "Staff login" })).toBeVisible();
      expect(openNativeBrowser).not.toHaveBeenCalled();
      expect(loadLearnerSession()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the primary button press before opening learner login", () => {
    vi.useFakeTimers();

    try {
      renderHome();
      const readButton = screen.getByRole("button", { name: "Let's Read!" });

      fireEvent.click(readButton);

      expect(readButton).toBeDisabled();
      expect(screen.queryByText("Learner login route")).not.toBeInTheDocument();

      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS));
      expect(screen.getByText("Learner login route")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps Switch account active while opening the learner dashboard", async () => {
    await saveLearnerSession(learnerSession);
    vi.useFakeTimers();

    try {
      renderHome();
      const primary = screen.getByRole("button", {
        name: /Keep Reading/,
      });
      const switchAccount = screen.getByRole("button", {
        name: "Switch account",
      });

      fireEvent.click(primary);

      expect(primary).toBeDisabled();
      expect(switchAccount).toBeEnabled();
      expect(switchAccount).toHaveAttribute("data-press-state", "idle");
    } finally {
      vi.useRealTimers();
    }
  });

  it("restores guest mode with an image-backed action and learner login", () => {
    vi.useFakeTimers();
    enterGuestMode();

    try {
      renderHome();

      const guestButton = screen.getByRole("button", {
        name: "Continue as Guest",
      });
      expect(guestButton).toHaveAttribute("data-guest", "true");

      const loginButton = screen.getByRole("button", {
        name: "Continue to login",
      });
      fireEvent.click(loginButton);
      act(() => vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS));

      expect(screen.getByText("Learner login route")).toBeVisible();
      expect(loadLearnerSession()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
