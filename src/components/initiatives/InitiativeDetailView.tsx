import { Check } from "lucide-react";
import { STAGES, getStageColor, type WorkflowStage } from "@/data/workflow";
import type {
  InitiativeWithUsers,
  ActivityEntry,
  CommentEntry,
} from "@/lib/queries";
import { ApprovalPanel, type ApprovalDecision } from "./ApprovalPanel";
import {
  ValidationApprovalPanel,
  type ValidationDecision,
} from "./ValidationApprovalPanel";
import {
  GoNoGoApprovalPanel,
  type GoNoGoDecision,
} from "./GoNoGoApprovalPanel";
import { CommentSection } from "./CommentSection";
import { ValidationPhaseSection } from "./ValidationPhaseSection";
import { ScopingPhaseSection } from "./ScopingPhaseSection";
import { PhaseCard } from "./PhaseCard";
import { IdeaDetailsSection } from "./IdeaDetailsSection";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { ShareButton } from "./ShareButton";
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

const STATUS_BADGE_STYLES: Record<string, string> = {
  submitted: "border-foreground bg-foreground text-background",
  approved: "border-success bg-success/10 text-success",
  rejected: "border-btr bg-btr/10 text-btr",
  "on-hold": "border-hn bg-hn/10 text-hn",
  feedback: "border-feedback bg-feedback/10 text-feedback",
  draft: "border-border bg-surface text-muted",
};

const STATUS_LABELS: Record<string, string> = {
  submitted: "Review",
  approved: "Approved",
  rejected: "Rejected",
  "on-hold": "On Hold",
  feedback: "Feedback",
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
  validationDecision?: ValidationDecision | null;
  goNoGoDecision?: GoNoGoDecision | null;
  isCreator?: boolean;
  /** When set, shows a Share CTA that copies this public path. */
  sharePath?: string;
};

export function InitiativeDetailView({
  initiative,
  activity,
  comments,
  canUserApprove,
  canComment,
  currentUserName,
  latestDecision = null,
  validationDecision = null,
  goNoGoDecision = null,
  isCreator = false,
  sharePath,
}: Props) {
  const stage = STAGES.find(
    (s) => s.id === initiative.currentStage,
  ) as WorkflowStage;

  const currentNum = STAGE_INDEX[initiative.currentStage] ?? 1;
  const ideaStage = STAGES.find((s) => s.id === "idea")!;
  const validationStage = STAGES.find((s) => s.id === "validation")!;

  const ideaAwaitingDecision =
    initiative.currentStage === "idea" && initiative.status === "submitted";

  const ideaHasFeedback =
    initiative.currentStage === "idea" &&
    initiative.status === "draft" &&
    latestDecision?.decision === "feedback";

  const displayedIdeaDecision =
    latestDecision && !ideaAwaitingDecision
      ? (ideaHasFeedback && latestDecision.decision === "feedback") ||
        (initiative.status === "on-hold" &&
          latestDecision.decision === "on-hold") ||
        (initiative.status === "rejected" &&
          latestDecision.decision === "rejected") ||
        (initiative.currentStage !== "idea" &&
          latestDecision.decision === "approved")
        ? latestDecision
        : null
      : null;

  const showApprovalPanel = ideaAwaitingDecision || !!displayedIdeaDecision;

  const canEditIdea =
    initiative.currentStage === "idea" &&
    (initiative.status === "rejected"
      ? isCreator
      : isCreator || canUserApprove);

  const ideaCanResubmit =
    initiative.currentStage === "idea" &&
    ((ideaHasFeedback && (isCreator || canUserApprove)) ||
      (initiative.status === "on-hold" && (isCreator || canUserApprove)) ||
      (initiative.status === "rejected" && isCreator));

  const statusKey = ideaHasFeedback ? "feedback" : initiative.status;
  const statusStyle =
    STATUS_BADGE_STYLES[statusKey] ?? STATUS_BADGE_STYLES.draft;
  const statusLabel = STATUS_LABELS[statusKey] ?? initiative.status;

  const showValidation = currentNum >= 2;
  const validationIsCurrent = initiative.currentStage === "validation";
  // Business case has been submitted and is waiting on a leadership decision.
  const validationAwaitingDecision =
    validationIsCurrent && initiative.status === "submitted";

  // Creators can keep editing while awaiting a decision (update & resubmit).
  const validationIsEditable =
    validationIsCurrent &&
    (initiative.status === "approved" ||
      initiative.status === "draft" ||
      (validationAwaitingDecision && isCreator));

  // Initiative details stay editable in the Initiative stage per status rules above.

  // Only surface the latest validation decision when it matches the current
  // state (avoids showing stale decisions after a resubmission).
  const displayedValidationDecision =
    validationDecision && !validationAwaitingDecision
      ? (validationIsCurrent &&
          initiative.status === "rejected" &&
          validationDecision.decision === "rejected") ||
        (validationIsCurrent &&
          initiative.status === "draft" &&
          validationDecision.decision === "feedback") ||
        (currentNum > 2 && validationDecision.decision === "approved")
        ? validationDecision
        : null
      : null;

  const validationStatus: "complete" | "current" | "review" =
    currentNum > 2
      ? "complete"
      : validationAwaitingDecision
        ? "review"
        : "current";

  // ── Phase 3: Scoping
  const scopingStage = STAGES.find((s) => s.id === "scoping")!;
  const showScoping = currentNum >= 3;
  const scopingIsCurrent = initiative.currentStage === "scoping";
  const scopingAwaitingDecision =
    scopingIsCurrent && initiative.status === "submitted";

  const scopingIsEditable =
    scopingIsCurrent &&
    (initiative.status === "approved" ||
      initiative.status === "draft" ||
      (scopingAwaitingDecision && isCreator));

  const scopingStatus: "complete" | "current" | "review" =
    currentNum > 3
      ? "complete"
      : scopingAwaitingDecision
        ? "review"
        : "current";

  // ── Phase 4: Go/No-Go
  const goNoGoStage = STAGES.find((s) => s.id === "go-nogo")!;
  const showGoNoGo = currentNum >= 4;
  const goNoGoIsCurrent = initiative.currentStage === "go-nogo";
  const goNoGoAwaitingDecision =
    goNoGoIsCurrent && initiative.status === "submitted";

  const displayedGoNoGoDecision =
    goNoGoDecision && !goNoGoAwaitingDecision
      ? (goNoGoIsCurrent &&
          initiative.status === "rejected" &&
          goNoGoDecision.decision === "rejected") ||
        (goNoGoIsCurrent &&
          initiative.status === "draft" &&
          goNoGoDecision.decision === "feedback") ||
        (currentNum > 4 && goNoGoDecision.decision === "approved")
        ? goNoGoDecision
        : null
      : null;

  const goNoGoStatus: "complete" | "current" | "review" =
    currentNum > 4
      ? "complete"
      : goNoGoAwaitingDecision
        ? "review"
        : "current";

  return (
    <div className="relative w-full flex-1">
      <FloatingDetailBar
        title={initiative.title}
        stageName={stage?.name ?? initiative.currentStage}
        stageColor={getStageColor(initiative.currentStage)}
        sharePath={sharePath}
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
            <div className="flex shrink-0 items-center gap-2">
              {sharePath && <ShareButton path={sharePath} />}
              <DownloadPdfButton />
            </div>
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
              status={
                initiative.currentStage !== "idea"
                  ? "complete"
                  : ideaAwaitingDecision
                    ? "review"
                    : "current"
              }
            >
              <IdeaDetailsSection
                initiativeId={initiative.id}
                values={{
                  title: initiative.title,
                  problemStatement: initiative.problemStatement,
                  opportunitySolution: initiative.opportunitySolution,
                  expectedImpact: initiative.expectedImpact,
                  targetAudience: initiative.targetAudience,
                }}
                canEdit={canEditIdea}
                canResubmit={ideaCanResubmit}
              />

              {showApprovalPanel && (
                <ApprovalPanel
                  initiativeId={initiative.id}
                  decision={
                    ideaAwaitingDecision ? null : displayedIdeaDecision
                  }
                  embedded
                  canDecide={canUserApprove}
                  awaitingDecision={ideaAwaitingDecision}
                />
              )}
            </PhaseCard>

            {showValidation && (
              <PhaseCard
                stageId="validation"
                number={validationStage.number}
                name={validationStage.name}
                status={validationStatus}
              >
                <div className="bg-surface">
                  {validationIsEditable ? (
                    <form>
                      <ValidationPhaseSection
                        initiativeId={initiative.id}
                        data={initiative.validationData}
                        feedback={displayedValidationDecision}
                        resubmitting={validationAwaitingDecision}
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

                {(validationAwaitingDecision ||
                  displayedValidationDecision) && (
                  <ValidationApprovalPanel
                    initiativeId={initiative.id}
                    decision={displayedValidationDecision}
                    canDecide={canUserApprove}
                    awaitingDecision={validationAwaitingDecision}
                  />
                )}
              </PhaseCard>
            )}

            {showScoping && (
              <PhaseCard
                stageId="scoping"
                number={scopingStage.number}
                name={scopingStage.name}
                status={scopingStatus}
              >
                <div className="bg-surface">
                  {scopingIsEditable ? (
                    <form>
                      <ScopingPhaseSection
                        initiativeId={initiative.id}
                        data={initiative.scopingData}
                        validationData={initiative.validationData}
                        resubmitting={scopingAwaitingDecision}
                      />
                    </form>
                  ) : (
                    <ScopingPhaseSection
                      initiativeId={initiative.id}
                      data={initiative.scopingData}
                      validationData={initiative.validationData}
                      readOnly
                    />
                  )}
                </div>
              </PhaseCard>
            )}

            {showGoNoGo && (
              <PhaseCard
                stageId="go-nogo"
                number={goNoGoStage.number}
                name={goNoGoStage.name}
                status={goNoGoStatus}
              >
                <div className="bg-surface px-4 py-5 sm:px-5">
                  <p className="text-xs text-muted">
                    All prior stages are shown above for review. Use the
                    approval panel below to make the Go / No-Go decision.
                  </p>
                </div>

                {(goNoGoAwaitingDecision || displayedGoNoGoDecision) && (
                  <GoNoGoApprovalPanel
                    initiativeId={initiative.id}
                    decision={displayedGoNoGoDecision}
                    canDecide={canUserApprove}
                    awaitingDecision={goNoGoAwaitingDecision}
                  />
                )}
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
