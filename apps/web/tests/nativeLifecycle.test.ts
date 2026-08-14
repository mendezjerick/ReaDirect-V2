import type { BackButtonListenerEvent } from "@capacitor/app";
import { describe, expect, it } from "vitest";

import {
  nativeBackDestination,
  notifyNativeBackButton,
  notifyNativePause,
  notifyNativeResume,
  registerNativeLifecycleHandler,
} from "../src/app/nativeLifecycle";

const backEvent = { canGoBack: false } as BackButtonListenerEvent;

describe("native lifecycle handler registry", () => {
  it("returns from Offline Practice to the mode chooser instead of startup", () => {
    expect(nativeBackDestination("/learner/offline")).toBe("/learner/modes");
    expect(
      nativeBackDestination("/learner/offline", "?from=dashboard"),
    ).toBe("/learner/dashboard");
    expect(nativeBackDestination("/learner/modes")).toBeNull();
  });

  it("notifies pause and resume handlers", async () => {
    const events: string[] = [];
    const unregister = registerNativeLifecycleHandler({
      onPause: () => {
        events.push("pause");
      },
      onResume: () => {
        events.push("resume");
      },
    });

    await notifyNativePause();
    await notifyNativeResume();
    unregister();

    expect(events).toEqual(["pause", "resume"]);
  });

  it("gives the newest back handler first chance to consume the event", async () => {
    const events: string[] = [];
    const unregisterOlder = registerNativeLifecycleHandler({
      onBackButton: () => {
        events.push("older");
        return true;
      },
    });
    const unregisterNewer = registerNativeLifecycleHandler({
      onBackButton: () => {
        events.push("newer");
        return true;
      },
    });

    const consumed = await notifyNativeBackButton(backEvent);
    unregisterNewer();
    unregisterOlder();

    expect(consumed).toBe(true);
    expect(events).toEqual(["newer"]);
  });
});
