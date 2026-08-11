import { DashboardView } from "@/components/dashboard/DashboardView";
import {
  getAllInitiatives,
  getStageCounts,
  getStatusCounts,
} from "@/lib/queries";

export default async function DashboardPage() {
  const [items, stageCounts, statusCounts] = await Promise.all([
    getAllInitiatives(),
    getStageCounts(),
    getStatusCounts(),
  ]);

  return (
    <DashboardView
      initiatives={items}
      stageCounts={stageCounts}
      statusCounts={statusCounts}
    />
  );
}
