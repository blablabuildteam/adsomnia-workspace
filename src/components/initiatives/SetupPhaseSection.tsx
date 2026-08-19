"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Rocket } from "lucide-react";
import {
  SETUP_TASKS,
  getSetupProgress,
  getSetupPhaseUnlockHint,
  isSetupPhaseUnlocked,
  normalizeUrl,
  suggestedDriveName,
  type SetupData,
  type SetupTaskId,
  type SetupTaskStatus,
  type ScopingData,
} from "@/lib/validation-data";
import { summarizeTeamCost } from "@/data/role-rates";

import { SetupTaskCard } from "./setup/SetupTaskCard";
import { SlackSetupTask } from "./setup/SlackSetupTask";
import { DriveSetupTask } from "./setup/DriveSetupTask";
import { JiraSetupTask } from "./setup/JiraSetupTask";
import { JiraPlanningTask } from "./setup/JiraPlanningTask";
import { DocsSetupTask } from "./setup/DocsSetupTask";
import { TeamSetupTask } from "./setup/TeamSetupTask";
import { ScopeConfirmTask } from "./setup/ScopeConfirmTask";
import { PlanningConfirmTask } from "./setup/PlanningConfirmTask";
import { BudgetConfirmTask } from "./setup/BudgetConfirmTask";
import { ManualConfirmTask } from "./setup/ManualConfirmTask";

import {
  completeSetupTask,
  resetSetupTask,
  advanceToOnboarding,
} from "@/app/(workspace)/workstreams/[id]/actions";

const advanceInitial: { error?: string; success?: boolean } = {};

type Props = {
  initiativeId: number;
  setupData: SetupData;
  scopingData?: ScopingData | null;
  ticketId: string;
  projectTitle: string;
  leadParty?: string;
  readOnly?: boolean;
};

export function SetupPhaseSection({
  initiativeId,
  setupData,
  scopingData,
  ticketId,
  projectTitle,
  readOnly,
}: Props) {
  const progress = getSetupProgress(setupData);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [pendingTask, setPendingTask] = useState<SetupTaskId | null>(null);
  const [forceOpenTask, setForceOpenTask] = useState<SetupTaskId | null>(null);
  const [forceOpenSeq, setForceOpenSeq] = useState(0);
  const [slackChannelName, setSlackChannelName] = useState(
    setupData.slack.channelName || "",
  );
  const [jiraBoardUrl, setJiraBoardUrl] = useState(
    setupData.jira.boardUrl || setupData.jira.projectUrl || "",
  );
  const [driveUrl, setDriveUrl] = useState(setupData.drive.driveUrl || "");

  const boundAdvance = advanceToOnboarding.bind(null, initiativeId);
  const [advanceState, advanceAction, advancePending] = useActionState(
    boundAdvance,
    advanceInitial,
  );

  const handleTaskComplete = async (
    taskId: SetupTaskId,
    data: Record<string, unknown>,
    options?: { complete?: boolean },
  ) => {
    setTaskError(null);
    setPendingTask(taskId);
    try {
      const formData = new FormData();
      formData.set("taskId", taskId);
      formData.set("data", JSON.stringify(data));
      if (options?.complete === false) formData.set("complete", "0");
      const result = await completeSetupTask(initiativeId, formData);
      if (result.error) {
        setTaskError(result.error);
      }
    } catch {
      setTaskError("Could not complete this task. Try again.");
    } finally {
      setPendingTask(null);
    }
  };

  const TASKS_NEEDING_INPUT: SetupTaskId[] = ["slack", "jira"];

  const handleMarkComplete = (taskId: SetupTaskId) => {
    const taskDef = SETUP_TASKS.find((t) => t.id === taskId);
    if (taskDef && !isSetupPhaseUnlocked(setupData, taskDef.phase)) {
      setTaskError(getSetupPhaseUnlockHint(taskDef.phase));
      return;
    }
    if (TASKS_NEEDING_INPUT.includes(taskId)) {
      setForceOpenTask(taskId);
      setForceOpenSeq((s) => s + 1);
      return;
    }
    const payload = buildQuickCompletePayload(taskId, {
      setupData,
      scopingData,
      slackChannelName,
      jiraBoardUrl,
      driveUrl,
      suggestedDriveName: suggestedDriveName(projectTitle, ticketId),
    });
    if ("error" in payload) {
      setTaskError(payload.error);
      setForceOpenTask(taskId);
      setForceOpenSeq((s) => s + 1);
      return;
    }
    void handleTaskComplete(taskId, payload.data);
  };

  const handleUndo = async (taskId: SetupTaskId) => {
    setTaskError(null);
    setPendingTask(taskId);
    try {
      const formData = new FormData();
      formData.set("taskId", taskId);
      const result = await resetSetupTask(initiativeId, formData);
      if (result.error) {
        setTaskError(result.error);
      }
    } catch {
      setTaskError("Could not reset this task. Try again.");
    } finally {
      setPendingTask(null);
    }
  };

  const PHASE_LABELS: Record<string, string> = {
    A: "Environment Setup",
    B: "Confirmations",
    C: "Kickoff Preparation",
  };

  let lastPhase = "";

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex-1">
          <div className="h-1.5 w-full bg-white/[0.04]">
            <div
              className="h-full bg-success transition-all duration-500"
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
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

      {pendingTask && (
        <p className="text-xs text-muted">Saving…</p>
      )}

      {/* Task list */}
      {SETUP_TASKS.map((task, index) => {
        const taskData = setupData[task.dataKey] as { status?: SetupTaskStatus } | undefined;
        const showPhaseLabel = task.phase !== lastPhase;
        lastPhase = task.phase;
        const phaseUnlocked = isSetupPhaseUnlocked(setupData, task.phase);
        const lockHint = getSetupPhaseUnlockHint(task.phase);
        const taskLocked = !phaseUnlocked;

        return (
          <div key={task.id}>
            {showPhaseLabel && (
              <div className="mb-2 mt-4 flex items-baseline justify-between gap-3">
                <p className="font-display text-[9px] font-bold uppercase tracking-[0.3em] text-muted/40">
                  {PHASE_LABELS[task.phase]}
                </p>
                {taskLocked && lockHint && (
                  <p className="font-display text-[9px] font-bold uppercase tracking-wide text-muted/40">
                    {lockHint}
                  </p>
                )}
              </div>
            )}
            <SetupTaskCard
              number={index + 1}
              label={task.label}
              logo={task.logo}
              status={taskData?.status ?? "pending"}
              optional={task.optional}
              readOnly={readOnly}
              locked={taskLocked}
              lockHint={lockHint}
              forceOpen={forceOpenTask === task.id ? forceOpenSeq : undefined}
              completing={pendingTask === task.id}
              onMarkComplete={
                readOnly || taskLocked
                  ? undefined
                  : () => handleMarkComplete(task.id)
              }
              onUndo={
                readOnly || taskLocked
                  ? undefined
                  : () => handleUndo(task.id)
              }
            >
              {renderTaskContent(task.id, {
                setupData,
                scopingData,
                readOnly: readOnly || taskLocked,
                suggestedDriveName: suggestedDriveName(projectTitle, ticketId),
                slackChannelName,
                onSlackChannelNameChange: setSlackChannelName,
                jiraBoardUrl,
                onJiraBoardUrlChange: setJiraBoardUrl,
                driveUrl,
                onDriveUrlChange: setDriveUrl,
                onComplete: handleTaskComplete,
              })}
            </SetupTaskCard>
          </div>
        );
      })}

      {/* Advance button */}
      {!readOnly && progress.allDone && (
        <form action={advanceAction} className="pt-4 text-center">
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
              {advancePending ? "Confirming…" : "Ready for Onboarding"}
            </span>
            <ArrowRight className="relative size-4" />
          </button>
        </form>
      )}

      {readOnly && progress.allDone && (
        <div className="border border-success/30 bg-success/10 px-4 py-3 text-center">
          <p className="font-display text-xs font-bold uppercase tracking-wide text-success">
            All setup tasks complete — ready for onboarding
          </p>
        </div>
      )}
    </div>
  );
}

type TaskRenderContext = {
  setupData: SetupData;
  scopingData?: ScopingData | null;
  readOnly?: boolean;
  suggestedDriveName: string;
  slackChannelName: string;
  onSlackChannelNameChange: (value: string) => void;
  jiraBoardUrl: string;
  onJiraBoardUrlChange: (value: string) => void;
  driveUrl: string;
  onDriveUrlChange: (value: string) => void;
  onComplete: (
    taskId: SetupTaskId,
    data: Record<string, unknown>,
    options?: { complete?: boolean },
  ) => void;
};

function buildQuickCompletePayload(
  taskId: SetupTaskId,
  ctx: {
    setupData: SetupData;
    scopingData?: ScopingData | null;
    slackChannelName: string;
    jiraBoardUrl: string;
    driveUrl: string;
    suggestedDriveName: string;
  },
): { data: Record<string, unknown> } | { error: string } {
  const { setupData, scopingData } = ctx;

  switch (taskId) {
    case "slack": {
      const channelName = ctx.slackChannelName.trim().replace(/^#/, "");
      if (!channelName) {
        return { error: "Enter the Slack channel name, then mark complete." };
      }
      return { data: { channelName } };
    }
    case "drive":
      return {
        data: {
          driveName:
            setupData.drive.driveName || ctx.suggestedDriveName,
          driveUrl: ctx.driveUrl || setupData.drive.driveUrl,
        },
      };
    case "jira": {
      const boardUrl = normalizeUrl(ctx.jiraBoardUrl);
      if (!boardUrl) {
        return { error: "Paste the Jira board URL, then mark complete." };
      }
      return { data: { boardUrl, projectUrl: boardUrl } };
    }
    case "jira-planning":
      return { data: {} };
    case "documentation":
      return { data: { linkedDocs: setupData.documentation.linkedDocs } };
    case "team":
      return { data: { members: setupData.team.members } };
    case "scope":
      return {
        data: {
          confirmedItems:
            setupData.scope.confirmedItems ?? scopingData?.scopeItems ?? [],
        },
      };
    case "planning":
      return {
        data: {
          confirmedMilestones:
            setupData.planning.confirmedMilestones ??
            scopingData?.milestones ??
            [],
        },
      };
    case "budget": {
      const original =
        setupData.budget.originalBudget ??
        summarizeTeamCost(scopingData?.team ?? []).total ??
        undefined;
      return {
        data: {
          originalBudget: original,
          adjustedBudget: setupData.budget.adjustedBudget,
        },
      };
    }
    case "kickoff-meeting":
      return { data: { meetingDate: setupData.kickoffMeeting.meetingDate } };
    case "kickoff-prep":
      return { data: { notes: setupData.kickoffPrep.notes } };
    default:
      return { data: {} };
  }
}

function renderTaskContent(
  taskId: SetupTaskId,
  ctx: TaskRenderContext,
): React.ReactNode {
  const { setupData, scopingData, readOnly } = ctx;

  switch (taskId) {
    case "slack":
      return (
        <SlackSetupTask
          data={setupData.slack}
          channelName={ctx.slackChannelName}
          onChannelNameChange={ctx.onSlackChannelNameChange}
          readOnly={readOnly}
          onComplete={(channelName) =>
            ctx.onComplete("slack", { channelName })
          }
        />
      );
    case "drive":
      return (
        <DriveSetupTask
          data={setupData.drive}
          suggestedName={ctx.suggestedDriveName}
          driveUrl={ctx.driveUrl}
          onDriveUrlChange={ctx.onDriveUrlChange}
          readOnly={readOnly}
          onComplete={(driveName, nextDriveUrl) =>
            ctx.onComplete("drive", { driveName, driveUrl: nextDriveUrl })
          }
        />
      );
    case "jira":
      return (
        <JiraSetupTask
          data={setupData.jira}
          boardUrl={ctx.jiraBoardUrl}
          onBoardUrlChange={ctx.onJiraBoardUrlChange}
          readOnly={readOnly}
          onComplete={(boardUrl) =>
            ctx.onComplete("jira", { boardUrl, projectUrl: boardUrl })
          }
        />
      );
    case "jira-planning":
      return (
        <JiraPlanningTask
          data={setupData.jiraPlanning ?? { status: "pending" }}
          milestones={scopingData?.milestones}
          boardUrl={setupData.jira.boardUrl || setupData.jira.projectUrl}
          readOnly={readOnly}
          onComplete={(notes) =>
            ctx.onComplete("jira-planning", { notes })
          }
        />
      );
    case "documentation":
      return (
        <DocsSetupTask
          linkedDocs={setupData.documentation.linkedDocs}
          folders={setupData.documentation.folders}
          driveUrl={ctx.driveUrl || setupData.drive.driveUrl}
          readOnly={readOnly}
          onFoldersCreated={(folders) =>
            ctx.onComplete(
              "documentation",
              {
                linkedDocs: setupData.documentation.linkedDocs,
                folders,
              },
              { complete: false },
            )
          }
          onComplete={(folders) =>
            ctx.onComplete("documentation", {
              linkedDocs: setupData.documentation.linkedDocs,
              folders,
            })
          }
        />
      );
    case "team":
      return (
        <TeamSetupTask
          members={setupData.team.members}
          readOnly={readOnly}
          onComplete={(members) =>
            ctx.onComplete("team", { members })
          }
        />
      );
    case "scope":
      return (
        <ScopeConfirmTask
          scopeItems={
            setupData.scope.confirmedItems ??
            scopingData?.scopeItems ??
            []
          }
          confirmed={setupData.scope.status === "completed"}
          readOnly={readOnly}
          onComplete={(items, notes) =>
            ctx.onComplete("scope", {
              confirmedItems: items,
              notes,
            })
          }
        />
      );
    case "planning":
      return (
        <PlanningConfirmTask
          milestones={
            setupData.planning.confirmedMilestones ??
            scopingData?.milestones ??
            []
          }
          confirmed={setupData.planning.status === "completed"}
          readOnly={readOnly}
          onComplete={(milestones, notes) =>
            ctx.onComplete("planning", {
              confirmedMilestones: milestones,
              notes,
            })
          }
        />
      );
    case "budget":
      return (
        <BudgetConfirmTask
          team={scopingData?.team ?? []}
          confirmed={setupData.budget.status === "completed"}
          originalBudget={setupData.budget.originalBudget}
          adjustedBudget={setupData.budget.adjustedBudget}
          readOnly={readOnly}
          onComplete={(adjustedBudget, notes) =>
            ctx.onComplete("budget", { adjustedBudget, notes })
          }
        />
      );
    case "kickoff-meeting":
      return (
        <ManualConfirmTask
          description="Book the kickoff meeting with the project team. Set a date and confirm once it's scheduled."
          confirmed={setupData.kickoffMeeting.status === "completed"}
          completedAt={setupData.kickoffMeeting.completedAt}
          showDatePicker
          readOnly={readOnly}
          onComplete={(date, notes) =>
            ctx.onComplete("kickoff-meeting", {
              meetingDate: date,
              notes,
            })
          }
        />
      );
    case "kickoff-prep":
      return (
        <ManualConfirmTask
          description="Prepare the kickoff meeting agenda: project overview, team introductions, scope walk-through, tooling access, meeting cadence, and next steps."
          confirmed={setupData.kickoffPrep.status === "completed"}
          completedAt={setupData.kickoffPrep.completedAt}
          readOnly={readOnly}
          onComplete={(_, notes) =>
            ctx.onComplete("kickoff-prep", { notes })
          }
        />
      );
    default:
      return null;
  }
}
