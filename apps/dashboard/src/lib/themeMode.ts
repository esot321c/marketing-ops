export type ThemeMode = "brand" | "base";

export const THEME_STORAGE_KEY = "ws-theme-mode";

export function readThemeMode(raw: string | null): ThemeMode {
  return raw === "base" ? "base" : "brand";
}

export function nextThemeMode(mode: ThemeMode): ThemeMode {
  return mode === "brand" ? "base" : "brand";
}
