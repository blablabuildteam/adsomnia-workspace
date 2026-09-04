import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { STAGES, getStageColor } from "@/data/workflow";
import { CornerTicks } from "@/components/ui/CornerTicks";
import {
  STAGE_HREF,
  StatusBadge,
  hoverTicks,
} from "@/components/dashboard/shared";
import type { InitiativeWithUsers } from "@/lib/queries";

function updatedAtMs(value: Date | string): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}

function WorkstreamRow({
  initiative,
}: {
  initiative: InitiativeWithUsers;
}) {
  return (
    <Link
      href={`/workstreams/${initiative.id}`}
      className="group relative flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
    >
      <CornerTicks className={hoverTicks} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-[10px] font-bold uppercase tracking-wider text-muted">
            {initiative.ticketId}
          </span>
          <span className="truncate text-sm font-medium group-hover:text-foreground">
            {initiative.title}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {initiative.submitter.name}
        </p>
      </div>
      <StatusBadge status={initiative.status} />
      <ArrowRight className="size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function PhaseSection({
  stageName,
  stageNumber,
  stageId,
  purpose,
  items,
  accentColor,
}: {
  stageName: string;
  stageNumber: number;
  stageId: string;
  purpose: string;
  items: InitiativeWithUsers[];
  accentColor: string;
}) {
  const href = STAGE_HREF[stageId];

  return (
    <section className="border border-border bg-surface">
      <div
        className="flex items-start justify-between gap-4 border-b border-border px-4 py-3.5"
        style={{ borderTopWidth: 3, borderTopColor: accentColor }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className="flex size-6 shrink-0 items-center justify-center border text-[10px] font-bold"
              style={{ borderColor: accentColor, color: accentColor }}
            >
              {String(stageNumber).padStart(2, "0")}
            </span>
            {href ? (
              <Link
                href={href}
                className="font-display text-sm font-bold uppercase tracking-wide transition-colors hover:text-foreground"
              >
                {stageName}
              </Link>
            ) : (
              <p className="font-display text-sm font-bold uppercase tracking-wide">
                {stageName}
              </p>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">
            {purpose}
          </p>
        </div>
        <span className="shrink-0 font-display text-lg font-extrabold tabular-nums text-muted">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-xs text-muted">
          No workstreams in this phase
        </p>
      ) : (
        <ul className="border-l-2 py-1 pl-3 sm:pl-4" style={{ borderColor: accentColor }}>
          {items.map((initiative, index) => (
            <li
              key={initiative.id}
              className={index > 0 ? "border-t border-border" : undefined}
            >
              <WorkstreamRow initiative={initiative} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type Props = {
  initiatives: InitiativeWithUsers[];
  className?: string;
};

export function PhaseList({ initiatives, className }: Props) {
  const itemsByStage = new Map<string, InitiativeWithUsers[]>();
  for (const stage of STAGES) {
    itemsByStage.set(stage.id, []);
  }
  for (const item of initiatives) {
    if (item.archivedAt) continue;
    itemsByStage.get(item.currentStage)?.push(item);
  }
  for (const items of itemsByStage.values()) {
    items.sort((a, b) => updatedAtMs(b.updatedAt) - updatedAtMs(a.updatedAt));
  }

  return (
    <ol
      className={["flex flex-col", className].filter(Boolean).join(" ")}
      aria-label="Workstreams by pipeline phase"
    >
      {STAGES.map((stage, idx) => {
        const accentColor = getStageColor(stage.id);
        const items = itemsByStage.get(stage.id) ?? [];
        const last = idx === STAGES.length - 1;

        return (
          <li key={stage.id}>
            <PhaseSection
              stageName={stage.name}
              stageNumber={stage.number}
              stageId={stage.id}
              purpose={stage.purpose}
              items={items}
              accentColor={accentColor}
            />
            {last ? null : (
              <div
                className="flex flex-col items-center py-2"
                aria-hidden
              >
                <span className="h-3 w-px bg-border-strong" />
                <ArrowDown className="size-4 text-border-strong" />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
