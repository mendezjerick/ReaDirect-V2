import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const isNativePlatform = vi.hoisted(() => vi.fn(() => false));
const openNativeBrowser = vi.hoisted(() => vi.fn());

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();

  return {
    ...actual,
    Capacitor: { ...actual.Capacitor, isNativePlatform },
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

import { createAppQueryClient } from "../src/app/queryClient";
import { NativeStaffLoginRedirect } from "../src/features/staff-auth/NativeStaffLoginRedirect";

function renderStaffLoginRoute() {
  return render(
    <QueryClientProvider client={createAppQueryClient()}>
      <MemoryRouter initialEntries={["/staff/login"]}>
        <Routes>
          <Route
            path="/staff/login"
            element={<NativeStaffLoginRedirect />}
          />
          <Route path="/home" element={<div>Home route</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NativeStaffLoginRedirect", () => {
  beforeEach(() => {
    isNativePlatform.mockReturnValue(false);
    openNativeBrowser.mockReset();
    openNativeBrowser.mockResolvedValue(undefined);
  });

  it("opens the production staff portal and returns a native direct visit to home", async () => {
    isNativePlatform.mockReturnValue(true);

    renderStaffLoginRoute();

    await waitFor(() =>
      expect(openNativeBrowser).toHaveBeenCalledWith({
        url: "https://app.readirect.org/staff/login",
      }),
    );
    expect(await screen.findByText("Home route")).toBeInTheDocument();
  });

  it("renders the existing staff sign-in page for browser direct navigation", () => {
    renderStaffLoginRoute();

    expect(
      screen.getByRole("heading", { name: "Welcome back" }),
    ).toBeInTheDocument();
    expect(openNativeBrowser).not.toHaveBeenCalled();
  });

  it("offers retry after the native browser cannot open and returns home on the next attempt", async () => {
    isNativePlatform.mockReturnValue(true);
    openNativeBrowser
      .mockRejectedValueOnce(new Error("browser unavailable"))
      .mockResolvedValueOnce(undefined);

    renderStaffLoginRoute();

    expect(
      await screen.findByText(
        "We couldn't open the staff portal. Check your connection and try again.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("Home route")).toBeInTheDocument();
    expect(openNativeBrowser).toHaveBeenCalledTimes(2);
  });
});
