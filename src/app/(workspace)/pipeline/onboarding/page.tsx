import { OnboardingStageView } from "@/components/pipeline/OnboardingStageView";
import { getAllInitiatives } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function PipelineOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const initiatives = await getAllInitiatives(user);

  return <OnboardingStageView initiatives={initiatives} />;
}
