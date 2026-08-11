"use client";

import Link from "next/link";
import { STAGES, getStageColor } from "@/data/workflow";

export const STAGE_PIPELINE_HREF: Record<string, string> = {
  idea: "/pipeline/initiatives",
  validation: "/pipeline/validation",
  scoping: "/pipeline/scoping",
  "go-nogo": "/pipeline/go-nogo",
  setup: "/pipeline/setup",
  onboarding: "/pipeline/onboarding",
  production: "/pipeline/production",
};

/** Text on a filled stage-color box — light fills need dark type. */
function stageLabelOnFill(hex: string): string {
  const light =
    hex === "#FFFFFF" || hex === "#CEFF00" || hex === "#2DD4BF";
  return light ? "#000000" : "#FFFFFF";
}

type Props = {
  /** Highlight the active pipeline stage. Omit on multi-stage views (e.g. Kanban overview). */
  currentStageId?: string;
  className?: string;
};

/** Horizontal 7-stage pipeline strip — clickable navigation between phase overview pages. */
export function PipelineStrip({ currentStageId, className }: Props) {
  return (
    <nav
      aria-label="Pipeline stages"
      className={["w-full overflow-visible pb-7", className]
        .filter(Boolean)
        .join(" ")}
    >
      <ol className="flex items-start">
        {STAGES.map((stage, i) => {
          const active = stage.id === currentStageId;
          const last = i === STAGES.length - 1;
          const href = STAGE_PIPELINE_HREF[stage.id];
          const stageColor = getStageColor(stage.id);

          return (
            <li
              key={stage.id}
              className={[
                "group/stage relative min-w-0",
                last ? "flex-none" : "flex-1",
              ].join(" ")}
            >
              {!last && (
                <span
                  aria-hidden
                  className="absolute left-[34px] right-1.5 top-3.5 h-px -translate-y-1/2 bg-border transition-colors duration-150 group-hover/stage:bg-[color-mix(in_srgb,var(--stage-color)_35%,var(--color-border))]"
                  style={
                    { "--stage-color": stageColor } as React.CSSProperties
                  }
                />
              )}
              <Link
                href={href}
                title={stage.name}
                aria-current={active ? "step" : undefined}
                style={
                  { "--stage-color": stageColor } as React.CSSProperties
                }
                className="relative flex flex-col items-start outline-none"
              >
                <span
                  className={[
                    "font-display relative z-[1] flex size-7 shrink-0 items-center justify-center border text-[10px] font-bold transition-all duration-150",
                    active
                      ? ""
                      : [
                          "border-border bg-background text-muted/60",
                          "group-hover/stage:border-[var(--stage-color)]",
                          "group-hover/stage:bg-[color-mix(in_srgb,var(--stage-color)_14%,transparent)]",
                          "group-hover/stage:text-[var(--stage-color)]",
                          "group-focus-visible/stage:border-[var(--stage-color)]",
                          "group-focus-visible/stage:text-[var(--stage-color)]",
                        ].join(" "),
                  ].join(" ")}
                  style={
                    active
                      ? {
                          borderColor: stageColor,
                          backgroundColor: stageColor,
                          color: stageLabelOnFill(stageColor),
                        }
                      : undefined
                  }
                >
                  {String(stage.number).padStart(2, "0")}
                </span>
                <span
                  className={[
                    "font-display pointer-events-none absolute left-0 top-[calc(100%+2px)] hidden origin-top-left -rotate-[38deg] whitespace-nowrap text-[9px] font-bold uppercase tracking-wide transition-colors duration-150 md:block",
                    active
                      ? ""
                      : "text-muted/40 group-hover/stage:text-[var(--stage-color)] group-focus-visible/stage:text-[var(--stage-color)]",
                  ].join(" ")}
                  style={active ? { color: stageColor } : undefined}
                >
                  {stage.name}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
