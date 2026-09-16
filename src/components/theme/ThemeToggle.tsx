"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

type Props = {
  collapsed?: boolean;
};

export function ThemeToggle({ collapsed = false }: Props) {
  const { theme, toggleTheme } = useTheme();
  const next = theme === "light" ? "dark" : "light";
  const label = next === "light" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={[
        "flex shrink-0 cursor-pointer items-center justify-center border border-transparent text-muted transition-colors hover:border-border hover:text-foreground",
        collapsed ? "mx-auto size-8" : "size-8",
      ].join(" ")}
    >
      {theme === "light" ? (
        <Moon className="size-3.5" />
      ) : (
        <Sun className="size-3.5" />
      )}
    </button>
  );
}
