import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const connectivityMock = vi.hoisted(() => vi.fn());

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock("../src/features/connectivity/connectivityContext", () => ({
  useConnectivity: connectivityMock,
}));

import { NativeConnectivityBanner } from "../src/features/connectivity/NativeConnectivityBanner";

afterEach(() => {
  connectivityMock.mockReset();
});

describe("NativeConnectivityBanner", () => {
  it("shows the persistent offline message for a disconnected device", () => {
    connectivityMock.mockReturnValue({
      device: "offline",
      api: "unreachable",
      learnerSession: "signed_out",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/learner/dashboard"]}>
        <NativeConnectivityBanner />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "No Internet Connection",
    );
    expect(
      document.querySelectorAll(".native-connectivity-banner__icon"),
    ).toHaveLength(2);
  });

  it("stays hidden while choosing between online and offline modes", () => {
    connectivityMock.mockReturnValue({
      device: "offline",
      api: "unreachable",
      learnerSession: "signed_out",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/learner/modes"]}>
        <NativeConnectivityBanner />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("stays hidden inside Offline Practice", () => {
    connectivityMock.mockReturnValue({
      device: "offline",
      api: "unreachable",
      learnerSession: "signed_out",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/learner/offline"]}>
        <NativeConnectivityBanner />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("distinguishes an unavailable API from missing internet", () => {
    connectivityMock.mockReturnValue({
      device: "online",
      api: "unreachable",
      learnerSession: "signed_out",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/learner/dashboard"]}>
        <NativeConnectivityBanner />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Online Learning is unavailable right now.",
    );
    expect(screen.queryByText("No Internet Connection")).toBeNull();
  });

  it("does not call a present Guest Mode session expired", () => {
    connectivityMock.mockReturnValue({
      device: "online",
      api: "unauthorized",
      learnerSession: "present",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/learner/dashboard"]}>
        <NativeConnectivityBanner />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Online Learning is unavailable right now.",
    );
    expect(screen.queryByText(/session has expired/i)).toBeNull();
  });

  it("shows session expiry only for an expired authenticated session", () => {
    connectivityMock.mockReturnValue({
      device: "online",
      api: "unauthorized",
      learnerSession: "expired",
      lastCheckedAt: null,
      refresh: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={["/learner/dashboard"]}>
        <NativeConnectivityBanner />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Your online session has expired. Sign in again to continue.",
    );
  });
});
