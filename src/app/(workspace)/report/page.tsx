import { redirect } from "next/navigation";
import { connection } from "next/server";
import { ProductionReportView } from "@/components/report/ProductionReportView";
import { getProductionOverview } from "@/lib/production/load";
import { buildProductionReport } from "@/lib/production/report";
import { canViewLeadershipReport, getCurrentUser } from "@/lib/session";

export default async function LeadershipReportPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user || !canViewLeadershipReport(user)) {
    redirect("/dashboard");
  }

  const data = await getProductionOverview();
  const report = buildProductionReport(data.active);

  return <ProductionReportView report={report} />;
}
