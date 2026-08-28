"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  Eye,
  Filter,
  GitBranch,
  Loader2,
  PauseCircle,
  Save,
  Users,
  XCircle,
} from "lucide-react";
import { STAGES, getPhaseProgressFill, getStageColor, PARTIES } from "@/data/workflow";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { PipelineStageHeader } from "@/components/pipeline/PipelineStageHeader";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  isBusinessValueComplete,
  isScopingComplete,
  type ScopingData,
} from "@/lib/validation-data";
import { formatEuro, summarizeTeamCost } from "@/data/role-rates";

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const stage = STAGES.find((s) => s.id === "scoping")!;
const stageColor = getStageColor(stage.id);

type FilterKey = "all" | "in-progress" | "in-review" | "rejected";

const FILTERS: { key: FilterKey; label: string; color: string }[] = [
  { key: "all", label: "All", color: "#FFFFFF" },
  { key: "in-progress", label: "In Progress", color: "#CEFF00" },
  { key: "in-review", label: "In Review", color: "#38BDF8" },
  { key: "rejected", label: "Rejected", color: "#FF3B1F" },
];

function matchesScopingFilter(
  status: InitiativeWithUsers["status"],
  filter: Exclude<FilterKey, "all">,
): boolean {
  if (filter === "in-progress") {
    return status === "draft" || status === "approved";
  }
  if (filter === "in-review") {
    return status === "submitted";
  }
  return status === "rejected";
}

const LEAD_PARTY_FILTERS = ["btr", "hn", "bbb", "as"] as const;
type LeadPartyFilter = (typeof LEAD_PARTY_FILTERS)[number];

const PARTY_LOGOS: Record<string, string> = {
  adsomnia: "/logos/adsomnia.png",
  btr: "/logos/bendingtherules.jpeg",
  hn: "/logos/harlemnext.webp",
  bbb: "/logos/blablabuild.png",
};

const SCOPING_SECTION_TOTAL = 4;

const STATUS_META: Record<
  string,
  {
    label: string;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  draft: { label: "In Progress", color: "#CEFF00", icon: Loader2 },
  approved: { label: "In Progress", color: "#CEFF00", icon: Loader2 },
  submitted: { label: "In Review", color: "#38BDF8", icon: Eye },
  rejected: { label: "Rejected", color: "#FF3B1F", icon: XCircle },
  "on-hold": { label: "On Hold", color: "#7E90A3", icon: PauseCircle },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide"
      style={{ borderColor: meta.color, color: meta.color }}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  );
}

function getScopingSectionCount(data: ScopingData | null): number {
  if (!data) return 0;
  let count = 0;
  if ((data.milestones?.length ?? 0) > 0) count++;
  if ((data.team?.length ?? 0) > 0) count++;
  if (isBusinessValueComplete(data.impact)) count++;
  if ((data.scopeItems?.length ?? 0) > 0) count++;
  return count;
}

function getTotalHours(data: ScopingData | null): number {
  if (!data?.team) return 0;
  return data.team.reduce((sum, t) => sum + (t.totalHours || 0), 0);
}

function getTeamCostLabel(data: ScopingData | null): {
  amount: string | null;
  hint: string;
} {
  if (!data?.team?.length) return { amount: null, hint: "" };
  const summary = summarizeTeamCost(data.team);
  if (summary.total == null) {
    return { amount: null, hint: "Est. pending" };
  }
  return {
    amount: formatEuro(summary.total),
    hint: summary.usesAssumedRates ? "Assumed rates" : "Estimated",
  };
}

function getDateRange(data: ScopingData | null): string | null {
  if (!data?.milestones?.length) return null;
  const dates = data.milestones
    .flatMap((m) => [m.startDate, m.endDate])
    .filter(Boolean) as string[];
  if (dates.length === 0) return null;
  const sorted = dates.sort();
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  return `${fmt(sorted[0])} – ${fmt(sorted[sorted.length - 1])}`;
}

/* Ticker label — scrolls only when text overflows the fixed width */
function TickerLabel({
  text,
  title,
  className,
}: {
  text: string;
  title?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);

  useEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const el = textRef.current;
      if (!container || !el) return;
      const distance = Math.max(0, el.scrollWidth - container.clientWidth);
      setOverflow(distance);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [text]);

  const duration = Math.max(4, overflow / 12);

  return (
    <div
      ref={containerRef}
      className={["overflow-hidden whitespace-nowrap", className]
        .filter(Boolean)
        .join(" ")}
      title={title ?? text}
    >
      <span
        ref={textRef}
        className={overflow > 0 ? "label-ticker-track inline-block" : "inline-block"}
        style={
          overflow > 0
            ? ({
                "--ticker-distance": `${overflow}px`,
                "--ticker-duration": `${duration}s`,
              } as React.CSSProperties)
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}

/* Stacked mini-Gantt — label + muted bar per milestone on a shared time axis */
function MiniGantt({ data }: { data: ScopingData | null }) {
  const withDates = (data?.milestones ?? []).filter(
    (m) => m.startDate && m.endDate,
  );
  if (withDates.length === 0) return null;

  const starts = withDates.map((m) => new Date(m.startDate!).getTime());
  const ends = withDates.map((m) => new Date(m.endDate!).getTime());
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const range = max - min || 1;

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });

  return (
    <div className="flex flex-col gap-1.5">
      {withDates.map((m, i) => {
        const start = new Date(m.startDate!).getTime();
        const end = new Date(m.endDate!).getTime();
        const left = ((start - min) / range) * 100;
        const width = Math.max(((end - start) / range) * 100, 3);
        const color = m.color || "#CEFF00";
        const label = m.epic?.trim() || `Milestone ${i + 1}`;
        const detail = m.milestone?.trim();
        return (
          <div key={m.id} className="flex items-center gap-2">
            <TickerLabel
              text={label}
              title={detail ? `${label} — ${detail}` : label}
              className="w-[88px] shrink-0 text-[9px] text-muted/70"
            />
            <div className="relative h-1.5 min-w-0 flex-1 bg-white/[0.04]">
              <div
                className="absolute inset-y-0"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  backgroundColor: color,
                  opacity: 0.45,
                }}
                title={`${label}${detail ? ` — ${detail}` : ""}: ${fmt(m.startDate!)} – ${fmt(m.endDate!)}`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}


function ScopingCard({ item }: { item: InitiativeWithUsers }) {
  const daysSinceUpdate = Math.floor(
    (Date.now() - item.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const sd = item.scopingData;
  const filledSections = getScopingSectionCount(sd);
  const progressPct = Math.round(
    (filledSections / SCOPING_SECTION_TOTAL) * 100,
  );
  const hasSavedDraft =
    filledSections > 0 &&
    (item.status === "draft" || item.status === "approved");

  const leadParty = item.validationData?.leadProductionParty;
  const leadPartyLogo = leadParty ? PARTY_LOGOS[leadParty] : undefined;
  const leadPartyLabel = leadParty
    ? PARTIES.find((p) => p.id === leadParty)?.label ?? leadParty
    : undefined;
  const milestonesCount = sd?.milestones?.length ?? 0;
  const teamCount = sd?.team?.length ?? 0;
  const totalHours = getTotalHours(sd);
  const teamCost = getTeamCostLabel(sd);
  const dateRange = getDateRange(sd);
  const complete = isScopingComplete(sd);

  return (
    <Link
      href={`/workstreams/${item.id}`}
      className="group relative flex h-full flex-col border border-border bg-surface transition-colors hover:border-border-strong hover:bg-white/[0.02]"
    >
      <CornerTicks className={hoverTicks} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="font-display shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">
            {item.ticketId}
          </span>
          <StatusBadge status={item.status} />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="h-1.5 min-w-0 flex-1 bg-border"
              role="progressbar"
              aria-valuenow={filledSections}
              aria-valuemin={0}
              aria-valuemax={SCOPING_SECTION_TOTAL}
              aria-label={`Scoping progress: ${filledSections} of ${SCOPING_SECTION_TOTAL} sections`}
            >
              <div
                className="h-full transition-[width,background-color] duration-300"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: getPhaseProgressFill(stageColor, complete),
                }}
              />
            </div>
            <span className="shrink-0 font-display text-[10px] font-bold uppercase tracking-wide tabular-nums text-muted">
              {filledSections}/{SCOPING_SECTION_TOTAL}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-[10px] text-muted/70">
          {hasSavedDraft && (
            <span className="inline-flex items-center gap-1 text-muted" title="Draft saved">
              <Save className="size-3" />
            </span>
          )}
          <Clock className="size-3" />
          {daysSinceUpdate === 0
            ? "Today"
            : daysSinceUpdate === 1
              ? "1 day ago"
              : `${daysSinceUpdate}d`}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 py-4">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-foreground">
          {item.title}
        </h3>

        {/* Key metrics row */}
        <div className="mt-3 grid grid-cols-3 gap-px bg-border">
          {/* Timeline: start – end date */}
          <div className="flex flex-col bg-surface p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <Calendar className="size-3 text-muted/50" />
              <span className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/50">
                Timeline
              </span>
            </div>
            {dateRange ? (
              <>
                <span className="font-display text-sm font-bold tabular-nums text-foreground">
                  {dateRange}
                </span>
                <span className="mt-0.5 text-[9px] text-muted/60">
                  {milestonesCount} milestone{milestonesCount !== 1 ? "s" : ""}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted/40">—</span>
            )}
          </div>

          {/* Team & Hours */}
          <div className="flex flex-col bg-surface p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <Users className="size-3 text-muted/50" />
              <span className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/50">
                Team
              </span>
            </div>
            {teamCount > 0 ? (
              <>
                <span className="font-display text-sm font-bold tabular-nums text-foreground">
                  {totalHours}h
                  <span className="ml-1 text-[10px] font-bold text-muted">
                    / {teamCount}
                  </span>
                </span>
                <span className="mt-0.5 truncate text-[9px] text-muted/60">
                  {sd!.team!
                    .slice(0, 2)
                    .map((t) => t.name || t.role)
                    .join(", ")}
                  {teamCount > 2 ? ` +${teamCount - 2}` : ""}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted/40">—</span>
            )}
          </div>

          {/* Costs */}
          <div className="flex flex-col bg-surface p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[10px] text-muted/50">€</span>
              <span className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/50">
                Costs
              </span>
            </div>
            {totalHours > 0 ? (
              <>
                <span
                  className={[
                    "font-display text-sm font-bold tabular-nums",
                    teamCost.amount ? "text-foreground" : "text-muted/40",
                  ].join(" ")}
                >
                  {teamCost.amount ?? "€—"}
                </span>
                <span className="mt-0.5 text-[9px] text-muted/40">
                  {teamCost.hint}
                </span>
              </>
            ) : (
              <span className="text-xs text-muted/40">—</span>
            )}
          </div>
        </div>

        {/* Mini Gantt */}
        {milestonesCount > 0 && (
          <div className="mt-3 border-t border-border/50 pt-3">
            <MiniGantt data={sd} />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <div className="flex items-center gap-4">
          {leadPartyLogo ? (
            <span className="inline-flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={leadPartyLogo}
                alt={leadPartyLabel ?? ""}
                className="h-4 w-4 shrink-0 object-contain"
              />
              <span className="font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
                {leadPartyLabel}
              </span>
            </span>
          ) : leadPartyLabel ? (
            <span className="inline-flex items-center gap-1 font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
              <Building2 className="size-3" />
              {leadPartyLabel}
            </span>
          ) : null}
          {complete && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-success">
              <GitBranch className="size-3" />
              Complete
            </span>
          )}
        </div>
        <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

type Props = {
  initiatives: InitiativeWithUsers[];
};

export function ScopingStageView({ initiatives }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [leadPartyFilter, setLeadPartyFilter] =
    useState<LeadPartyFilter | null>(null);

  const inStage = initiatives.filter((i) => i.currentStage === "scoping");

  const statusFiltered =
    activeFilter === "all"
      ? inStage
      : inStage.filter((i) => matchesScopingFilter(i.status, activeFilter));

  const counts: Record<FilterKey, number> = {
    all: inStage.length,
    "in-progress": inStage.filter((i) =>
      matchesScopingFilter(i.status, "in-progress"),
    ).length,
    "in-review": inStage.filter((i) =>
      matchesScopingFilter(i.status, "in-review"),
    ).length,
    rejected: inStage.filter((i) =>
      matchesScopingFilter(i.status, "rejected"),
    ).length,
  };

  const leadPartyCounts = Object.fromEntries(
    LEAD_PARTY_FILTERS.map((partyId) => [
      partyId,
      statusFiltered.filter(
        (i) => i.validationData?.leadProductionParty === partyId,
      ).length,
    ]),
  ) as Record<LeadPartyFilter, number>;

  const filtered = statusFiltered.filter((item) => {
    if (
      leadPartyFilter &&
      item.validationData?.leadProductionParty !== leadPartyFilter
    ) {
      return false;
    }
    return true;
  });

  const hasLeadFilter = leadPartyFilter !== null;

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PipelineStageHeader stage={stage} />

      <div className="mb-4 flex items-center gap-2 overflow-x-auto border-b border-border pb-px">
        <Filter className="mr-1 size-3.5 shrink-0 text-muted/60" />
        {FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              type="button"
              onClick={() => setActiveFilter(filter.key)}
              className={[
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium uppercase tracking-wide transition-colors",
                isActive
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              ].join(" ")}
            >
              {filter.key !== "all" && (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: filter.color }}
                />
              )}
              {filter.label}
              <span
                className={[
                  "ml-0.5 tabular-nums",
                  isActive ? "text-foreground" : "text-muted/60",
                ].join(" ")}
              >
                {counts[filter.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-3.5 shrink-0 text-muted/60" />
          <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Lead Party
          </span>
          <div className="flex items-center gap-1.5">
            {LEAD_PARTY_FILTERS.map((partyId) => {
              const isActive = leadPartyFilter === partyId;
              const p = PARTIES.find((pt) => pt.id === partyId)!;
              return (
                <button
                  key={partyId}
                  type="button"
                  onClick={() =>
                    setLeadPartyFilter((current) =>
                      current === partyId ? null : partyId,
                    )
                  }
                  className={[
                    "border px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide transition-colors",
                    isActive
                      ? "border-foreground bg-foreground/[0.06] text-foreground"
                      : "border-border text-muted hover:border-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {p.label}
                  <span
                    className={[
                      "ml-1.5 tabular-nums",
                      isActive ? "text-foreground" : "text-muted/60",
                    ].join(" ")}
                  >
                    {leadPartyCounts[partyId]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {hasLeadFilter && (
          <button
            type="button"
            onClick={() => setLeadPartyFilter(null)}
            className="font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <section>
        {filtered.length === 0 && (
          <div className="relative border border-border bg-surface px-5 py-16 text-center">
            <CornerTicks />
            <GitBranch className="mx-auto size-8 text-muted/40" />
            <p className="mt-3 text-sm text-muted">
              {activeFilter === "all" && !hasLeadFilter
                ? "No initiatives in Scoping yet. Approve a validated initiative to advance it here."
                : "No initiatives match the current filters."}
            </p>
          </div>
        )}
        <div
          key={`${activeFilter}-${leadPartyFilter ?? ""}`}
          className="grid items-stretch gap-4 sm:grid-cols-2"
        >
          {filtered.map((item, index) => (
            <div
              key={item.id}
              className="animate-card-enter h-full"
              style={
                {
                  "--enter-delay": `${Math.min(index, 8) * 45}ms`,
                } as React.CSSProperties
              }
            >
              <ScopingCard item={item} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
