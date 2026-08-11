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

  const latest = approvals[0];
  const latestDecision: ApprovalDecision | null = latest
    ? {
        decision: latest.decision,
        comment: latest.comment,
        approverName: latest.approverName,
        createdAt: latest.createdAt,
        toStage: latest.toStage,
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
    />
  );
}
