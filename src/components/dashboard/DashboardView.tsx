import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Layers,
  TrendingUp,
  Zap,
} from "lucide-react";
import { STAGES, FAST_TRACK, getParty } from "@/data/workflow";
import {
  MOCK_INITIATIVES,
  countByPriority,
  countByStage,
  type Initiative,
  type InitiativePriority,
} from "@/data/mock-initiatives";
import { WorkspaceChip } from "@/components/WorkspaceChip";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="border border-border bg-surface p-4">
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p
        className="font-display mt-2 text-3xl font-extrabold tabular-nums"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function PriorityColumn({
  priority,
  label,
  initiatives,
}: {
  priority: InitiativePriority;
  label: string;
  initiatives: Initiative[];
}) {
  const accentMap: Record<InitiativePriority, string> = {
    now: "#FFFFFF",
    next: "#7E90A3",
    later: "#CEFF00",
    rollout: "#FF3B1F",
  };

  return (
    <div className="flex min-w-[220px] flex-1 flex-col border border-border bg-surface">
      <div
        className="border-b border-border px-4 py-3"
        style={{ borderTopWidth: 3, borderTopColor: accentMap[priority] }}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-xs font-bold uppercase tracking-wide">
            {label}
          </p>
          <span className="font-display text-lg font-extrabold tabular-nums text-muted">
            {initiatives.length}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {initiatives.map((init) => {
          const stage = STAGES.find((s) => s.id === init.stageId);
          const party = init.leadParty ? getParty(init.leadParty) : null;
          return (
            <Link
              key={init.id}
              href={`/initiatives/${init.id}`}
              className="group block border border-border bg-surface-elevated p-3 transition-colors hover:border-border-strong hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                  {init.id}
                </span>
                {init.isFastTrack && (
                  <span className="flex items-center gap-1 border border-foreground/30 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-wider text-foreground">
                    <Zap className="size-2.5" />
                    FT
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-sm font-medium leading-snug group-hover:text-foreground">
                {init.title}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {stage && (
                  <span className="border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted">
                    {stage.name}
                  </span>
                )}
                {party && (
                  <span
                    className="border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ borderColor: party.color, color: party.color }}
                  >
                    {party.short}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {initiatives.length === 0 && (
          <p className="py-6 text-center text-xs text-muted">No initiatives</p>
        )}
      </div>
    </div>
  );
}

function PipelineStageBar({
  stageId,
  name,
  count,
  max,
}: {
  stageId: string;
  name: string;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
        {name}
      </span>
      <div className="relative h-6 flex-1 border border-border bg-surface-elevated">
        <div
          className="absolute inset-y-0 left-0 bg-white/15 transition-all"
          style={{ width: `${pct}%` }}
        />
        <span className="absolute inset-0 flex items-center px-2 font-display text-xs font-bold tabular-nums">
          {count}
        </span>
      </div>
    </div>
  );
}

export function DashboardView() {
  const activeCount = MOCK_INITIATIVES.filter((i) => i.status === "active").length;
  const fastTrackCount = MOCK_INITIATIVES.filter((i) => i.isFastTrack).length;
  const maxStageCount = Math.max(...STAGES.map((s) => countByStage(s.id)), 1);

  const byPriority = (p: InitiativePriority) =>
    MOCK_INITIATIVES.filter((i) => i.priority === p && i.status === "active");

  const recent = [...MOCK_INITIATIVES]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
            Governance Overview
          </p>
          <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
            Dashboard
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted">
            Central view for initiative status across the Production Framework
            — powered by the <WorkspaceChip />.
          </p>
        </div>
        <Link
          href="/ideas/new"
          className="inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
        >
          Submit New Idea
          <ArrowRight className="size-3.5" />
        </Link>
      </header>

      {/* Stats row */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <StatCard label="Active Initiatives" value={activeCount} />
        <StatCard
          label="In Production"
          value={countByStage("production")}
          sub="Stage 7 · delivery active"
        />
        <StatCard
          label="Fast-Track"
          value={fastTrackCount}
          sub={FAST_TRACK.condition}
          accent="#FFFFFF"
        />
        <StatCard
          label="Awaiting Go/No-Go"
          value={countByStage("go-nogo")}
          sub="Leadership decision pending"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Now / Next / Later / Rollout */}
        <section className="lg:col-span-8">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="size-4 text-muted" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">
              Now / Next / Later / Rollout
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <PriorityColumn
              priority="now"
              label="Now"
              initiatives={byPriority("now")}
            />
            <PriorityColumn
              priority="next"
              label="Next"
              initiatives={byPriority("next")}
            />
            <PriorityColumn
              priority="later"
              label="Later"
              initiatives={byPriority("later")}
            />
            <PriorityColumn
              priority="rollout"
              label="Rollout"
              initiatives={byPriority("rollout")}
            />
          </div>
        </section>

        {/* Pipeline by stage */}
        <section className="lg:col-span-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-muted" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">
              Pipeline by Stage
            </h2>
          </div>
          <div className="space-y-2 border border-border bg-surface p-4">
            {STAGES.map((stage) => (
              <PipelineStageBar
                key={stage.id}
                stageId={stage.id}
                name={stage.name}
                count={countByStage(stage.id)}
                max={maxStageCount}
              />
            ))}
          </div>
          <div className="mt-3 border border-border bg-surface-elevated px-4 py-3 text-xs text-muted">
            <span className="font-display font-bold uppercase tracking-wide text-foreground">
              {countByPriority("now")} Now
            </span>
            {" · "}
            <span>{countByPriority("next")} Next</span>
            {" · "}
            <span>{countByPriority("later")} Later</span>
            {" · "}
            <span>{countByPriority("rollout")} Rollout</span>
          </div>
        </section>
      </div>

      {/* Recent activity */}
      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="size-4 text-muted" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">
            Recent Activity
          </h2>
        </div>
        <div className="border border-border">
          {recent.map((init, i) => {
            const stage = STAGES.find((s) => s.id === init.stageId);
            return (
              <Link
                key={init.id}
                href={`/initiatives/${init.id}`}
                className={[
                  "flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]",
                  i > 0 ? "border-t border-border" : "",
                ].join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                      {init.id}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {init.title}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {stage?.name ?? init.stageId} · Updated {init.updatedAt}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
