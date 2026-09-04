"use client";

import { useState } from "react";
import {
  Building2,
  Calendar,
  ChevronDown,
  DollarSign,
  FileText,
  Layers,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { PARTIES } from "@/data/workflow";
import { formatEuro, summarizeTeamCost } from "@/data/role-rates";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  BUSINESS_VALUE_TYPES,
  adsomniaPriority,
  consensusPriority,
  formatBusinessValueSummary,
  isBusinessValueData,
  parseImpactScore,
} from "@/lib/validation-data";
function Stat({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Icon className="size-3 text-muted/50" />
        <span className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/50">
          {label}
        </span>
      </div>
      <div className="text-xs text-foreground">{children}</div>
    </div>
  );
}

type Props = {
  initiative: InitiativeWithUsers;
  goDate?: Date | null;
  goApprover?: string | null;
};

export function ProjectBriefCard({
  initiative,
  goDate,
  goApprover,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const vd = initiative.validationData;
  const sd = initiative.scopingData;

  const leadPartyId = vd?.leadProductionParty;
  const leadParty = PARTIES.find((p) => p.id === leadPartyId);
  const tShirtSize = vd?.tShirtSize;
  const adsomnia = adsomniaPriority(vd);
  const consensus = consensusPriority(sd);

  const teamCount = sd?.team?.length ?? 0;
  const totalHours = sd?.team?.reduce((s, t) => s + (t.totalHours || 0), 0) ?? 0;
  const teamCost = sd?.team?.length ? summarizeTeamCost(sd.team) : null;

  const milestones = sd?.milestones ?? [];
  const dates = milestones
    .flatMap((m) => [m.startDate, m.endDate])
    .filter(Boolean) as string[];
  const sortedDates = dates.sort();
  const dateRange =
    sortedDates.length >= 2
      ? `${fmtDate(sortedDates[0])} – ${fmtDate(sortedDates[sortedDates.length - 1])}`
      : null;

  const scopeIn = sd?.scopeItems?.filter((s) => s.inScope).length ?? 0;
  const scopeOut = sd?.scopeItems?.filter((s) => !s.inScope).length ?? 0;

  const businessValueSummary = formatBusinessValueSummary(vd?.businessValue);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border bg-surface-elevated px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <FileText className="size-4 text-[#38BDF8]" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">
            Project Brief
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {goDate && (
            <span className="inline-flex items-center gap-1.5 text-[10px] text-muted">
              <Calendar className="size-3" />
              GO {goDate.toLocaleDateString("en-US", { dateStyle: "medium" })}
              {goApprover && ` by ${goApprover}`}
            </span>
          )}
          {leadParty && (
            <span
              className="border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide"
              style={{ borderColor: leadParty.color, color: leadParty.color }}
            >
              {leadParty.label}
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid divide-border border-b border-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
        <Stat icon={Target} label="Problem">
          <p className="line-clamp-2">
            {initiative.problemStatement || "—"}
          </p>
        </Stat>
        <Stat icon={Zap} label="Solution Direction">
          <p className="line-clamp-2">
            {vd?.solutionDirection || "—"}
          </p>
        </Stat>
        <Stat icon={DollarSign} label="Business Value">
          <p>{businessValueSummary || "—"}</p>
        </Stat>
        <Stat icon={Layers} label="Sizing">
          <div className="flex items-center gap-2">
            {tShirtSize && (
              <span className="border border-border px-1.5 py-0.5 font-display text-[10px] font-bold">
                {tShirtSize}
              </span>
            )}
            {consensus && (
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
                Consensus {consensus}
              </span>
            )}
            {adsomnia && (
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Adsomnia {adsomnia}
              </span>
            )}
            {!tShirtSize && !consensus && !adsomnia && "—"}
          </div>
        </Stat>
      </div>

      {/* Key metrics */}
      <div className="grid divide-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
        <Stat icon={Calendar} label="Timeline">
          {dateRange ? (
            <div>
              <span className="font-display text-sm font-bold tabular-nums">
                {dateRange}
              </span>
              <span className="ml-2 text-[10px] text-muted">
                {milestones.length} milestone{milestones.length !== 1 ? "s" : ""}
              </span>
            </div>
          ) : (
            <span className="text-muted/40">—</span>
          )}
        </Stat>
        <Stat icon={Users} label="Team">
          {teamCount > 0 ? (
            <div>
              <span className="font-display text-sm font-bold tabular-nums">
                {teamCount}
              </span>
              <span className="ml-1 text-[10px] text-muted">
                members · {totalHours}h total
              </span>
            </div>
          ) : (
            <span className="text-muted/40">—</span>
          )}
        </Stat>
        <Stat icon={DollarSign} label="Budget">
          {teamCost?.total != null ? (
            <span className="font-display text-sm font-bold tabular-nums">
              {formatEuro(teamCost.total)}
            </span>
          ) : (
            <span className="text-muted/40">—</span>
          )}
        </Stat>
        <Stat icon={Building2} label="Scope">
          {scopeIn + scopeOut > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-success">{scopeIn} in scope</span>
              {scopeOut > 0 && (
                <span className="text-muted/60">{scopeOut} excluded</span>
              )}
            </div>
          ) : (
            <span className="text-muted/40">—</span>
          )}
        </Stat>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="space-y-4 border-t border-border px-4 py-4 sm:px-5">
          {/* Impact details */}
          {vd?.businessValue &&
            isBusinessValueData(vd.businessValue) &&
            vd.businessValue.types.length > 0 && (
              <div>
                <h4 className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                  Impact Breakdown
                </h4>
                <div className="mt-2 flex flex-wrap gap-3">
                  {vd.businessValue.types.map((type) => {
                    const label =
                      BUSINESS_VALUE_TYPES.find((t) => t.id === type)?.label ??
                      type;
                    const score = parseImpactScore(
                      vd.businessValue &&
                        isBusinessValueData(vd.businessValue)
                        ? vd.businessValue.expectations[type]
                        : undefined,
                    );
                    return (
                      <div
                        key={type}
                        className="border border-border bg-surface px-3 py-2"
                      >
                        <span className="text-xs font-medium">{label}</span>
                        {score != null && (
                          <span className="ml-2 font-display text-sm font-bold tabular-nums text-foreground">
                            {score}/10
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Scope items */}
          {sd?.scopeItems && sd.scopeItems.length > 0 && (
            <div>
              <h4 className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Scope Boundaries
              </h4>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {sd.scopeItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 border border-border bg-surface px-3 py-1.5 text-xs"
                  >
                    <span
                      className={
                        item.inScope ? "text-success" : "text-muted/50 line-through"
                      }
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dependencies */}
          {(sd?.dependencies || vd?.dependencies) && (
            <div>
              <h4 className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                Dependencies & Risks
              </h4>
              <p className="mt-1 text-xs text-muted">
                {sd?.dependencies || vd?.dependencies}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-border bg-foreground/[0.02] px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:bg-foreground/[0.05] hover:text-foreground"
      >
        {expanded ? "Hide Details" : "Show Full Brief"}
        <ChevronDown
          className={`size-3 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>
    </div>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}
