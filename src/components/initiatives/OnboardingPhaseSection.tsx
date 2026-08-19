"use client";

import { useActionState, useState } from "react";
import { ArrowRight, ListChecks, Rocket } from "lucide-react";
import { getPhaseProgressFill, getStageColor } from "@/data/workflow";
import type { InitiativeWithUsers } from "@/lib/queries";
import {
  ONBOARDING_ACTION_TASKS,
  getOnboardingPhaseUnlockHint,
  getOnboardingProgress,
  isOnboardingPhaseUnlocked,
  type AbsenceEntry,
  type OnboardingData,
  type OnboardingTaskId,
  type SetupTaskStatus,
} from "@/lib/validation-data";
import { PhaseSectionCard, PhaseSectionStack } from "./PhaseSectionCard";
import { SetupTaskCard } from "./setup/SetupTaskCard";
import { BriefingDeck } from "./onboarding/BriefingDeck";
import { WorkspaceLinksCard } from "./onboarding/WorkspaceLinksCard";
import { ToolAccessTask } from "./onboarding/ToolAccessTask";
import { MeetingCadenceTask } from "./onboarding/MeetingCadenceTask";
import { AbsenceLogTask } from "./onboarding/AbsenceLogTask";
import { BacklogTask } from "./onboarding/BacklogTask";
import { AllClearTask } from "./onboarding/AllClearTask";

import {
  completeOnboardingTask,
  resetOnboardingTask,
  advanceToProduction,
} from "@/app/(workspace)/workstreams/[id]/actions";

const advanceInitial: { error?: string; success?: boolean } = {};
const ACCENT = getStageColor("onboarding");

type Props = {
  initiative: InitiativeWithUsers;
  onboardingData: OnboardingData;
  readOnly?: boolean;
  /** False once the initiative has moved past Onboarding & Kickoff. */
  isCurrentStage?: boolean;
};

export function OnboardingPhaseSection({
  initiative,
  onboardingData,
  readOnly,
  isCurrentStage = true,
}: Props) {
  const progress = getOnboardingProgress(onboardingData);
  const actionProgress = getOnboardingProgress(onboardingData, "actions");
  const [taskError, setTaskError] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<OnboardingTaskId | null>(null);
  const [forceOpenTask, setForceOpenTask] = useState<OnboardingTaskId | null>(
    null,
  );
  const [forceOpenSeq, setForceOpenSeq] = useState(0);

  const boundAdvance = advanceToProduction.bind(null, initiative.id);
  const [advanceState, advanceAction, advancePending] = useActionState(
    boundAdvance,
    advanceInitial,
  );

  const actionsUnlocked = isOnboardingPhaseUnlocked(onboardingData, "actions");
  const lockHint = getOnboardingPhaseUnlockHint("actions");

  const runTask = async (
    taskId: OnboardingTaskId,
    data: Record<string, unknown>,
    options?: { complete?: boolean },
  ) => {
    const isDraft = options?.complete === false;
    setTaskError(null);
    if (!isDraft) setPendingTask(taskId);
    try {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("data", JSON.stringify(data));
      if (isDraft) formData.set("complete", "0");
      const result = await completeOnboardingTask(initiative.id, formData);
      if (result.error) setTaskError(result.error);
    } catch {
      setTaskError("Could not save this item. Try again.");
    } finally {
      if (!isDraft) setPendingTask(null);
    }
  };

  const handleUndo = async (taskId: OnboardingTaskId) => {
    setTaskError(null);
    setPendingTask(taskId);
    try {
      const formData = new FormData();
      formData.set("taskId", taskId);
      const result = await resetOnboardingTask(initiative.id, formData);
      if (result.error) setTaskError(result.error);
    } catch {
      setTaskError("Could not reset this item. Try again.");
    } finally {
      setPendingTask(null);
    }
  };

  /** Action items always confirm inside the card, so the tick just expands it. */
  const handleMarkComplete = (taskId: OnboardingTaskId) => {
    if (!actionsUnlocked) {
      setTaskError(
        "Walk through the kickoff briefing before the action items.",
      );
      return;
    }
    setForceOpenTask(taskId);
    setForceOpenSeq((seq) => seq + 1);
  };

  const teamNames = [
    ...new Set(
      (initiative.scopingData?.team ?? [])
        .map((member) => member.name?.trim())
        .filter((name): name is string => !!name),
    ),
  ];

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex-1">
          <div className="h-1.5 w-full bg-white/[0.04]">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
                backgroundColor: getPhaseProgressFill(
                  ACCENT,
                  progress.allDone,
                ),
              }}
            />
          </div>
        </div>
        <span className="shrink-0 font-display text-xs font-bold tabular-nums text-muted">
          {progress.completed}/{progress.total}
        </span>
      </div>

      {taskError && (
        <p className="border border-btr/40 bg-btr/10 px-3 py-2 text-xs text-btr">
          {taskError}
        </p>
      )}

      <PhaseSectionStack>
        <BriefingDeck
          initiative={initiative}
          data={onboardingData}
          readOnly={readOnly}
          pendingTask={pendingTask}
          onReview={(taskId) => void runTask(taskId, {})}
          onUndo={(taskId) => void handleUndo(taskId)}
        />

        <WorkspaceLinksCard
          initiativeId={initiative.id}
          setupData={initiative.setupData}
          links={onboardingData.links ?? {}}
          readOnly={readOnly}
        />

        <PhaseSectionCard
          header={
            <>
              <div className="flex items-center gap-2 text-muted">
                <ListChecks
                  className="size-3.5 shrink-0"
                  style={{ color: ACCENT }}
                />
                <p className="font-display text-[10px] font-bold uppercase tracking-wide">
                  Action Items
                </p>
                <span className="font-display text-[10px] font-bold tabular-nums text-muted/60">
                  {actionProgress.completed}/{actionProgress.total} done
                </span>
              </div>
              {!actionsUnlocked && lockHint && (
                <p className="font-display text-[10px] font-bold uppercase tracking-wide text-muted/40">
                  {lockHint}
                </p>
              )}
            </>
          }
          bodyClassName="space-y-2 p-4"
        >
          {ONBOARDING_ACTION_TASKS.map((task, index) => {
            const taskData = onboardingData[task.dataKey] as
              { status?: SetupTaskStatus } | undefined;
            const locked = !actionsUnlocked;

            return (
              <SetupTaskCard
                key={task.id}
                number={index + 1}
                label={task.label}
                logo={task.logo}
                status={taskData?.status ?? "pending"}
                readOnly={readOnly}
                locked={locked}
                lockHint={lockHint}
                forceOpen={forceOpenTask === task.id ? forceOpenSeq : undefined}
                completing={pendingTask === task.id}
                stayOpenOnComplete={task.id === "absences"}
                onMarkComplete={
                  readOnly || locked
                    ? undefined
                    : () => handleMarkComplete(task.id)
                }
                onUndo={
                  readOnly || locked ? undefined : () => handleUndo(task.id)
                }
              >
                {renderActionTask(task.id, {
                  initiative,
                  onboardingData,
                  teamNames,
                  readOnly: readOnly || locked,
                  onRun: runTask,
                })}
              </SetupTaskCard>
            );
          })}
        </PhaseSectionCard>
      </PhaseSectionStack>

      {/* Advance */}
      {!readOnly && isCurrentStage && progress.allDone && (
        <form action={advanceAction} className="pt-2 text-center">
          {advanceState.error && (
            <p className="mb-3 text-sm text-btr">{advanceState.error}</p>
          )}
          <button
            type="submit"
            disabled={advancePending}
            className="group relative inline-flex items-center gap-3 overflow-hidden border border-success bg-success px-6 py-3.5 font-display text-sm font-bold uppercase tracking-wide text-background transition-colors hover:bg-success/90 disabled:opacity-50"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-background/20 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            <Rocket className="relative size-4" />
            <span className="relative">
              {advancePending ? "Confirming…" : "Move to Production"}
            </span>
            <ArrowRight className="relative size-4" />
          </button>
        </form>
      )}

      {readOnly && isCurrentStage && progress.allDone && (
        <div className="border border-success/30 bg-success/10 px-4 py-3 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-success">
            Onboarding complete — ready for production
          </p>
        </div>
      )}
    </div>
  );
}

type ActionRenderContext = {
  initiative: InitiativeWithUsers;
  onboardingData: OnboardingData;
  teamNames: string[];
  readOnly?: boolean;
  onRun: (
    taskId: OnboardingTaskId,
    data: Record<string, unknown>,
    options?: { complete?: boolean },
  ) => void;
};

function renderActionTask(
  taskId: OnboardingTaskId,
  ctx: ActionRenderContext,
): React.ReactNode {
  const { initiative, onboardingData, readOnly, onRun } = ctx;

  switch (taskId) {
    case "tool-access":
      return (
        <ToolAccessTask
          data={onboardingData.toolAccess}
          readOnly={readOnly}
          onComplete={() => onRun("tool-access", {})}
        />
      );
    case "meeting-cadence":
      return (
        <MeetingCadenceTask
          data={onboardingData.meetingCadence}
          readOnly={readOnly}
          onComplete={() => onRun("meeting-cadence", {})}
        />
      );
    case "absences":
      return (
        <AbsenceLogTask
          data={onboardingData.absences}
          teamNames={ctx.teamNames}
          readOnly={readOnly}
          onSave={(payload: {
            entries: AbsenceEntry[];
            noneReported: boolean;
          }) => onRun("absences", payload, { complete: false })}
          onComplete={(payload: {
            entries: AbsenceEntry[];
            noneReported: boolean;
          }) => onRun("absences", payload)}
        />
      );
    case "backlog":
      return (
        <BacklogTask
          data={onboardingData.backlog}
          boardUrl={
            initiative.setupData?.jira.boardUrl ||
            initiative.setupData?.jira.projectUrl
          }
          readOnly={readOnly}
          onComplete={() => onRun("backlog", {})}
        />
      );
    case "all-clear":
      return (
        <AllClearTask
          data={onboardingData.allClear ?? { status: "pending" }}
          readOnly={readOnly}
          onComplete={() => onRun("all-clear", {})}
        />
      );
    default:
      return null;
  }
}
