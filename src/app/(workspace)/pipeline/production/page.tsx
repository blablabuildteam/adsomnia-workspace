import { connection } from "next/server";
import { ProductionOverview } from "@/components/production/ProductionOverview";
import { getProductionOverview } from "@/lib/production/load";
import {
  canAddProductionProject,
  canAdjustProductionPriority,
  canManageOnboarding,
  getCurrentUser,
} from "@/lib/session";

export default async function PipelineProductionPage() {
  await connection();
  const [data, user] = await Promise.all([
    getProductionOverview(),
    getCurrentUser(),
  ]);

  return (
    <ProductionOverview
      projects={data.active}
      archived={data.archived}
      canArchive={Boolean(user && canManageOnboarding(user))}
      canAdjustPriority={Boolean(user && canAdjustProductionPriority(user))}
      canAddProject={Boolean(user && canAddProductionProject(user))}
    />
  );
}
