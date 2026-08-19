import { SetupStageView } from "@/components/pipeline/SetupStageView";
import { getAllInitiatives } from "@/lib/queries";

export default async function PipelineSetupPage() {
  const initiatives = await getAllInitiatives();

  return <SetupStageView initiatives={initiatives} />;
}
