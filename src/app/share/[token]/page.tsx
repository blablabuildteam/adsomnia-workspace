import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InitiativeDetailView } from "@/components/initiatives/InitiativeDetailView";
import type { ApprovalDecision } from "@/components/initiatives/ApprovalPanel";
import type { ValidationDecision } from "@/components/initiatives/ValidationApprovalPanel";
import {
  getInitiativeById,
  getApprovalHistory,
} from "@/lib/queries";
import { verifyShareToken } from "@/lib/share";

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

  const approvals = await getApprovalHistory(initiative.id);

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
      comments={[]}
      canUserApprove={false}
      canComment={false}
      currentUserName=""
      latestDecision={latestDecision}
      validationDecision={validationDecision}
      isCreator={false}
    />
  );
}
