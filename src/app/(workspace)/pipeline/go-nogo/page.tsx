import { GoNoGoStageView } from "@/components/pipeline/GoNoGoStageView";
import { getAllInitiatives, getInitiativeIdsWithLatestDecision } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function PipelineGoNoGoPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [initiatives, feedbackIds] = await Promise.all([
    getAllInitiatives(user),
    getInitiativeIdsWithLatestDecision("go-nogo", "feedback"),
  ]);

  return (
    <GoNoGoStageView
      initiatives={initiatives}
      feedbackIds={Array.from(feedbackIds)}
    />
  );
}
