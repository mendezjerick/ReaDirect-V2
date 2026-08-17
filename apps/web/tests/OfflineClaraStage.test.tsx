import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect, useState } from "react";
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

  it("keeps Static Clara ready across low-end parent rerenders", async () => {
    const loadDynamic = vi.fn();

    function LowEndHarness() {
      const [loadState, setLoadState] = useState("loading");

      return (
        <>
          <output>{loadState}</output>
          <OfflineClaraStage
            savedMode="static"
            selection={staticSelection}
            loadDynamic={loadDynamic}
            onLoadStateChange={(state) => setLoadState(state)}
          />
        </>
      );
    }

    const { container } = render(<LowEndHarness />);
    const image = container.querySelector("img")!;
    fireEvent.load(image);

    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(
      container.querySelector('[data-live2d-state="ready"]'),
    ).toBeInTheDocument();
    expect(loadDynamic).not.toHaveBeenCalled();
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

  it("keeps Dynamic Clara mounted when its parent observes readiness", async () => {
    let initializationCount = 0;
    let cleanupCount = 0;

    const DynamicCanvas = ({
      onStateChange,
    }: {
      onStateChange: (state: "loading" | "ready" | "error") => void;
    }) => {
      useEffect(() => {
        initializationCount += 1;
        onStateChange("loading");
        queueMicrotask(() => onStateChange("ready"));

        return () => {
          cleanupCount += 1;
        };
      }, [onStateChange]);

      return <canvas data-testid="stable-dynamic-clara" />;
    };
    const loadDynamic = vi.fn(async () => ({ default: DynamicCanvas }));

    function ReadinessHarness() {
      const [loadState, setLoadState] = useState("loading");

      return (
        <>
          <output>{loadState}</output>
          <OfflineClaraStage
            savedMode="dynamic"
            selection={dynamicSelection}
            loadDynamic={loadDynamic}
            onLoadStateChange={(state) => setLoadState(state)}
          />
        </>
      );
    }

    render(<ReadinessHarness />);

    expect(
      await screen.findByTestId("stable-dynamic-clara"),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("ready")).toBeInTheDocument());
    expect(initializationCount).toBe(1);
    expect(cleanupCount).toBe(0);
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
