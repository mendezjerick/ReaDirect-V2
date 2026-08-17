import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { OfflineApkApp } from "./OfflineApkApp";
import "./offline-apk.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("ReaDirect could not find its offline APK application root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <OfflineApkApp />
  </StrictMode>,
);
