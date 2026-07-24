interface Choice {
  key: string;
  text: string;
}

interface ComprehensionChoiceGridProps {
  choices: Choice[];
  selectedChoice: string | null;
  unavailable: boolean;
  disabledChoices?: string[];
  correctChoice?: string | null;
  lastWrongChoice?: string | null;
  onSelect: (choice: string) => void;
}

export function ComprehensionChoiceGrid({
  choices,
  selectedChoice,
  unavailable,
  disabledChoices = [],
  correctChoice = null,
  lastWrongChoice = null,
  onSelect,
}: ComprehensionChoiceGridProps) {
  return (
    <div className="assessment-comprehension-choices">
      {choices.map((choice) => {
        const disabled = disabledChoices.includes(choice.key);
        const state =
          correctChoice === choice.key
            ? "correct"
            : lastWrongChoice === choice.key
              ? "wrong"
              : undefined;

        return (
          <button
            key={choice.key}
            type="button"
            data-selected={selectedChoice === choice.key || undefined}
            data-choice-state={state}
            disabled={unavailable || disabled}
            aria-pressed={selectedChoice === choice.key}
            onClick={() => onSelect(choice.key)}
          >
            <span>{choice.key.toUpperCase()}</span>
            <strong>{choice.text}</strong>
          </button>
        );
      })}
    </div>
  );
}
