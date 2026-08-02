import Echo from "laravel-echo";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { z } from "zod";

import {
  getStaffAuthHeaders,
  loadStaffSession,
  staffFetch,
  staffSessionChangedEvent,
  type StaffSession,
} from "../staff-auth/staffApi";
import { createConnectionOptions } from "./staffRealtimeConnection";
import {
  queryKeysForRealtimeTopics,
  staffRealtimeTopicSchema,
} from "./staffRealtimeInvalidation";

const realtimeConfigSchema = z.object({
  enabled: z.boolean(),
  app_key: z.string().min(1).nullable(),
  auth_endpoint: z.string().startsWith("/api/"),
  channel: z.string().regex(/^staff\.users\.\d+$/),
  data_channels: z.array(
    z.string().regex(/^(staff\.system|schools\.\d+|teachers\.\d+)$/),
  ),
});

const transportProbeSchema = z.object({
  version: z.literal(1),
  nonce: z.string().uuid(),
  occurred_at: z.string(),
});

const dataChangedSchema = z.object({
  version: z.literal(1),
  event_id: z.string().uuid(),
  topics: z.array(staffRealtimeTopicSchema).min(1),
  occurred_at: z.string(),
});

type StaffRealtimeStatus =
  "disconnected" | "connecting" | "connected" | "degraded" | "disabled";

interface StaffRealtimeState {
  status: StaffRealtimeStatus;
  transportVerified: boolean;
}

const disconnectedState: StaffRealtimeState = {
  status: "disconnected",
  transportVerified: false,
};

const StaffRealtimeContext =
  createContext<StaffRealtimeState>(disconnectedState);

export function StaffRealtimeProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(loadStaffSession);
  const [realtime, setRealtime] = useState(disconnectedState);

  useEffect(() => {
    const synchronizeSession = () => {
      const nextSession = loadStaffSession();
      setSession((currentSession) =>
        sameStaffSession(currentSession, nextSession)
          ? currentSession
          : nextSession,
      );
    };

    window.addEventListener(staffSessionChangedEvent, synchronizeSession);
    return () =>
      window.removeEventListener(staffSessionChangedEvent, synchronizeSession);
  }, []);

  useEffect(() => {
    if (!session) {
      setRealtime(disconnectedState);
      return;
    }

    const abortController = new AbortController();
    const seenEventIds = new Set<string>();
    let echo: Echo<"reverb"> | null = null;
    setRealtime({ status: "connecting", transportVerified: false });

    const connect = async () => {
      try {
        const response = await staffFetch("/api/staff/realtime/config", {
          headers: { Accept: "application/json" },
          signal: abortController.signal,
        });
        if (!response.ok) {
          throw new Error(
            `Realtime configuration returned HTTP ${response.status}.`,
          );
        }

        const config = realtimeConfigSchema.parse(await response.json());
        if (!config.enabled || !config.app_key) {
          setRealtime({ status: "disabled", transportVerified: false });
          return;
        }

        echo = new Echo<"reverb">(
          createConnectionOptions(
            config,
            getStaffAuthHeaders(session),
            window.location,
          ),
        );
        const nonce = crypto.randomUUID();
        const channel = echo.private(config.channel);

        for (const dataChannelName of config.data_channels) {
          echo
            .private(dataChannelName)
            .listen(".staff.data.changed", (payload: unknown) => {
              const event = dataChangedSchema.safeParse(payload);
              if (!event.success || seenEventIds.has(event.data.event_id)) {
                return;
              }

              rememberEvent(seenEventIds, event.data.event_id);
              const queryKeys = queryKeysForRealtimeTopics(
                session.staff,
                event.data.topics,
              );
              void Promise.all(
                queryKeys.map((queryKey) =>
                  queryClient.invalidateQueries({ queryKey }),
                ),
              ).catch(() => undefined);
            })
            .error(() => {
              setRealtime({ status: "degraded", transportVerified: false });
            });
        }

        channel
          .listen(".realtime.transport.probe", (payload: unknown) => {
            const probe = transportProbeSchema.safeParse(payload);
            if (probe.success && probe.data.nonce === nonce) {
              setRealtime({ status: "connected", transportVerified: true });
            }
          })
          .subscribed(() => {
            setRealtime({ status: "connected", transportVerified: false });
            void staffFetch("/api/staff/realtime/probe", {
              method: "POST",
              headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ nonce }),
              signal: abortController.signal,
            })
              .then((probeResponse) => {
                if (!probeResponse.ok) {
                  setRealtime({ status: "degraded", transportVerified: false });
                }
              })
              .catch(() => {
                if (!abortController.signal.aborted) {
                  setRealtime({ status: "degraded", transportVerified: false });
                }
              });
          })
          .error(() => {
            setRealtime({ status: "degraded", transportVerified: false });
          });
      } catch {
        if (!abortController.signal.aborted) {
          setRealtime({ status: "degraded", transportVerified: false });
        }
      }
    };

    void connect();

    return () => {
      abortController.abort();
      echo?.disconnect();
    };
  }, [queryClient, session]);

  const value = useMemo(() => realtime, [realtime]);

  return (
    <StaffRealtimeContext.Provider value={value}>
      {children}
    </StaffRealtimeContext.Provider>
  );
}

export function useStaffRealtime(): StaffRealtimeState {
  return useContext(StaffRealtimeContext);
}

function sameStaffSession(
  current: StaffSession | null,
  next: StaffSession | null,
): boolean {
  return (
    current?.token === next?.token &&
    current?.staff.id === next?.staff.id &&
    current?.staff.role === next?.staff.role &&
    current?.staff.school?.id === next?.staff.school?.id
  );
}

function rememberEvent(eventIds: Set<string>, eventId: string): void {
  eventIds.add(eventId);

  if (eventIds.size <= 100) {
    return;
  }

  const oldestEventId = eventIds.values().next().value;
  if (oldestEventId !== undefined) {
    eventIds.delete(oldestEventId);
  }
}
