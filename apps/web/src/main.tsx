import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { AppProviders } from "./app/AppProviders";
import { NativeAppLifecycleProvider } from "./app/NativeAppLifecycleProvider";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("ReaDirect could not find its application root.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <BrowserRouter>
        <NativeAppLifecycleProvider>
          <App />
        </NativeAppLifecycleProvider>
      </BrowserRouter>
    </AppProviders>
  </StrictMode>,
);
