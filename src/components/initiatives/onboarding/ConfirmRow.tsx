"use client";

import { useState } from "react";
import { Check, CheckCircle2 } from "lucide-react";

/** Checkbox + "Confirm Done" row shared by every onboarding action item. */
export function ConfirmRow({
  label,
  confirmLabel = "Confirm Done",
  blockedReason,
  onConfirm,
}: {
  label: string;
  confirmLabel?: string;
  /** When set, the confirm button stays disabled and this hint is shown. */
  blockedReason?: string | null;
  onConfirm: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 border border-border bg-surface px-3 py-2">
        <button
          type="button"
          onClick={() => setConfirmed((current) => !current)}
          className="flex min-w-0 items-center gap-3 text-left"
        >
          <span
            aria-hidden
            className={`flex size-5 shrink-0 items-center justify-center border transition-colors ${
              confirmed
                ? "border-success bg-success text-background"
                : "border-foreground/30 bg-transparent text-transparent hover:border-success"
            }`}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-xs text-foreground">{label}</span>
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!confirmed || !!blockedReason}
          className="inline-flex shrink-0 items-center gap-2 border border-success bg-success/10 px-4 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-success transition-colors hover:bg-success/20 disabled:opacity-40"
        >
          {confirmLabel}
        </button>
      </div>
      {blockedReason && (
        <p className="text-[10px] uppercase tracking-wide text-muted/60">
          {blockedReason}
        </p>
      )}
    </div>
  );
}

/** Green summary line shown once a task is complete. */
export function CompletedLine({
  children,
  completedAt,
}: {
  children: React.ReactNode;
  completedAt?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-success">
      <CheckCircle2 className="size-3.5 shrink-0" />
      <span>{children}</span>
      {completedAt && (
        <span className="text-muted">
          ·{" "}
          {new Date(completedAt).toLocaleDateString("en-US", {
            dateStyle: "medium",
          })}
        </span>
      )}
    </div>
  );
}
