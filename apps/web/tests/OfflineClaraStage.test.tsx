import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { OfflineClaraStage } from "../src/apk/clara/OfflineClaraStage";
import { resolveOfflineClaraMode } from "../src/apk/clara/offlineClaraRuntime";

import type { ClaraSelection } from "../src/apk/clara/claraCapability";

const dynamicSelection: ClaraSelection = {
  mode: "dynamic",
  displayName: "Dynamic",
  reason: "supported",
  dynamicLocked: false,
  requiresAcknowledgement: true,
  acknowledgementLabel: "I understand",
};

const staticSelection: ClaraSelection = {
  ...dynamicSelection,
  mode: "static",
  displayName: "Static",
  reason: "texture_limit",
  dynamicLocked: true,
};

describe("offline Clara stage", () => {
  it("never loads Dynamic Clara when the current device selection locks it", () => {
    const loadDynamic = vi.fn();
    const { container } = render(
      <OfflineClaraStage
        savedMode="dynamic"
        selection={staticSelection}
        loadDynamic={loadDynamic}
      />,
    );

    expect(resolveOfflineClaraMode("dynamic", staticSelection)).toBe("static");
    expect(loadDynamic).not.toHaveBeenCalled();
    expect(
      container.querySelector('[data-clara-display-mode="static"]'),
    ).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      "/assets/live2d/clara/stills/clara-default.png",
    );
  });

  it("loads the animated canvas only when both saved and current modes allow it", async () => {
    const loadDynamic = vi.fn(async () => ({
      default: ({
        onStateChange,
      }: {
        onStateChange: (state: "ready") => void;
      }) => {
        queueMicrotask(() => onStateChange("ready"));
        return <canvas data-testid="dynamic-clara" />;
      },
    }));

    render(
      <OfflineClaraStage
        savedMode="dynamic"
        selection={dynamicSelection}
        loadDynamic={loadDynamic}
      />,
    );

    expect(await screen.findByTestId("dynamic-clara")).toBeInTheDocument();
    expect(loadDynamic).toHaveBeenCalledOnce();
  });

  it("falls back to Static Clara if the local animated runtime fails", async () => {
    const loadDynamic = vi.fn(async () => {
      throw new Error("runtime failed");
    });
    const { container } = render(
      <OfflineClaraStage
        savedMode="dynamic"
        selection={dynamicSelection}
        loadDynamic={loadDynamic}
      />,
    );

    await waitFor(() =>
      expect(
        container.querySelector('[data-clara-display-mode="static"]'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Dynamic Clara could not start",
    );
  });
});
