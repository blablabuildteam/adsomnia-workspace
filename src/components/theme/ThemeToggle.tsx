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
  const light = theme === "light";

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
      <span className="relative size-3.5">
        <Sun
          aria-hidden
          className={[
            "absolute inset-0 size-3.5 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
            light
              ? "rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100",
          ].join(" ")}
        />
        <Moon
          aria-hidden
          className={[
            "absolute inset-0 size-3.5 transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none",
            light
              ? "rotate-0 scale-100 opacity-100"
              : "-rotate-90 scale-0 opacity-0",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
