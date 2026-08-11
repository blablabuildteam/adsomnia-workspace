import { InitiativesStageView } from "@/components/pipeline/InitiativesStageView";
import { getAllInitiatives } from "@/lib/queries";

export default async function PipelineInitiativesPage() {
  const initiatives = await getAllInitiatives();

  return <InitiativesStageView initiatives={initiatives} />;
}
