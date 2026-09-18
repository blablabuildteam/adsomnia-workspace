import { notFound } from "next/navigation";
import { InitiativeDetailView } from "@/components/initiatives/InitiativeDetailView";
import {
  getInitiativeById,
  getCommentsForInitiative,
  getActivityForInitiative,
  getApprovalHistory,
  getMentionablePeople,
} from "@/lib/queries";
import {
  getCurrentUser,
  displayName,
  canApprove,
  canManageSetup,
  canManageOnboarding,
  canUseFormPrefill,
  canViewInitiative,
} from "@/lib/session";
import { createSharePath } from "@/lib/share";
import { listWorkstreamAttachments } from "@/lib/workstream-attachments";
import type { ApprovalDecision } from "@/components/initiatives/ApprovalPanel";
import type { ValidationDecision } from "@/components/initiatives/ValidationApprovalPanel";
import type { GoNoGoDecision } from "@/components/initiatives/GoNoGoApprovalPanel";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function InitiativePage({ params }: Props) {
  const { id } = await params;
  const numericId = parseInt(id, 10);

  if (isNaN(numericId)) {
    notFound();
  }

  const [initiative, user] = await Promise.all([
    getInitiativeById(numericId),
    getCurrentUser(),
  ]);

  if (
    !initiative ||
    !user ||
    !canViewInitiative(user, { submitterId: initiative.submitter.id })
  ) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-2xl font-extrabold uppercase">
          Initiative Not Found
        </p>
        <p className="mt-2 text-sm text-muted">
          This workstream is not available.
        </p>
      </div>
    );
  }

  const [comments, activity, approvals, mentionablePeople, attachments] = await Promise.all([
    getCommentsForInitiative(initiative.id),
    getActivityForInitiative(initiative.id),
    getApprovalHistory(initiative.id),
    getMentionablePeople(),
    listWorkstreamAttachments(initiative.id),
  ]);
  const canUserApprove = user ? canApprove(user) : false;
  const canUserManageSetup = user ? canManageSetup(user) : false;
  const canUserManageOnboarding = user ? canManageOnboarding(user) : false;
  const isCreator = user?.id === initiative.submitter.id;

  const latestIdea = approvals.find((a) => a.fromStage === "idea");
  const latestDecision: ApprovalDecision | null = latestIdea
    ? {
        decision: latestIdea.decision,
        comment: latestIdea.comment,
        approverName: latestIdea.approverName,
        createdAt: latestIdea.createdAt,
        toStage: latestIdea.toStage,
      }
    : null;

  const latestValidation = approvals.find((a) => a.fromStage === "validation");
  const validationDecision: ValidationDecision | null =
    latestValidation
      ? {
          decision: latestValidation.decision as ValidationDecision["decision"],
          comment: latestValidation.comment,
          approverName: latestValidation.approverName,
          createdAt: latestValidation.createdAt,
        }
      : null;

  const latestGoNoGo = approvals.find((a) => a.fromStage === "go-nogo");
  const goNoGoDecision: GoNoGoDecision | null = latestGoNoGo
    ? {
        decision: latestGoNoGo.decision as GoNoGoDecision["decision"],
        comment: latestGoNoGo.comment,
        approverName: latestGoNoGo.approverName,
        createdAt: latestGoNoGo.createdAt,
      }
    : null;

  return (
    <InitiativeDetailView
      initiative={initiative}
      comments={comments}
      activity={activity}
      mentionablePeople={mentionablePeople}
      attachments={attachments}
      canUserApprove={canUserApprove}
      canComment={!!user}
      currentUserName={user ? displayName(user) : "Unknown"}
      currentUserId={user?.id}
      showChat={!!user}
      latestDecision={latestDecision}
      validationDecision={validationDecision}
      goNoGoDecision={goNoGoDecision}
      isCreator={isCreator}
      sharePath={createSharePath(initiative.id)}
      canUserManageSetup={canUserManageSetup}
      canUserManageOnboarding={canUserManageOnboarding}
      showFormPrefill={user ? canUseFormPrefill(user) : false}
    />
  );
}
