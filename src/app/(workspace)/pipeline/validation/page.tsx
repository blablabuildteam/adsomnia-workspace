import { ValidationStageView } from "@/components/pipeline/ValidationStageView";
import { getAllInitiatives } from "@/lib/queries";

export default async function PipelineValidationPage() {
  const initiatives = await getAllInitiatives();

  return <ValidationStageView initiatives={initiatives} />;
}
