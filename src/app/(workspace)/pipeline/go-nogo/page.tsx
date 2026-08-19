import { GoNoGoStageView } from "@/components/pipeline/GoNoGoStageView";
import { getAllInitiatives, getInitiativeIdsWithLatestDecision } from "@/lib/queries";

export default async function PipelineGoNoGoPage() {
  const [initiatives, feedbackIds] = await Promise.all([
    getAllInitiatives(),
    getInitiativeIdsWithLatestDecision("go-nogo", "feedback"),
  ]);

  return (
    <GoNoGoStageView
      initiatives={initiatives}
      feedbackIds={Array.from(feedbackIds)}
    />
  );
}
