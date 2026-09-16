import { InitiativesStageView } from "@/components/pipeline/InitiativesStageView";
import { getAllInitiatives, getInitiativeIdsWithLatestDecision } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function PipelineInitiativesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [initiatives, feedbackIds] = await Promise.all([
    getAllInitiatives(user),
    getInitiativeIdsWithLatestDecision("idea", "feedback"),
  ]);

  return (
    <InitiativesStageView
      initiatives={initiatives}
      feedbackIds={Array.from(feedbackIds)}
    />
  );
}
