import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import {
  applyTheme,
  readStoredTheme,
  THEME_STORAGE_KEY,
  type ThemeId,
} from "./theme";
import { ThemeContext } from "./themeContext";

export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const initialTheme = readStoredTheme();
    applyTheme(initialTheme);
    return initialTheme;
  });

  const setTheme = useCallback((nextTheme: ThemeId) => {
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setThemeState(nextTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
