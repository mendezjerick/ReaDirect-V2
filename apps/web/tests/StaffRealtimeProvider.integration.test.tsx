import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const realtimeMocks = vi.hoisted(() => ({
  channels: new Map<string, Map<string, (payload: unknown) => void>>(),
  disconnect: vi.fn(),
  privateChannel: vi.fn(),
  staffFetch: vi.fn(),
  session: {
    token: "staff-session-token-with-at-least-32-characters",
    staff: {
      id: 27,
      username: "teacher-27",
      email: null,
      display_name: "Teacher",
      role: "teacher" as const,
      school: { id: 90, name: "Realtime School" },
      requires_school_setup: false,
      requires_credential_setup: false,
    },
    session: { expires_at: "2026-08-02T00:00:00+00:00" },
  },
}));

vi.mock("laravel-echo", () => ({
  default: class Echo {
    private(channelName: string) {
      return realtimeMocks.privateChannel(channelName);
    }

    disconnect() {
      realtimeMocks.disconnect();
    }
  },
}));

vi.mock("pusher-js", () => ({ default: class Pusher {} }));

vi.mock("../src/features/staff-auth/staffApi", () => ({
  getStaffAuthHeaders: () => ({
    Authorization: `Bearer ${realtimeMocks.session.token}`,
  }),
  loadStaffSession: () => realtimeMocks.session,
  staffFetch: realtimeMocks.staffFetch,
  staffSessionChangedEvent: "readirect:staff-session-changed",
}));

import { StaffRealtimeProvider } from "../src/features/realtime/StaffRealtimeProvider";

describe("StaffRealtimeProvider domain subscriptions", () => {
  beforeEach(() => {
    realtimeMocks.channels.clear();
    realtimeMocks.disconnect.mockClear();
    realtimeMocks.privateChannel.mockReset();
    realtimeMocks.staffFetch.mockReset();

    realtimeMocks.privateChannel.mockImplementation((channelName: string) => {
      const listeners = new Map<string, (payload: unknown) => void>();
      realtimeMocks.channels.set(channelName, listeners);

      const channel = {
        listen: vi.fn(
          (eventName: string, listener: (payload: unknown) => void) => {
            listeners.set(eventName, listener);
            return channel;
          },
        ),
        subscribed: vi.fn((listener: () => void) => {
          if (channelName.startsWith("staff.users.")) {
            queueMicrotask(listener);
          }
          return channel;
        }),
        error: vi.fn(() => channel),
      };

      return channel;
    });

    realtimeMocks.staffFetch.mockImplementation(async (path: string) => {
      if (path === "/api/staff/realtime/config") {
        return new Response(
          JSON.stringify({
            enabled: true,
            app_key: "readirect-public-key",
            auth_endpoint: "/api/staff/broadcasting/auth",
            channel: "staff.users.27",
            data_channels: ["teachers.27"],
          }),
          { status: 200 },
        );
      }

      return new Response(JSON.stringify({ queued: true }), { status: 202 });
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("subscribes to the server-provided role channel and invalidates mapped queries once", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidate = vi
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue();

    const rendered = render(
      <QueryClientProvider client={queryClient}>
        <StaffRealtimeProvider>
          <div>Realtime child</div>
        </StaffRealtimeProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(realtimeMocks.privateChannel).toHaveBeenCalledWith(
        "staff.users.27",
      );
      expect(realtimeMocks.privateChannel).toHaveBeenCalledWith("teachers.27");
    });

    const listener = realtimeMocks.channels
      .get("teachers.27")
      ?.get(".staff.data.changed");
    expect(listener).toBeDefined();

    const event = {
      version: 1,
      event_id: "6badf773-1511-4942-9348-5895e7358950",
      topics: ["overview", "learners"],
      occurred_at: "2026-08-01T12:00:00+00:00",
    };
    act(() => listener?.(event));
    act(() => listener?.(event));

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledTimes(2);
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["teacher-overview", 27],
      });
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: ["teacher-learners", 27],
      });
    });

    rendered.unmount();
    expect(realtimeMocks.disconnect).toHaveBeenCalledOnce();
  });
});
