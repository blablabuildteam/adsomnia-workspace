import { ScopingStageView } from "@/components/pipeline/ScopingStageView";
import { getAllInitiatives } from "@/lib/queries";

export default async function PipelineScopingPage() {
  const initiatives = await getAllInitiatives();

  return <ScopingStageView initiatives={initiatives} />;
}
