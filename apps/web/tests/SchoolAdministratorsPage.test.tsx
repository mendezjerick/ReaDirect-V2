import { QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createAppQueryClient } from "../src/app/queryClient";
import { BUTTON_PRESS_COMMIT_MS } from "../src/components/ui/useButtonCommit";
import { SchoolAdministratorsPage } from "../src/features/staff-dashboard/SchoolAdministratorsPage";

function renderPage() {
  const queryClient = createAppQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter
        initialEntries={["/staff/system-admin/school-administrators"]}
      >
        <SchoolAdministratorsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("SchoolAdministratorsPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the full navigation structure with future work disabled", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ school_administrators: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    renderPage();

    expect(
      screen.getByRole("heading", { name: "School administrators" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "School administrators" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByText("Schools").closest("[aria-disabled]"),
    ).toHaveAttribute("aria-disabled", "true");
    expect(
      await screen.findByText("No School Administrators yet."),
    ).toBeVisible();
  });

  it("creates an account after the tactile button commit interval", async () => {
    vi.useFakeTimers();
    let created = false;
    const fetchMock = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          created = true;

          return Promise.resolve(
            new Response(
              JSON.stringify({
                school_administrator: {
                  id: 12,
                  username: "northfield-admin",
                  display_name: "School Administrator",
                  is_active: true,
                  school: null,
                  requires_school_setup: true,
                  requires_credential_setup: true,
                  created_at: "2026-07-20T10:00:00+00:00",
                },
              }),
              {
                status: 201,
                headers: { "Content-Type": "application/json" },
              },
            ),
          );
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              school_administrators: created
                ? [
                    {
                      id: 12,
                      username: "northfield-admin",
                      display_name: "School Administrator",
                      is_active: true,
                      school: null,
                      requires_school_setup: true,
                      requires_credential_setup: true,
                      created_at: "2026-07-20T10:00:00+00:00",
                    },
                  ]
                : [],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      });
    vi.stubGlobal("fetch", fetchMock);

    renderPage();

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "northfield-admin" },
    });
    fireEvent.change(screen.getByLabelText("Temporary password"), {
      target: { value: "temporary-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(BUTTON_PRESS_COMMIT_MS);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/staff/system-admin/school-administrators",
      expect.objectContaining({ method: "POST" }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(screen.getByText("Account created.")).toBeVisible();
    expect(screen.getAllByText("northfield-admin").length).toBeGreaterThan(0);
  });
});
