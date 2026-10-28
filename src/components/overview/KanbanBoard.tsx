import Link from "next/link";
import { ChevronRight, Link2 } from "lucide-react";
import { STAGES, getStageColor } from "@/data/workflow";
import { CornerTicks } from "@/components/ui/CornerTicks";
import type { InitiativeWithUsers } from "@/lib/queries";
import { isParkedOnHold } from "@/lib/workstream-status";
import { dashboardItemHref } from "@/components/dashboard/shared";

const hoverTicks =
  "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

const STATUS_COLORS: Record<string, string> = {
  submitted: "#FFFFFF",
  approved: "#22c55e",
  rejected: "#FF3B1F",
  "on-hold": "#7E90A3",
  draft: "#666666",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? "#FFFFFF";
  const label =
    status === "submitted"
      ? "Submitted"
      : status === "approved"
        ? "Approved"
        : status === "rejected"
          ? "Rejected"
          : status === "on-hold"
            ? "On Hold"
            : status;

  return (
    <span
      className="border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
      style={{ borderColor: color, color }}
    >
      {label}
    </span>
  );
}

function InitiativeCard({
  initiative,
  linkCount,
}: {
  initiative: InitiativeWithUsers;
  linkCount: number;
}) {
  return (
    <Link
      href={dashboardItemHref(initiative)}
      className="group relative block border border-border bg-surface-elevated p-3 transition-colors hover:border-border-strong hover:bg-hover-strong"
    >
      <CornerTicks className={hoverTicks} />
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
          {initiative.ticketId}
        </span>
        <StatusBadge status={initiative.status} />
      </div>
      <p className="mt-2 text-sm font-medium leading-snug group-hover:text-foreground">
        {initiative.title}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted">
        <span>by {initiative.submitter.name}</span>
        {linkCount > 0 && (
          <span
            className="inline-flex items-center gap-1 font-display text-[10px] font-bold tabular-nums"
            title={`${linkCount} connected workstream${linkCount === 1 ? "" : "s"}`}
          >
            <Link2 className="size-3" />
            {linkCount}
          </span>
        )}
      </div>
    </Link>
  );
}

function StageColumn({
  stageName,
  stageNumber,
  items,
  accentColor,
  linkMap,
}: {
  stageName: string;
  stageNumber: number;
  items: InitiativeWithUsers[];
  accentColor: string;
  linkMap: Record<number, number[]>;
}) {
  return (
    <div className="flex min-w-[260px] flex-1 flex-col border border-border bg-surface">
      <div
        className="border-b border-border px-4 py-3"
        style={{ borderTopWidth: 3, borderTopColor: accentColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex size-5 items-center justify-center border text-[10px] font-bold"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {stageNumber}
            </span>
            <p className="font-display text-xs font-bold uppercase tracking-wide">
              {stageName}
            </p>
          </div>
          <span className="font-display text-lg font-extrabold tabular-nums text-muted">
            {items.length}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {items.map((init) => (
          <InitiativeCard
            key={init.id}
            initiative={init}
            linkCount={linkMap[init.id]?.length ?? 0}
          />
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-xs text-muted">No initiatives</p>
        )}
      </div>
    </div>
  );
}

type Props = {
  initiatives: InitiativeWithUsers[];
  /** Linked workstream ids per workstream. */
  linkMap?: Record<number, number[]>;
  className?: string;
};

export function KanbanBoard({ initiatives, linkMap = {}, className }: Props) {
  const byStage = (stageId: string) =>
    initiatives.filter((item) => item.currentStage === stageId && !isParkedOnHold(item));

  return (
    <div className={["flex gap-1 overflow-x-auto pb-4", className].filter(Boolean).join(" ")}>
      {STAGES.map((stage, idx) => {
        const accentColor = getStageColor(stage.id);
        return (
          <div key={stage.id} className="flex items-stretch">
            <StageColumn
              stageName={stage.name}
              stageNumber={stage.number}
              items={byStage(stage.id)}
              accentColor={accentColor}
              linkMap={linkMap}
            />
            {idx < STAGES.length - 1 && (
              <div className="flex shrink-0 items-center justify-center px-1">
                <ChevronRight className="size-5 text-border-strong" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
