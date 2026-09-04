"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, initiatives } from "@/db/schema";
import {
  getProductionJourney,
  type JourneyStage,
} from "@/lib/production/load";
import { canManageOnboarding, getCurrentUser } from "@/lib/session";

export async function refreshProductionOverview() {
  const user = await getCurrentUser();
  if (!user) return;
  revalidatePath("/pipeline/production");
}

export async function loadProductionJourney(
  initiativeId: number,
): Promise<JourneyStage[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return getProductionJourney(initiativeId);
}

export type ArchiveResult = { error?: string; success?: boolean };

export async function setProductionArchived(
  initiativeId: number,
  archived: boolean,
): Promise<ArchiveResult> {
  const user = await getCurrentUser();
  if (!user || !canManageOnboarding(user)) {
    return { error: "Only the Head of Production can archive projects." };
  }

  const [row] = await db
    .select({
      id: initiatives.id,
      currentStage: initiatives.currentStage,
      title: initiatives.title,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!row || row.currentStage !== "production") {
    return { error: "Only Production workstreams can be archived." };
  }

  await db
    .update(initiatives)
    .set({
      archivedAt: archived ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: archived ? "production_archived" : "production_restored",
    details: {
      title: row.title,
      by: user.name,
    },
  });

  revalidatePath("/pipeline/production");
  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/overview");
  revalidatePath("/dashboard");
  return { success: true };
}
