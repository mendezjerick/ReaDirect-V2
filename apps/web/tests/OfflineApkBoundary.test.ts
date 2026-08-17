import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveAppTarget } from "../src/app/appTarget";

type OfflineApkBoundary = {
  target: string;
  entry: string;
  network_policy: string;
  forbidden_module_fragments: string[];
  forbidden_bundle_tokens: string[];
  forbidden_route_families: string[];
  required_properties: Record<string, boolean>;
};

function readBoundary(): OfflineApkBoundary {
  return JSON.parse(
    readFileSync(path.resolve("offline-apk-boundary.json"), "utf8"),
  ) as OfflineApkBoundary;
}

describe("offline APK product boundary", () => {
  it("resolves only declared build targets", () => {
    expect(resolveAppTarget(undefined)).toBe("web");
    expect(resolveAppTarget("web")).toBe("web");
    expect(resolveAppTarget("offline-apk")).toBe("offline-apk");
    expect(resolveAppTarget(undefined, "offline-apk-simulator")).toBe(
      "offline-apk",
    );
    expect(() => resolveAppTarget("mobile-ish")).toThrow(
      "Unsupported ReaDirect application target",
    );
  });

  it("excludes authenticated, staff, game, and Learn with Clara routes", () => {
    const boundary = readBoundary();

    expect(boundary.target).toBe("offline-apk");
    expect(boundary.entry).toBe("src/apk/main.tsx");
    expect(boundary.network_policy).toBe("native_local_only");
    expect(boundary.forbidden_module_fragments).toContain("/src/main.tsx");
    expect(boundary.forbidden_bundle_tokens).toEqual(
      expect.arrayContaining(["APK Simulator", "readirect.offline.simulator"]),
    );
    expect(boundary.forbidden_route_families).toEqual(
      expect.arrayContaining([
        "/learner/login",
        "/learner/games",
        "/learner/learn-with-clara",
        "/staff",
      ]),
    );
    expect(boundary.required_properties).toMatchObject({
      authentication: false,
      staff_experience: false,
      games: false,
      learn_with_clara: false,
      production_network: false,
      local_learner_profile: true,
      offline_asr: true,
      pregenerated_tts: true,
    });
  });
});
