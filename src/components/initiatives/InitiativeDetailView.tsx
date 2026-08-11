import {
  Check,
  ChevronDown,
  Target,
  Lightbulb,
  TrendingUp,
  Users,
} from "lucide-react";
import { STAGES, getStageColor, type WorkflowStage } from "@/data/workflow";
import type {
  InitiativeWithUsers,
  ActivityEntry,
  CommentEntry,
} from "@/lib/queries";
import { ApprovalPanel, type ApprovalDecision } from "./ApprovalPanel";
import { CommentSection } from "./CommentSection";
import { ValidationPhaseSection } from "./ValidationPhaseSection";
import { CornerTicks } from "@/components/ui/CornerTicks";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { FloatingDetailBar } from "./FloatingDetailBar";

const STAGE_INDEX: Record<string, number> = {};
for (const s of STAGES) STAGE_INDEX[s.id] = s.number;

/** Re-enable when comment UI is ready for the detail view. */
const SHOW_COMMENT_SECTION = false;

/** Re-enable when the pipeline stepper returns to the detail view. */
const SHOW_PIPELINE_STEPPER = false;

/** Dark fill → light label; light fill (white / volt / teal) → black label. */
function stageLabelOnFill(hex: string): string {
  const light = hex === "#FFFFFF" || hex === "#CEFF00" || hex === "#2DD4BF";
  return light ? "#000000" : "#FFFFFF";
}

function StageStepper({ currentStageId }: { currentStageId: string }) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStageId);
  const currentColor = getStageColor(currentStageId);

  return (
    <ol className="flex items-start">
      {STAGES.map((stage, i) => {
        const isPast = i < currentIndex;
        const isCurrent = i === currentIndex;
        const last = i === STAGES.length - 1;
        const stageColor = getStageColor(stage.id);

        return (
          <li key={stage.id} className={last ? "flex-none" : "flex-1"}>
            <div className="flex items-center">
              <span
                className={[
                  "font-display flex size-8 shrink-0 items-center justify-center border text-[10px] font-bold",
                  !isCurrent && !isPast ? "border-border text-muted/50" : "",
                ].join(" ")}
                style={
                  isCurrent
                    ? {
                        borderColor: currentColor,
                        backgroundColor: currentColor,
                        color: stageLabelOnFill(currentColor),
                      }
                    : isPast
                      ? {
                          borderColor: `${stageColor}99`,
                          backgroundColor: `${stageColor}1A`,
                          color: stageColor,
                        }
                      : undefined
                }
              >
                {isPast ? (
                  <Check className="size-3.5" />
                ) : (
                  String(stage.number).padStart(2, "0")
                )}
              </span>
              {!last && (
                <span
                  className={`h-px flex-1 ${isPast ? "" : "bg-border"}`}
                  style={
                    isPast
                      ? { backgroundColor: `${stageColor}66` }
                      : undefined
                  }
                />
              )}
            </div>
            <p
              className={[
                "font-display mt-1.5 hidden pr-2 text-[9px] font-bold uppercase tracking-wide md:block",
                isCurrent ? "" : isPast ? "text-muted" : "text-muted/40",
              ].join(" ")}
              style={isCurrent ? { color: currentColor } : undefined}
            >
              {stage.name}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Phase wrapper with two visual states:
 * - "complete": collapsed by default (native <details>), neutral chrome, dimmed body
 * - "current": always expanded, stage-color accent + filled badge — the one place to work
 */
function PhaseCard({
  stageId,
  number,
  name,
  status,
  children,
}: {
  stageId: string;
  number: number;
  name: string;
  status: "complete" | "current";
  children: React.ReactNode;
}) {
  const color = getStageColor(stageId);
  const phaseLabel = `Phase ${String(number).padStart(2, "0")}`;

  if (status === "complete") {
    return (
      <details className="group/phase relative border border-border">
        <CornerTicks complete />
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-surface px-4 py-4 transition-colors hover:bg-surface-elevated sm:px-5 [&::-webkit-details-marker]:hidden">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.25em] text-muted/70">
              {phaseLabel}
            </p>
            <h2 className="font-display mt-1 text-xl font-extrabold uppercase tracking-tight text-foreground/50 sm:text-2xl">
              {name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-display flex items-center gap-1.5 border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-success">
              <Check className="size-3" />
              Complete
            </span>
            <ChevronDown className="size-4 text-muted transition-transform duration-200 group-open/phase:rotate-180" />
          </div>
        </summary>
        <div className="border-t border-border opacity-70 transition-opacity hover:opacity-100">
          {children}
        </div>
      </details>
    );
  }

  return (
    <section
      className="relative border border-border"
      style={{ borderLeftWidth: 3, borderLeftColor: color }}
    >
      <CornerTicks />
      <div
        className="flex items-end justify-between gap-4 border-b border-border bg-surface-elevated px-4 py-4 sm:px-5"
        style={{ borderTopWidth: 3, borderTopColor: color }}
      >
        <div>
          <p
            className="font-display text-[10px] font-bold uppercase tracking-[0.25em]"
            style={{ color }}
          >
            {phaseLabel}
          </p>
          <h2 className="font-display mt-1 text-xl font-extrabold uppercase tracking-tight sm:text-2xl">
            {name}
          </h2>
        </div>
        <span
          className="font-display shrink-0 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
          style={{
            backgroundColor: color,
            color: stageLabelOnFill(color),
          }}
        >
          In Progress
        </span>
      </div>
      {children}
    </section>
  );
}

const STATUS_BADGE_STYLES: Record<string, string> = {
  submitted: "border-foreground bg-foreground text-background",
  approved: "border-success bg-success/10 text-success",
  rejected: "border-btr bg-btr/10 text-btr",
  "on-hold": "border-hn bg-hn/10 text-hn",
  draft: "border-border bg-surface text-muted",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  "on-hold": "On Hold",
  draft: "Draft",
};

type Props = {
  initiative: InitiativeWithUsers;
  activity: ActivityEntry[];
  comments: CommentEntry[];
  canUserApprove: boolean;
  canComment: boolean;
  currentUserName: string;
  latestDecision?: ApprovalDecision | null;
};

export function InitiativeDetailView({
  initiative,
  activity,
  comments,
  canUserApprove,
  canComment,
  currentUserName,
  latestDecision = null,
}: Props) {
  const stage = STAGES.find(
    (s) => s.id === initiative.currentStage,
  ) as WorkflowStage;

  const statusStyle =
    STATUS_BADGE_STYLES[initiative.status] ?? STATUS_BADGE_STYLES.draft;
  const statusLabel =
    STATUS_LABELS[initiative.status] ?? initiative.status;

  const currentNum = STAGE_INDEX[initiative.currentStage] ?? 1;
  const ideaStage = STAGES.find((s) => s.id === "idea")!;
  const validationStage = STAGES.find((s) => s.id === "validation")!;

  const canTakeDecision =
    canUserApprove &&
    initiative.currentStage === "idea" &&
    initiative.status === "submitted";

  const showApprovalPanel = canTakeDecision || !!latestDecision;

  const showValidation = currentNum >= 2;
  const validationIsCurrent = initiative.currentStage === "validation";
  const validationIsEditable =
    validationIsCurrent &&
    (initiative.status === "approved" || initiative.status === "draft");

  return (
    <div className="relative w-full flex-1">
      <FloatingDetailBar
        title={initiative.title}
        stageName={stage?.name ?? initiative.currentStage}
        stageColor={getStageColor(initiative.currentStage)}
      />
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-40 pt-4 sm:px-6 sm:pt-6 lg:pb-48">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  {initiative.ticketId}
                </span>
                <span
                  className={`border px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}
                >
                  {statusLabel}
                </span>
              </div>
              <h1 className="font-display mt-3 text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
                {initiative.title}
              </h1>
            </div>
            <DownloadPdfButton />
          </div>
        </header>

        {/* Details — horizontal metadata bar (replaces pipeline stepper) */}
        <div className="mb-8 border border-border bg-surface">
          <h3 className="border-b border-border px-4 py-3 font-display text-xs font-bold uppercase tracking-wide">
            Details
          </h3>
          <div className="grid divide-border sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
            <div className="border-b border-border px-4 py-3 lg:border-b-0">
              <span className="text-xs text-muted">Stage</span>
              <p
                className="font-display mt-1 text-xs font-bold uppercase tracking-wide"
                style={{ color: getStageColor(initiative.currentStage) }}
              >
                {stage?.name ?? initiative.currentStage}
              </p>
            </div>
            <div className="border-b border-border px-4 py-3 sm:border-b-0 lg:border-b-0">
              <span className="text-xs text-muted">Submitter</span>
              <p className="mt-1 text-xs text-foreground">
                {initiative.submitter.name}
              </p>
            </div>
            <div className="border-b border-border px-4 py-3 lg:border-b-0">
              <span className="text-xs text-muted">Sponsor</span>
              <p className="mt-1 text-xs text-foreground">
                {initiative.sponsor.name}
              </p>
            </div>
            <div className="px-4 py-3">
              <span className="text-xs text-muted">Last updated</span>
              <p className="mt-1 text-xs text-foreground">
                {initiative.updatedAt.toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>
        </div>

        <div id="detail-header-sentinel" aria-hidden="true" />

        {SHOW_PIPELINE_STEPPER && (
          <div className="mb-8 border border-border bg-surface-elevated p-5">
            <StageStepper currentStageId={initiative.currentStage} />
          </div>
        )}

        <div className="space-y-6">
            <PhaseCard
              stageId="idea"
              number={ideaStage.number}
              name={ideaStage.name}
              status={initiative.currentStage === "idea" ? "current" : "complete"}
            >
              <div className="bg-surface">
                <h3 className="border-b border-border px-4 py-3 font-display text-xs font-bold uppercase tracking-wide">
                  Initiative Details
                </h3>
                <div className="grid gap-px bg-border sm:grid-cols-2">
                  <div className="bg-surface p-4">
                    <div className="mb-2 flex items-center gap-2 text-muted">
                      <Target className="size-3.5" />
                      <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                        Problem Statement
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {initiative.problemStatement ?? "—"}
                    </p>
                  </div>
                  <div className="bg-surface p-4">
                    <div className="mb-2 flex items-center gap-2 text-muted">
                      <Lightbulb className="size-3.5" />
                      <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                        Opportunity / Solution
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {initiative.opportunitySolution ?? "—"}
                    </p>
                  </div>
                  <div className="bg-surface p-4">
                    <div className="mb-2 flex items-center gap-2 text-muted">
                      <TrendingUp className="size-3.5" />
                      <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                        Expected Impact
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {initiative.expectedImpact ?? "—"}
                    </p>
                  </div>
                  <div className="bg-surface p-4">
                    <div className="mb-2 flex items-center gap-2 text-muted">
                      <Users className="size-3.5" />
                      <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                        Target Audience
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {initiative.targetAudience ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              {showApprovalPanel && (
                <ApprovalPanel
                  initiativeId={initiative.id}
                  decision={latestDecision}
                  embedded
                />
              )}
            </PhaseCard>

            {showValidation && (
              <PhaseCard
                stageId="validation"
                number={validationStage.number}
                name={validationStage.name}
                status={validationIsCurrent ? "current" : "complete"}
              >
                <div className="bg-surface">
                  {validationIsEditable ? (
                    <form>
                      <ValidationPhaseSection
                        initiativeId={initiative.id}
                        data={initiative.validationData}
                      />
                    </form>
                  ) : (
                    <ValidationPhaseSection
                      initiativeId={initiative.id}
                      data={initiative.validationData}
                      readOnly
                    />
                  )}
                </div>
              </PhaseCard>
            )}
        </div>

        {SHOW_COMMENT_SECTION && (
          <CommentSection
            initiativeId={initiative.id}
            comments={comments}
            activity={activity}
            currentUserName={currentUserName}
            canComment={canComment}
          />
        )}
      </div>
    </div>
  );
}
