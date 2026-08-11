import { OverviewView } from "@/components/overview/OverviewView";
import { getAllInitiatives } from "@/lib/queries";

export default async function OverviewPage() {
  const initiatives = await getAllInitiatives();

  return <OverviewView initiatives={initiatives} />;
}
