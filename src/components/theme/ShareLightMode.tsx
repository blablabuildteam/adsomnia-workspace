"use client";

import { useLayoutEffect } from "react";
import { useTheme } from "./ThemeProvider";

/**
 * Forces light mode on public share links.
 * Does not write the theme cookie, so a signed-in visitor keeps their saved preference.
 */
export function ShareLightMode() {
  const { theme } = useTheme();

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add("light");
    root.style.colorScheme = "light";
    return () => {
      root.classList.toggle("light", theme === "light");
      root.style.colorScheme = theme;
    };
  }, [theme]);

  return null;
}
