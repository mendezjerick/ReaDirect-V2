import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lifecycleMocks = vi.hoisted(() => {
  class InvalidSessionError extends Error {
    constructor() {
      super("The learner session is no longer valid.");
      this.name = "LearnerSessionInvalidError";
    }
  }

  return {
    InvalidSessionError,
    session: { token: "cookie-session" } as { token: string } | null,
    heartbeat: vi.fn(),
    clear: vi.fn(),
  };
});

vi.mock("../src/features/learner-auth/learnerApi", () => ({
  clearLearnerSession: lifecycleMocks.clear,
  heartbeatLearnerSession: lifecycleMocks.heartbeat,
  learnerSessionChangedEvent: "readirect:learner-session-changed",
  LearnerSessionInvalidError: lifecycleMocks.InvalidSessionError,
  loadLearnerSession: () => lifecycleMocks.session,
}));

import { LearnerSessionLifecycleProvider } from "../src/features/learner-auth/LearnerSessionLifecycleProvider";

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe("LearnerSessionLifecycleProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lifecycleMocks.session = { token: "cookie-session" };
    lifecycleMocks.heartbeat.mockReset().mockResolvedValue(undefined);
    lifecycleMocks.clear.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps an active learner lease alive while the page is visible", async () => {
    render(
      <MemoryRouter initialEntries={["/learner/dashboard"]}>
        <LearnerSessionLifecycleProvider>
          <LocationProbe />
        </LearnerSessionLifecycleProvider>
      </MemoryRouter>,
    );

    await act(async () => Promise.resolve());
    expect(lifecycleMocks.heartbeat).toHaveBeenCalledOnce();

    await act(async () => vi.advanceTimersByTimeAsync(30_000));
    expect(lifecycleMocks.heartbeat).toHaveBeenCalledTimes(2);
  });

  it("clears an expired session and preserves the learner route for re-login", async () => {
    lifecycleMocks.heartbeat.mockRejectedValueOnce(
      new lifecycleMocks.InvalidSessionError(),
    );

    render(
      <MemoryRouter initialEntries={["/learner/assessment/part-one"]}>
        <LearnerSessionLifecycleProvider>
          <LocationProbe />
        </LearnerSessionLifecycleProvider>
      </MemoryRouter>,
    );

    await act(async () => Promise.resolve());
    expect(lifecycleMocks.clear).toHaveBeenCalledOnce();
    expect(screen.getByTestId("location")).toHaveTextContent("/learner/login");
  });
});
