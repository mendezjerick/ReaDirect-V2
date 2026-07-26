import { useEffect, useRef } from "react";
import { GAME_LANGUAGES, getUiCopy, type GameLanguage } from "./language";

type LanguageSelectionOverlayProps = {
  selectedLanguage: GameLanguage;
  required: boolean;
  onSelect: (language: GameLanguage) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function LanguageSelectionOverlay({
  selectedLanguage,
  required,
  onSelect,
  onConfirm,
  onCancel
}: LanguageSelectionOverlayProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const copy = getUiCopy(selectedLanguage);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="language-selection-layer">
      <section role="dialog" aria-modal="true" aria-labelledby="language-title" className="language-selection-panel">
        <p className="language-selection-eyebrow">{copy.language}</p>
        <h2 id="language-title" ref={headingRef} tabIndex={-1}>{copy.chooseLanguage}</h2>
        <p>{copy.languageSupport}</p>
        <div className="language-options" aria-label={copy.language}>
          {GAME_LANGUAGES.map((language) => {
            const selected = language === selectedLanguage;
            const label = language === "en" ? "English" : "Filipino";
            return (
              <button
                key={language}
                type="button"
                aria-pressed={selected}
                aria-label={`${label}${selected ? `, ${copy.selected}` : ""}`}
                className={`language-option ${selected ? "is-selected" : ""}`}
                onClick={() => onSelect(language)}
              >
                <span aria-hidden="true" className="language-check">{selected ? "x" : ""}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <div className="language-selection-actions">
          {!required && <button type="button" className="question-secondary" onClick={onCancel}>{copy.cancel}</button>}
          <button type="button" className="story-primary" onClick={onConfirm}>{copy.continue}</button>
        </div>
      </section>
    </div>
  );
}
