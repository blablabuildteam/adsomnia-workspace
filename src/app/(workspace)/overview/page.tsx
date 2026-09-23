import { OverviewView } from "@/components/overview/OverviewView";
import { withoutDeletedJiraSpaces } from "@/lib/production/load";
import { getAllInitiatives } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const initiatives = await withoutDeletedJiraSpaces(
    await getAllInitiatives(user),
  );

  return <OverviewView initiatives={initiatives} />;
}
