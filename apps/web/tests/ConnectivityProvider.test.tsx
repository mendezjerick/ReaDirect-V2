import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const loadSessionMock = vi.hoisted(() =>
  vi.fn<() => { token: string } | null>(() => null),
);
const getStatusMock = vi.hoisted(() => vi.fn());
const addListenerMock = vi.hoisted(() => vi.fn());

vi.mock("../src/features/learner-auth/learnerApi", () => ({
  loadLearnerSession: loadSessionMock,
}));
vi.mock("@capacitor/network", () => ({
  Network: {
    getStatus: getStatusMock,
    addListener: addListenerMock,
  },
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));

import { ConnectivityProvider } from "../src/features/connectivity/ConnectivityProvider";
import { useConnectivity } from "../src/features/connectivity/connectivityContext";
import {
  guestToken,
  startGuestSession,
} from "../src/features/guest/guestSession";

function StateProbe() {
  const state = useConnectivity();
  return (
    <output role="status" aria-live="polite">
      {state.device}|{state.api}|{state.learnerSession}
    </output>
  );
}

describe("ConnectivityProvider", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    loadSessionMock.mockReset().mockReturnValue(null);
    getStatusMock.mockReset();
    addListenerMock.mockReset();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("keeps device offline separate from the API state and does not hang", async () => {
    getStatusMock.mockResolvedValue({
      connected: false,
      connectionType: "none",
    });
    addListenerMock.mockResolvedValue({ remove: vi.fn() });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(
      <ConnectivityProvider>
        <StateProbe />
      </ConnectivityProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("offline"),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("unreachable"),
    );
  });

  it("reports an expired session as unauthorized while the API remains reachable", async () => {
    loadSessionMock.mockReturnValue({ token: "expired-token" });
    getStatusMock.mockResolvedValue({
      connected: true,
      connectionType: "wifi",
    });
    addListenerMock.mockResolvedValue({ remove: vi.fn() });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );

    render(
      <ConnectivityProvider>
        <StateProbe />
      </ConnectivityProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /online.*unauthorized.*expired/,
      ),
    );
  });

  it("checks the public API for Guest Mode without reporting an expired session", async () => {
    startGuestSession();
    loadSessionMock.mockReturnValue({ token: guestToken });
    getStatusMock.mockResolvedValue({
      connected: true,
      connectionType: "wifi",
    });
    addListenerMock.mockResolvedValue({ remove: vi.fn() });
    const fetchMock = vi.fn().mockImplementation((_input, init) => {
      const headers = init?.headers as Record<string, string> | undefined;
      return Promise.resolve(
        new Response("{}", {
          status: headers?.Authorization ? 401 : 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ConnectivityProvider>
        <StateProbe />
      </ConnectivityProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /online.*reachable.*present/,
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.readirect.org/api/experience/intro/settings",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("never treats Guest Mode as an expired authenticated session", async () => {
    startGuestSession();
    loadSessionMock.mockReturnValue({ token: guestToken });
    getStatusMock.mockResolvedValue({
      connected: true,
      connectionType: "wifi",
    });
    addListenerMock.mockResolvedValue({ remove: vi.fn() });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 401 })),
    );

    render(
      <ConnectivityProvider>
        <StateProbe />
      </ConnectivityProvider>,
    );

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        /online.*unauthorized.*present/,
      ),
    );
  });
});
