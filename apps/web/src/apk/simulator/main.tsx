import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../styles/index.css";
import { ThemeProvider } from "../../features/theme/ThemeProvider";
import { OfflineSimulatorShell } from "./OfflineSimulatorShell";
import "../offline-apk.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <OfflineSimulatorShell />
    </ThemeProvider>
  </StrictMode>,
);
