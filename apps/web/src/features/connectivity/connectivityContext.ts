import { createContext, useContext } from "react";

import type { ApiReachability } from "./connectivityProbe";

export type DeviceNetworkState = "unknown" | "online" | "offline";
export type LearnerSessionState = "signed_out" | "present" | "expired";

export interface ConnectivityState {
  readonly device: DeviceNetworkState;
  readonly api: ApiReachability;
  readonly learnerSession: LearnerSessionState;
  readonly lastCheckedAt: string | null;
  readonly refresh: () => Promise<void>;
}

export const ConnectivityContext = createContext<ConnectivityState | null>(
  null,
);

export function useConnectivity(): ConnectivityState {
  const value = useContext(ConnectivityContext);
  if (!value) {
    throw new Error("useConnectivity must be used inside ConnectivityProvider");
  }
  return value;
}
