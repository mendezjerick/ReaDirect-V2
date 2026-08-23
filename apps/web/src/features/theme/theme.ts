export const THEME_STORAGE_KEY = "readirect.theme";

export const THEME_OPTIONS = [
  { id: "t1", label: "Meadow theme" },
  { id: "t2", label: "Winter theme" },
  { id: "t3", label: "Dawn theme" },
  { id: "t4", label: "Desert theme" },
  { id: "t5", label: "Volcano theme" },
  { id: "t6", label: "Jade theme" },
  { id: "t7", label: "Castle theme" },
  { id: "t8", label: "Space theme" },
] as const;

export type ThemeId = (typeof THEME_OPTIONS)[number]["id"];

export function isThemeId(value: string | null): value is ThemeId {
  return THEME_OPTIONS.some((theme) => theme.id === value);
}

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") {
    return "t1";
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(storedTheme) ? storedTheme : "t1";
}

export function applyTheme(theme: ThemeId) {
  document.documentElement.dataset.theme = theme;
}
