import type { CSSProperties } from "react";
import { ArrowUpRight, Check, Rocket } from "lucide-react";
import { STAGES, getStageColor, stageInk, type WorkflowStage } from "@/data/workflow";
import type {
  ActivityEntry,
  InitiativeWithUsers,
  CommentEntry,
  MentionPerson,
} from "@/lib/queries";
import type { Attachment } from "@/lib/validation-data";
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
import { WorkstreamAttachments } from "./WorkstreamAttachments";
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
import { ArchiveWorkstreamButton } from "./ArchiveWorkstreamButton";
import {
  createDefaultOnboardingData,
  getOnboardingProgress,
  getSetupProgress,
  isManualProductionProject,
} from "@/lib/validation-data";

const STAGE_INDEX: Record<string, number> = {};
for (const s of STAGES) STAGE_INDEX[s.id] = s.number;

/** Re-enable when the pipeline stepper returns to the detail view. */
const SHOW_PIPELINE_STEPPER = false;

const ENTER_CLASS = "animate-card-enter";

function enterStyle(delayMs: number): CSSProperties {
  return { "--enter-delay": `${delayMs}ms` } as CSSProperties;
}

type PhaseCompletion = { name: string; at: Date };

function completionFromDecision(
  decision:
    | { decision: string; approverName: string; createdAt: Date }
    | null
    | undefined,
): PhaseCompletion | null {
  if (!decision || decision.decision !== "approved") return null;
  return { name: decision.approverName, at: decision.createdAt };
}

function completionFromActivity(
  activity: ActivityEntry[],
  actions: string[],
): PhaseCompletion | null {
  const match = activity.find((entry) => actions.includes(entry.action));
  return match ? { name: match.userName, at: match.createdAt } : null;
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
  activity?: ActivityEntry[];
  mentionablePeople?: MentionPerson[];
  attachments?: Attachment[];
  canUserApprove: boolean;
  canComment: boolean;
  currentUserName: string;
  currentUserId?: string;
  /** Floating workstream chat (workspace users and shared links). */
  showChat?: boolean;
  /** When set, visitors without a session comment via the share guest flow. */
  shareToken?: string;
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
  /** Dev/test form prefill for allowlisted accounts. */
  showFormPrefill?: boolean;
};

export function InitiativeDetailView({
  initiative,
  comments,
  activity = [],
  mentionablePeople = [],
  attachments = [],
  canUserApprove,
  canComment,
  currentUserName,
  currentUserId,
  showChat = false,
  shareToken,
  latestDecision = null,
  validationDecision = null,
  goNoGoDecision = null,
  isCreator = false,
  sharePath,
  canUserManageSetup = false,
  canUserManageOnboarding = false,
  showFormPrefill = false,
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
  const goNoGoOnHold =
    goNoGoIsCurrent &&
    initiative.status === "on-hold" &&
    goNoGoDecision?.decision === "on-hold";

  // ── Phase 3: Scoping
  const scopingStage = STAGES.find((s) => s.id === "scoping")!;
  const showScoping = currentNum >= 3;
  const scopingIsCurrent = initiative.currentStage === "scoping";
  const scopingAwaitingDecision =
    scopingIsCurrent && initiative.status === "submitted";

  const scopingCanResubmit =
    (goNoGoHasFeedback || goNoGoOnHold) && (isCreator || canUserApprove);

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
        (goNoGoIsCurrent &&
          initiative.status === "on-hold" &&
          goNoGoDecision.decision === "on-hold") ||
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

  const addedManually = isManualProductionProject(initiative.setupData);
  const addedManuallyOn = initiative.setupData?.addedAt
    ? new Date(initiative.setupData.addedAt).toLocaleDateString("en-US", {
        dateStyle: "medium",
      })
    : null;

  const canArchive = canUserApprove && !shareToken && !initiative.isFastTrack;
  const archiveAction = canArchive && (
    <ArchiveWorkstreamButton
      initiativeId={initiative.id}
      title={initiative.title}
      stageName={stage?.name ?? initiative.currentStage}
      archived={Boolean(initiative.archivedAt)}
    />
  );
  const archiveActionBar = canArchive && (
    <ArchiveWorkstreamButton
      initiativeId={initiative.id}
      title={initiative.title}
      stageName={stage?.name ?? initiative.currentStage}
      archived={Boolean(initiative.archivedAt)}
      size="md"
    />
  );

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
        archiveAction={archiveActionBar}
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
                  style={{ color: stageInk(initiative.currentStage) }}
                >
                  {stage?.name ?? initiative.currentStage}
                </span>
              </div>
              <h1 className="font-display mt-3 text-3xl font-extrabold uppercase leading-tight tracking-tight sm:text-4xl">
                {initiative.title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {archiveAction}
              {sharePath && <ShareButton path={sharePath} />}
              <DownloadPdfButton />
            </div>
          </div>
          {initiative.archivedAt && (
            <p
              className="mt-4 border px-4 py-3 font-display text-[11px] font-bold uppercase tracking-wide"
              style={{ borderColor: "var(--hn-ink)", color: "var(--hn-ink)" }}
            >
              On Hold in {stage?.name ?? initiative.currentStage}
            </p>
          )}
        </header>

        {addedManually ? (
          <div
            className={`mb-8 border border-border bg-surface px-5 py-5 ${ENTER_CLASS}`}
            style={enterStyle(70)}
          >
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
              Added manually
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              This project was added from Production and did not go through the
              pipeline.
              {addedManuallyOn ? ` Added ${addedManuallyOn}.` : ""}
            </p>
          </div>
        ) : (
        <DetailsQuickView
          className={ENTER_CLASS}
          style={enterStyle(70)}
          initiative={initiative}
          attachments={attachments}
          shareToken={shareToken}
          currentUserId={currentUserId}
          canRemoveWorkstreamAttachments={!shareToken && Boolean(currentUserId)}
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
        )}

        {addedManually && (
          <div className={`mb-8 ${ENTER_CLASS}`} style={enterStyle(90)}>
            <WorkstreamAttachments
              initiativeId={initiative.id}
              attachments={attachments}
              shareToken={shareToken}
              currentUserId={currentUserId}
              canRemove={!shareToken && Boolean(currentUserId)}
            />
          </div>
        )}

        <div id="detail-header-sentinel" aria-hidden="true" />

        {SHOW_PIPELINE_STEPPER && (
          <div className="mb-8 border border-border bg-surface-elevated p-5">
            <StageStepper currentStageId={initiative.currentStage} />
          </div>
        )}

        {!addedManually && (
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
              completedBy={
                completionFromDecision(displayedIdeaDecision) ??
                completionFromActivity(activity, [
                  "approved_to_validation",
                  "converted_to_fast_track",
                ])
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
                feedback={displayedIdeaDecision}
              />

              {initiative.isFastTrack && (
                <div className="flex flex-wrap items-center gap-3 border-t border-border bg-bbb/5 px-4 py-3 sm:px-5">
                  <span className="inline-flex items-center gap-1.5 border border-bbb bg-bbb/10 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wide text-bbb">
                    <Rocket className="size-3.5" />
                    Fast-Track
                  </span>
                  <p className="text-xs text-muted">
                    This initiative skipped the pipeline and is tracked on the
                    Fast Track board.
                  </p>
                  {initiative.fastTrackJiraUrl && (
                    <a
                      href={initiative.fastTrackJiraUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wide text-bbb hover:underline"
                    >
                      {initiative.fastTrackJiraKey ?? "Open in Jira"}
                      <ArrowUpRight className="size-3" />
                    </a>
                  )}
                </div>
              )}

              {showApprovalPanel && !initiative.isFastTrack && (
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
                completedBy={
                  completionFromDecision(displayedValidationDecision) ??
                  completionFromActivity(activity, ["validation_approved"])
                }
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
                        canFastTrack={canUserApprove && !initiative.isFastTrack}
                        showFormPrefill={showFormPrefill}
                      />
                    </form>
                  ) : (
                    <ValidationPhaseSection
                      initiativeId={initiative.id}
                      data={initiative.validationData}
                      readOnly
                      feedback={displayedValidationDecision}
                    />
                  )}
                </div>

                {(validationAwaitingDecision ||
                  displayedValidationDecision) &&
                  !validationCanResubmit &&
                  !initiative.isFastTrack && (
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
                completedBy={completionFromActivity(activity, [
                  "scoping_submitted",
                  "scoping_resubmitted",
                ])}
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
                        showFormPrefill={showFormPrefill}
                      />
                    </form>
                  ) : (
                    <ScopingPhaseSection
                      initiativeId={initiative.id}
                      data={initiative.scopingData}
                      validationData={initiative.validationData}
                      readOnly
                      feedback={displayedGoNoGoDecision}
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
                completedBy={
                  completionFromDecision(displayedGoNoGoDecision) ??
                  completionFromActivity(activity, ["gonogo_approved"])
                }
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
                completedBy={completionFromActivity(activity, ["setup_completed"])}
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
                completedBy={completionFromActivity(activity, [
                  "onboarding_completed",
                ])}
              >
                <div className="bg-surface p-4 sm:p-5">
                  <OnboardingPhaseSection
                    initiative={initiative}
                    onboardingData={onboardingData}
                    attachments={attachments}
                    readOnly={onboardingIsReadOnly}
                    isCurrentStage={onboardingIsCurrent}
                  />
                </div>
              </PhaseCard>
            )}
        </div>
        )}

      </div>
      {showChat && (
        <WorkstreamChat
          initiativeId={initiative.id}
          comments={comments}
          activity={activity}
          mentionablePeople={mentionablePeople}
          currentUserName={currentUserName}
          currentUserId={currentUserId}
          canComment={canComment}
          shareToken={shareToken}
          dockAbovePhaseBar={currentNum >= 4}
          currentStage={initiative.currentStage}
          isFastTrack={initiative.isFastTrack}
        />
      )}
      {!addedManually && currentNum >= 4 && currentPhaseBarStatus && (
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
