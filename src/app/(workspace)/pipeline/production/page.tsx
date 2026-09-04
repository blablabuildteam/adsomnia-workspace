import { connection } from "next/server";
import { ProductionOverview } from "@/components/production/ProductionOverview";
import { getProductionOverview } from "@/lib/production/load";
import {
  canAddProductionProject,
  canAdjustProductionPriority,
  canManageOnboarding,
  getCurrentUser,
} from "@/lib/session";

type PageProps = {
  searchParams: Promise<{ project?: string }>;
};

export default async function PipelineProductionPage({
  searchParams,
}: PageProps) {
  await connection();
  const [data, user, params] = await Promise.all([
    getProductionOverview(),
    getCurrentUser(),
    searchParams,
  ]);
  const parsed = Number.parseInt(params.project ?? "", 10);
  const initialSelectedId = Number.isFinite(parsed) ? parsed : null;

  return (
    <ProductionOverview
      projects={data.active}
      archived={data.archived}
      canArchive={Boolean(user && canManageOnboarding(user))}
      canAdjustPriority={Boolean(user && canAdjustProductionPriority(user))}
      canAddProject={Boolean(user && canAddProductionProject(user))}
      initialSelectedId={initialSelectedId}
    />
  );
}
