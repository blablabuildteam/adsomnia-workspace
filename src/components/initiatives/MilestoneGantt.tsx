"use client";

import {
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { PARTIES } from "@/data/workflow";
import type {
  ScopingMilestone,
  ScopingTeamMember,
} from "@/lib/validation-data";

export const MILESTONE_COLORS = [
  "#CEFF00",
  "#38BDF8",
  "#FF3B1F",
  "#7E90A3",
  "#22C55E",
  "#EAB308",
  "#A78BFA",
  "#F472B6",
  "#FB923C",
  "#2DD4BF",
];

const PARTY_LOGOS: Record<string, string> = {
  adsomnia: "/logos/adsomnia.png",
  btr: "/logos/bendingtherules.jpeg",
  hn: "/logos/harlemnext.webp",
  bbb: "/logos/blablabuild.png",
};

const PARTY_OPTIONS = PARTIES.filter((p) => p.id !== "as").map((p) => ({
  value: p.id,
  label: p.label,
  color: p.color,
  logo: PARTY_LOGOS[p.id],
}));

const DAY_MS = 86_400_000;

function dateToMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function msToDate(ms: number): string {
  const d = new Date(ms);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shiftDate(iso: string, days: number): string {
  return msToDate(dateToMs(iso) + days * DAY_MS);
}

function formatGanttDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

type GanttDragMode = "move" | "resize-start" | "resize-end";

function GanttBar({
  trackRef,
  leftPct,
  widthPct,
  startDate,
  endDate,
  range,
  disabled,
  title,
  className,
  style,
  children,
  onDatesChange,
  onDragActive,
}: {
  trackRef: RefObject<HTMLDivElement | null>;
  leftPct: number;
  widthPct: number;
  startDate: string;
  endDate: string;
  range: number;
  disabled?: boolean;
  title: string;
  className?: string;
  style: CSSProperties;
  children: ReactNode;
  onDatesChange?: (startDate: string, endDate: string) => void;
  onDragActive?: (active: boolean) => void;
}) {
  const interactive = Boolean(onDatesChange) && !disabled;
  const [dragging, setDragging] = useState(false);

  function beginDrag(event: ReactPointerEvent, mode: GanttDragMode) {
    if (!interactive || !onDatesChange) return;
    event.preventDefault();
    event.stopPropagation();

    const trackWidth = trackRef.current?.getBoundingClientRect().width ?? 0;
    if (trackWidth <= 0) return;

    const originX = event.clientX;
    const origStart = startDate;
    const origEnd = endDate;

    onDragActive?.(true);
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const days = Math.round(
        ((ev.clientX - originX) / trackWidth) * (range / DAY_MS),
      );
      let nextStart = origStart;
      let nextEnd = origEnd;
      if (mode === "move") {
        nextStart = shiftDate(origStart, days);
        nextEnd = shiftDate(origEnd, days);
      } else if (mode === "resize-start") {
        nextStart = shiftDate(origStart, days);
        if (dateToMs(nextStart) > dateToMs(origEnd)) nextStart = origEnd;
      } else {
        nextEnd = shiftDate(origEnd, days);
        if (dateToMs(nextEnd) < dateToMs(origStart)) nextEnd = origStart;
      }
      onDatesChange(nextStart, nextEnd);
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setDragging(false);
      onDragActive?.(false);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      className={[
        "absolute h-full",
        interactive ? (dragging ? "z-20" : "z-10") : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      }}
    >
      {dragging && (
        <div
          role="status"
          className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap border border-border bg-surface-elevated px-2 py-1 shadow-lg"
        >
          <span className="font-display text-[10px] font-bold tabular-nums tracking-wide text-foreground">
            {formatGanttDate(startDate)}
            <span className="mx-1 font-normal text-muted">–</span>
            {formatGanttDate(endDate)}
          </span>
        </div>
      )}
      <div
        className={[
          "relative flex h-full items-center gap-1.5 overflow-hidden px-2 select-none",
          interactive ? (dragging ? "cursor-grabbing" : "cursor-grab") : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          ...style,
          touchAction: interactive ? "none" : undefined,
        }}
        title={
          dragging
            ? undefined
            : interactive
              ? `${title} — drag to move, edges to resize`
              : title
        }
        onPointerDown={
          interactive ? (e) => beginDrag(e, "move") : undefined
        }
      >
        {interactive && (
          <>
            <button
              type="button"
              aria-label="Resize start date"
              className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize"
              onPointerDown={(e) => beginDrag(e, "resize-start")}
            />
            <button
              type="button"
              aria-label="Resize end date"
              className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize"
              onPointerDown={(e) => beginDrag(e, "resize-end")}
            />
          </>
        )}
        {children}
      </div>
    </div>
  );
}

export function MilestoneGantt({
  milestones,
  team = [],
  onMilestoneDates,
  onTeamDates,
  className,
}: {
  milestones: ScopingMilestone[];
  team?: ScopingTeamMember[];
  onMilestoneDates?: (id: string, startDate: string, endDate: string) => void;
  onTeamDates?: (id: string, startDate: string, endDate: string) => void;
  className?: string;
}) {
  const withDates = milestones.filter((m) => m.startDate && m.endDate);
  const teamWithDates = team.filter((t) => t.startDate && t.endDate);
  const hasBars = withDates.length > 0 || teamWithDates.length > 0;

  const allStarts = [
    ...withDates.map((m) => dateToMs(m.startDate!)),
    ...teamWithDates.map((t) => dateToMs(t.startDate!)),
  ];
  const allEnds = [
    ...withDates.map((m) => dateToMs(m.endDate!)),
    ...teamWithDates.map((t) => dateToMs(t.endDate!)),
  ];
  const rawMin = allStarts.length ? Math.min(...allStarts) : Date.now();
  const rawMax = allEnds.length ? Math.max(...allEnds) : Date.now();
  const rawRange = Math.max(rawMax - rawMin, DAY_MS);
  const pad = Math.max(3 * DAY_MS, rawRange * 0.1);
  const computedMin = rawMin - pad;
  const computedRange = rawRange + pad * 2;

  const [axisLock, setAxisLock] = useState<{
    min: number;
    range: number;
  } | null>(null);
  const minTime = axisLock?.min ?? computedMin;
  const range = axisLock?.range ?? computedRange;
  const interactive = Boolean(onMilestoneDates || onTeamDates);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeDrags = useRef(0);

  if (!hasBars) return null;

  function handleDragActive(active: boolean) {
    if (active) {
      if (activeDrags.current === 0) {
        setAxisLock({ min: computedMin, range: computedRange });
      }
      activeDrags.current += 1;
      return;
    }
    activeDrags.current = Math.max(0, activeDrags.current - 1);
    if (activeDrags.current === 0) setAxisLock(null);
  }

  function milestoneColor(m: ScopingMilestone, index: number): string {
    if (m.color) return m.color;
    return MILESTONE_COLORS[index % MILESTONE_COLORS.length];
  }

  const totalDays = Math.ceil(range / DAY_MS);
  const ticks: { label: string; pct: number }[] = [];
  const tickCount = Math.min(totalDays, 6);
  for (let i = 0; i <= tickCount; i++) {
    const t = minTime + (range * i) / tickCount;
    ticks.push({
      label: new Date(t).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
      pct: (i / tickCount) * 100,
    });
  }

  return (
    <div
      className={["border border-white/[0.12] bg-white/[0.05]", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.04] px-3 py-2">
        <span className="font-display text-[9px] font-bold uppercase tracking-widest text-muted/50">
          Timeline
        </span>
        {interactive && (
          <span className="text-[9px] text-muted/40">
            Drag bars to move · Edges to resize
          </span>
        )}
      </div>
      <div className="relative px-3 py-3">
        <div className="relative mb-2 h-4">
          {ticks.map((tick) => (
            <span
              key={tick.pct}
              className="absolute top-0 -translate-x-1/2 text-[9px] tabular-nums text-muted/50"
              style={{ left: `${tick.pct}%` }}
            >
              {tick.label}
            </span>
          ))}
        </div>

        <div ref={trackRef}>
          {withDates.length > 0 && (
            <div className="space-y-1.5">
              {withDates.map((m, i) => {
                const start = dateToMs(m.startDate!);
                const end = dateToMs(m.endDate!);
                const left = ((start - minTime) / range) * 100;
                const width = Math.max(((end - start) / range) * 100, 1.5);
                const color = milestoneColor(m, i);
                const label = m.milestone || m.epic || `Milestone ${i + 1}`;

                return (
                  <div key={m.id} className="relative flex h-7 items-center">
                    <GanttBar
                      trackRef={trackRef}
                      leftPct={left}
                      widthPct={width}
                      startDate={m.startDate!}
                      endDate={m.endDate!}
                      range={range}
                      title={`${m.epic}: ${m.milestone} (${formatGanttDate(m.startDate!)} – ${formatGanttDate(m.endDate!)})`}
                      style={{
                        backgroundColor: `${color}20`,
                        borderLeft: `2px solid ${color}`,
                      }}
                      onDatesChange={
                        onMilestoneDates
                          ? (startDate, endDate) =>
                              onMilestoneDates(m.id, startDate, endDate)
                          : undefined
                      }
                      onDragActive={handleDragActive}
                    >
                      <span
                        className="truncate text-[10px] font-medium"
                        style={{ color }}
                      >
                        {label}
                      </span>
                    </GanttBar>
                  </div>
                );
              })}
            </div>
          )}

          {teamWithDates.length > 0 && (
            <>
              <div className="my-2 border-t border-dashed border-border/50" />
              <div className="mb-1">
                <span className="font-display text-[9px] font-bold uppercase tracking-widest text-muted/40">
                  Resources
                </span>
              </div>
              <div className="space-y-1">
                {teamWithDates.map((t) => {
                  const start = dateToMs(t.startDate!);
                  const end = dateToMs(t.endDate!);
                  const left = ((start - minTime) / range) * 100;
                  const width = Math.max(((end - start) / range) * 100, 1.5);
                  const partyOpt = PARTY_OPTIONS.find(
                    (p) => p.value === t.party,
                  );
                  const barColor = partyOpt?.color ?? "#666666";
                  const partyLogo = partyOpt?.logo;

                  return (
                    <div key={t.id} className="relative flex h-6 items-center">
                      <GanttBar
                        trackRef={trackRef}
                        leftPct={left}
                        widthPct={width}
                        startDate={t.startDate!}
                        endDate={t.endDate!}
                        range={range}
                        title={`${t.name} — ${t.role} (${t.totalHours}h, ${formatGanttDate(t.startDate!)} – ${formatGanttDate(t.endDate!)})`}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.04)",
                          borderLeft: `2px solid ${barColor}`,
                        }}
                        onDatesChange={
                          onTeamDates
                            ? (startDate, endDate) =>
                                onTeamDates(t.id, startDate, endDate)
                            : undefined
                        }
                        onDragActive={handleDragActive}
                      >
                        {partyLogo && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={partyLogo}
                            alt=""
                            className="h-3.5 w-3.5 shrink-0 object-contain"
                          />
                        )}
                        <span className="truncate text-[10px] font-medium text-foreground/70">
                          {t.name || t.role}
                        </span>
                        <span className="shrink-0 text-[9px] tabular-nums text-muted/50">
                          {t.totalHours}h
                        </span>
                      </GanttBar>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {withDates.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-3 border-t border-white/[0.06] pt-2">
            {withDates.map((m, i) => {
              const c = milestoneColor(m, i);
              return (
                <span
                  key={m.id}
                  className="flex items-center gap-1.5 text-[10px] text-muted"
                >
                  <span className="size-2" style={{ backgroundColor: c }} />
                  {m.milestone.trim() || m.epic.trim() || `Milestone ${i + 1}`}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
