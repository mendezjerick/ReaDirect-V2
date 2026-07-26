import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MISSIONS } from "../content/missions";
import { getNpc } from "../content/npcs";
import { createInitialMissionState } from "../mission/missionState";
import { createMissionRounds, createSeededRandom } from "../questions/questionRound";
import { NavigationHud } from "./NavigationHud";

describe("mission navigation HUD", () => {
  it("shows the active mission, target direction, and synchronized map markers", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(7));
    const initial = createInitialMissionState(rounds);
    const missionState = {
      ...initial,
      missionId: MISSIONS[1].id,
      missionIndex: 1,
      round: rounds[1]
    };
    const target = getNpc("market-vendor");
    const player = { position: { x: target.interactionPosition.x + 400, y: target.interactionPosition.y }, facing: "left" as const };
    const onOpenMap = vi.fn();

    const { container } = render(
      <NavigationHud
        missionState={missionState}
        player={player}
        mapOpen={false}
        showPath
        onOpenMap={onOpenMap}
        onCloseMap={vi.fn()}
        onTogglePath={vi.fn()}
      />
    );

    expect(screen.getByText("Mission 2 of 6")).toBeVisible();
    expect(screen.getByText(MISSIONS[1].objective)).toBeVisible();
    expect(screen.getByRole("img", { name: /Direction to Market Vendor/i })).toHaveStyle({ transform: "rotate(180deg)" });
    expect(container.querySelector(".circular-minimap")).toHaveAttribute("viewBox", "0 0 240 240");
    expect(container.querySelector("clipPath circle")).toHaveAttribute("r", "108");
    expect(container.querySelector(".minimap-panning-world")).toHaveAttribute("transform", expect.stringContaining("scale(0.32)"));
    expect(container.querySelector(".minimap-player")).toHaveAttribute("transform", expect.stringContaining("translate(120 120)"));
    expect(container.querySelector(".minimap-target")).toHaveClass("is-edge");
    expect(screen.queryByLabelText("Follow the dots")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Open map/i }));
    expect(onOpenMap).toHaveBeenCalledOnce();
  });

  it("shows the dotted-trail hint only during the nearby final approach", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(11));
    const missionState = createInitialMissionState(rounds);
    const target = getNpc("miss-estelle");
    const props = {
      missionState,
      mapOpen: false,
      showPath: true,
      onOpenMap: vi.fn(),
      onCloseMap: vi.fn(),
      onTogglePath: vi.fn()
    };
    const { rerender } = render(
      <NavigationHud
        {...props}
        player={{ position: { x: target.interactionPosition.x + 128, y: target.interactionPosition.y }, facing: "left" }}
      />
    );

    expect(screen.getByLabelText("Follow the dots")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: /Progress toward Miss Estelle/i })).toHaveAttribute("aria-valuenow", "73");

    rerender(
      <NavigationHud
        {...props}
        player={{ position: { ...target.interactionPosition }, facing: "up" }}
      />
    );
    expect(screen.queryByLabelText("Follow the dots")).not.toBeInTheDocument();
  });

  it("shows the nearby state and removes target guidance outside the approach stage", () => {
    const rounds = createMissionRounds(MISSIONS, createSeededRandom(9));
    const missionState = createInitialMissionState(rounds);
    const target = getNpc("miss-estelle");
    const props = {
      missionState,
      player: { position: { ...target.interactionPosition }, facing: "up" as const },
      mapOpen: false,
      showPath: true,
      onOpenMap: vi.fn(),
      onCloseMap: vi.fn(),
      onTogglePath: vi.fn()
    };
    const { container, rerender } = render(<NavigationHud {...props} />);
    expect(screen.getByText("You're near!")).toBeVisible();

    rerender(<NavigationHud {...props} missionState={{ ...missionState, stage: "storyIntroduction" }} />);
    expect(screen.queryByText("You're here!")).not.toBeInTheDocument();
    expect(container.querySelector(".minimap-target")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".navigation-trail-guide")).toHaveLength(0);
  });
});
