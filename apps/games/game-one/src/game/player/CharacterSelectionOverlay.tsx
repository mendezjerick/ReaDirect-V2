import { useEffect, useRef, type CSSProperties } from "react";
import type { GameLanguage } from "../localization/language";
import {
  getPlayableCharacterAsset,
  PLAYABLE_CHARACTERS,
  type PlayableCharacterId
} from "./playableCharacters";

type CharacterSelectionOverlayProps = {
  selectedCharacterId: PlayableCharacterId;
  language: GameLanguage;
  required: boolean;
  onSelect: (id: PlayableCharacterId) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

const characterCopy = {
  en: {
    eyebrow: "CHOOSE CHARACTER",
    title: "Pick your explorer",
    support: "Choose who you want to use while exploring. The story and controls stay the same.",
    selected: "Selected",
    choose: "Choose",
    cancel: "Cancel",
    continue: "Explore"
  },
  fil: {
    eyebrow: "PUMILI NG CHARACTER",
    title: "Piliin ang explorer mo",
    support: "Piliin kung sino ang gagamitin sa pag-explore. Pareho pa rin ang story at controls.",
    selected: "Napili",
    choose: "Piliin",
    cancel: "Kanselahin",
    continue: "Mag-explore"
  }
} as const;

export function CharacterSelectionOverlay({
  selectedCharacterId,
  language,
  required,
  onSelect,
  onConfirm,
  onCancel
}: CharacterSelectionOverlayProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const copy = characterCopy[language];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="character-selection-layer">
      <section role="dialog" aria-modal="true" aria-labelledby="character-selection-title" className="character-selection-panel">
        <p className="character-selection-eyebrow">{copy.eyebrow}</p>
        <h2 id="character-selection-title" ref={headingRef} tabIndex={-1}>{copy.title}</h2>
        <p>{copy.support}</p>
        <div className="character-options" role="radiogroup" aria-label={copy.title}>
          {PLAYABLE_CHARACTERS.map((character) => {
            const selected = character.id === selectedCharacterId;
            const asset = getPlayableCharacterAsset(character.id);
            const previewStyle = {
              backgroundImage: `url(${asset.path})`,
              backgroundSize: `${asset.metadata?.columns ?? 1}00% ${(asset.metadata?.rows ?? 1) * 100}%`
            } satisfies CSSProperties;

            return (
              <button
                key={character.id}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`character-option ${selected ? "is-selected" : ""}`}
                onClick={() => onSelect(character.id)}
              >
                <span className="character-option__sprite" style={previewStyle} aria-hidden="true" />
                <span className="character-option__details">
                  <span className="character-option__name">{character.name[language]}</span>
                </span>
                <span className="character-option__choice" aria-hidden="true">
                  <span className="character-option__radio">{selected ? "✓" : ""}</span>
                  <span>{selected ? copy.selected : copy.choose}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="character-selection-actions">
          {!required && <button type="button" className="question-secondary" onClick={onCancel}>{copy.cancel}</button>}
          <button type="button" className="story-primary" onClick={onConfirm}>{copy.continue}</button>
        </div>
      </section>
    </div>
  );
}
