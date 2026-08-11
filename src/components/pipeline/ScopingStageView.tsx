"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckSquare,
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
import { STAGES, getParty, PARTIES } from "@/data/workflow";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { PipelineStrip } from "@/components/pipeline/PipelineStrip";
import type { InitiativeWithUsers } from "@/lib/queries";
import { isScopingComplete, type ScopingData } from "@/lib/validation-data";

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const stage = STAGES.find((s) => s.id === "scoping")!;
const party = getParty(stage.parties[0]);

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

function resolvePartyLabel(stored: string | undefined): string | undefined {
  if (!stored) return undefined;
  if (stored === "as") return "Adsomnia Internal";
  return PARTIES.find((p) => p.id === stored)?.label ?? stored;
}

function resolvePartyColor(stored: string | undefined): string {
  if (!stored) return "#666666";
  const p = PARTIES.find((party) => party.id === stored);
  return p?.color ?? "#FFFFFF";
}

function getScopingSectionCount(data: ScopingData | null): number {
  if (!data) return 0;
  let count = 0;
  if ((data.milestones?.length ?? 0) > 0) count++;
  if ((data.team?.length ?? 0) > 0) count++;
  if ((data.scopeItems?.length ?? 0) > 0) count++;
  if ((data.dependencies ?? "").trim().length > 0) count++;
  return count;
}

function getTotalHours(data: ScopingData | null): number {
  if (!data?.team) return 0;
  return data.team.reduce((sum, t) => sum + (t.totalHours || 0), 0);
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
  const milestonesCount = sd?.milestones?.length ?? 0;
  const teamCount = sd?.team?.length ?? 0;
  const totalHours = getTotalHours(sd);
  const inScopeCount =
    sd?.scopeItems?.filter((s) => s.inScope).length ?? 0;
  const outScopeCount =
    sd?.scopeItems?.filter((s) => !s.inScope).length ?? 0;

  return (
    <Link
      href={`/workstreams/${item.id}`}
      className="group relative flex h-full flex-col border border-border bg-surface transition-colors hover:border-border-strong hover:bg-white/[0.02]"
    >
      <CornerTicks className={hoverTicks} />
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
                className="h-full transition-[width] duration-300"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: "#CEFF00",
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
            <span
              className="inline-flex items-center gap-1 text-muted"
              title="Draft saved"
            >
              <Save className="size-3" />
              <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                Saved
              </span>
            </span>
          )}
          <Clock className="size-3" />
          {daysSinceUpdate === 0
            ? "Today"
            : daysSinceUpdate === 1
              ? "1 day ago"
              : `${daysSinceUpdate} days ago`}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 py-4">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-foreground">
          {item.title}
        </h3>

        <div className="mt-3 grid flex-1 grid-cols-2 gap-px bg-border">
          <div className="flex min-h-[72px] flex-col bg-surface p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-muted">
              <Calendar className="size-3" />
              <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/60">
                Milestones & Timeline
              </p>
            </div>
            <div className="flex-1">
              {milestonesCount > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted">
                    {milestonesCount} milestone{milestonesCount !== 1 ? "s" : ""}
                  </p>
                  {sd!.milestones!.slice(0, 2).map((m) => (
                    <p
                      key={m.id}
                      className="truncate text-[10px] leading-relaxed text-muted/70"
                    >
                      {m.epic}: {m.milestone}
                    </p>
                  ))}
                  {milestonesCount > 2 && (
                    <p className="text-[10px] text-muted/50">
                      +{milestonesCount - 2} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted">—</p>
              )}
            </div>
          </div>
          <div className="flex min-h-[72px] flex-col bg-surface p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-muted">
              <Users className="size-3" />
              <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/60">
                Team & Hours
              </p>
            </div>
            <div className="flex-1">
              {teamCount > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted">
                    {teamCount} member{teamCount !== 1 ? "s" : ""}
                  </p>
                  <p className="text-[10px] tabular-nums text-muted/70">
                    {totalHours}h total
                  </p>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted">—</p>
              )}
            </div>
          </div>
          <div className="flex min-h-[72px] flex-col bg-surface p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-muted">
              <CheckSquare className="size-3" />
              <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/60">
                Scope Boundaries
              </p>
            </div>
            <div className="flex-1">
              {inScopeCount > 0 || outScopeCount > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium text-muted">
                    <span className="text-foreground/80">{inScopeCount}</span> in
                  </span>
                  <span className="text-[10px] font-medium text-muted">
                    <span className="text-muted/70">{outScopeCount}</span> out
                  </span>
                </div>
              ) : (
                <p className="text-xs leading-relaxed text-muted">—</p>
              )}
            </div>
          </div>
          <div className="flex min-h-[72px] flex-col bg-surface p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-muted">
              <Building2 className="size-3" />
              <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/60">
                Lead Party
              </p>
            </div>
            <div className="flex-1">
              {leadParty ? (
                <span
                  className="inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{
                    borderColor: resolvePartyColor(leadParty),
                    color: resolvePartyColor(leadParty),
                  }}
                >
                  {resolvePartyLabel(leadParty)}
                </span>
              ) : (
                <p className="text-xs leading-relaxed text-muted">—</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <GitBranch className="size-3" />
            <span>
              {isScopingComplete(sd) ? "Complete" : "In progress"}
            </span>
          </div>
          <div className="text-[10px] text-muted/50">
            Sponsor: {item.sponsor.name}
          </div>
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
      <header className="relative mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <BrandTexture variant="hero" />
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <span
              className="flex size-9 shrink-0 items-center justify-center border text-sm font-bold"
              style={{ borderColor: party.color, color: party.color }}
            >
              03
            </span>
            <h1 className="font-display truncate text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
              Scoping
            </h1>
          </div>
        </div>
        <PipelineStrip
          currentStageId="scoping"
          className="shrink-0 sm:w-[440px] lg:w-[560px]"
        />
      </header>

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
                  {p.short}
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
