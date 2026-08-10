import { beforeEach, describe, expect, it, vi } from "vitest";

const loadSessionMock = vi.hoisted(() => vi.fn());

vi.mock("../src/features/learner-auth/learnerApi", () => ({
  loadLearnerSession: loadSessionMock,
}));

import {
  activeOfflinePracticeProfileId,
  resolveOfflinePracticeProfileId,
} from "../src/features/offline-practice/offlinePracticeIdentity";

describe("offline practice identity", () => {
  beforeEach(() => {
    window.localStorage.clear();
    loadSessionMock.mockReturnValue(null);
  });

  it("derives separate opaque profile namespaces without storing the learner ID", async () => {
    loadSessionMock.mockReturnValue({ learner: { id: 7 } });
    const first = await resolveOfflinePracticeProfileId();

    loadSessionMock.mockReturnValue({ learner: { id: 8 } });
    const second = await resolveOfflinePracticeProfileId();

    expect(first).not.toBe(second);
    expect(first).toMatch(/^p-[a-f0-9]{64}$/);
    expect(second).toMatch(/^p-[a-f0-9]{64}$/);
    expect(
      window.localStorage.getItem("readirect.offline-practice.active-profile"),
    ).toBe(second);
    expect(
      window.localStorage.getItem("readirect.offline-practice.install-salt"),
    ).not.toBe("7");
  });

  it("can resume a generic device namespace without a live session", async () => {
    const first = await resolveOfflinePracticeProfileId();
    loadSessionMock.mockReturnValue(null);

    expect(await resolveOfflinePracticeProfileId()).toBe(first);
    expect(activeOfflinePracticeProfileId()).toBe(first);
  });
});
