"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { getStageColor } from "@/data/workflow";
import { CornerTicks } from "@/components/ui/CornerTicks";

const STATUS_COLORS = {
  progress: "#EAB308",
  review: "#38BDF8",
} as const;

/**
 * Phase wrapper with three visual states:
 * - "complete": collapsed by default, neutral chrome, dimmed body
 * - "current": open by default, stage-color accent + yellow "In Progress" badge
 * - "review": like current, but badged "Awaiting Approval" in blue
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
  status: "complete" | "current" | "review";
  children: ReactNode;
}) {
  const color = getStageColor(stageId);
  const phaseLabel = `Phase ${String(number).padStart(2, "0")}`;
  const isCurrent = status === "current" || status === "review";
  const [open, setOpen] = useState(isCurrent);

  return (
    <details
      className="group/phase relative border border-border"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      style={
        isCurrent
          ? { borderLeftWidth: 3, borderLeftColor: color }
          : undefined
      }
    >
      <CornerTicks complete={!isCurrent} />
      <summary
        className={[
          "flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden",
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
              <span
                className="size-1.5 shrink-0 animate-pulse rounded-full"
                style={{ backgroundColor: STATUS_COLORS.review }}
                aria-hidden
              />
              Awaiting Approval
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
          <ChevronDown className="size-4 text-muted transition-transform duration-200 group-open/phase:rotate-180" />
        </div>
      </summary>
      <div
        className={
          isCurrent
            ? undefined
            : "border-t border-border opacity-70 transition-opacity hover:opacity-100"
        }
      >
        {children}
      </div>
    </details>
  );
}
