import { OnboardingStageView } from "@/components/pipeline/OnboardingStageView";
import { getAllInitiatives } from "@/lib/queries";

export default async function PipelineOnboardingPage() {
  const initiatives = await getAllInitiatives();

  return <OnboardingStageView initiatives={initiatives} />;
}
