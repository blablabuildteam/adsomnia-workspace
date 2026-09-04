"use client";

import Link from "next/link";
import { Columns3, ChevronRight } from "lucide-react";
import { STAGES, getStageColor } from "@/data/workflow";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { PipelineStrip } from "@/components/pipeline/PipelineStrip";
import type { InitiativeWithUsers } from "@/lib/queries";

const hoverTicks = "opacity-0 transition-opacity duration-300 group-hover:opacity-100";

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

function InitiativeCard({ initiative }: { initiative: InitiativeWithUsers }) {
  return (
    <Link
      href={`/workstreams/${initiative.id}`}
      className="group relative block border border-border bg-surface-elevated p-3 transition-colors hover:border-border-strong hover:bg-white/[0.04]"
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
      <p className="mt-1.5 text-[11px] text-muted">
        by {initiative.submitter.name}
      </p>
    </Link>
  );
}

function StageColumn({
  stageId,
  stageName,
  stageNumber,
  items,
  accentColor,
}: {
  stageId: string;
  stageName: string;
  stageNumber: number;
  items: InitiativeWithUsers[];
  accentColor: string;
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
          <InitiativeCard key={init.id} initiative={init} />
        ))}
        {items.length === 0 && (
          <p className="py-6 text-center text-xs text-muted">No initiatives</p>
        )}
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex shrink-0 items-center justify-center px-1">
      <ChevronRight className="size-5 text-border-strong" />
    </div>
  );
}

type OverviewProps = {
  initiatives: InitiativeWithUsers[];
};

export function OverviewView({ initiatives }: OverviewProps) {
  const byStage = (stageId: string) =>
    initiatives.filter(
      (i) => i.currentStage === stageId && !i.archivedAt,
    );

  const totalActive = initiatives.filter(
    (i) =>
      i.status !== "rejected" && i.status !== "on-hold" && !i.archivedAt,
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-[2200px] flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <BrandTexture variant="hero" />
        <div>
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-muted">
            Pipeline Overview
          </p>
          <h1 className="font-display mt-2 text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
            Stage Kanban
          </h1>
          <p className="mt-3 max-w-lg text-sm text-muted">
            Track initiatives as they flow through the Production Framework
            stages — powered by the <WorkspaceChip />.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-5 sm:items-end">
          <PipelineStrip className="sm:mr-8 sm:w-[528px] lg:mr-12 lg:w-[672px]" />
          <div className="relative border border-border bg-surface px-4 py-2">
            <CornerTicks />
            <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Active in Pipeline
            </p>
            <p className="font-display mt-1 text-2xl font-extrabold tabular-nums">
              {totalActive}
            </p>
          </div>
        </div>
      </header>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[10px]">
        <div className="flex items-center gap-2">
          <Columns3 className="size-4 text-muted" />
          <span className="font-display font-bold uppercase tracking-wide text-muted">
            Workflow Stages
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        {STAGES.map((stage) => {
          const color = getStageColor(stage.id);
          return (
            <div key={stage.id} className="flex items-center gap-1.5">
              <span
                className="size-2"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="text-muted">{stage.name}</span>
            </div>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex flex-1 gap-1 overflow-x-auto pb-4">
        {STAGES.map((stage, idx) => {
          const accentColor = getStageColor(stage.id);

          return (
            <div key={stage.id} className="flex items-stretch">
              <StageColumn
                stageId={stage.id}
                stageName={stage.name}
                stageNumber={stage.number}
                items={byStage(stage.id)}
                accentColor={accentColor}
              />
              {idx < STAGES.length - 1 && <FlowArrow />}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-xs text-muted">
          <span className="font-bold">Tip:</span> Click any initiative card to
          view details and take action. Initiatives move through stages as they
          progress from Initiative to Production.
        </p>
      </div>
    </div>
  );
}
