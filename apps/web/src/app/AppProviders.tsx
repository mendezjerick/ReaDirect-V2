import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";

import { ThemeProvider } from "../features/theme/ThemeProvider";
import { StaffRealtimeProvider } from "../features/realtime/StaffRealtimeProvider";
import { StaffSessionLifecycleProvider } from "../features/staff-auth/StaffSessionLifecycleProvider";
import { ConnectivityProvider } from "../features/connectivity/ConnectivityProvider";
import { createAppQueryClient } from "./queryClient";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(createAppQueryClient);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <StaffSessionLifecycleProvider>
          <ConnectivityProvider>
            <StaffRealtimeProvider>{children}</StaffRealtimeProvider>
          </ConnectivityProvider>
        </StaffSessionLifecycleProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
