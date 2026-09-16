import { ScopingStageView } from "@/components/pipeline/ScopingStageView";
import { getAllInitiatives } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function PipelineScopingPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const initiatives = await getAllInitiatives(user);

  return <ScopingStageView initiatives={initiatives} />;
}
