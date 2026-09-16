export const THEME_COOKIE = "adsomnia-theme";

export const THEME_PREFERENCES = ["dark", "light"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME: ThemePreference = "dark";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "dark" || value === "light";
}

export function parseThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME;
}

export function themeCookieMaxAge(): number {
  return 60 * 60 * 24 * 365;
}
