import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StaffBadge } from "../src/components/staff/StaffBadge";
import { StaffButton } from "../src/components/staff/StaffButton";
import { StaffCard } from "../src/components/staff/StaffCard";
import { StaffDataTable } from "../src/components/staff/StaffDataTable";
import { StaffWorkspacePage } from "../src/components/staff/StaffContentPatterns";
import { StaffNotice } from "../src/components/staff/StaffNotice";
import { StaffSectionHeader } from "../src/components/staff/StaffSectionHeader";
import { StaffState } from "../src/components/staff/StaffState";

describe("shared staff design components", () => {
  it("requires every StaffShell page to use the shared workspace rhythm", () => {
    const dashboardDirectory = resolve(
      process.cwd(),
      "src/features/staff-dashboard",
    );

    for (const file of readdirSync(dashboardDirectory)) {
      if (!file.endsWith(".tsx")) {
        continue;
      }

      const source = readFileSync(resolve(dashboardDirectory, file), "utf8");

      expect(source, file).not.toContain('className="staff-workspace-page');

      if (source.includes("<StaffShell")) {
        expect(source, file).toContain("<StaffWorkspacePage");
      }
    }
  });

  it("provides the System Admin workspace rhythm to every staff dashboard", () => {
    const { container } = render(
      <StaffWorkspacePage className="role-dashboard">
        <StaffCard>First section</StaffCard>
        <StaffCard>Second section</StaffCard>
      </StaffWorkspacePage>,
    );

    expect(container.firstElementChild).toHaveClass(
      "staff-workspace-page",
      "staff-workspace-stack",
      "role-dashboard",
    );
  });

  it("applies the same professional card, heading, badge, and action language", () => {
    render(
      <StaffCard tone="accent">
        <StaffSectionHeader
          eyebrow="School overview"
          title="Reading activity"
          meta={<StaffBadge tone="success">Ready</StaffBadge>}
        />
        <StaffButton tone="primary">Open workspace</StaffButton>
      </StaffCard>,
    );

    expect(
      screen.getByRole("heading", { name: "Reading activity" }),
    ).toBeVisible();
    expect(screen.getByText("Ready")).toHaveClass(
      "staff-badge",
      "staff-badge--success",
    );
    expect(screen.getByRole("button", { name: "Open workspace" })).toHaveClass(
      "staff-button",
      "staff-button--regular",
    );
  });

  it("keeps shared data tables semantic and supplies responsive row labels", () => {
    render(
      <StaffDataTable
        accessibleLabel="Learner evidence"
        rows={[{ id: 7, learner: "Dorothy Wright", status: "Complete" }]}
        rowKey={(row) => row.id}
        columns={[
          {
            key: "learner",
            label: "Learner",
            render: (row) => row.learner,
          },
          {
            key: "status",
            label: "Status",
            render: (row) => <StaffBadge>{row.status}</StaffBadge>,
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("table", { name: "Learner evidence" }),
    ).toBeVisible();
    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.getAllByRole("cell")).toHaveLength(2);
    expect(
      screen
        .getAllByText("Learner")
        .some((label) =>
          label.classList.contains("staff-data-table__mobile-label"),
        ),
    ).toBe(true);
  });

  it("uses shared notice and state actions for feedback and recovery", async () => {
    const retry = vi.fn();
    const user = userEvent.setup();

    render(
      <>
        <StaffNotice tone="warning" title="Review required">
          Confirm the persisted evidence before continuing.
        </StaffNotice>
        <StaffState
          tone="danger"
          title="Dashboard unavailable"
          actionLabel="Retry"
          onAction={retry}
        />
      </>,
    );

    expect(screen.getByText("Review required")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
