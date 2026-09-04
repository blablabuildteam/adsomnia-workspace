"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { refreshProductionOverview } from "@/app/(workspace)/pipeline/production/actions";
import { ConsensusPriorityChip } from "@/components/production/ConsensusPriorityChip";
import { ProductionHealthBadge } from "@/components/production/ProductionHealthBadge";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { PARTIES } from "@/data/workflow";
import {
  formatShortDate,
  HEALTH_META,
  type ProductionHealth,
  type ProductionLeadParty,
} from "@/lib/production/health";
import type {
  AttentionKind,
  ProductionReport,
  ReportPartyId,
  ReportPartyRollup,
  ReportRow,
} from "@/lib/production/report";

type Props = {
  report: ProductionReport;
};

const ATTENTION_KIND_LABEL: Record<AttentionKind, string> = {
  critical: "Critical",
  "at-risk": "At risk",
  overdue: "Overdue",
  "due-soon": "Due soon",
  "flagged-epics": "Flagged",
  jira: "Jira",
};

function partyMeta(id: ProductionLeadParty | null) {
  if (!id) return null;
  return PARTIES.find((party) => party.id === id) ?? null;
}

function partyLabel(id: ReportPartyId) {
  if (id === "unassigned") return "Unassigned";
  return PARTIES.find((party) => party.id === id)?.short ?? id.toUpperCase();
}

function partyColor(id: ReportPartyId) {
  if (id === "unassigned") return "#A1A1A1";
  return PARTIES.find((party) => party.id === id)?.color ?? "#FFFFFF";
}

function formatWeekOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatUpdatedAt(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHours(hours: number): string {
  if (hours <= 0) return "—";
  return `${Math.round(hours).toLocaleString("en-US")}h`;
}

function projectHref(id: number) {
  return `/pipeline/production?project=${id}`;
}

function dateCell(iso?: string, days?: number) {
  if (!iso) return "—";
  const label = formatShortDate(iso);
  if (days === undefined) return label;
  if (days < 0) return `${label} · ${Math.abs(days)}d overdue`;
  if (days === 0) return `${label} · today`;
  return `${label} · ${days}d`;
}

function PulseStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="relative border border-border bg-surface px-3 py-3">
      <CornerTicks />
      <p className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
        {label}
      </p>
      <p
        className="mt-1 font-display text-2xl font-extrabold tabular-nums leading-none"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function PartyCard({ rollup }: { rollup: ReportPartyRollup }) {
  const mix: { key: ProductionHealth; count: number }[] = [
    { key: "critical", count: rollup.critical },
    { key: "at-risk", count: rollup.atRisk },
    { key: "on-track", count: rollup.onTrack },
    { key: "unscored", count: rollup.unscored },
  ];

  return (
    <div className="relative border border-border bg-surface px-4 py-3">
      <CornerTicks />
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-display text-xs font-bold uppercase tracking-wide"
          style={{ color: partyColor(rollup.partyId) }}
        >
          {partyLabel(rollup.partyId)}
        </span>
        <span className="font-display text-xs font-bold tabular-nums text-muted">
          {rollup.projects}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {mix.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-1.5 font-display text-[10px] font-bold uppercase tracking-wide tabular-nums text-muted"
          >
            <span
              className="size-1.5"
              style={{ backgroundColor: HEALTH_META[item.key].color }}
            />
            {item.count}
          </span>
        ))}
      </div>
      <p className="mt-3 font-display text-[10px] font-bold uppercase tracking-wide text-muted">
        Booked {formatHours(rollup.bookedHours)}
      </p>
    </div>
  );
}

function PortfolioRow({
  row,
  bordered,
}: {
  row: ReportRow;
  bordered: boolean;
}) {
  const party = partyMeta(row.leadPartyId);
  return (
    <li>
      <Link
        href={projectHref(row.projectId)}
        className={[
          "group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 transition-colors hover:bg-white/[0.03] sm:grid-cols-[auto_minmax(0,1.4fr)_auto_auto_auto_auto] sm:gap-4",
          bordered ? "border-t border-border" : "",
        ].join(" ")}
      >
        <ProductionHealthBadge health={row.health} compact />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {row.title}
          </p>
          <p className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
            {row.ticketId}
          </p>
        </div>
        <span
          className="hidden font-display text-[10px] font-bold uppercase tracking-wide sm:inline"
          style={{ color: party?.color ?? "#A1A1A1" }}
        >
          {party?.short ?? "—"}
        </span>
        <span className="hidden font-display text-[10px] font-bold tabular-nums text-muted sm:inline">
          {row.totalTickets === 0
            ? "—"
            : `${Math.round(row.ticketsDonePct)}% · ${row.doneTickets}/${row.totalTickets}`}
        </span>
        <span className="hidden font-display text-[10px] font-bold tabular-nums text-muted sm:inline">
          {dateCell(row.nearestEndDate, row.daysUntil)}
        </span>
        <span className="justify-self-end">
          <ConsensusPriorityChip
            value={row.consensusPriority}
            compact
          />
        </span>
      </Link>
    </li>
  );
}

export function ProductionReportView({ report }: Props) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const { pulse } = report;

  function refresh() {
    startRefresh(async () => {
      await refreshProductionOverview();
      router.refresh();
    });
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-8">
        <BrandTexture variant="hero" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              Week of {formatWeekOf(report.weekOf)}
            </p>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
              Production Report
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Live production glance for the weekly leadership update. Open a
              row to walk the project on the Production board.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Updated {formatUpdatedAt(report.generatedAt)}
            </p>
            <button
              type="button"
              onClick={refresh}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw
                className={["size-3.5", refreshing ? "animate-spin" : ""].join(
                  " ",
                )}
              />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <section className="mb-10">
        <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
          Pulse
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <PulseStat label="Active" value={pulse.active} />
          <PulseStat
            label="Critical"
            value={pulse.critical}
            color={HEALTH_META.critical.color}
          />
          <PulseStat
            label="At risk"
            value={pulse.atRisk}
            color={HEALTH_META["at-risk"].color}
          />
          <PulseStat
            label="On track"
            value={pulse.onTrack}
            color={HEALTH_META["on-track"].color}
          />
          <PulseStat
            label="Unscored"
            value={pulse.unscored}
            color={HEALTH_META.unscored.color}
          />
          <PulseStat
            label="Booked hours"
            value={formatHours(pulse.bookedHours)}
          />
        </div>
        <p className="mt-3 font-display text-[11px] font-bold uppercase tracking-wide text-muted">
          Tickets {pulse.doneTickets}/{pulse.totalTickets} done
          {pulse.inProgressTickets > 0
            ? ` · ${pulse.inProgressTickets} in progress`
            : ""}
        </p>
      </section>

      <div className="mb-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                Meeting script
              </p>
              <h2 className="font-display text-sm font-bold uppercase tracking-wide">
                Needs attention
              </h2>
            </div>
            <span className="font-display text-xs font-bold tabular-nums text-muted">
              {report.attention.length}
            </span>
          </div>
          {report.attention.length === 0 ? (
            <div className="relative border border-border bg-surface px-4 py-6 text-sm text-muted">
              <CornerTicks />
              Nothing needs a call-out. Portfolio is clear.
            </div>
          ) : (
            <ul className="border border-border">
              {report.attention.map((item, index) => {
                const party = partyMeta(item.leadPartyId);
                return (
                  <li key={`${item.kind}-${item.projectId}`}>
                    <Link
                      href={projectHref(item.projectId)}
                      className={[
                        "group flex items-start gap-3 px-3 py-3 transition-colors hover:bg-white/[0.03]",
                        index > 0 ? "border-t border-border" : "",
                      ].join(" ")}
                    >
                      <ProductionHealthBadge health={item.health} compact />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                            {item.ticketId}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted">{item.detail}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                          {ATTENTION_KIND_LABEL[item.kind]}
                        </span>
                        {party && (
                          <span
                            className="font-display text-[10px] font-bold uppercase tracking-wide"
                            style={{ color: party.color }}
                          >
                            {party.short}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                Next 4 weeks
              </p>
              <h2 className="font-display text-sm font-bold uppercase tracking-wide">
                Coming up
              </h2>
            </div>
            <span className="font-display text-xs font-bold tabular-nums text-muted">
              {report.upcoming.length}
            </span>
          </div>
          {report.upcoming.length === 0 ? (
            <div className="relative border border-border bg-surface px-4 py-6 text-sm text-muted">
              <CornerTicks />
              No milestone or epic end dates in the next four weeks.
            </div>
          ) : (
            <ul className="border border-border">
              {report.upcoming.map((item, index) => {
                const party = partyMeta(item.leadPartyId);
                return (
                  <li key={`${item.projectId}-${item.date}-${item.kind}`}>
                    <Link
                      href={projectHref(item.projectId)}
                      className={[
                        "group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-white/[0.03]",
                        index > 0 ? "border-t border-border" : "",
                      ].join(" ")}
                    >
                      <div className="w-16 shrink-0">
                        <p className="font-display text-sm font-bold tabular-nums text-foreground">
                          {formatShortDate(item.date)}
                        </p>
                        <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                          {item.daysUntil === 0
                            ? "Today"
                            : `${item.daysUntil}d`}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {item.kind === "milestone"
                            ? item.label || "Milestone"
                            : "Nearest epic end"}
                        </p>
                      </div>
                      {party && (
                        <span
                          className="shrink-0 font-display text-[10px] font-bold uppercase tracking-wide"
                          style={{ color: party.color }}
                        >
                          {party.short}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="mb-10">
        <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
          By lead party
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {report.byParty.map((rollup) => (
            <PartyCard key={rollup.partyId} rollup={rollup} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
              Portfolio
            </p>
            <h2 className="font-display text-sm font-bold uppercase tracking-wide">
              All active projects
            </h2>
          </div>
          <span className="font-display text-xs font-bold tabular-nums text-muted">
            {report.rows.length}
          </span>
        </div>
        {report.rows.length === 0 ? (
          <div className="relative border border-border bg-surface px-4 py-10 text-center text-sm text-muted">
            <CornerTicks />
            No workstreams are in Production yet.
          </div>
        ) : (
          <div className="border border-border">
            <div className="hidden border-b border-border px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wide text-muted sm:grid sm:grid-cols-[auto_minmax(0,1.4fr)_auto_auto_auto_auto] sm:gap-4">
              <span>Health</span>
              <span>Project</span>
              <span>Party</span>
              <span>Tickets</span>
              <span>Next date</span>
              <span className="justify-self-end">Priority</span>
            </div>
            <ul>
              {report.rows.map((row, index) => (
                <PortfolioRow
                  key={row.projectId}
                  row={row}
                  bordered={index > 0}
                />
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
