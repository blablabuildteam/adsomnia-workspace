import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  getAllInitiatives,
  getStageCounts,
  getStatusCounts,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export default async function DashboardPage() {
  const [items, stageCounts, statusCounts, user] = await Promise.all([
    getAllInitiatives(),
    getStageCounts(),
    getStatusCounts(),
    getCurrentUser(),
  ]);

  return (
    <DashboardView
      initiatives={items}
      stageCounts={stageCounts}
      statusCounts={statusCounts}
      currentUserId={user?.id}
    />
  );
}
