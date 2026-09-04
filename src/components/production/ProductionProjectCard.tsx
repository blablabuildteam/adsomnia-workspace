import { AlertTriangle, ArrowRight, Calendar, Flag } from "lucide-react";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { ProductionHealthBadge } from "@/components/production/ProductionHealthBadge";
import {
  STATUS_COLORS,
  StatusFillBar,
} from "@/components/production/epic-tickets";
import { PARTIES } from "@/data/workflow";
import {
  daysUntil,
  formatShortDate,
  HEALTH_META,
  todayIso,
  type ProductionEpic,
  type ProductionProject,
} from "@/lib/production/health";

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";
const PREVIEW_LIMIT = 4;

function partyMeta(id: string | null) {
  if (!id) return null;
  return PARTIES.find((party) => party.id === id) ?? null;
}

function epicDateLabel(epic: ProductionEpic) {
  if (epic.startDate && epic.endDate) {
    return `${formatShortDate(epic.startDate)} – ${formatShortDate(epic.endDate)}`;
  }
  if (epic.startDate) return `${formatShortDate(epic.startDate)} – No end`;
  if (epic.endDate) return `No start – ${formatShortDate(epic.endDate)}`;
  return "Dates not set";
}

function EpicPreviewRow({ epic }: { epic: ProductionEpic }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-[11px] font-medium text-foreground/90">
          {epic.name}
        </p>
        <span className="shrink-0 font-display text-[9px] font-bold uppercase tracking-wide tabular-nums text-muted">
          {epicDateLabel(epic)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <StatusFillBar
          done={epic.done}
          inProgress={epic.inProgress}
          total={epic.total}
          className="h-1.5 min-w-0 flex-1"
        />
        <span className="shrink-0 font-display text-[9px] font-bold tabular-nums text-muted">
          {epic.done}/{epic.total}
        </span>
      </div>
    </div>
  );
}

function TicketStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col bg-surface p-2.5">
      <span className="inline-flex items-center gap-1.5 font-display text-[9px] font-bold uppercase tracking-wide text-muted/50">
        <span className="size-1.5" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span
        className="mt-1 font-display text-sm font-bold tabular-nums"
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}

type Props = {
  project: ProductionProject;
  onOpen: (id: number) => void;
};

export function ProductionProjectCard({ project, onOpen }: Props) {
  const party = partyMeta(project.leadPartyId);
  const healthColor = HEALTH_META[project.health].color;
  const today = todayIso();
  const days = project.nearestEndDate
    ? daysUntil(project.nearestEndDate, today)
    : null;
  const preview = project.epics.slice(0, PREVIEW_LIMIT);
  const overflow = project.epics.length - preview.length;
  const openTickets = Math.max(
    project.totalTickets - project.doneTickets - project.inProgressTickets,
    0,
  );

  return (
    <button
      type="button"
      onClick={() => onOpen(project.id)}
      className="group relative flex h-full w-full flex-col border border-border bg-surface text-left transition-colors hover:border-border-strong hover:bg-white/[0.02]"
    >
      <CornerTicks className={hoverTicks} />
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-0.5"
        style={{ backgroundColor: healthColor }}
      />

      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="font-display shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">
            {project.ticketId}
          </span>
          <ProductionHealthBadge health={project.health} />
        </div>
        {party && (
          <span
            className="shrink-0 border px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide"
            style={{ borderColor: party.color, color: party.color }}
          >
            {party.label}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col px-5 py-4">
        <h3 className="text-sm font-semibold leading-snug group-hover:text-foreground">
          {project.title}
        </h3>

        <div className="mt-3 grid grid-cols-3 gap-px bg-border">
          <TicketStat
            label="Done"
            value={project.doneTickets}
            color={STATUS_COLORS.done}
          />
          <TicketStat
            label="In progress"
            value={project.inProgressTickets}
            color={STATUS_COLORS.inProgress}
          />
          <TicketStat
            label="Open"
            value={openTickets}
            color={STATUS_COLORS.open}
          />
        </div>

        <StatusFillBar
          done={project.doneTickets}
          inProgress={project.inProgressTickets}
          total={project.totalTickets}
          className="mt-2 h-1"
        />

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[10px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3 text-muted/50" />
            {project.nearestEndDate && days !== null ? (
              <>
                <span className="font-display font-bold uppercase tracking-wide">
                  {formatShortDate(project.nearestEndDate)}
                </span>
                <span
                  className={
                    days < 0
                      ? "text-danger"
                      : days <= 14
                        ? "text-[#EAB308]"
                        : "text-muted/60"
                  }
                >
                  {days < 0
                    ? `${Math.abs(days)}d overdue`
                    : days === 0
                      ? "Due today"
                      : `${days}d remaining`}
                </span>
              </>
            ) : (
              <span className="text-muted/40">No end date</span>
            )}
          </span>
          {project.timeElapsedPct !== undefined && (
            <span className="tabular-nums text-muted/60">
              Time {Math.round(project.timeElapsedPct)}% · Tickets{" "}
              {Math.round(project.ticketsDonePct)}%
            </span>
          )}
        </div>

        {preview.length > 0 ? (
          <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3">
            {preview.map((epic) => (
              <EpicPreviewRow key={epic.key} epic={epic} />
            ))}
            {overflow > 0 && (
              <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted">
                +{overflow} more epic{overflow === 1 ? "" : "s"}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-muted">
            {project.jira.fetchError ?? "No epics on this board yet."}
          </p>
        )}

        {project.flaggedEpicCount > 0 && (
          <p className="mt-3 inline-flex items-center gap-1 text-[10px] text-[#EAB308]">
            <Flag className="size-3" />
            {project.flaggedEpicCount} epic
            {project.flaggedEpicCount === 1 ? "" : "s"} missing dates or tickets
          </p>
        )}

        {project.jira.fetchError && preview.length > 0 && (
          <p className="mt-3 inline-flex items-start gap-1.5 text-[11px] leading-snug text-muted">
            <AlertTriangle className="mt-0.5 size-3 shrink-0 text-[#EAB308]" />
            {project.jira.fetchError}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border px-5 py-3">
        <span className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
          View details
        </span>
        <ArrowRight className="size-3.5 text-muted transition-transform group-hover:translate-x-0.5" />
      </div>
    </button>
  );
}
