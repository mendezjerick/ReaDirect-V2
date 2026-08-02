import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lifecycleMocks = vi.hoisted(() => ({
  session: null as null | {
    token: string;
    staff: {
      id: number;
      username: string;
      email: null;
      display_name: string;
      role: "teacher";
      school: null;
      requires_school_setup: false;
      requires_credential_setup: false;
    };
    session: {
      expires_at: string;
      remembered: boolean;
      heartbeat_interval_seconds: number | null;
    };
  },
  staffFetch: vi.fn(),
}));

vi.mock("../src/features/staff-auth/staffApi", () => ({
  loadStaffSession: () => lifecycleMocks.session,
  staffFetch: lifecycleMocks.staffFetch,
  staffSessionChangedEvent: "readirect:staff-session-changed",
}));

import { StaffSessionLifecycleProvider } from "../src/features/staff-auth/StaffSessionLifecycleProvider";

const nonRememberedSession = {
  token: "staff-session-token-with-at-least-32-characters",
  staff: {
    id: 27,
    username: "teacher-27",
    email: null,
    display_name: "Teacher",
    role: "teacher" as const,
    school: null,
    requires_school_setup: false as const,
    requires_credential_setup: false as const,
  },
  session: {
    expires_at: "2026-08-02T00:00:00+00:00",
    remembered: false,
    heartbeat_interval_seconds: 10,
  },
};

describe("StaffSessionLifecycleProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    lifecycleMocks.session = nonRememberedSession;
    lifecycleMocks.staffFetch.mockReset();
    lifecycleMocks.staffFetch.mockResolvedValue(
      new Response(JSON.stringify({ active: true }), { status: 200 }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renews a non-remembered staff session immediately and on its interval", async () => {
    render(
      <StaffSessionLifecycleProvider>
        <div>Staff workspace</div>
      </StaffSessionLifecycleProvider>,
    );

    await act(async () => Promise.resolve());
    expect(lifecycleMocks.staffFetch).toHaveBeenCalledOnce();
    expect(lifecycleMocks.staffFetch).toHaveBeenLastCalledWith(
      "/api/staff/session/heartbeat",
      expect.objectContaining({ method: "POST" }),
    );

    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(lifecycleMocks.staffFetch).toHaveBeenCalledTimes(2);
  });

  it("does not heartbeat a remembered staff session", async () => {
    lifecycleMocks.session = {
      ...nonRememberedSession,
      session: {
        ...nonRememberedSession.session,
        remembered: true,
        heartbeat_interval_seconds: null,
      },
    };

    render(
      <StaffSessionLifecycleProvider>
        <div>Remembered workspace</div>
      </StaffSessionLifecycleProvider>,
    );
    await act(async () => vi.advanceTimersByTimeAsync(60_000));

    expect(lifecycleMocks.staffFetch).not.toHaveBeenCalled();
  });

  it("stops renewing the lease when the staff browser lifecycle ends", async () => {
    const rendered = render(
      <StaffSessionLifecycleProvider>
        <div>Closing workspace</div>
      </StaffSessionLifecycleProvider>,
    );
    await act(async () => Promise.resolve());
    expect(lifecycleMocks.staffFetch).toHaveBeenCalledOnce();

    rendered.unmount();
    await act(async () => vi.advanceTimersByTimeAsync(30_000));

    expect(lifecycleMocks.staffFetch).toHaveBeenCalledOnce();
  });

  it("starts heartbeats when a staff login announces a new session", async () => {
    lifecycleMocks.session = null;
    render(
      <StaffSessionLifecycleProvider>
        <div>Login workspace</div>
      </StaffSessionLifecycleProvider>,
    );

    lifecycleMocks.session = nonRememberedSession;
    act(() => window.dispatchEvent(new Event("readirect:staff-session-changed")));
    await act(async () => Promise.resolve());

    expect(lifecycleMocks.staffFetch).toHaveBeenCalledOnce();
  });
});
