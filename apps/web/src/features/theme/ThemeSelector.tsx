import { THEME_OPTIONS } from "./theme";
import { useTheme } from "./themeContext";

export function ThemeSelector() {
  const { theme: selectedTheme, setTheme } = useTheme();

  return (
    <nav className="theme-selector" aria-label="Choose a theme">
      <div className="theme-selector__track">
        {THEME_OPTIONS.map((theme) => (
          <button
            key={theme.id}
            className="theme-selector__choice"
            type="button"
            data-theme-option={theme.id}
            aria-label={`Use ${theme.label}`}
            aria-pressed={selectedTheme === theme.id}
            onClick={() => setTheme(theme.id)}
          >
            <span className="visually-hidden">{theme.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
