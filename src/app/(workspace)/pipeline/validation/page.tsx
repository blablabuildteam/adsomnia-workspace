import { ValidationStageView } from "@/components/pipeline/ValidationStageView";
import { getAllInitiatives, getInitiativeIdsWithLatestDecision } from "@/lib/queries";

export default async function PipelineValidationPage() {
  const [initiatives, feedbackIds] = await Promise.all([
    getAllInitiatives(),
    getInitiativeIdsWithLatestDecision("validation", "feedback"),
  ]);

  return (
    <ValidationStageView
      initiatives={initiatives}
      feedbackIds={Array.from(feedbackIds)}
    />
  );
}
