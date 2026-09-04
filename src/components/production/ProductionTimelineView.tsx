"use client";

import { useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Calendar } from "lucide-react";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { ConsensusPriorityChip } from "@/components/production/ConsensusPriorityChip";
import { ProductionHealthBadge } from "@/components/production/ProductionHealthBadge";
import {
  EpicTicketGroups,
  STATUS_COLORS,
  StatusFillBar,
  ticketShare,
} from "@/components/production/epic-tickets";
import { PARTIES } from "@/data/workflow";
import {
  dateToMs,
  formatShortDate,
  HEALTH_META,
  todayIso,
  type ProductionEpic,
  type ProductionProject,
} from "@/lib/production/health";

const DAY_MS = 86_400_000;
const PAD_DAYS = 7;

function partyMeta(id: string | null) {
  if (!id) return null;
  return PARTIES.find((party) => party.id === id) ?? null;
}

function datedEpics(project: ProductionProject): ProductionEpic[] {
  return project.epics.filter((epic) => epic.startDate && epic.endDate);
}

function buildRange(projects: ProductionProject[], today: string) {
  const dates: string[] = [today];
  for (const project of projects) {
    for (const epic of datedEpics(project)) {
      if (epic.startDate) dates.push(epic.startDate);
      if (epic.endDate) dates.push(epic.endDate);
    }
  }
  dates.sort();
  const start = dateToMs(dates[0]) - PAD_DAYS * DAY_MS;
  const end = dateToMs(dates[dates.length - 1]) + PAD_DAYS * DAY_MS;
  return { start, end, span: Math.max(end - start, DAY_MS) };
}

function monthTicks(start: number, end: number) {
  const ticks: { ms: number; label: string }[] = [];
  const first = new Date(start);
  const cursor = Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1);
  for (let ms = cursor; ms <= end; ms = Date.UTC(
    new Date(ms).getUTCFullYear(),
    new Date(ms).getUTCMonth() + 1,
    1,
  )) {
    if (ms >= start) {
      ticks.push({
        ms,
        label: new Date(ms).toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
          timeZone: "UTC",
        }),
      });
    }
  }
  return ticks;
}

function leftPct(ms: number, range: { start: number; span: number }) {
  return ((ms - range.start) / range.span) * 100;
}

type HoverState = {
  epic: ProductionEpic;
  anchor: { top: number; bottom: number; left: number; width: number };
};

const VIEWPORT_PAD = 12;
const HOVER_GAP = 8;

function EpicHoverCard({
  hover,
  onKeep,
  onLeave,
}: {
  hover: HoverState;
  onKeep: () => void;
  onLeave: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({
    top: hover.anchor.top,
    left: hover.anchor.left,
    maxHeight: 360,
    ready: false,
  });
  const color = HEALTH_META[hover.epic.health ?? "unscored"].color;
  const todo = Math.max(
    hover.epic.total - hover.epic.done - hover.epic.inProgress,
    0,
  );

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceAbove = hover.anchor.top - VIEWPORT_PAD;
    const spaceBelow = vh - hover.anchor.bottom - VIEWPORT_PAD;
    const placeAbove = spaceAbove >= 180 && spaceAbove >= spaceBelow;
    const available = (placeAbove ? spaceAbove : spaceBelow) - HOVER_GAP;
    const maxHeight = Math.max(160, available);

    card.style.maxHeight = `${maxHeight}px`;
    const width = Math.min(card.offsetWidth, vw - VIEWPORT_PAD * 2);
    const height = card.offsetHeight;

    let left =
      hover.anchor.left + hover.anchor.width / 2 - width / 2;
    left = Math.min(Math.max(VIEWPORT_PAD, left), vw - width - VIEWPORT_PAD);

    let top = placeAbove
      ? hover.anchor.top - HOVER_GAP - height
      : hover.anchor.bottom + HOVER_GAP;
    if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;
    if (top + height > vh - VIEWPORT_PAD) {
      top = Math.max(VIEWPORT_PAD, vh - VIEWPORT_PAD - height);
    }

    setPos({ top, left, maxHeight, ready: true });
  }, [hover.epic.key, hover.anchor]);

  return createPortal(
    <div
      ref={cardRef}
      role="tooltip"
      className="fixed z-[80] flex w-80 flex-col overflow-hidden border border-border-strong bg-surface-elevated shadow-[0_16px_48px_rgba(0,0,0,0.8)]"
      style={{
        top: pos.top,
        left: pos.left,
        maxHeight: pos.maxHeight,
        visibility: pos.ready ? "visible" : "hidden",
      }}
      onMouseEnter={onKeep}
      onMouseLeave={onLeave}
    >
      <div
        className="shrink-0 border-b border-border px-3 py-2.5"
        style={{ borderTop: `2px solid ${color}` }}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
            {hover.epic.key}
          </p>
          <ProductionHealthBadge
            health={hover.epic.health ?? "unscored"}
            compact
          />
        </div>
        <p className="mt-1 text-sm font-semibold leading-snug">{hover.epic.name}</p>
        {hover.epic.startDate && hover.epic.endDate && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-muted">
            <Calendar className="size-3" />
            {formatShortDate(hover.epic.startDate)} –{" "}
            {formatShortDate(hover.epic.endDate)}
          </p>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
        <StatusFillBar
          done={hover.epic.done}
          inProgress={hover.epic.inProgress}
          total={hover.epic.total}
        />
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          <div>
            <p
              className="font-display text-sm font-bold tabular-nums"
              style={{ color: STATUS_COLORS.done }}
            >
              {hover.epic.done}
            </p>
            <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
              Done
            </p>
          </div>
          <div>
            <p
              className="font-display text-sm font-bold tabular-nums"
              style={{ color: STATUS_COLORS.inProgress }}
            >
              {hover.epic.inProgress}
            </p>
            <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
              In progress
            </p>
          </div>
          <div>
            <p
              className="font-display text-sm font-bold tabular-nums"
              style={{ color: STATUS_COLORS.open }}
            >
              {todo}
            </p>
            <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
              Open
            </p>
          </div>
        </div>
        {hover.epic.tasks.length > 0 && (
          <EpicTicketGroups
            tasks={hover.epic.tasks}
            className="mt-3 space-y-3 border-t border-border pt-2.5"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}

type Props = {
  projects: ProductionProject[];
  onOpen: (id: number) => void;
};

export function ProductionTimelineView({ projects, onOpen }: Props) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const hideTimer = useRef<number | null>(null);
  const today = todayIso();

  function clearHide() {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function showHover(epic: ProductionEpic, event: MouseEvent<HTMLElement>) {
    clearHide();
    const rect = event.currentTarget.getBoundingClientRect();
    setHover({
      epic,
      anchor: {
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
      },
    });
  }

  function scheduleHide() {
    clearHide();
    hideTimer.current = window.setTimeout(() => setHover(null), 160);
  }
  const withDates = projects.filter((project) => datedEpics(project).length > 0);
  const withoutDates = projects.filter(
    (project) => datedEpics(project).length === 0,
  );

  if (withDates.length === 0) {
    return (
      <div className="relative border border-border bg-surface px-5 py-16 text-center">
        <CornerTicks />
        <p className="text-sm text-muted">
          No dated epics to place on a timeline yet. Projects still appear in
          the list view.
        </p>
      </div>
    );
  }

  const range = buildRange(withDates, today);
  const ticks = monthTicks(range.start, range.end);
  const todayLeft = leftPct(dateToMs(today), range);

  return (
    <div className="space-y-4">
    <div className="border border-border bg-surface">
      <div className="grid grid-cols-[minmax(14rem,20rem)_1fr] border-b border-border">
        <div className="flex items-end justify-between gap-3 border-r border-border px-4 py-3">
          <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Project title
          </p>
          <p className="font-display shrink-0 text-[10px] font-bold uppercase tracking-wide text-muted">
            WS ID
          </p>
        </div>
        <div className="relative min-h-10 overflow-hidden">
          {ticks.map((tick) => (
            <span
              key={tick.ms}
              className="absolute top-2 -translate-x-1/2 font-display text-[10px] font-bold uppercase tracking-wide text-muted/70"
              style={{ left: `${leftPct(tick.ms, range)}%` }}
            >
              {tick.label}
            </span>
          ))}
          <span
            className="absolute top-0 bottom-0 w-px bg-foreground/50"
            style={{ left: `${todayLeft}%` }}
          />
          <span
            className="absolute top-7 -translate-x-1/2 font-display text-[9px] font-bold uppercase tracking-wider text-foreground"
            style={{ left: `${todayLeft}%` }}
          >
            Today
          </span>
        </div>
      </div>

      <ul>
        {withDates.map((project) => {
          const party = partyMeta(project.leadPartyId);
          const epics = datedEpics(project);
          return (
            <li
              key={project.id}
              className="grid grid-cols-[minmax(14rem,20rem)_1fr] border-b border-border last:border-b-0"
            >
              <button
                type="button"
                onClick={() => onOpen(project.id)}
                className="border-r border-border px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-sm font-semibold">
                    {project.title}
                  </p>
                  <span className="font-display shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">
                    {project.ticketId}
                  </span>
                </div>
                <div className="mt-2 border border-border px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <ProductionHealthBadge health={project.health} compact />
                    <span className="font-display text-[11px] font-bold tabular-nums">
                      {Math.round(project.ticketsDonePct)}%
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    {project.doneTickets}/{project.totalTickets} tickets
                  </p>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    {party ? (
                      <p
                        className="font-display text-[10px] font-bold uppercase tracking-wide"
                        style={{ color: party.color }}
                      >
                        {party.label}
                      </p>
                    ) : (
                      <span />
                    )}
                    <ConsensusPriorityChip
                      value={project.brief.consensusPriority}
                      compact
                    />
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onOpen(project.id)}
                className="relative overflow-visible px-0 py-3 text-left hover:bg-white/[0.02]"
              >
                {ticks.map((tick) => (
                  <span
                    key={`${project.id}-${tick.ms}`}
                    className="absolute inset-y-0 w-px bg-white/[0.04]"
                    style={{ left: `${leftPct(tick.ms, range)}%` }}
                  />
                ))}
                <span
                  className="absolute inset-y-0 w-px bg-foreground/35"
                  style={{ left: `${todayLeft}%` }}
                />
                <span className="relative flex flex-col gap-1.5 py-1">
                  {epics.map((epic) => {
                    const start = dateToMs(epic.startDate!);
                    const end = dateToMs(epic.endDate!);
                    const left = leftPct(start, range);
                    const width = Math.max(((end - start) / range.span) * 100, 1.2);
                    const color = HEALTH_META[epic.health ?? "unscored"].color;
                    const donePct = ticketShare(epic.done, epic.total);
                    const inProgressPct = ticketShare(epic.inProgress, epic.total);
                    return (
                      <span key={epic.key} className="relative h-6">
                        <span
                          aria-hidden
                          title={HEALTH_META[epic.health ?? "unscored"].label}
                          className="absolute top-1/2 size-2.5 -translate-y-1/2"
                          style={{
                            left: `max(0px, calc(${left}% - 18px))`,
                            backgroundColor: color,
                          }}
                        />
                        <span
                          className="absolute inset-y-0 overflow-hidden border"
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                            borderColor: "transparent",
                            backgroundColor: `${STATUS_COLORS.open}40`,
                          }}
                          onMouseEnter={(event) => showHover(epic, event)}
                          onMouseLeave={scheduleHide}
                        >
                          <span
                            className="absolute inset-y-0 left-0"
                            style={{
                              width: `${donePct}%`,
                              backgroundColor: STATUS_COLORS.done,
                            }}
                          />
                          <span
                            className="absolute inset-y-0"
                            style={{
                              left: `${donePct}%`,
                              width: `${inProgressPct}%`,
                              backgroundColor: STATUS_COLORS.inProgress,
                            }}
                          />
                          <span className="relative z-[1] block truncate px-1.5 text-[10px] font-medium leading-6">
                            {epic.name}
                          </span>
                        </span>
                      </span>
                    );
                  })}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
    {withoutDates.length > 0 && (
      <div className="border border-border bg-surface px-4 py-3">
        <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          Not on the timeline
        </p>
        <p className="mt-1 text-[12px] text-muted">
          These projects have no epic start and end dates, so they cannot be
          placed on the calendar.
        </p>
        <ul className="mt-3 space-y-2">
          {withoutDates.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onOpen(project.id)}
                className="flex w-full items-center justify-between gap-3 border border-border px-3 py-2 text-left transition-colors hover:border-border-strong"
              >
                <span className="min-w-0">
                  <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
                    {project.ticketId}
                  </span>
                  <span className="ml-2 text-sm font-semibold">{project.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <ConsensusPriorityChip
                    value={project.brief.consensusPriority}
                    compact
                  />
                  <ProductionHealthBadge health={project.health} compact />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    )}
    {hover && (
      <EpicHoverCard
        hover={hover}
        onKeep={clearHide}
        onLeave={scheduleHide}
      />
    )}
    </div>
  );
}
