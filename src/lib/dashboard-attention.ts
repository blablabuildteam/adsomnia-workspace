import { STAGES } from "@/data/workflow";
import type { InitiativeWithUsers } from "@/lib/queries";

export type TeamItemKind = "action" | "waiting";

export type TeamItemState = {
  kind: TeamItemKind;
  reason: string;
};

function stageName(stageId: string): string {
  return STAGES.find((stage) => stage.id === stageId)?.name ?? stageId;
}

const EARLY_STAGES = new Set(["idea", "validation", "scoping", "go-nogo"]);

/**
 * What a submitter should do next. "action" means they need to open the
 * workstream; "waiting" means the ball is elsewhere.
 */
export function teamItemState(
  item: InitiativeWithUsers,
  feedbackIds: Set<number>,
): TeamItemState {
  const stage = stageName(item.currentStage);

  if (item.status === "rejected") {
    return {
      kind: "action",
      reason: `Rejected in ${stage} — review the decision`,
    };
  }
  if (feedbackIds.has(item.id)) {
    return {
      kind: "action",
      reason: `Feedback in ${stage} — update and resubmit`,
    };
  }
  if (item.status === "draft") {
    return {
      kind: "action",
      reason: `Draft in ${stage} — finish and submit`,
    };
  }
  if (item.status === "on-hold" && EARLY_STAGES.has(item.currentStage)) {
    return { kind: "action", reason: `On hold in ${stage}` };
  }
  if (item.status === "submitted") {
    return { kind: "waiting", reason: `Waiting on review in ${stage}` };
  }
  if (item.status === "on-hold") {
    return { kind: "waiting", reason: `On hold in ${stage}` };
  }
  return { kind: "waiting", reason: `In ${stage}` };
}

export function sortTeamWorkstreams(
  items: InitiativeWithUsers[],
  feedbackIds: Set<number>,
): InitiativeWithUsers[] {
  return [...items].sort((a, b) => {
    const aAction = teamItemState(a, feedbackIds).kind === "action" ? 1 : 0;
    const bAction = teamItemState(b, feedbackIds).kind === "action" ? 1 : 0;
    if (aAction !== bAction) return bAction - aAction;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}
