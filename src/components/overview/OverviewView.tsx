"use client";

import { Columns3 } from "lucide-react";
import { STAGES, getStageColor } from "@/data/workflow";
import { WorkspaceChip } from "@/components/WorkspaceChip";
import { BrandTexture } from "@/components/ui/BrandTexture";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { PipelineStrip } from "@/components/pipeline/PipelineStrip";
import { KanbanBoard } from "@/components/overview/KanbanBoard";
import type { InitiativeWithUsers } from "@/lib/queries";

type OverviewProps = {
  initiatives: InitiativeWithUsers[];
};

export function OverviewView({ initiatives }: OverviewProps) {
  const totalActive = initiatives.filter(
    (item) =>
      item.status !== "rejected" && item.status !== "on-hold" && !item.archivedAt,
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

      <KanbanBoard initiatives={initiatives} className="flex-1" />

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
