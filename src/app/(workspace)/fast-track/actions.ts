"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, initiatives } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { canApprove } from "@/lib/permissions";
import { createFastTrackIssue } from "@/lib/integrations/jira";
import type { ApprovalResult } from "@/app/(workspace)/workstreams/[id]/actions";

export async function convertToFastTrack(
  initiativeId: number,
  _prev: ApprovalResult,
  formData: FormData,
): Promise<ApprovalResult> {
  const user = await getCurrentUser();
  if (!user || !canApprove(user)) {
    return { error: "Only leadership admins can send initiatives to Fast-Track." };
  }

  const comment = (formData.get("comment") as string)?.trim() || null;
  if (!comment) {
    return { error: "A remark is required when sending an initiative to Fast-Track." };
  }

  const [initiative] = await db
    .select({
      id: initiatives.id,
      ticketId: initiatives.ticketId,
      title: initiatives.title,
      problemStatement: initiatives.problemStatement,
      opportunitySolution: initiatives.opportunitySolution,
      expectedImpact: initiatives.expectedImpact,
      targetAudience: initiatives.targetAudience,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
      isFastTrack: initiatives.isFastTrack,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!initiative) {
    return { error: "Initiative not found." };
  }
  if (initiative.isFastTrack) {
    return { error: "This initiative is already on Fast-Track." };
  }
  if (initiative.currentStage !== "idea" || initiative.status !== "submitted") {
    return { error: "Only submitted initiatives can be sent to Fast-Track." };
  }

  let created: { key: string; url: string };
  try {
    created = await createFastTrackIssue({
      title: initiative.title,
      problemStatement: initiative.problemStatement,
      opportunitySolution: initiative.opportunitySolution,
      expectedImpact: initiative.expectedImpact,
      targetAudience: initiative.targetAudience,
      ticketId: initiative.ticketId,
      remark: comment,
    });
  } catch (error) {
    console.error("Fast-Track Jira create failed:", error);
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create the Fast-Track task in Jira.",
    };
  }

  await db
    .update(initiatives)
    .set({
      isFastTrack: true,
      fastTrackJiraKey: created.key,
      fastTrackJiraUrl: created.url,
      status: "approved",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "converted_to_fast_track",
    details: {
      comment,
      approver: user.name,
      jiraKey: created.key,
      jiraUrl: created.url,
    },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/initiatives");
  revalidatePath("/fast-track");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  redirect("/fast-track");
}
