"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Check, ChevronDown, Eye } from "lucide-react";
import { getStageColor } from "@/data/workflow";
import { CornerTicks } from "@/components/ui/CornerTicks";

export function phaseCardDomId(stageId: string) {
  return `phase-${stageId}`;
}

export const EXPAND_PHASE_EVENT = "adsomnia:expand-phase";

const STATUS_COLORS = {
  progress: "#EAB308",
  review: "#38BDF8",
  ready: "#22C55E",
} as const;

/**
 * Phase wrapper with four visual states:
 * - "complete": collapsed by default, dimmed body
 * - "current": open by default, yellow "In Progress" badge
 * - "review": like current, but badged "Review" in blue
 * - "ready": like current, but badged with `readyLabel` in green
 * The phase index (01, 02…) hangs to the left of the page grid; closed cards
 * show a left accent in the stage color, open cards swap that for corner ticks.
 * All use the same summary layout (status badge + chevron) so labels align.
 */
export function PhaseCard({
  stageId,
  number,
  name,
  status,
  readyLabel = "Ready for Onboarding",
  className,
  style,
  children,
}: {
  stageId: string;
  number: number;
  name: string;
  status: "complete" | "current" | "review" | "ready";
  /** Badge text for the "ready" state — the next stage this hands off to. */
  readyLabel?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const color = getStageColor(stageId);
  const phaseIndex = String(number).padStart(2, "0");
  const isCurrent =
    status === "current" || status === "review" || status === "ready";
  const [open, setOpen] = useState(isCurrent);
  const rootRef = useRef<HTMLDivElement>(null);

  // Follow the phase as it advances: collapse once it completes, reopen when it
  // becomes active again. Adjusted during render so no extra commit is needed.
  const [trackedStatus, setTrackedStatus] = useState(status);
  if (trackedStatus !== status) {
    setTrackedStatus(status);
    setOpen(isCurrent);
  }

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const expand = () => setOpen(true);
    el.addEventListener(EXPAND_PHASE_EVENT, expand);
    return () => el.removeEventListener(EXPAND_PHASE_EVENT, expand);
  }, []);

  return (
    <div
      id={phaseCardDomId(stageId)}
      ref={rootRef}
      className={["relative scroll-mt-[68px]", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
    >
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute right-full top-0 mr-2.5 text-right tabular-nums sm:mr-3",
          isCurrent
            ? "font-display font-extrabold tracking-tight"
            : "font-body font-medium tracking-wide text-muted/40",
          open
            ? "pt-4 text-xl sm:text-2xl"
            : "pt-2 text-lg leading-none sm:text-xl",
        ].join(" ")}
        style={isCurrent ? { color } : undefined}
      >
        {phaseIndex}
      </span>
      <div className="relative border border-border">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-y-0 left-0 z-[1] w-[3px] transition-opacity duration-300 ${
            open ? "opacity-0" : "opacity-100"
          }`}
          style={{ backgroundColor: color }}
        />
        <CornerTicks
          color={color}
          className={`z-[2] ${open ? "opacity-100" : "opacity-0"}`}
        />
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={`Phase ${phaseIndex}: ${name}`}
          className={[
            "group/phase flex w-full items-center justify-between gap-4 px-4 text-left sm:px-5",
            open ? "border-b border-border py-4" : "py-2",
            isCurrent
              ? "bg-surface-elevated"
              : "bg-surface transition-colors hover:bg-surface-elevated",
          ].join(" ")}
        >
          <h2
            className={[
              "font-display font-extrabold uppercase tracking-tight",
              open ? "text-xl sm:text-2xl" : "text-lg leading-none sm:text-xl",
              isCurrent ? "" : "text-foreground/50",
            ].join(" ")}
          >
            {name}
          </h2>
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
                {readyLabel}
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
            ) : null}
            <span
              className={
                open
                  ? "inline-flex group-hover/phase:animate-[chevron-hint-up_480ms_ease-in-out]"
                  : "inline-flex group-hover/phase:animate-[chevron-hint-down_480ms_ease-in-out]"
              }
            >
              <ChevronDown
                className={`size-4 text-muted transition-transform duration-300 ease-out ${
                  open ? "rotate-180" : ""
                }`}
              />
            </span>
          </div>
        </button>
        <div
          className={[
            "grid transition-[grid-template-rows] duration-300 ease-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          ].join(" ")}
        >
          <div className="overflow-hidden">
            <div
              className={[
                "transition-opacity duration-300 ease-out",
                open
                  ? isCurrent
                    ? "opacity-100"
                    : "opacity-70 hover:opacity-100"
                  : "opacity-0",
              ].join(" ")}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
