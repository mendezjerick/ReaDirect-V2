import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./App";
import { AppProviders } from "./app/AppProviders";
import { NativeAppLifecycleProvider } from "./app/NativeAppLifecycleProvider";
import {
  hydrateNativeSessions,
  isNativeSecureSessionAvailable,
} from "./app/nativeSecureSession";
import {
  clearLearnerSession,
  getLearnerSession,
  hydrateLearnerSession,
  LearnerSessionInvalidError,
  loadLearnerSession,
  saveLearnerSession,
} from "./features/learner-auth/learnerApi";
import {
  clearStaffSession,
  getCurrentStaffSession,
  hydrateStaffSession,
  loadStaffSession,
  saveStaffSession,
} from "./features/staff-auth/staffApi";
import "./styles/index.css";
// Keep Game One's styles in the entry bundle. Android WebView can reject the
// dynamically preloaded CSS chunk for this route, leaving only the game
// background visible even though the JavaScript route loaded successfully.
import "../../games/game-one/src/styles/game-one.css";
import "../../games/game-one/src/game/layout/game-layout.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("ReaDirect could not find its application root.");
}

async function validateNativeSessions(): Promise<void> {
  if (!isNativeSecureSessionAvailable()) return;

  const learner = loadLearnerSession();
  if (learner) {
    try {
      const session = await getLearnerSession(learner.token);
      await saveLearnerSession({ ...session, token: learner.token });
    } catch (error) {
      if (error instanceof LearnerSessionInvalidError) {
        clearLearnerSession();
      }
    }
  }

  const staff = loadStaffSession();
  if (staff) {
    try {
      await saveStaffSession(await getCurrentStaffSession());
    } catch {
      clearStaffSession();
    }
  }
}

void hydrateNativeSessions([
  "readirect.learner-session",
  "readirect.staff-session",
])
  .then(() => {
    hydrateLearnerSession();
    hydrateStaffSession();
    return validateNativeSessions();
  })
  .then(() => {
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
  });
