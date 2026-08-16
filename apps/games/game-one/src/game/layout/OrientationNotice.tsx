import { useEffect, useState } from "react";
import type { GameLanguage } from "../localization/language";

type OrientationNoticeProps = {
  hidden: boolean;
  language: GameLanguage;
  portrait: boolean;
  onContinue: () => void;
  onExit: () => void;
};

export function OrientationNotice({
  hidden,
  language,
  portrait,
  onContinue,
  onExit
}: OrientationNoticeProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!portrait) setDismissed(false);
  }, [portrait]);

  if (!portrait || hidden || dismissed) return null;

  const filipino = language === "fil";

  return (
    <aside
      className="orientation-notice"
      aria-labelledby="orientation-notice-title"
      aria-live="polite"
    >
      <span className="orientation-notice__screen" aria-hidden="true">
        <span />
      </span>
      <div className="orientation-notice__copy">
        <p>{filipino ? "Mas magandang tingnan" : "Best view"}</p>
        <h2 id="orientation-notice-title">
          {filipino ? "Ihiga ang iyong device" : "Turn your device sideways"}
        </h2>
        <span>
          {filipino
            ? "Maaari ka pa ring maglaro nang patayo."
            : "You can still play in portrait."}
        </span>
      </div>
      <div className="orientation-notice__actions">
        <button
          type="button"
          className="orientation-notice__secondary"
          onClick={onExit}
        >
          {filipino ? "Lumabas" : "Exit"}
        </button>
        <button
          type="button"
          className="orientation-notice__primary"
          onClick={() => {
            setDismissed(true);
            onContinue();
          }}
        >
          {filipino ? "Magpatuloy" : "Continue"}
        </button>
      </div>
    </aside>
  );
}
