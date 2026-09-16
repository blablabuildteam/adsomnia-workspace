import { ValidationStageView } from "@/components/pipeline/ValidationStageView";
import { getAllInitiatives, getInitiativeIdsWithLatestDecision } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function PipelineValidationPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [initiatives, feedbackIds] = await Promise.all([
    getAllInitiatives(user),
    getInitiativeIdsWithLatestDecision("validation", "feedback"),
  ]);

  return (
    <ValidationStageView
      initiatives={initiatives}
      feedbackIds={Array.from(feedbackIds)}
    />
  );
}
