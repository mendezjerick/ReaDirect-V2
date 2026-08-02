import { describe, expect, it } from "vitest";

import { createConnectionOptions } from "../src/features/realtime/staffRealtimeConnection";

const config = {
  enabled: true,
  app_key: "readirect-public-key",
  auth_endpoint: "/api/staff/broadcasting/auth",
  channel: "staff.users.17",
};

describe("staff realtime connection", () => {
  it("uses the local same-origin WebSocket proxy", () => {
    const options = createConnectionOptions(
      config,
      {
        Authorization: "Bearer staff-token",
        "X-ReaDirect-Device": "remembered-browser-id",
      },
      {
        hostname: "localhost",
        port: "5173",
        protocol: "http:",
      },
    );

    expect(options).toMatchObject({
      broadcaster: "reverb",
      key: "readirect-public-key",
      wsHost: "localhost",
      wsPort: 5173,
      wssPort: 5173,
      forceTLS: false,
      authEndpoint: "/api/staff/broadcasting/auth",
      auth: {
        headers: {
          Authorization: "Bearer staff-token",
          "X-ReaDirect-Device": "remembered-browser-id",
        },
      },
    });
  });

  it("uses secure WebSockets on the public HTTPS origin", () => {
    const options = createConnectionOptions(
      config,
      {
        Authorization: "Bearer staff-token",
      },
      {
        hostname: "staging.readirect.org",
        port: "",
        protocol: "https:",
      },
    );

    expect(options.wsHost).toBe("staging.readirect.org");
    expect(options.wssPort).toBe(443);
    expect(options.forceTLS).toBe(true);
  });
});
