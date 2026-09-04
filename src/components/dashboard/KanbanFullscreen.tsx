"use client";

import { useEffect, useId, useState } from "react";
import { Maximize2, X } from "lucide-react";
import { KanbanBoard } from "@/components/overview/KanbanBoard";
import type { InitiativeWithUsers } from "@/lib/queries";

type Props = {
  initiatives: InitiativeWithUsers[];
};

export function KanbanFullscreen({ initiatives }: Props) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 border border-border bg-surface px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground"
      >
        <Maximize2 className="size-3" />
        Full screen
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-6">
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                Pipeline
              </p>
              <h2
                id={titleId}
                className="font-display text-sm font-bold uppercase tracking-wide"
              >
                Stage Kanban
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex size-9 items-center justify-center border border-border text-muted transition-colors hover:border-foreground hover:text-foreground"
              aria-label="Close full-screen kanban"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
            <KanbanBoard initiatives={initiatives} className="h-full min-h-[70vh]" />
          </div>
        </div>
      ) : null}
    </>
  );
}
