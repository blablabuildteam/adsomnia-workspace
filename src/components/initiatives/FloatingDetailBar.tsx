"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type Props = {
  title: string;
  stageName: string;
  stageColor: string;
};

export function FloatingDetailBar({ title, stageName, stageColor }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("detail-header-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={[
        "sticky top-0 z-40 transition-all duration-300 print:hidden",
        visible
          ? "translate-y-0 opacity-100"
          : "-translate-y-full opacity-0 pointer-events-none",
      ].join(" ")}
    >
      <div className="border-b border-white/[0.06] bg-black/50 px-4 backdrop-blur-2xl sm:px-6">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 py-3">
          <span
            className="font-display shrink-0 text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: stageColor }}
          >
            {stageName}
          </span>
          <span className="text-white/20">/</span>
          <h2 className="font-display min-w-0 flex-1 truncate text-sm font-extrabold uppercase tracking-tight text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto inline-flex shrink-0 items-center gap-2 border border-white/10 px-3 py-1.5 text-muted transition-colors hover:border-foreground hover:text-foreground"
            title="Download as PDF"
          >
            <Download className="size-3.5" />
            <span className="font-display text-[10px] font-bold uppercase tracking-wide">
              PDF
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
