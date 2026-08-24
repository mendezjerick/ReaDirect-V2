import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { StaffShell } from "../src/components/staff/StaffShell";
import {
  enterGuestMode,
  loadLearnerSession,
} from "../src/features/learner-auth/learnerApi";

describe("StaffShell", () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("clears any learner identity before exiting staff view", () => {
    enterGuestMode();
    const onExit = vi.fn();

    render(
      <MemoryRouter initialEntries={["/staff/system-admin"]}>
        <StaffShell
          accountLabel="System Administrator"
          exitCommitting={false}
          onExit={onExit}
          brandIcon={<span aria-hidden="true">RD</span>}
        >
          <p>Staff content</p>
        </StaffShell>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Exit staff view" }));

    expect(loadLearnerSession()).toBeNull();
    expect(onExit).toHaveBeenCalledOnce();
  });
});
