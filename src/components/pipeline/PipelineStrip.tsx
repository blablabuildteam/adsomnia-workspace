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
    hex === "#FFFFFF" ||
    hex === "#CEFF00" ||
    hex === "#9CA3AF" ||
    hex === "#22D3EE" ||
    hex === "#FB923C";
  return light ? "#000000" : "#FFFFFF";
}

type Props = {
  /** Highlight the active pipeline stage. Omit on multi-stage views (e.g. overview). */
  currentStageId?: string;
  className?: string;
};

/** Horizontal 7-stage pipeline strip — clickable navigation between phase overview pages. */
export function PipelineStrip({ currentStageId, className }: Props) {
  return (
    <nav
      aria-label="Pipeline stages"
      className={["w-full overflow-visible pb-6 -mb-6", className]
        .filter(Boolean)
        .join(" ")}
    >
      <ol className="flex items-center">
        {STAGES.map((stage, i) => {
          const active = stage.id === currentStageId;
          const last = i === STAGES.length - 1;
          const href = STAGE_PIPELINE_HREF[stage.id];
          const stageColor = getStageColor(stage.id);
          const onFill = stageLabelOnFill(stageColor);

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
                  className="absolute left-[40px] right-1.5 top-1/2 h-px -translate-y-1/2 bg-border transition-colors duration-150 group-hover/stage:bg-[color-mix(in_srgb,var(--stage-color)_35%,var(--color-border))]"
                  style={
                    { "--stage-color": stageColor } as React.CSSProperties
                  }
                />
              )}
              <Link
                href={href}
                aria-label={stage.name}
                aria-current={active ? "step" : undefined}
                style={
                  { "--stage-color": stageColor } as React.CSSProperties
                }
                className="relative inline-flex flex-col items-center outline-none"
              >
                <span
                  className={[
                    "font-display relative z-[1] flex size-[34px] shrink-0 items-center justify-center overflow-hidden border text-xs font-bold transition-colors duration-300",
                    active
                      ? ""
                      : [
                          "border-border bg-background text-muted/60",
                          "group-hover/stage:border-[var(--stage-color)]",
                          "group-hover/stage:text-[var(--on-fill)]",
                          "group-focus-visible/stage:border-[var(--stage-color)]",
                          "group-focus-visible/stage:text-[var(--on-fill)]",
                        ].join(" "),
                  ].join(" ")}
                  style={
                    active
                      ? {
                          borderColor: stageColor,
                          backgroundColor: stageColor,
                          color: onFill,
                          ["--on-fill" as string]: onFill,
                        }
                      : ({
                          ["--stage-color" as string]: stageColor,
                          ["--on-fill" as string]: onFill,
                        } as React.CSSProperties)
                  }
                >
                  <span
                    aria-hidden
                    className={[
                      "absolute inset-0 origin-left scale-x-0 transition-transform duration-300 ease-out",
                      "group-hover/stage:scale-x-100 group-focus-visible/stage:scale-x-100",
                      active ? "bg-background/20" : "bg-[var(--stage-color)]",
                    ].join(" ")}
                  />
                  <span className="relative z-[1]">
                    {String(stage.number).padStart(2, "0")}
                  </span>
                </span>
                <span
                  className={[
                    "font-display pointer-events-none absolute left-1/2 top-[calc(100%+5px)] z-10 -translate-x-1/2 whitespace-nowrap text-[11px] font-bold uppercase tracking-wide opacity-0 transition-all duration-200 ease-out",
                    "group-hover/stage:opacity-100 group-focus-visible/stage:opacity-100",
                  ].join(" ")}
                  style={{ color: stageColor }}
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
