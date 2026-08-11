import { notFound } from "next/navigation";
import { InitiativeDetailView } from "@/components/initiatives/InitiativeDetailView";
import {
  getInitiativeById,
  getActivityForInitiative,
  getCommentsForInitiative,
  getApprovalHistory,
} from "@/lib/queries";
import { getCurrentUser, canApprove } from "@/lib/session";
import type { ApprovalDecision } from "@/components/initiatives/ApprovalPanel";
import type { ValidationDecision } from "@/components/initiatives/ValidationApprovalPanel";

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

  if (!initiative) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <p className="font-display text-2xl font-extrabold uppercase">
          Initiative Not Found
        </p>
        <p className="mt-2 text-sm text-muted">
          No initiative with ID <span className="font-mono">{id}</span>.
        </p>
      </div>
    );
  }

  const [activity, comments, approvals] = await Promise.all([
    getActivityForInitiative(initiative.id),
    getCommentsForInitiative(initiative.id),
    getApprovalHistory(initiative.id),
  ]);
  const canUserApprove = user ? canApprove(user) : false;
  const isCreator = user?.id === initiative.submitter.id;

  const latestIdea = approvals.find((a) => a.fromStage === "idea");
  const latestDecision: ApprovalDecision | null =
    latestIdea && latestIdea.decision !== "feedback"
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
    latestValidation && latestValidation.decision !== "on-hold"
      ? {
          decision: latestValidation.decision,
          comment: latestValidation.comment,
          approverName: latestValidation.approverName,
          createdAt: latestValidation.createdAt,
        }
      : null;

  return (
    <InitiativeDetailView
      initiative={initiative}
      activity={activity}
      comments={comments}
      canUserApprove={canUserApprove}
      canComment={!!user}
      currentUserName={user?.name ?? "Unknown"}
      latestDecision={latestDecision}
      validationDecision={validationDecision}
      isCreator={isCreator}
    />
  );
}
