import { Navigate, Route, Routes } from "react-router-dom";

import { RouteTransitionProvider } from "./components/transitions/RouteTransitionProvider";
import { HomePage } from "./features/home/HomePage";
import { IntroPage } from "./features/intro/IntroPage";

export function App() {
  return (
    <RouteTransitionProvider>
      <Routes>
        <Route path="/" element={<IntroPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </RouteTransitionProvider>
  );
}
