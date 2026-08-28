import { BrandTexture } from "@/components/ui/BrandTexture";
import { PipelineStrip } from "@/components/pipeline/PipelineStrip";
import { getStageColor, type StageId, type WorkflowStage } from "@/data/workflow";

type PipelineStageHeaderProps = {
  stage: WorkflowStage;
  pipelineStripClassName?: string;
};

export function PipelineStageHeader({
  stage,
  pipelineStripClassName = "shrink-0 sm:mr-8 sm:w-[528px] lg:mr-12 lg:w-[672px]",
}: PipelineStageHeaderProps) {
  const stageColor = getStageColor(stage.id);

  return (
    <header className="relative mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
      <BrandTexture variant="hero" />
      <div className="min-w-0">
        <div className="flex items-start gap-4">
          <span
            className="flex size-9 shrink-0 items-center justify-center border text-sm font-bold"
            style={{ borderColor: stageColor, color: stageColor }}
          >
            {String(stage.number).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h1 className="font-display text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-5xl">
              {stage.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {stage.purpose}
            </p>
          </div>
        </div>
      </div>
      <PipelineStrip
        currentStageId={stage.id as StageId}
        className={pipelineStripClassName}
      />
    </header>
  );
}
