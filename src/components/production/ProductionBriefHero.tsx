import type { ReactNode } from "react";
import { formatEuro } from "@/data/role-rates";
import {
  formatShortDate,
  type ProductionProjectBrief,
} from "@/lib/production/health";
import { PRIORITY_META } from "@/lib/validation-data";

function weeksInPeriod(startIso: string, endIso: string): number | null {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return null;
  }
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(1, Math.ceil(days / 7));
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-1.5 px-3 py-3">
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
        {label}
      </span>
      <div>
        <div
          className="font-display text-lg font-extrabold uppercase leading-none tracking-tight"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </div>
        {sub && <div className="mt-1 text-[10px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

function Narrative({
  label,
  text,
}: {
  label: string;
  text?: string | null;
}) {
  if (!text?.trim()) return null;
  return (
    <div className="min-w-0 px-3 py-3">
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-muted/50">
        {label}
      </span>
      <p className="mt-1.5 line-clamp-4 text-xs leading-relaxed text-foreground/80">
        {text}
      </p>
    </div>
  );
}

type Props = {
  brief: ProductionProjectBrief;
};

export function ProductionBriefHero({ brief }: Props) {
  const consensus = brief.consensusPriority?.trim() || undefined;
  const adsomnia = brief.priority?.trim() || undefined;
  const consensusMeta = consensus ? PRIORITY_META[consensus] : undefined;

  const dateRange =
    brief.timelineStart && brief.timelineEnd
      ? `${formatShortDate(brief.timelineStart)} – ${formatShortDate(brief.timelineEnd)}`
      : null;
  const weekCount =
    brief.timelineStart && brief.timelineEnd
      ? weeksInPeriod(brief.timelineStart, brief.timelineEnd)
      : null;
  const weekLabel =
    weekCount != null ? `${weekCount} week${weekCount !== 1 ? "s" : ""}` : null;

  const teamCount = brief.team.length;
  const budgetSub = [
    brief.budgetConfirmed ? "Confirmed at setup" : null,
    brief.originalBudget != null &&
    brief.budget != null &&
    brief.originalBudget !== brief.budget
      ? `Was ${formatEuro(brief.originalBudget)}`
      : null,
    brief.budgetUsesAssumedRates ? "Assumed rates" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const hasNarrative =
    Boolean(brief.problemStatement?.trim()) ||
    Boolean(brief.solutionDirection?.trim()) ||
    Boolean(brief.businessValueSummary?.trim()) ||
    Boolean(brief.expectedImpact?.trim());

  return (
    <section>
      <h3 className="font-display mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
        Project brief
      </h3>
      <div className="border border-border">
        <div className="grid grid-cols-2 gap-px bg-border">
          <div className="bg-surface">
            <Stat
              label="Consensus Priority"
              value={consensus ?? "TBD"}
              accent={consensusMeta?.color}
              sub={
                consensus
                  ? [
                      consensusMeta?.hint,
                      adsomnia && adsomnia !== consensus
                        ? `Adsomnia: ${adsomnia}`
                        : adsomnia && adsomnia === consensus
                          ? "Matches Adsomnia"
                          : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  : adsomnia
                    ? `Adsomnia: ${adsomnia}`
                    : undefined
              }
            />
          </div>
          <div className="bg-surface">
            <Stat
              label="Budget"
              value={brief.budget != null ? formatEuro(brief.budget) : "TBD"}
              sub={budgetSub || undefined}
            />
          </div>
          <div className="bg-surface">
            <Stat
              label="Timeline"
              value={dateRange ?? "TBD"}
              sub={
                [
                  weekLabel,
                  brief.milestones.length > 0
                    ? `${brief.milestones.length} epic${brief.milestones.length !== 1 ? "s" : ""}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || undefined
              }
            />
          </div>
          <div className="bg-surface">
            <Stat
              label="Team"
              value={teamCount > 0 ? teamCount : "TBD"}
              sub={
                teamCount > 0
                  ? `members · ${brief.teamHours ?? 0}h booked`
                  : undefined
              }
            />
          </div>
        </div>
        {hasNarrative && (
          <div className="divide-y divide-border border-t border-border bg-surface">
            <Narrative label="Problem" text={brief.problemStatement} />
            <Narrative label="Solution" text={brief.solutionDirection} />
            <Narrative
              label="Business Value"
              text={brief.businessValueSummary ?? brief.expectedImpact}
            />
          </div>
        )}
      </div>
    </section>
  );
}
