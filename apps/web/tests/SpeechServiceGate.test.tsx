import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearPagePortalOrigin,
  setPagePortalOrigin,
} from "../src/app/navigationContext";
import { SpeechServiceGate } from "../src/features/speech-readiness/SpeechServiceGate";

function readinessResponse(
  asr: "online" | "offline",
  tts: "online" | "offline",
) {
  return Response.json({ asr, tts });
}

function renderGuardedLesson() {
  return render(
    <MemoryRouter initialEntries={["/learner/lessons/1"]}>
      <Routes>
        <Route
          path="/learner/lessons/1"
          element={
            <SpeechServiceGate>
              <h1>Lesson activity</h1>
            </SpeechServiceGate>
          }
        />
        <Route
          path="/learner/lesson-intro"
          element={<h1>Reading Journey</h1>}
        />
        <Route
          path="/staff/system-admin/page-portals"
          element={<h1>Page Portals</h1>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  clearPagePortalOrigin();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("SpeechServiceGate", () => {
  it("opens the activity immediately when ASR and runtime TTS are online", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(readinessResponse("online", "online")),
    );

    renderGuardedLesson();

    expect(
      await screen.findByRole("heading", { name: "Lesson activity" }),
    ).toBeVisible();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("blocks an ASR-offline activity and returns to the reading journey", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(readinessResponse("offline", "online")),
    );

    renderGuardedLesson();

    const dialog = await screen.findByRole("alertdialog", {
      name: "Reading Checker Offline",
    });
    expect(dialog).toHaveTextContent("cannot check or score recordings");
    expect(
      screen.queryByRole("heading", { name: "Lesson activity" }),
    ).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Try Again Later" }));

    expect(
      await screen.findByRole("heading", { name: "Reading Journey" }),
    ).toBeVisible();
  });

  it("mentions both services when ASR and runtime TTS are offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(readinessResponse("offline", "offline")),
    );

    renderGuardedLesson();

    const dialog = await screen.findByRole("alertdialog", {
      name: "Speech Services Offline",
    });
    expect(dialog).toHaveTextContent("cannot check or score recordings");
    expect(dialog).toHaveTextContent("TTS) is also offline");
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Try Again Later" }));
    expect(
      await screen.findByRole("heading", { name: "Reading Journey" }),
    ).toBeVisible();
  });

  it("allows the learner to proceed with prepared lines when only TTS is offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(readinessResponse("online", "offline")),
    );

    renderGuardedLesson();

    const dialog = await screen.findByRole("alertdialog", {
      name: "Dynamic Voice Offline",
    });
    expect(dialog).toHaveTextContent(
      "dynamic feedback in lessons will be disabled",
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);

    fireEvent.click(
      screen.getByRole("button", { name: "Proceed with Prepared Voice Lines" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Lesson activity" }),
    ).toBeVisible();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("fails closed when the readiness response cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    renderGuardedLesson();

    expect(
      await screen.findByRole("alertdialog", {
        name: "Speech Services Offline",
      }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Try Again Later" }));
    expect(
      await screen.findByRole("heading", { name: "Reading Journey" }),
    ).toBeVisible();
  });

  it("returns a blocked Page Portal activity to Page Portals", async () => {
    setPagePortalOrigin();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(readinessResponse("offline", "online")),
    );

    renderGuardedLesson();
    fireEvent.click(
      await screen.findByRole("button", { name: "Try Again Later" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Page Portals" }),
    ).toBeVisible();
    await waitFor(() => expect(window.sessionStorage.length).toBe(0));
  });
});
