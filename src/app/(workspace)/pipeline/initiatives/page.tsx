import { InitiativesStageView } from "@/components/pipeline/InitiativesStageView";
import { getAllInitiatives, getInitiativeIdsWithLatestDecision } from "@/lib/queries";

export default async function PipelineInitiativesPage() {
  const [initiatives, feedbackIds] = await Promise.all([
    getAllInitiatives(),
    getInitiativeIdsWithLatestDecision("idea", "feedback"),
  ]);

  return (
    <InitiativesStageView
      initiatives={initiatives}
      feedbackIds={Array.from(feedbackIds)}
    />
  );
}
