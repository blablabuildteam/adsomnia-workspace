"use client";

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Save,
  Send,
  SendHorizonal,
  AlertCircle,
  Check,
  Info,
  Plus,
  Trash2,
  FlaskConical,
  Calendar,
  Users,
  SplitSquareVertical,
  StickyNote,
  Milestone as MilestoneIcon,
  UserPlus,
  GripVertical,
  DollarSign,
  Paperclip,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  saveScopingData,
  submitScopingForApproval,
  resubmitScoping,
  type ScopingResult,
} from "@/app/(workspace)/workstreams/[id]/actions";
import type { GoNoGoDecision } from "./GoNoGoApprovalPanel";
import { inputClass } from "@/lib/form-styles";
import type {
  ScopingData,
  ScopingMilestone,
  ScopingTeamMember,
  ScopingScopeItem,
  BusinessValueType,
  ValidationData,
} from "@/lib/validation-data";
import {
  BUSINESS_VALUE_TYPES,
  IMPACT_DEFAULT,
  IMPACT_MAX,
  IMPACT_MIN,
  buildBusinessValueData,
  impactScoreLabel,
  isBusinessValueData,
  parseImpactScore,
  resolveBusinessValueState,
} from "@/lib/validation-data";
import { PARTIES } from "@/data/workflow";
import { formatEuro, getRoleById } from "@/data/role-rates";
import { BusinessValueTypeButton, ImpactSlider } from "./ImpactSlider";
import { AttachmentZone, AttachmentChip } from "./AttachmentZone";
import { PhaseSectionCard, PhaseSectionStack } from "./PhaseSectionCard";
import { RoleCombobox } from "./RoleCombobox";
import { ScopeCostBreakdown } from "./ScopeCostBreakdown";
import type { Attachment } from "@/lib/validation-data";

const initial: ScopingResult = {};

const IS_DEV = process.env.NODE_ENV === "development";

/* ─── Help text & icons ─────────────────────────────────── */

const FIELD_HELP: Record<string, string> = {
  milestones:
    "Break delivery into Epics and Milestones with target date windows. These feed directly into the Jira structure and capacity booking.",
  team:
    "Pick a company and catalog role (or search all roles), then add who, hours, and period. Hours × rate feed the cost estimate below.",
  impact:
    "Carried forward from Validation. Refine the impact scores if scoping changes the picture.",
  scope:
    "Define what's in scope for the first delivery slice, and what's explicitly out. Flip items between in and out.",
  notes:
    "Optional notes that do not fit elsewhere — leftover context, open questions, or anything the Go/No-Go reviewers should see.",
  attachments:
    "Attach files or paste links to Google Docs, Sheets, Slides, or any URL. These are saved with the scoping proposal.",
};

const FIELD_ICONS: Record<string, LucideIcon> = {
  milestones: Calendar,
  team: Users,
  impact: TrendingUp,
  scope: SplitSquareVertical,
  notes: StickyNote,
  attachments: Paperclip,
};

/* ─── ID generator ─────────────────────────────────────── */

let _id = 0;
function uid(): string {
  return `s${Date.now()}-${++_id}`;
}

/* ─── Milestone Colors ─────────────────────────────────── */

const MILESTONE_COLORS = [
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

function nextMilestoneColor(existing: ScopingMilestone[]): string {
  const usedColors = new Set(existing.map((m) => m.color).filter(Boolean));
  const available = MILESTONE_COLORS.find((c) => !usedColors.has(c));
  if (available) return available;
  return MILESTONE_COLORS[existing.length % MILESTONE_COLORS.length];
}

/* ─── Factories ────────────────────────────────────────── */

function emptyMilestone(existing: ScopingMilestone[] = []): ScopingMilestone {
  return { id: uid(), epic: "", milestone: "", startDate: "", endDate: "", color: nextMilestoneColor(existing) };
}

function emptyTeamMember(): ScopingTeamMember {
  return {
    id: uid(),
    role: "",
    roleId: "",
    hourlyRate: undefined,
    name: "",
    totalHours: 0,
    hoursPerDay: 0,
    startDate: "",
    endDate: "",
    party: "",
  };
}

function emptyScopeItem(inScope = true): ScopingScopeItem {
  return { id: uid(), label: "", inScope };
}

/* ─── Dev prefill ──────────────────────────────────────── */

const DEV_PREFILL: ScopingData = {
  milestones: [
    {
      id: uid(),
      epic: "Onboarding Flow Redesign",
      milestone: "User research & wireframes",
      startDate: "2026-09-01",
      endDate: "2026-09-14",
      color: "#CEFF00",
    },
    {
      id: uid(),
      epic: "Onboarding Flow Redesign",
      milestone: "Frontend implementation",
      startDate: "2026-09-15",
      endDate: "2026-10-06",
      color: "#38BDF8",
    },
    {
      id: uid(),
      epic: "Data Pipeline Migration",
      milestone: "Schema migration & testing",
      startDate: "2026-09-08",
      color: "#FF3B1F",
      endDate: "2026-09-28",
    },
  ],
  team: [
    {
      id: uid(),
      role: "Senior Frontend Engineer",
      roleId: "hn-senior-frontend-engineer",
      hourlyRate: 100,
      name: "Alex V.",
      totalHours: 120,
      hoursPerDay: 6,
      startDate: "2026-09-01",
      endDate: "2026-10-06",
      party: "hn",
    },
    {
      id: uid(),
      role: "Designer",
      roleId: "btr-designer",
      hourlyRate: 100,
      name: "Sophie K.",
      totalHours: 40,
      hoursPerDay: 4,
      startDate: "2026-09-01",
      endDate: "2026-09-14",
      party: "btr",
    },
  ],
  scopeItems: [
    { id: uid(), label: "New user onboarding wizard", inScope: true },
    { id: uid(), label: "SSO/SAML integration", inScope: true },
    { id: uid(), label: "Data pipeline v2 migration", inScope: true },
    { id: uid(), label: "Legacy API deprecation", inScope: false },
    { id: uid(), label: "Mobile app support", inScope: false },
  ],
  impact: {
    types: ["speed", "growth"],
    expectations: { speed: 8, growth: 7 },
  },
  dependencies:
    "Requires partner API v3 access (pending contract). Calendar dependency: design team on partial leave Sep 20–27. Assumes current infrastructure can handle 2× throughput.",
};

/* ─── Shared sub-components ────────────────────────────── */

function ScopingFieldInfo({ field }: { field: string }) {
  const helpText = FIELD_HELP[field];
  if (!helpText) return null;
  return (
    <span className="group relative ml-auto cursor-help">
      <Info className="size-3.5 text-muted/40 transition-colors group-hover:text-foreground" />
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded border border-border bg-surface-elevated px-3 py-2 text-[11px] font-normal normal-case tracking-normal text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {helpText}
      </span>
    </span>
  );
}

function ScopingFieldLabel({
  field,
  children,
  required = false,
  complete = false,
}: {
  field: string;
  children: ReactNode;
  required?: boolean;
  complete?: boolean;
}) {
  const Icon = FIELD_ICONS[field];
  return (
    <span
      className={[
        "flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide",
        complete ? "text-foreground" : "text-muted",
      ].join(" ")}
    >
      {Icon && <Icon className="size-3.5 shrink-0 text-muted/60" />}
      {children}
      {required && !complete && <span className="text-btr">*</span>}
      {complete && (
        <Check className="animate-check-pop size-3.5 shrink-0 text-success" />
      )}
      <ScopingFieldInfo field={field} />
    </span>
  );
}

function MiniDateInput({
  value,
  onChange,
  label,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  min?: string;
}) {
  return (
    <div className="flex-1">
      <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className="date-input w-full border border-border bg-surface-input px-2 py-1.5 text-xs text-foreground transition-colors focus:border-muted focus:outline-none [color-scheme:dark]"
        aria-label={label}
      />
    </div>
  );
}

function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[10px] text-muted">
      <span className="flex size-5 items-center justify-center border border-border font-display text-[10px] font-bold tabular-nums">
        {count}
      </span>
      {label}
    </span>
  );
}

/* ─── Gantt Chart ──────────────────────────────────────── */

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

function MilestoneGantt({
  milestones,
  team = [],
  onMilestoneDates,
  onTeamDates,
}: {
  milestones: ScopingMilestone[];
  team?: ScopingTeamMember[];
  onMilestoneDates?: (id: string, startDate: string, endDate: string) => void;
  onTeamDates?: (id: string, startDate: string, endDate: string) => void;
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
    <div className="mt-4 border border-white/[0.12] bg-white/[0.05]">
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

/* ─── Milestone Timeline Cards ─────────────────────────── */

function MilestoneColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = MILESTONE_COLORS.length;
  const radius = 24;

  return (
    <div className="relative z-10">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex size-5 shrink-0 items-center justify-center rounded-full border transition-all hover:scale-110"
        style={{ borderColor: color, backgroundColor: `${color}30` }}
        title="Change color"
        aria-label="Change milestone color"
      >
        <MilestoneIcon className="size-2.5" style={{ color }} />
      </button>
      {open && (
        <>
          {/* Invisible backdrop to close on outside click */}
          <button
            type="button"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-label="Close color picker"
          />
          <div className="absolute left-1/2 top-1/2 z-20">
            {MILESTONE_COLORS.map((c, i) => {
              const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    onChange(c);
                    setOpen(false);
                  }}
                  className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm transition-transform hover:scale-150"
                  style={{
                    backgroundColor: c,
                    borderColor: c === color ? "#FFFFFF" : "transparent",
                    left: `${x}px`,
                    top: `${y}px`,
                    animation: `color-bloom 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both`,
                    animationDelay: `${i * 25}ms`,
                  }}
                  aria-label={`Color ${c}`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MilestoneCard({
  milestone,
  index,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragTarget,
}: {
  milestone: ScopingMilestone;
  index: number;
  onChange: (updated: ScopingMilestone) => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  isDragTarget: boolean;
}) {
  const hasContent = milestone.epic.trim() || milestone.milestone.trim();
  const hasDates = milestone.startDate || milestone.endDate;
  const color = milestone.color || MILESTONE_COLORS[index % MILESTONE_COLORS.length];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={[
        "group relative border transition-colors",
        hasContent && hasDates
          ? "border-success/30 bg-success/[0.03]"
          : "border-border bg-surface",
        isDragTarget ? "ring-1 ring-bbb/50" : "",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <GripVertical className="size-3 shrink-0 cursor-grab text-muted/30 active:cursor-grabbing" />
        <span className="font-display text-[9px] font-bold uppercase tracking-widest text-muted/50">
          Milestone {index + 1}
        </span>
        <MilestoneColorPicker
          color={color}
          onChange={(c) => onChange({ ...milestone, color: c })}
        />
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove milestone"
        >
          <Trash2 className="size-3 text-btr/70 hover:text-btr" />
        </button>
      </div>
      <div className="space-y-2 p-3">
        <input
          type="text"
          value={milestone.epic}
          onChange={(e) => onChange({ ...milestone, epic: e.target.value })}
          placeholder="Epic name…"
          className="w-full border-b border-border bg-transparent px-0 py-1 font-display text-sm font-bold uppercase tracking-wide text-foreground placeholder:text-muted/40 focus:border-muted focus:outline-none"
        />
        <input
          type="text"
          value={milestone.milestone}
          onChange={(e) => onChange({ ...milestone, milestone: e.target.value })}
          placeholder="Milestone deliverable…"
          className="w-full border-b border-border bg-transparent px-0 py-1 text-xs text-foreground placeholder:text-muted/40 focus:border-muted focus:outline-none"
        />
        <div className="flex gap-2">
          <MiniDateInput
            value={milestone.startDate ?? ""}
            onChange={(v) => {
              const prev = milestone.startDate;
              const end = milestone.endDate;
              if (prev && end) {
                const duration =
                  new Date(end).getTime() - new Date(prev).getTime();
                const newEnd = new Date(
                  new Date(v).getTime() + duration,
                );
                const yyyy = newEnd.getFullYear();
                const mm = String(newEnd.getMonth() + 1).padStart(2, "0");
                const dd = String(newEnd.getDate()).padStart(2, "0");
                onChange({
                  ...milestone,
                  startDate: v,
                  endDate: `${yyyy}-${mm}-${dd}`,
                });
              } else {
                onChange({ ...milestone, startDate: v });
              }
            }}
            label="Start"
          />
          <MiniDateInput
            value={milestone.endDate ?? ""}
            onChange={(v) => onChange({ ...milestone, endDate: v })}
            label="End"
            min={milestone.startDate || undefined}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Milestone Drag Grid ──────────────────────────────── */

function MilestoneDragGrid({
  milestones,
  onReorder,
  onUpdate,
  onRemove,
}: {
  milestones: ScopingMilestone[];
  onReorder: (milestones: ScopingMilestone[]) => void;
  onUpdate: (index: number, updated: ScopingMilestone) => void;
  onRemove: (index: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) return;
    const reordered = [...milestones];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    onReorder(reordered);
    setDragIndex(null);
    setOverIndex(null);
  }

  function handleDragEnd() {
    setDragIndex(null);
    setOverIndex(null);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {milestones.map((m, i) => (
        <MilestoneCard
          key={m.id}
          milestone={m}
          index={i}
          onChange={(updated) => onUpdate(i, updated)}
          onRemove={() => onRemove(i)}
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDrop={() => handleDrop(i)}
          onDragEnd={handleDragEnd}
          isDragTarget={overIndex === i && dragIndex !== i}
        />
      ))}
    </div>
  );
}

/* ─── Team Member Cards ────────────────────────────────── */

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

function HoursBar({ hours, max }: { hours: number; max: number }) {
  const pct = max > 0 ? Math.min((hours / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full bg-border">
      <div
        className="h-full bg-bbb/60 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TeamMemberCard({
  member,
  maxHours,
  onChange,
  onRemove,
}: {
  member: ScopingTeamMember;
  maxHours: number;
  onChange: (updated: ScopingTeamMember) => void;
  onRemove: () => void;
}) {
  const filled = member.role.trim() && member.name.trim() && member.totalHours > 0;
  const selectedParty = PARTY_OPTIONS.find((p) => p.value === member.party);
  const partyColor = selectedParty?.color;
  const partyLogo = selectedParty?.logo;
  const partyLabel =
    PARTIES.find((p) => p.id === member.party)?.label ?? selectedParty?.label;
  const catalogRole = getRoleById(member.roleId);

  function selectParty(partyId: string) {
    if (member.party === partyId) {
      if (catalogRole) return;
      onChange({ ...member, party: "" });
      return;
    }
    if (catalogRole && catalogRole.party !== partyId) {
      onChange({
        ...member,
        party: partyId,
        role: "",
        roleId: "",
        hourlyRate: undefined,
      });
      return;
    }
    onChange({ ...member, party: partyId });
  }

  return (
    <div
      className={[
        "group relative border transition-colors",
        filled ? "border-success/30 bg-success/[0.03]" : "border-border bg-surface",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        {partyLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={partyLogo}
            alt={partyLabel ?? "Party"}
            title={partyLabel}
            className="h-6 w-6 shrink-0 object-contain"
          />
        ) : (
          <div
            className="flex size-6 items-center justify-center border text-[10px] font-bold uppercase"
            style={{
              borderColor: partyColor ?? "#333",
              color: partyColor ?? "#666",
            }}
          >
            {member.name ? member.name.charAt(0) : "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={member.name}
            onChange={(e) => onChange({ ...member, name: e.target.value })}
            placeholder="Person name…"
            className="w-full bg-transparent font-display text-xs font-bold uppercase tracking-wide text-foreground placeholder:text-muted/40 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove team member"
        >
          <Trash2 className="size-3 text-btr/70 hover:text-btr" />
        </button>
      </div>

      <div className="space-y-2 p-3">
        <div className="grid grid-cols-4 gap-1">
          {PARTY_OPTIONS.map((p) => {
            const selected = member.party === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => selectParty(p.value)}
                aria-pressed={selected}
                title={p.label}
                className={[
                  "flex items-center justify-center border px-1 py-1.5 transition-colors",
                  selected
                    ? "bg-foreground/[0.04]"
                    : "border-border hover:border-muted",
                ].join(" ")}
                style={{
                  color: p.color,
                  borderColor: selected ? p.color : undefined,
                }}
              >
                <span className="text-center font-display text-[10px] font-bold uppercase leading-tight tracking-wide">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>

        <RoleCombobox
          partyFilter={member.party}
          roleId={member.roleId}
          roleLabel={
            member.role && member.hourlyRate
              ? `${member.role} · €${member.hourlyRate}/h`
              : member.role
          }
          onSelect={(role) =>
            onChange({
              ...member,
              role: role.name,
              roleId: role.id,
              hourlyRate: role.hourlyRate,
              party: role.party,
            })
          }
        />

        <div className="flex gap-2">
          <div className="w-[5.5rem] shrink-0">
            <span className="mb-0.5 block text-[9px] uppercase tracking-wider text-muted/60">
              Total hours
            </span>
            <input
              type="number"
              min={0}
              value={member.totalHours || ""}
              onChange={(e) =>
                onChange({
                  ...member,
                  totalHours: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full border border-border bg-surface-input px-2 py-1.5 text-xs tabular-nums text-foreground focus:border-muted focus:outline-none"
              placeholder="0"
            />
          </div>
          <MiniDateInput
            value={member.startDate ?? ""}
            onChange={(v) => {
              const prev = member.startDate;
              const end = member.endDate;
              if (prev && end) {
                const duration =
                  new Date(end).getTime() - new Date(prev).getTime();
                const newEnd = new Date(new Date(v).getTime() + duration);
                const yyyy = newEnd.getFullYear();
                const mm = String(newEnd.getMonth() + 1).padStart(2, "0");
                const dd = String(newEnd.getDate()).padStart(2, "0");
                onChange({
                  ...member,
                  startDate: v,
                  endDate: `${yyyy}-${mm}-${dd}`,
                });
              } else {
                onChange({ ...member, startDate: v });
              }
            }}
            label="From"
          />
          <MiniDateInput
            value={member.endDate ?? ""}
            onChange={(v) => onChange({ ...member, endDate: v })}
            label="Until"
            min={member.startDate || undefined}
          />
        </div>
        <HoursBar hours={member.totalHours} max={maxHours} />
        {typeof member.hourlyRate === "number" &&
          member.hourlyRate > 0 &&
          member.totalHours > 0 && (
            <p className="text-[10px] tabular-nums text-muted/60">
              {member.totalHours}h × {formatEuro(member.hourlyRate)}/h ={" "}
              {formatEuro(member.totalHours * member.hourlyRate)}
            </p>
          )}
      </div>
    </div>
  );
}

/* ─── Scope Toggle Chips ───────────────────────────────── */

function ScopeItemChip({
  item,
  onToggle,
  onLabelChange,
  onRemove,
}: {
  item: ScopingScopeItem;
  onToggle: () => void;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className={[
        "group flex items-center gap-1.5 border px-2.5 py-1.5 transition-colors",
        item.inScope
          ? "border-success/40 bg-success/[0.06]"
          : "border-btr/30 bg-btr/[0.04]",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex size-4 shrink-0 items-center justify-center border text-[8px] font-bold transition-colors",
          item.inScope
            ? "border-success bg-success/20 text-success"
            : "border-btr/60 bg-btr/10 text-btr",
        ].join(" ")}
        title={item.inScope ? "Click to mark out of scope" : "Click to mark in scope"}
        aria-label={item.inScope ? "In scope — click to toggle" : "Out of scope — click to toggle"}
      >
        {item.inScope ? "IN" : "OUT"}
      </button>
      <input
        type="text"
        value={item.label}
        onChange={(e) => onLabelChange(e.target.value)}
        placeholder="Scope item…"
        className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted/40 focus:outline-none"
      />
      <button
        type="button"
        onClick={onRemove}
        className="opacity-0 transition-opacity group-hover:opacity-100"
        aria-label="Remove scope item"
      >
        <Trash2 className="size-3 text-muted/50 hover:text-btr" />
      </button>
    </div>
  );
}

/* ─── Progress Ring ────────────────────────────────────── */

function ProgressRing({ sections }: { sections: { done: boolean; label: string }[] }) {
  const total = sections.length;
  const completed = sections.filter((s) => s.done).length;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex items-center gap-3">
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#222" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={pct === 100 ? "#22c55e" : "#CEFF00"}
          strokeWidth="3"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          className="transition-all duration-500"
        />
      </svg>
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-xs font-bold tabular-nums">
          {completed}/{total}
        </span>
        <span className="text-[10px] text-muted">sections ready</span>
      </div>
    </div>
  );
}

/* ─── Scoping Header ───────────────────────────────────── */

function ScopingHeader({
  onPrefill,
  sections,
}: {
  onPrefill?: () => void;
  sections: { done: boolean; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-4">
        <ProgressRing sections={sections} />
        <div>
          <h3 className="font-display text-xs font-bold uppercase tracking-wide">
            Scoping Proposal
          </h3>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
            Define the delivery plan — milestones, team, and scope boundaries.
            This feeds directly into the Go/No-Go decision and Jira project setup.
          </p>
        </div>
      </div>
      {IS_DEV && onPrefill && (
        <button
          type="button"
          onClick={onPrefill}
          title="Prefill form (dev only)"
          aria-label="Prefill form for testing"
          className="inline-flex size-8 shrink-0 items-center justify-center border border-border text-muted transition-colors hover:border-bbb/50 hover:text-bbb"
        >
          <FlaskConical className="size-3.5" />
        </button>
      )}
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────── */

type Props = {
  initiativeId: number;
  data: ScopingData | null;
  validationData?: ValidationData | null;
  readOnly?: boolean;
  resubmitting?: boolean;
  /** Show Save Changes + Resubmit after Go/No-Go feedback. */
  canResubmit?: boolean;
  /** Leadership feedback shown above the form when the scope was bounced back. */
  feedback?: GoNoGoDecision | null;
};

function sameImpactState(
  a: ReturnType<typeof resolveBusinessValueState>,
  b: ReturnType<typeof resolveBusinessValueState>,
): boolean {
  if (a.types.length !== b.types.length) return false;
  const aSet = new Set(a.types);
  if (!b.types.every((type) => aSet.has(type))) return false;
  return a.types.every((type) => a.impacts[type] === b.impacts[type]);
}

export function ScopingPhaseSection({
  initiativeId,
  data,
  validationData,
  readOnly = false,
  resubmitting = false,
  canResubmit = false,
  feedback = null,
}: Props) {
  const boundSave = saveScopingData.bind(null, initiativeId);
  const boundSubmit = submitScopingForApproval.bind(null, initiativeId);
  const boundResubmit = resubmitScoping.bind(null, initiativeId);

  const [saveState, saveAction, savePending] = useActionState(boundSave, initial);
  const [submitState, submitAction, submitPending] = useActionState(
    boundSubmit,
    initial,
  );
  const [resubmitState, resubmitAction, resubmitPending] = useActionState(
    boundResubmit,
    initial,
  );

  const pending = savePending || submitPending || resubmitPending;
  const error = saveState.error || submitState.error || resubmitState.error;
  const saved = saveState.success;
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [submissionUpdated, setSubmissionUpdated] = useState(false);

  useEffect(() => {
    if (saveState.success) setSavedAt(new Date());
  }, [saveState]);

  useEffect(() => {
    if (submitState.success && resubmitting) setSubmissionUpdated(true);
  }, [submitState.success, resubmitting]);

  function markDirty() {
    if (submissionUpdated) setSubmissionUpdated(false);
  }

  // ── Milestones state
  const [milestones, setMilestones] = useState<ScopingMilestone[]>(() => {
    if (data?.milestones?.length) {
      return data.milestones.map((m, i) => ({
        ...m,
        color: m.color || MILESTONE_COLORS[i % MILESTONE_COLORS.length],
      }));
    }
    return [emptyMilestone()];
  });
  const addMilestone = () => {
    markDirty();
    setMilestones((prev) => [...prev, emptyMilestone(prev)]);
  };
  const updateMilestone = useCallback(
    (i: number, updated: ScopingMilestone) => {
      markDirty();
      setMilestones((prev) => prev.map((m, idx) => (idx === i ? updated : m)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const removeMilestone = (i: number) => {
    markDirty();
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Team state
  const [team, setTeam] = useState<ScopingTeamMember[]>(
    data?.team?.length ? data.team : [emptyTeamMember()],
  );
  const maxHours = Math.max(...team.map((t) => t.totalHours), 1);
  const totalHours = team.reduce((sum, t) => sum + t.totalHours, 0);
  const addTeamMember = () => {
    markDirty();
    setTeam((prev) => [...prev, emptyTeamMember()]);
  };
  const updateTeamMember = useCallback(
    (i: number, updated: ScopingTeamMember) => {
      markDirty();
      setTeam((prev) => prev.map((m, idx) => (idx === i ? updated : m)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const removeTeamMember = (i: number) => {
    markDirty();
    setTeam((prev) => prev.filter((_, idx) => idx !== i));
  };
  const updateMilestoneDates = useCallback(
    (id: string, startDate: string, endDate: string) => {
      markDirty();
      setMilestones((prev) =>
        prev.map((m) => (m.id === id ? { ...m, startDate, endDate } : m)),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const updateTeamDates = useCallback(
    (id: string, startDate: string, endDate: string) => {
      markDirty();
      setTeam((prev) =>
        prev.map((t) => (t.id === id ? { ...t, startDate, endDate } : t)),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Impact (carried forward from Validation)
  const priorImpact = resolveBusinessValueState(validationData?.businessValue);
  const initialImpact =
    data?.impact && isBusinessValueData(data.impact) && data.impact.types.length > 0
      ? resolveBusinessValueState(data.impact)
      : priorImpact;

  const [impactTypes, setImpactTypes] = useState<BusinessValueType[]>(
    initialImpact.types,
  );
  const [impactScores, setImpactScores] = useState(initialImpact.impacts);

  const toggleImpactType = (type: BusinessValueType) => {
    markDirty();
    setImpactTypes((current) => {
      if (current.includes(type)) {
        setImpactScores((scores) => ({ ...scores, [type]: null }));
        return current.filter((item) => item !== type);
      }
      setImpactScores((scores) => ({
        ...scores,
        [type]: scores[type] ?? IMPACT_DEFAULT,
      }));
      return [...current, type];
    });
  };

  const impactData = buildBusinessValueData(impactTypes, impactScores);
  const fromValidation =
    priorImpact.types.length > 0 &&
    sameImpactState(
      { types: impactTypes, impacts: impactScores },
      priorImpact,
    );

  // ── Scope items state
  const [scopeItems, setScopeItems] = useState<ScopingScopeItem[]>(
    data?.scopeItems?.length
      ? data.scopeItems
      : [emptyScopeItem(true), emptyScopeItem(false)],
  );
  const addScopeItem = (inScope: boolean) => {
    markDirty();
    setScopeItems((prev) => [...prev, emptyScopeItem(inScope)]);
  };
  const updateScopeItem = (i: number, changes: Partial<ScopingScopeItem>) => {
    markDirty();
    setScopeItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, ...changes } : item)),
    );
  };
  const removeScopeItem = (i: number) => {
    markDirty();
    setScopeItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ── Dependencies state
  const [dependencies, setDependencies] = useState(data?.dependencies ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(data?.attachments ?? []);

  // ── Completeness checks
  const milestonesReady =
    milestones.length > 0 &&
    milestones.every((m) => m.epic.trim() && m.milestone.trim());
  const teamReady =
    team.length > 0 &&
    team.every((t) => t.role.trim() && t.name.trim() && t.totalHours > 0);
  const valueReady =
    impactTypes.length > 0 &&
    impactTypes.every((type) => impactScores[type] !== null);
  const scopeReady =
    scopeItems.length > 0 && scopeItems.every((s) => s.label.trim());
  const notesReady = dependencies.trim().length > 0;
  const canSubmit = milestonesReady && teamReady && valueReady && scopeReady;

  const sections = [
    { done: milestonesReady, label: "Milestones" },
    { done: teamReady, label: "Team" },
    { done: valueReady, label: "Impact" },
    { done: scopeReady, label: "Scope" },
  ];

  function applyDevPrefill() {
    markDirty();
    setMilestones(DEV_PREFILL.milestones!.map((m) => ({ ...m, id: uid() })));
    setTeam(DEV_PREFILL.team!.map((t) => ({ ...t, id: uid() })));
    const prefillImpact = resolveBusinessValueState(DEV_PREFILL.impact);
    setImpactTypes(prefillImpact.types);
    setImpactScores(prefillImpact.impacts);
    setScopeItems(
      DEV_PREFILL.scopeItems!.map((s) => ({ ...s, id: uid() })),
    );
    setDependencies(DEV_PREFILL.dependencies!);
  }

  const inScopeItems = scopeItems.filter((s) => s.inScope);
  const outScopeItems = scopeItems.filter((s) => !s.inScope);

  if (readOnly) {
    return (
      <>
        <ScopingHeader sections={sections} />
        <ScopingReadOnly
          data={data}
          maxHours={maxHours}
          validationData={validationData}
        />
      </>
    );
  }

  return (
    <>
      <ScopingHeader onPrefill={applyDevPrefill} sections={sections} />

      {/* Hidden JSON fields for server action */}
      <input type="hidden" name="milestones" value={JSON.stringify(milestones)} />
      <input type="hidden" name="team" value={JSON.stringify(team)} />
      <input type="hidden" name="impact" value={JSON.stringify(impactData)} />
      <input type="hidden" name="scopeItems" value={JSON.stringify(scopeItems)} />
      <input type="hidden" name="attachments" value={JSON.stringify(attachments)} />

      <div className="space-y-4 p-4">
        {feedback?.decision === "feedback" && (
          <div className="border border-feedback/50 bg-feedback/10 px-3 py-2.5">
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-feedback">
              Feedback from Go / No-Go — revise Phase 3 and resubmit
            </p>
            {feedback.comment && (
              <p className="mt-1 text-xs leading-relaxed text-foreground/90">
                “{feedback.comment}” — {feedback.approverName}
              </p>
            )}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 border border-btr/40 bg-btr/10 px-3 py-2 text-xs text-btr">
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </div>
        )}

        <PhaseSectionStack>
          {/* ─── 1. Milestone Timeline ──────────────────────── */}
          <PhaseSectionCard
            header={
              <>
                <ScopingFieldLabel field="milestones" required complete={milestonesReady}>
                  Epic & Milestone Timeline
                </ScopingFieldLabel>
                <div className="flex items-center gap-2">
                  <CountBadge count={milestones.length} label="milestones" />
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="inline-flex items-center gap-1 border border-dashed border-border px-2 py-1 text-[10px] text-muted transition-colors hover:border-bbb/50 hover:text-bbb"
                  >
                    <Plus className="size-3" />
                    Add
                  </button>
                </div>
              </>
            }
          >
            <MilestoneDragGrid
              milestones={milestones}
              onReorder={(reordered) => { markDirty(); setMilestones(reordered); }}
              onUpdate={updateMilestone}
              onRemove={removeMilestone}
            />
            <div className="mt-4 border-t border-border" />
            <MilestoneGantt
              milestones={milestones}
              team={team}
              onMilestoneDates={updateMilestoneDates}
              onTeamDates={updateTeamDates}
            />
          </PhaseSectionCard>

          {/* ─── 2. Team & Hour Estimates ───────────────────── */}
          <PhaseSectionCard
            header={
              <>
                <ScopingFieldLabel field="team" required complete={teamReady}>
                  Role-Based Team & Hours
                </ScopingFieldLabel>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[10px] font-bold tabular-nums text-muted">
                    {totalHours}h total
                  </span>
                  <CountBadge count={team.length} label="members" />
                  <button
                    type="button"
                    onClick={addTeamMember}
                    className="inline-flex items-center gap-1 border border-dashed border-border px-2 py-1 text-[10px] text-muted transition-colors hover:border-bbb/50 hover:text-bbb"
                  >
                    <Plus className="size-3" />
                    Add
                  </button>
                </div>
              </>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {team.map((m, i) => (
                <TeamMemberCard
                  key={m.id}
                  member={m}
                  maxHours={maxHours}
                  onChange={(updated) => updateTeamMember(i, updated)}
                  onRemove={() => removeTeamMember(i)}
                />
              ))}
            </div>
          </PhaseSectionCard>

          {/* ─── 3. Impact ─────────────────────────────────── */}
          <PhaseSectionCard
            header={
              <div className="flex flex-wrap items-center gap-2">
                <ScopingFieldLabel field="impact" required complete={valueReady}>
                  Impact
                </ScopingFieldLabel>
                {fromValidation && (
                  <span className="border border-border px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-muted">
                    From Validation
                  </span>
                )}
                {!fromValidation && priorImpact.types.length > 0 && (
                  <span className="border border-bbb/40 px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-bbb">
                    Updated in Scoping
                  </span>
                )}
              </div>
            }
          >
            <p className="text-[11px] leading-relaxed text-muted">
              Values from Validation are carried forward. Adjust them if the scoped delivery changes the picture.
            </p>

            <div className="flex flex-wrap gap-2">
              {BUSINESS_VALUE_TYPES.map((type) => (
                <BusinessValueTypeButton
                  key={type.id}
                  id={type.id}
                  label={type.label}
                  selected={impactTypes.includes(type.id)}
                  onClick={() => toggleImpactType(type.id)}
                />
              ))}
            </div>

            {impactTypes.length === 0 ? (
              <p className="text-xs text-muted">
                Select one or more value types, then rate impact from 1 to 10 for each.
              </p>
            ) : (
              <div className="space-y-4">
                {impactTypes.map((type) => {
                  const label =
                    BUSINESS_VALUE_TYPES.find((item) => item.id === type)
                      ?.label ?? type;
                  const score = impactScores[type] ?? IMPACT_DEFAULT;
                  return (
                    <ImpactSlider
                      key={type}
                      name={`impactExpectation_${type}`}
                      label={label}
                      value={score}
                      onChange={(next) => {
                        markDirty();
                        setImpactScores((current) => ({
                          ...current,
                          [type]: next,
                        }));
                      }}
                    />
                  );
                })}
              </div>
            )}
          </PhaseSectionCard>

          {/* ─── 4. Scope Boundaries (toggle chips) ────────── */}
          <PhaseSectionCard
            header={
              <ScopingFieldLabel field="scope" required complete={scopeReady}>
                Scope Boundaries
              </ScopingFieldLabel>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-4 items-center justify-center border border-success bg-success/20 text-[7px] font-bold text-success">
                    IN
                  </span>
                  <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    In Scope ({inScopeItems.length})
                  </span>
                </div>
                {inScopeItems.map((item) => {
                  const idx = scopeItems.findIndex((s) => s.id === item.id);
                  return (
                    <ScopeItemChip
                      key={item.id}
                      item={item}
                      onToggle={() => updateScopeItem(idx, { inScope: false })}
                      onLabelChange={(label) => updateScopeItem(idx, { label })}
                      onRemove={() => removeScopeItem(idx)}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => addScopeItem(true)}
                  className="flex w-full items-center justify-center gap-1.5 border border-dashed border-success/30 px-2 py-1.5 text-[10px] text-success/60 transition-colors hover:border-success/50 hover:text-success"
                >
                  <Plus className="size-3" />
                  Add in-scope item
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-4 items-center justify-center border border-btr/60 bg-btr/10 text-[7px] font-bold text-btr">
                    OUT
                  </span>
                  <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                    Out of Scope ({outScopeItems.length})
                  </span>
                </div>
                {outScopeItems.map((item) => {
                  const idx = scopeItems.findIndex((s) => s.id === item.id);
                  return (
                    <ScopeItemChip
                      key={item.id}
                      item={item}
                      onToggle={() => updateScopeItem(idx, { inScope: true })}
                      onLabelChange={(label) => updateScopeItem(idx, { label })}
                      onRemove={() => removeScopeItem(idx)}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={() => addScopeItem(false)}
                  className="flex w-full items-center justify-center gap-1.5 border border-dashed border-btr/30 px-2 py-1.5 text-[10px] text-btr/60 transition-colors hover:border-btr/50 hover:text-btr"
                >
                  <Plus className="size-3" />
                  Add out-of-scope item
                </button>
              </div>
            </div>
          </PhaseSectionCard>

          {/* ─── 5. Other Notes & Attachments ──────────────── */}
          <PhaseSectionCard
            header={
              <span
                className={[
                  "flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide",
                  notesReady || attachments.length > 0
                    ? "text-foreground"
                    : "text-muted",
                ].join(" ")}
              >
                <StickyNote className="size-3.5 shrink-0 text-muted/60" />
                Other Notes &amp; Attachments
                {(notesReady || attachments.length > 0) && (
                  <Check className="animate-check-pop size-3.5 shrink-0 text-success" />
                )}
              </span>
            }
            bodyClassName="space-y-4 p-4"
          >
            <label className="block">
              <ScopingFieldLabel field="notes" complete={notesReady}>
                Other Notes
              </ScopingFieldLabel>
              <textarea
                name="scopeDependencies"
                rows={3}
                value={dependencies}
                onChange={(e) => {
                  markDirty();
                  setDependencies(e.target.value);
                }}
                className={`${inputClass} mt-1`}
                placeholder="Optional — leftover context, open questions, or anything reviewers should see."
              />
            </label>

            <div>
              <ScopingFieldLabel field="attachments" complete={attachments.length > 0}>
                Attachments
              </ScopingFieldLabel>
              <div className="mt-2">
                <AttachmentZone
                  attachments={attachments}
                  onChange={(next) => {
                    markDirty();
                    setAttachments(next);
                  }}
                />
              </div>
            </div>
          </PhaseSectionCard>

          {/* ─── 6. Costs ──────────────────────────────────── */}
          <PhaseSectionCard
            header={
              <div className="flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-foreground">
                <DollarSign className="size-3.5" />
                Costs
                <span className="ml-2 border border-border px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-muted/60">
                  Assumed rates
                </span>
              </div>
            }
            bodyClassName="p-4"
          >
            <ScopeCostBreakdown team={team} />
          </PhaseSectionCard>
        </PhaseSectionStack>

        {/* ─── Actions ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          {saved && savedAt && (
            <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-success">
              <Check className="animate-check-pop size-3.5" />
              Draft saved on{" "}
              {savedAt.toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              at{" "}
              {savedAt.toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          {!resubmitting && (
            <button
              type="submit"
              formAction={saveAction}
              formNoValidate
              disabled={pending}
              className="group relative inline-flex items-center gap-2 overflow-hidden border border-border px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-muted transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-foreground/[0.06] transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <Save className="relative size-3.5" />
              <span className="relative">
                {savePending ? "Saving…" : canResubmit ? "Save Changes" : "Save Draft"}
              </span>
            </button>
          )}
          {canResubmit ? (
            <button
              type="submit"
              formAction={resubmitAction}
              disabled={pending || !canSubmit}
              title={!canSubmit ? "Fill in all required fields to resubmit" : undefined}
              className="group relative inline-flex items-center gap-2 overflow-hidden border border-success bg-success px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <Send className="relative size-3.5" />
              <span className="relative">
                {resubmitPending ? "Resubmitting…" : "Resubmit"}
              </span>
            </button>
          ) : submissionUpdated ? (
            <span className="inline-flex items-center gap-2 border border-success bg-success/10 px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-success">
              <Check className="animate-check-pop size-3.5" />
              Saved
            </span>
          ) : (
            <button
              type="submit"
              formAction={submitAction}
              disabled={pending || !canSubmit}
              title={!canSubmit ? "Fill in all required fields to submit" : undefined}
              className="group relative inline-flex items-center gap-2 overflow-hidden border border-foreground bg-foreground px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wide text-background transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
              <SendHorizonal className="relative size-3.5" />
              <span className="relative">
                {submitPending
                  ? "Submitting…"
                  : resubmitting
                    ? "Update Submission"
                    : "Submit for Go/No-Go"}
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Read-Only View ───────────────────────────────────── */

function ScopingReadOnly({
  data,
  maxHours,
  validationData,
}: {
  data: ScopingData | null;
  maxHours: number;
  validationData?: ValidationData | null;
}) {
  const milestones = data?.milestones ?? [];
  const team = data?.team ?? [];
  const scopeItems = data?.scopeItems ?? [];
  const validationImpact = validationData?.businessValue;
  const impact =
    data?.impact && isBusinessValueData(data.impact) && data.impact.types.length > 0
      ? data.impact
      : isBusinessValueData(validationImpact)
        ? validationImpact
        : null;

  return (
    <div className="p-4">
      <PhaseSectionStack>
      {/* Milestones */}
      <PhaseSectionCard
        header={
          <div className="flex items-center gap-2 text-muted">
            <Calendar className="size-3.5 shrink-0" />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide">
              Epic & Milestone Timeline
            </p>
            <CountBadge count={milestones.length} label="milestones" />
          </div>
        }
        bodyClassName="p-4"
      >
        {milestones.length > 0 ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {milestones.map((m, i) => (
                <div key={m.id ?? i} className="border border-border bg-surface p-3">
                  <p className="font-display text-xs font-bold uppercase tracking-wide text-foreground">
                    {m.epic}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{m.milestone}</p>
                  {(m.startDate || m.endDate) && (
                    <p className="mt-1.5 text-[10px] tabular-nums text-muted/70">
                      {m.startDate ?? "—"} → {m.endDate ?? "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border" />
            <MilestoneGantt milestones={milestones} team={team} />
          </>
        ) : (
          <p className="text-sm text-foreground/90">—</p>
        )}
      </PhaseSectionCard>

      {/* Team */}
      <PhaseSectionCard
        header={
          <div className="flex w-full items-center gap-2 text-muted">
            <Users className="size-3.5 shrink-0" />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide">
              Team & Hours
            </p>
            <span className="ml-auto font-display text-[10px] font-bold tabular-nums">
              {team.reduce((s, t) => s + t.totalHours, 0)}h total
            </span>
          </div>
        }
        bodyClassName="p-4"
      >
        {team.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {team.map((t, i) => {
              const selectedParty = PARTY_OPTIONS.find(
                (p) => p.value === t.party,
              );
              const partyColor = selectedParty?.color;
              const partyLogo = selectedParty?.logo;
              const partyLabel =
                PARTIES.find((p) => p.id === t.party)?.label ??
                selectedParty?.label;
              return (
                <div key={t.id ?? i} className="border border-border bg-surface p-3">
                  <div className="flex items-center gap-2">
                    {partyLogo ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={partyLogo}
                        alt={partyLabel ?? "Party"}
                        title={partyLabel}
                        className="h-5 w-5 shrink-0 object-contain"
                      />
                    ) : (
                      <div
                        className="flex size-5 items-center justify-center border text-[9px] font-bold"
                        style={{
                          borderColor: partyColor ?? "#333",
                          color: partyColor ?? "#666",
                        }}
                      >
                        {t.name.charAt(0) || "?"}
                      </div>
                    )}
                    <span className="min-w-0 flex-1 font-display text-xs font-bold uppercase tracking-wide text-foreground">
                      {t.name}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">{t.role}</p>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="font-display text-[10px] font-bold tabular-nums text-foreground">
                      {t.totalHours}h
                    </span>
                    {typeof t.hourlyRate === "number" && t.hourlyRate > 0 && (
                      <span className="text-[10px] tabular-nums text-muted/60">
                        × {formatEuro(t.hourlyRate)}/h
                      </span>
                    )}
                  </div>
                  <HoursBar hours={t.totalHours} max={maxHours} />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-foreground/90">—</p>
        )}
      </PhaseSectionCard>

      {/* Impact */}
      <PhaseSectionCard
        header={
          <div className="flex items-center gap-2 text-muted">
            <TrendingUp className="size-3.5 shrink-0" />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide">
              Impact
            </p>
          </div>
        }
        bodyClassName="p-4"
      >
        {impact && impact.types.length > 0 ? (
          <div className="space-y-3">
            {impact.types.map((type) => {
              const label =
                BUSINESS_VALUE_TYPES.find((item) => item.id === type)?.label ??
                type;
              const score = parseImpactScore(impact.expectations[type]);
              const pct =
                score !== null
                  ? ((score - IMPACT_MIN) / (IMPACT_MAX - IMPACT_MIN)) * 100
                  : 0;
              return (
                <div key={type}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="border border-border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide text-foreground">
                      {label}
                    </span>
                    <span className="flex items-baseline gap-2">
                      <span className="font-display text-xs font-bold tabular-nums text-foreground">
                        {score !== null ? (
                          <>
                            {score}
                            <span className="text-muted">/10</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </span>
                      {score !== null && (
                        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
                          {impactScoreLabel(score)}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-border">
                    <div
                      className="h-full bg-muted transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-foreground/90">—</p>
        )}
      </PhaseSectionCard>

      {/* Scope */}
      <PhaseSectionCard
        header={
          <div className="flex items-center gap-2 text-muted">
            <SplitSquareVertical className="size-3.5 shrink-0" />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide">
              Scope Boundaries
            </p>
          </div>
        }
        bodyClassName="p-4"
      >
        {scopeItems.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <span className="font-display text-[9px] font-bold uppercase tracking-wider text-success">
                In Scope
              </span>
              {scopeItems
                .filter((s) => s.inScope)
                .map((s, i) => (
                  <div
                    key={s.id ?? i}
                    className="flex items-center gap-1.5 border border-success/30 bg-success/[0.04] px-2 py-1 text-xs text-foreground"
                  >
                    <Check className="size-3 text-success" />
                    {s.label}
                  </div>
                ))}
            </div>
            <div className="space-y-1">
              <span className="font-display text-[9px] font-bold uppercase tracking-wider text-btr">
                Out of Scope
              </span>
              {scopeItems
                .filter((s) => !s.inScope)
                .map((s, i) => (
                  <div
                    key={s.id ?? i}
                    className="flex items-center gap-1.5 border border-btr/30 bg-btr/[0.04] px-2 py-1 text-xs text-foreground/70 line-through"
                  >
                    {s.label}
                  </div>
                ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/90">—</p>
        )}
      </PhaseSectionCard>

      {/* Other Notes & Attachments */}
      <PhaseSectionCard
        header={
          <div className="flex items-center gap-2 text-muted">
            <StickyNote className="size-3.5 shrink-0" />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide">
              Other Notes &amp; Attachments
            </p>
          </div>
        }
        bodyClassName="space-y-4 p-4"
      >
        <p className="text-sm leading-relaxed text-foreground/90">
          {data?.dependencies || "—"}
        </p>
        {data?.attachments && data.attachments.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-2 text-muted">
              <Paperclip className="size-3.5 shrink-0" />
              <p className="font-display text-[10px] font-bold uppercase tracking-wide">
                Attachments ({data.attachments.length})
              </p>
            </div>
            <div className="space-y-1.5">
              {data.attachments.map((a) => (
                <AttachmentChip key={a.id} attachment={a} readOnly />
              ))}
            </div>
          </div>
        )}
      </PhaseSectionCard>

      {/* Costs */}
      <PhaseSectionCard
        header={
          <div className="flex items-center gap-2 text-muted">
            <DollarSign className="size-3.5 shrink-0" />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide">
              Costs
            </p>
            <span className="ml-1 border border-border px-1.5 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-muted/60">
              Assumed rates
            </span>
          </div>
        }
        bodyClassName="p-4"
      >
        <ScopeCostBreakdown team={team} />
      </PhaseSectionCard>
      </PhaseSectionStack>
    </div>
  );
}
