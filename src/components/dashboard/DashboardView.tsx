import Link from "next/link";
import {
  ArrowRight,
  Clock,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { STAGES, getStageColor } from "@/data/workflow";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import type { InitiativeWithUsers } from "@/lib/queries";

const hoverTicks = "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

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
    <div className="group relative border border-border bg-surface p-4 transition-colors hover:border-border-strong">
      <CornerTicks className={hoverTicks} />
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

const STATUS_COLORS: Record<string, string> = {
  submitted: "#FFFFFF",
  approved: "#22c55e",
  rejected: "#FF3B1F",
  "on-hold": "#7E90A3",
  draft: "#666666",
};

function StatusColumn({
  status,
  label,
  items,
}: {
  status: string;
  label: string;
  items: InitiativeWithUsers[];
}) {
  const accent = STATUS_COLORS[status] ?? "#FFFFFF";

  return (
    <div className="flex min-w-[220px] flex-1 flex-col border border-border bg-surface">
      <div
        className="border-b border-border px-4 py-3"
        style={{ borderTopWidth: 3, borderTopColor: accent }}
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-xs font-bold uppercase tracking-wide">
            {label}
          </p>
          <span className="font-display text-lg font-extrabold tabular-nums text-muted">
            {items.length}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        {items.map((init) => {
          const stage = STAGES.find((s) => s.id === init.currentStage);
          return (
            <Link
              key={init.id}
              href={`/initiatives/${init.id}`}
              className="group relative block border border-border bg-surface-elevated p-3 transition-colors hover:border-border-strong hover:bg-white/[0.04]"
            >
              <CornerTicks className={hoverTicks} />
              <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                {init.ticketId}
              </span>
              <p className="mt-1.5 text-sm font-medium leading-snug group-hover:text-foreground">
                {init.title}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {stage && (
                  <span
                    className="border px-1.5 py-0.5 text-[10px] uppercase tracking-wide"
                    style={{
                      borderColor: getStageColor(stage.id),
                      color: getStageColor(stage.id),
                    }}
                  >
                    {stage.name}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {items.length === 0 && (
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
  const color = getStageColor(stageId);
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-28 shrink-0 font-display text-[10px] font-bold uppercase tracking-wide"
        style={{ color }}
      >
        {name}
      </span>
      <div className="relative h-6 flex-1 border border-border bg-surface-elevated">
        <div
          className="absolute inset-y-0 left-0 transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            opacity: 0.28,
          }}
        />
        <span className="absolute inset-0 flex items-center px-2 font-display text-xs font-bold tabular-nums">
          {count}
        </span>
      </div>
    </div>
  );
}

type DashboardProps = {
  initiatives: InitiativeWithUsers[];
  stageCounts: Record<string, number>;
  statusCounts: Record<string, number>;
};

export function DashboardView({
  initiatives: items,
  stageCounts,
  statusCounts,
}: DashboardProps) {
  const total = items.length;
  const submittedCount = statusCounts["submitted"] ?? 0;
  const approvedCount = statusCounts["approved"] ?? 0;

  const byStatus = (s: string) => items.filter((i) => i.status === s);

  const recent = items.slice(0, 5);

  const maxStageCount = Math.max(
    ...STAGES.map((s) => stageCounts[s.id] ?? 0),
    1,
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <BrandTexture variant="hero" />
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
          className="group inline-flex items-center gap-2 border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-opacity hover:opacity-90"
        >
          Submit New Initiative
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
        <StatCard label="Total Initiatives" value={total} />
        <StatCard
          label="Awaiting Approval"
          value={submittedCount}
          sub="Submitted — pending review"
        />
        <StatCard
          label="Approved"
          value={approvedCount}
          sub="Advanced to next stage"
          accent="#22c55e"
        />
        <StatCard
          label="Rejected / On Hold"
          value={(statusCounts["rejected"] ?? 0) + (statusCounts["on-hold"] ?? 0)}
          sub="Requires attention"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8">
          <div className="mb-4 flex items-center gap-2">
            <Inbox className="size-4 text-muted" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">
              By Status
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            <StatusColumn
              status="submitted"
              label="Submitted"
              items={byStatus("submitted")}
            />
            <StatusColumn
              status="approved"
              label="Approved"
              items={byStatus("approved")}
            />
            <StatusColumn
              status="on-hold"
              label="On Hold"
              items={byStatus("on-hold")}
            />
            <StatusColumn
              status="rejected"
              label="Rejected"
              items={byStatus("rejected")}
            />
          </div>
        </section>

        <section className="lg:col-span-4">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-muted" />
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">
              Pipeline by Stage
            </h2>
          </div>
          <div className="relative border border-border bg-surface p-4">
            <CornerTicks />
            <div className="space-y-2">
              {STAGES.map((stage) => (
                <PipelineStageBar
                  key={stage.id}
                  stageId={stage.id}
                  name={stage.name}
                  count={stageCounts[stage.id] ?? 0}
                  max={maxStageCount}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="size-4 text-muted" />
          <h2 className="font-display text-sm font-bold uppercase tracking-wide">
            Recent Activity
          </h2>
        </div>
        <div className="border border-border">
          {recent.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted">
              No initiatives yet. Submit your first initiative to get started.
            </div>
          )}
          {recent.map((init, i) => {
            const stage = STAGES.find((s) => s.id === init.currentStage);
            const statusBadge = init.status === "submitted"
              ? "Submitted"
              : init.status === "approved"
                ? "Approved"
                : init.status === "rejected"
                  ? "Rejected"
                  : init.status === "on-hold"
                    ? "On Hold"
                    : init.status;

            return (
              <Link
                key={init.id}
                href={`/initiatives/${init.id}`}
                className={[
                  "group flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-white/[0.03]",
                  i > 0 ? "border-t border-border" : "",
                ].join(" ")}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                      {init.ticketId}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {init.title}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {stage?.name ?? init.currentStage} · {statusBadge} ·
                    Updated{" "}
                    {init.updatedAt.toLocaleDateString("en-US", {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
