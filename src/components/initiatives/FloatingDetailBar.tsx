"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { ShareButton } from "./ShareButton";

type Props = {
  title: string;
  stageName: string;
  stageColor: string;
  sharePath?: string;
};

export function FloatingDetailBar({
  title,
  stageName,
  stageColor,
  sharePath,
}: Props) {
  const [visible, setVisible] = useState(false);
  const rafId = useRef(0);

  const checkVisibility = useCallback(() => {
    const sentinel = document.getElementById("detail-header-sentinel");
    if (!sentinel) return;
    const rect = sentinel.getBoundingClientRect();
    // Trigger while the sentinel is still ~80px below the top edge
    setVisible(rect.bottom < 80);
  }, []);

  useEffect(() => {
    const scroller =
      document.querySelector("main.workspace-content") ?? window;

    const onScroll = () => {
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(checkVisibility);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    checkVisibility();

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId.current);
    };
  }, [checkVisibility]);

  return (
    <div
      className={[
        "sticky top-0 z-40 transition-all duration-300 print:hidden",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none",
      ].join(" ")}
    >
      {/* Height matches sidebar brand row: py-4 + size-9 logo = 68px */}
      <div className="border-b border-border bg-surface/90 px-4 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-3.5">
          <span
            className="font-display shrink-0 text-xs font-bold uppercase tracking-[0.2em]"
            style={{ color: stageColor }}
          >
            {stageName}
          </span>
          <span className="text-white/20">/</span>
          <h2 className="font-display min-w-0 flex-1 truncate text-base font-extrabold uppercase tracking-tight text-foreground">
            {title}
          </h2>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {sharePath && <ShareButton path={sharePath} size="md" />}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex shrink-0 items-center gap-2 border border-border px-3.5 py-2 text-muted transition-colors hover:border-foreground hover:text-foreground"
              title="Download as PDF"
            >
              <Download className="size-4" />
              <span className="font-display text-xs font-bold uppercase tracking-wide">
                PDF
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
