"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { activityLog, initiatives, users, workstreamAccess } from "@/db/schema";
import { canManageWorkstreamAccess } from "@/lib/permissions";
import { displayName, getCurrentUser } from "@/lib/session";
import type { WorkstreamAccessLevel } from "@/lib/permissions";

export type WorkstreamAccessResult = { error?: string; success?: boolean };

function revalidateAccess(initiativeId: number) {
  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  revalidatePath("/fast-track");
  revalidatePath("/pipeline/initiatives");
  revalidatePath("/pipeline/validation");
  revalidatePath("/pipeline/scoping");
  revalidatePath("/pipeline/go-nogo");
  revalidatePath("/pipeline/setup");
  revalidatePath("/pipeline/onboarding");
  revalidatePath("/pipeline/production");
}

async function authorize(initiativeId: number) {
  const actor = await getCurrentUser();
  if (!actor || !canManageWorkstreamAccess(actor)) {
    return { error: "Only leadership or an assistant can change workstream access." } as const;
  }

  const [initiative] = await db
    .select({
      id: initiatives.id,
      submitterId: initiatives.submitterId,
      title: initiatives.title,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!initiative) return { error: "Workstream not found." } as const;
  return { actor, initiative };
}

async function loadTarget(userId: string) {
  const [target] = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return target ?? null;
}

export async function grantWorkstreamAccess(
  initiativeId: number,
  userId: string,
  level: WorkstreamAccessLevel,
): Promise<WorkstreamAccessResult> {
  if (level !== "view" && level !== "edit") {
    return { error: "Choose view or edit access." };
  }

  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return loaded;

  const target = await loadTarget(userId);
  if (!target) return { error: "That person does not have a workspace account." };
  if (target.id === loaded.initiative.submitterId) {
    return { error: "The owner already has access to this workstream." };
  }
  if (target.role === "leadership" || target.role === "assistant") {
    return { error: "That account already has access to every workstream." };
  }

  await db
    .insert(workstreamAccess)
    .values({
      initiativeId,
      userId: target.id,
      level,
      grantedById: loaded.actor.id,
    })
    .onConflictDoUpdate({
      target: [workstreamAccess.initiativeId, workstreamAccess.userId],
      set: {
        level,
        grantedById: loaded.actor.id,
        updatedAt: new Date(),
      },
    });

  await db.insert(activityLog).values({
    initiativeId,
    userId: loaded.actor.id,
    action: "workstream_access_granted",
    details: {
      targetUserId: target.id,
      targetName: displayName(target),
      level,
      by: displayName(loaded.actor),
    },
  });

  revalidateAccess(initiativeId);
  return { success: true };
}

export async function removeWorkstreamAccess(
  initiativeId: number,
  userId: string,
): Promise<WorkstreamAccessResult> {
  const loaded = await authorize(initiativeId);
  if ("error" in loaded) return loaded;

  const target = await loadTarget(userId);
  if (!target) return { error: "That person does not have a workspace account." };

  const removed = await db
    .delete(workstreamAccess)
    .where(
      and(
        eq(workstreamAccess.initiativeId, initiativeId),
        eq(workstreamAccess.userId, target.id),
      ),
    )
    .returning({ id: workstreamAccess.id });

  if (removed.length === 0) {
    return { error: "That person was not added to this workstream." };
  }

  await db.insert(activityLog).values({
    initiativeId,
    userId: loaded.actor.id,
    action: "workstream_access_removed",
    details: {
      targetUserId: target.id,
      targetName: displayName(target),
      by: displayName(loaded.actor),
    },
  });

  revalidateAccess(initiativeId);
  return { success: true };
}
