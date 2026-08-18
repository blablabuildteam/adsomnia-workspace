import { GoNoGoStageView } from "@/components/pipeline/GoNoGoStageView";
import { getAllInitiatives } from "@/lib/queries";

export default async function PipelineGoNoGoPage() {
  const initiatives = await getAllInitiatives();

  return <GoNoGoStageView initiatives={initiatives} />;
}
