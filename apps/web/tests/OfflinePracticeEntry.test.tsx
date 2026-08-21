import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const connectivityMock = vi.hoisted(() => vi.fn());
const loadSessionMock = vi.hoisted(() =>
  vi.fn<() => { token: string } | null>(() => null),
);

vi.mock("../src/features/connectivity/connectivityContext", () => ({
  useConnectivity: connectivityMock,
}));
vi.mock("../src/features/learner-auth/learnerApi", () => ({
  loadLearnerSession: loadSessionMock,
}));
vi.mock("../src/features/theme/ThemeSelector", () => ({
  ThemeSelector: () => null,
}));
vi.mock("../src/features/theme/themeContext", () => ({
  useTheme: () => ({ theme: "t1", setTheme: vi.fn() }),
}));

import { NativeLearnerEntryPage } from "../src/features/offline-practice/NativeLearnerEntryPage";
import { LINK_START_DURATION_MS } from "../src/components/transitions/LinkStartTransition";

function renderEntry(advanceStartup = true) {
  const result = render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<NativeLearnerEntryPage />} />
        <Route path="/home" element={<p>Online landing</p>} />
        <Route path="/learner/offline" element={<p>Offline home</p>} />
        <Route path="/learner/login" element={<p>Online sign in</p>} />
      </Routes>
    </MemoryRouter>,
  );

  if (advanceStartup) {
    act(() => vi.advanceTimersByTime(5000));
  }

  return result;
}

function completeTapToContinue() {
  fireEvent.click(screen.getByRole("button", { name: "Tap to continue" }));
  act(() => vi.advanceTimersByTime(LINK_START_DURATION_MS));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  connectivityMock.mockReset();
  loadSessionMock.mockReset().mockReturnValue(null);
  vi.unstubAllGlobals();
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("Native learner entry", () => {
  it("shows the local ReaDirect icon while startup is loading", () => {
    renderEntry(false);

    expect(
      screen.getByRole("status", { name: "Loading ReaDirect" }),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "ReaDirect" })).toBeVisible();
    expect(
      document.querySelector<HTMLImageElement>(".native-startup-splash__icon")
        ?.src,
    ).toContain("/assets/icons/rd.png");
    expect(
      document.querySelector<HTMLImageElement>(
        ".native-startup-splash__background",
      )?.src,
    ).toContain("/assets/backgrounds/T1mobile.png");
    expect(
      screen.queryByRole("button", { name: "Tap to continue" }),
    ).toBeNull();

    act(() => vi.advanceTimersByTime(4999));
    expect(
      screen.getByRole("status", { name: "Loading ReaDirect" }),
    ).toBeVisible();

    act(() => vi.advanceTimersByTime(1));

    expect(
      screen.getByRole("button", { name: "Tap to continue" }),
    ).toBeVisible();
  });

  it("keeps Offline Practice available when the API is down", () => {
    connectivityMock.mockReturnValue({
      device: "offline",
      api: "unreachable",
      learnerSession: "signed_out",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    renderEntry();

    expect(screen.getByRole("heading", { name: "ReaDirect" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Tap to continue" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("heading", { name: "Practice Offline" }),
    ).toBeNull();
    completeTapToContinue();
    expect(
      screen.getByRole("heading", { name: "Practice Offline" }),
    ).toBeVisible();
    expect(
      screen.getByText("Offline Mode is ready on this device."),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Offline Mode" }));
    expect(screen.getByText("Offline home")).toBeVisible();
  });

  it("provides the public privacy policy from the native intro", () => {
    connectivityMock.mockReturnValue({
      device: "online",
      api: "reachable",
      learnerSession: "signed_out",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    renderEntry();

    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "https://readirect.org/docs/privacy");
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("target", "_blank");
  });

  it("does not send a session into online learning when the API is unavailable", async () => {
    loadSessionMock.mockReturnValue({ token: "cached-token" });
    connectivityMock.mockReturnValue({
      device: "online",
      api: "unreachable",
      learnerSession: "present",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    renderEntry();
    completeTapToContinue();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Online Learning" }));
      await Promise.resolve();
    });

    expect(screen.queryByText("Online sign in")).toBeNull();
    expect(screen.getByText("No Internet Connection")).toBeVisible();
    expect(
      document.querySelectorAll(".offline-entry__notice--warning"),
    ).toHaveLength(1);
  });

  it("opens the existing online landing page when the API is reachable", () => {
    loadSessionMock.mockReturnValue({ token: "expired-token" });
    connectivityMock.mockReturnValue({
      device: "online",
      api: "unauthorized",
      learnerSession: "expired",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    renderEntry();
    completeTapToContinue();
    fireEvent.click(screen.getByRole("button", { name: "Online Learning" }));

    expect(screen.getByText("Online landing")).toBeVisible();
  });

  it("does not require connectivity before revealing the mode choices", () => {
    connectivityMock.mockReturnValue({
      device: "unknown",
      api: "checking",
      learnerSession: "signed_out",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    renderEntry();

    completeTapToContinue();

    expect(
      screen.getByRole("button", { name: "Online Learning" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Offline Mode" })).toBeEnabled();
  });
});
