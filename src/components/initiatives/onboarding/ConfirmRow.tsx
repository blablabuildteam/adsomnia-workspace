"use client";

import { useState, type CSSProperties } from "react";
import { Check, CheckCircle2 } from "lucide-react";
import { getStageColor } from "@/data/workflow";

const DEFAULT_ACCENT = getStageColor("onboarding");

export function accentFillStyle(accent: string, strong = false): CSSProperties {
  return {
    borderColor: strong ? accent : `${accent}66`,
    backgroundColor: strong ? accent : `${accent}1A`,
    color: strong ? "#0B0B0B" : accent,
  };
}

/** Checkbox + "Confirm Done" row shared by onboarding and setup action items. */
export function ConfirmRow({
  label,
  confirmLabel = "Confirm Done",
  blockedReason,
  onConfirm,
  accent = DEFAULT_ACCENT,
}: {
  label: string;
  confirmLabel?: string;
  /** When set, the confirm button stays disabled and this hint is shown. */
  blockedReason?: string | null;
  onConfirm: () => void;
  /** Phase accent — defaults to Onboarding teal. */
  accent?: string;
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
            className="flex size-5 shrink-0 items-center justify-center border transition-colors"
            style={
              confirmed
                ? accentFillStyle(accent, true)
                : { borderColor: "rgb(255 255 255 / 0.3)", color: "transparent" }
            }
          >
            <Check className="size-3.5" strokeWidth={3} />
          </span>
          <span className="text-xs text-foreground">{label}</span>
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!confirmed || !!blockedReason}
          className="inline-flex shrink-0 items-center gap-2 border px-4 py-2 font-display text-[10px] font-bold uppercase tracking-wide transition-opacity hover:opacity-80 disabled:opacity-40"
          style={accentFillStyle(accent)}
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

/** Summary line shown once a task is complete. */
export function CompletedLine({
  children,
  completedAt,
  accent = DEFAULT_ACCENT,
}: {
  children: React.ReactNode;
  completedAt?: string;
  accent?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs" style={{ color: accent }}>
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
