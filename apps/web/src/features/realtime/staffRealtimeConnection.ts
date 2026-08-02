import Pusher from "pusher-js";

interface StaffRealtimeConnectionConfig {
  app_key: string | null;
  auth_endpoint: string;
}

export function createConnectionOptions(
  config: StaffRealtimeConnectionConfig,
  authHeaders: Record<string, string>,
  location: Pick<Location, "hostname" | "port" | "protocol">,
) {
  if (!config.app_key) {
    throw new Error("A Reverb application key is required.");
  }

  const secure = location.protocol === "https:";
  const publicPort = location.port
    ? Number.parseInt(location.port, 10)
    : secure
      ? 443
      : 80;

  return {
    broadcaster: "reverb" as const,
    key: config.app_key,
    Pusher,
    wsHost: location.hostname,
    wsPort: publicPort,
    wssPort: publicPort,
    forceTLS: secure,
    enabledTransports: ["ws", "wss"] as ("ws" | "wss")[],
    authEndpoint: config.auth_endpoint,
    auth: {
      headers: authHeaders,
    },
  };
}
