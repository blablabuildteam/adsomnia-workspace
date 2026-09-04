import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { STAGES, getStageColor, type WorkflowStage } from "@/data/workflow";
import type {
  InitiativeWithUsers,
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
import { WorkstreamChat } from "./WorkstreamChat";
import { ValidationPhaseSection } from "./ValidationPhaseSection";
import { ScopingPhaseSection } from "./ScopingPhaseSection";
import { SetupPhaseSection } from "./SetupPhaseSection";
import { OnboardingPhaseSection } from "./OnboardingPhaseSection";
import { DetailsQuickView } from "./DetailsQuickView";
import { PhaseCard } from "./PhaseCard";
import { IdeaDetailsSection } from "./IdeaDetailsSection";
import { DownloadPdfButton } from "./DownloadPdfButton";
import { ShareButton } from "./ShareButton";
import { CurrentPhaseBar } from "./CurrentPhaseBar";
import { FloatingDetailBar } from "./FloatingDetailBar";
import {
  createDefaultOnboardingData,
  getOnboardingProgress,
  getSetupProgress,
} from "@/lib/validation-data";

const STAGE_INDEX: Record<string, number> = {};
for (const s of STAGES) STAGE_INDEX[s.id] = s.number;

/** Re-enable when the pipeline stepper returns to the detail view. */
const SHOW_PIPELINE_STEPPER = false;

const ENTER_CLASS = "animate-card-enter";

function enterStyle(delayMs: number): CSSProperties {
  return { "--enter-delay": `${delayMs}ms` } as CSSProperties;
}

/** Dark fill → light label; light fill (white / volt / teal) → black label. */
function stageLabelOnFill(hex: string): string {
  const light =
    hex === "#FFFFFF" ||
    hex === "#CEFF00" ||
    hex === "#9CA3AF" ||
    hex === "#22D3EE" ||
    hex === "#FB923C";
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

type Props = {
  initiative: InitiativeWithUsers;
  comments: CommentEntry[];
  canUserApprove: boolean;
  canComment: boolean;
  currentUserName: string;
  currentUserId?: string;
  /** Hide on public share links — chat is for signed-in workspace users. */
  showChat?: boolean;
  latestDecision?: ApprovalDecision | null;
  validationDecision?: ValidationDecision | null;
  goNoGoDecision?: GoNoGoDecision | null;
  isCreator?: boolean;
  /** When set, shows a Share CTA that copies this public path. */
  sharePath?: string;
  /** Whether the current user can manage setup tasks (Head of Production). */
  canUserManageSetup?: boolean;
  /** Whether the current user runs the onboarding session (Head of Production). */
  canUserManageOnboarding?: boolean;
};

export function InitiativeDetailView({
  initiative,
  comments,
  canUserApprove,
  canComment,
  currentUserName,
  currentUserId,
  showChat = false,
  latestDecision = null,
  validationDecision = null,
  goNoGoDecision = null,
  isCreator = false,
  sharePath,
  canUserManageSetup = false,
  canUserManageOnboarding = false,
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
    (initiative.currentStage === "idea" ||
      initiative.currentStage === "validation") &&
    (initiative.status === "rejected"
      ? isCreator
      : isCreator || canUserApprove);

  const ideaCanResubmit =
    initiative.currentStage === "idea" &&
    ((ideaHasFeedback && (isCreator || canUserApprove)) ||
      (initiative.status === "on-hold" && (isCreator || canUserApprove)) ||
      (initiative.status === "rejected" && isCreator));

  const showValidation = currentNum >= 2;
  const validationIsCurrent = initiative.currentStage === "validation";
  // Business case has been submitted and is waiting on a leadership decision.
  const validationAwaitingDecision =
    validationIsCurrent && initiative.status === "submitted";

  const validationHasFeedback =
    validationIsCurrent &&
    initiative.status === "draft" &&
    validationDecision?.decision === "feedback";

  const validationCanResubmit =
    validationIsCurrent &&
    ((validationHasFeedback && (isCreator || canUserApprove)) ||
      (initiative.status === "on-hold" && (isCreator || canUserApprove)) ||
      (initiative.status === "rejected" && isCreator));

  // Creator or leadership can keep editing the business case in Validation.
  const validationIsEditable =
    validationIsCurrent &&
    (initiative.status === "rejected"
      ? isCreator
      : isCreator || canUserApprove);

  // Only surface the latest validation decision when it matches the current
  // state (avoids showing stale decisions after a resubmission).
  const displayedValidationDecision =
    validationDecision && !validationAwaitingDecision
      ? (validationIsCurrent &&
          initiative.status === "rejected" &&
          validationDecision.decision === "rejected") ||
        (validationIsCurrent &&
          initiative.status === "on-hold" &&
          validationDecision.decision === "on-hold") ||
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

  // ── Phase 4 flags needed before Phase 3 editability
  const goNoGoIsCurrent = initiative.currentStage === "go-nogo";
  const goNoGoHasFeedback =
    goNoGoIsCurrent &&
    initiative.status === "draft" &&
    goNoGoDecision?.decision === "feedback";

  // ── Phase 3: Scoping
  const scopingStage = STAGES.find((s) => s.id === "scoping")!;
  const showScoping = currentNum >= 3;
  const scopingIsCurrent = initiative.currentStage === "scoping";
  const scopingAwaitingDecision =
    scopingIsCurrent && initiative.status === "submitted";

  const scopingCanResubmit =
    goNoGoHasFeedback && (isCreator || canUserApprove);

  const scopingIsEditable =
    (isCreator || canUserApprove) &&
    ((scopingIsCurrent &&
      (initiative.status === "approved" ||
        initiative.status === "draft" ||
        initiative.status === "on-hold" ||
        scopingAwaitingDecision)) ||
      scopingCanResubmit);

  const scopingStatus: "complete" | "current" | "review" =
    currentNum > 3 && !scopingCanResubmit
      ? "complete"
      : scopingAwaitingDecision
        ? "review"
        : "current";

  // ── Phase 4: Go/No-Go
  const goNoGoStage = STAGES.find((s) => s.id === "go-nogo")!;
  const showGoNoGo = currentNum >= 4;
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

  // ── Phase 5: Project Setup
  const setupStage = STAGES.find((s) => s.id === "setup")!;
  const showSetup = currentNum >= 5;
  const setupIsCurrent = initiative.currentStage === "setup";
  // Past stages are locked — the server rejects writes outside the live stage.
  const setupIsReadOnly = !canUserManageSetup || !setupIsCurrent;
  const setupReady =
    setupIsCurrent && getSetupProgress(initiative.setupData).allDone;

  // ── Phase 6: Onboarding & Kickoff
  const onboardingStage = STAGES.find((s) => s.id === "onboarding")!;
  const showOnboarding = currentNum >= 6;
  const onboardingIsCurrent = initiative.currentStage === "onboarding";
  const onboardingIsReadOnly =
    !canUserManageOnboarding || !onboardingIsCurrent;
  // Initiatives that reached onboarding before this phase existed have no blob.
  const onboardingData =
    initiative.onboardingData ?? createDefaultOnboardingData();
  const onboardingReady =
    onboardingIsCurrent && getOnboardingProgress(onboardingData).allDone;

  const currentPhaseBarStatus: "current" | "review" | "ready" | null =
    goNoGoIsCurrent
      ? goNoGoStatus === "review"
        ? "review"
        : "current"
      : setupIsCurrent
        ? setupReady
          ? "ready"
          : "current"
        : onboardingIsCurrent
          ? onboardingReady
            ? "ready"
            : "current"
          : null;

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
        <header className={`mb-6 ${ENTER_CLASS}`} style={enterStyle(0)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted">
                  {initiative.ticketId}
                </span>
                <span
                  className="font-display text-[10px] font-bold uppercase tracking-wide"
                  style={{ color: getStageColor(initiative.currentStage) }}
                >
                  {stage?.name ?? initiative.currentStage}
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

        {/* Quick View — grows as phases fill */}
        <DetailsQuickView
          className={ENTER_CLASS}
          style={enterStyle(70)}
          initiative={initiative}
          goDate={
            goNoGoDecision?.decision === "approved"
              ? goNoGoDecision.createdAt
              : null
          }
          goApprover={
            goNoGoDecision?.decision === "approved"
              ? goNoGoDecision.approverName
              : null
          }
        />

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
              className={ENTER_CLASS}
              style={enterStyle(140)}
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
                className={ENTER_CLASS}
                style={enterStyle(210)}
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
                        canResubmit={validationCanResubmit}
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
                  displayedValidationDecision) &&
                  !validationCanResubmit && (
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
                className={ENTER_CLASS}
                style={enterStyle(280)}
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
                        canResubmit={scopingCanResubmit}
                        feedback={
                          scopingCanResubmit ? displayedGoNoGoDecision : null
                        }
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
                className={ENTER_CLASS}
                style={enterStyle(350)}
                status={goNoGoStatus}
              >
                <div className="bg-surface px-4 py-5 sm:px-5">
                  <p className="text-xs text-muted">
                    All prior stages are shown above for review. Use the
                    approval panel below to make the Go / No-Go decision.
                  </p>
                </div>

                {(goNoGoAwaitingDecision || displayedGoNoGoDecision) &&
                  !scopingCanResubmit && (
                  <GoNoGoApprovalPanel
                    initiativeId={initiative.id}
                    decision={displayedGoNoGoDecision}
                    canDecide={canUserApprove}
                    awaitingDecision={goNoGoAwaitingDecision}
                  />
                )}
              </PhaseCard>
            )}

            {showSetup && initiative.setupData && (
              <PhaseCard
                stageId="setup"
                number={setupStage.number}
                name={setupStage.name}
                className={ENTER_CLASS}
                style={enterStyle(420)}
                status={
                  currentNum > 5
                    ? "complete"
                    : setupReady
                      ? "ready"
                      : "current"
                }
              >
                <div className="bg-surface p-4 sm:p-5">
                  <SetupPhaseSection
                    initiativeId={initiative.id}
                    setupData={initiative.setupData}
                    scopingData={initiative.scopingData}
                    ticketId={initiative.ticketId}
                    projectTitle={initiative.title}
                    leadParty={initiative.validationData?.leadProductionParty}
                    readOnly={setupIsReadOnly}
                    isCurrentStage={setupIsCurrent}
                  />
                </div>
              </PhaseCard>
            )}

            {showOnboarding && (
              <PhaseCard
                stageId="onboarding"
                number={onboardingStage.number}
                name={onboardingStage.name}
                className={ENTER_CLASS}
                style={enterStyle(490)}
                status={
                  currentNum > 6
                    ? "complete"
                    : onboardingReady
                      ? "ready"
                      : "current"
                }
                readyLabel="Ready for Production"
              >
                <div className="bg-surface p-4 sm:p-5">
                  <OnboardingPhaseSection
                    initiative={initiative}
                    onboardingData={onboardingData}
                    readOnly={onboardingIsReadOnly}
                    isCurrentStage={onboardingIsCurrent}
                  />
                </div>
              </PhaseCard>
            )}
        </div>

      </div>
      {showChat && (
        <WorkstreamChat
          initiativeId={initiative.id}
          comments={comments}
          currentUserName={currentUserName}
          currentUserId={currentUserId}
          canComment={canComment}
          dockAbovePhaseBar={currentNum >= 4}
        />
      )}
      {currentNum >= 4 && currentPhaseBarStatus && (
        <CurrentPhaseBar
          stageId={initiative.currentStage}
          stageNumber={stage?.number ?? currentNum}
          stageName={stage?.name ?? initiative.currentStage}
          stageColor={getStageColor(initiative.currentStage)}
          status={currentPhaseBarStatus}
          readyLabel={
            onboardingIsCurrent
              ? "Ready for Production"
              : "Ready for Onboarding"
          }
        />
      )}
    </div>
  );
}
