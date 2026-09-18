import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InitiativeDetailView } from "@/components/initiatives/InitiativeDetailView";
import type { ApprovalDecision } from "@/components/initiatives/ApprovalPanel";
import type { ValidationDecision } from "@/components/initiatives/ValidationApprovalPanel";
import type { GoNoGoDecision } from "@/components/initiatives/GoNoGoApprovalPanel";
import {
  getInitiativeById,
  getApprovalHistory,
  getCommentsForInitiative,
  getActivityForInitiative,
} from "@/lib/queries";
import { verifyShareToken } from "@/lib/share";
import { listWorkstreamAttachments } from "@/lib/workstream-attachments";
import { displayName, getCurrentUser } from "@/lib/session";

type Props = {
  params: Promise<{ token: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const id = verifyShareToken(token);
  if (id == null) {
    return { title: "Shared initiative", robots: { index: false, follow: false } };
  }

  const initiative = await getInitiativeById(id);
  if (!initiative) {
    return { title: "Shared initiative", robots: { index: false, follow: false } };
  }

  return {
    title: `${initiative.title} — Shared`,
    description: `${initiative.ticketId} · Adsomnia Workspace`,
    robots: { index: false, follow: false },
  };
}

export default async function SharedInitiativePage({ params }: Props) {
  const { token } = await params;
  const id = verifyShareToken(token);
  if (id == null) {
    notFound();
  }

  const initiative = await getInitiativeById(id);
  if (!initiative) {
    notFound();
  }

  const [user, comments, activity, attachments] = await Promise.all([
    getCurrentUser(),
    getCommentsForInitiative(initiative.id),
    getActivityForInitiative(initiative.id),
    listWorkstreamAttachments(initiative.id, token),
  ]);

  const approvals = await getApprovalHistory(initiative.id);

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
  const validationDecision: ValidationDecision | null = latestValidation
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
      attachments={attachments}
      canUserApprove={false}
      canComment
      currentUserName={user ? displayName(user) : ""}
      currentUserId={user?.id}
      showChat
      shareToken={token}
      latestDecision={latestDecision}
      validationDecision={validationDecision}
      goNoGoDecision={goNoGoDecision}
      isCreator={false}
    />
  );
}
