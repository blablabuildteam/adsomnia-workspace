"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { updateThemePreference } from "@/lib/auth";
import {
  DEFAULT_THEME,
  THEME_COOKIE,
  themeCookieMaxAge,
  type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemePreference;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
});

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${themeCookieMaxAge()}; SameSite=Lax`;
}

export function ThemeProvider({
  initialTheme,
  canPersist,
  children,
}: {
  initialTheme: ThemePreference;
  canPersist: boolean;
  children: ReactNode;
}) {
  const [theme, setTheme] = useState<ThemePreference>(initialTheme);
  const [, startTransition] = useTransition();

  const toggleTheme = useCallback(() => {
    const next: ThemePreference = theme === "light" ? "dark" : "light";
    setTheme(next);
    applyTheme(next);
    if (canPersist) {
      startTransition(() => {
        void updateThemePreference(next);
      });
    }
  }, [theme, canPersist]);

  const value = useMemo(
    () => ({ theme, toggleTheme }),
    [theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
