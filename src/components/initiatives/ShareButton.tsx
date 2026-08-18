"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

type Props = {
  path: string;
  /** Match the PDF control in the page header (`sm`) or the sticky bar (`md`). */
  size?: "sm" | "md";
};

export function ShareButton({ path, size = "sm" }: Props) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number>(0);

  useEffect(() => {
    return () => window.clearTimeout(resetTimer.current);
  }, []);

  async function handleShare() {
    const url = new URL(path, window.location.origin).href;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copy this link", url);
    }

    setCopied(true);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={[
        "inline-flex shrink-0 items-center gap-2 border text-muted transition-colors hover:border-foreground hover:text-foreground print:hidden",
        copied
          ? "border-success bg-success/10 text-success hover:border-success hover:text-success"
          : "border-border",
        size === "md" ? "px-3.5 py-2" : "px-3 py-2",
      ].join(" ")}
      title={copied ? "Link copied" : "Copy share link"}
      aria-live="polite"
    >
      {copied ? (
        <Check className="size-4" />
      ) : (
        <Share2 className="size-4" />
      )}
      <span
        className={[
          "font-display font-bold uppercase tracking-wide",
          size === "md" ? "text-xs" : "text-[10px]",
        ].join(" ")}
      >
        {copied ? "Link copied" : "Share"}
      </span>
    </button>
  );
}
