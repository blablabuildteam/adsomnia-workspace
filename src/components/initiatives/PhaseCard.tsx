"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown, Eye } from "lucide-react";
import { getStageColor } from "@/data/workflow";
import { CornerTicks } from "@/components/ui/CornerTicks";

const STATUS_COLORS = {
  progress: "#EAB308",
  review: "#38BDF8",
  ready: "#22C55E",
} as const;

/**
 * Phase wrapper with four visual states:
 * - "complete": collapsed by default, neutral chrome, dimmed body
 * - "current": open by default, stage-color accent + yellow "In Progress" badge
 * - "review": like current, but badged "Review" in blue
 * - "ready": like current, but badged "Ready for Onboarding" in green
 * All use the same summary layout (status badge + chevron) so labels align.
 */
export function PhaseCard({
  stageId,
  number,
  name,
  status,
  children,
}: {
  stageId: string;
  number: number;
  name: string;
  status: "complete" | "current" | "review" | "ready";
  children: ReactNode;
}) {
  const color = getStageColor(stageId);
  const phaseLabel = `Phase ${String(number).padStart(2, "0")}`;
  const isCurrent =
    status === "current" || status === "review" || status === "ready";
  const [open, setOpen] = useState(isCurrent);

  return (
    <div
      className="group/phase relative border border-border"
      style={
        isCurrent
          ? { borderLeftWidth: 3, borderLeftColor: color }
          : undefined
      }
    >
      <CornerTicks complete={!isCurrent} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={[
          "flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5",
          isCurrent
            ? "border-b border-border bg-surface-elevated"
            : "bg-surface transition-colors hover:bg-surface-elevated",
        ].join(" ")}
        style={
          isCurrent
            ? { borderTopWidth: 3, borderTopColor: color }
            : undefined
        }
      >
        <div>
          <p
            className={[
              "font-display text-[10px] font-bold uppercase tracking-[0.25em]",
              isCurrent ? "" : "text-muted/70",
            ].join(" ")}
            style={isCurrent ? { color } : undefined}
          >
            {phaseLabel}
          </p>
          <h2
            className={[
              "font-display mt-1 text-xl font-extrabold uppercase tracking-tight sm:text-2xl",
              isCurrent ? "" : "text-foreground/50",
            ].join(" ")}
          >
            {name}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {status === "review" ? (
            <span
              className="font-display flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                borderColor: STATUS_COLORS.review,
                color: STATUS_COLORS.review,
                backgroundColor: `${STATUS_COLORS.review}1A`,
              }}
            >
              <Eye className="size-3 animate-pulse" />
              Review
            </span>
          ) : status === "ready" ? (
            <span
              className="font-display flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                borderColor: STATUS_COLORS.ready,
                color: STATUS_COLORS.ready,
                backgroundColor: `${STATUS_COLORS.ready}1A`,
              }}
            >
              <Check className="size-3" />
              Ready for Onboarding
            </span>
          ) : isCurrent ? (
            <span
              className="font-display flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{
                borderColor: STATUS_COLORS.progress,
                color: STATUS_COLORS.progress,
                backgroundColor: `${STATUS_COLORS.progress}1A`,
              }}
            >
              <span
                className="size-1.5 shrink-0 animate-pulse rounded-full"
                style={{ backgroundColor: STATUS_COLORS.progress }}
                aria-hidden
              />
              In Progress
            </span>
          ) : (
            <span className="font-display flex items-center gap-1.5 border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
              <Check className="size-3" />
              Complete
            </span>
          )}
          <ChevronDown
            className={`size-4 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>
      {open && (
        <div
          className={
            isCurrent
              ? undefined
              : "border-t border-border opacity-70 transition-opacity hover:opacity-100"
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
