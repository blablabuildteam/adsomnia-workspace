"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { activityLog, approvals, initiatives } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { canAddFastTrack, canApprove } from "@/lib/permissions";
import {
  FAST_TRACK_FIELD_LIMITS,
  validateValidationNarratives,
} from "@/lib/field-limits";
import { createFastTrackIssue } from "@/lib/integrations/jira";
import { notifyOwner } from "@/lib/integrations/slack-notify";
import { parseValidationFormData } from "@/lib/validation-form";
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
  const fromStage = initiative.currentStage;
  const validationDraftStatuses = new Set([
    "approved",
    "draft",
    "submitted",
    "on-hold",
    "rejected",
  ]);
  const canConvertFromIdea =
    fromStage === "idea" && initiative.status === "submitted";
  const canConvertFromValidation =
    fromStage === "validation" &&
    validationDraftStatuses.has(initiative.status);
  if (!canConvertFromIdea && !canConvertFromValidation) {
    return {
      error:
        "Only items in Initiative review or Validation can be sent to Fast-Track.",
    };
  }

  const looksLikeValidationForm =
    formData.has("solutionDirection") ||
    formData.has("tShirtSize") ||
    formData.has("priority") ||
    formData.has("leadProductionParty");
  let validationData = undefined;
  if (canConvertFromValidation && looksLikeValidationForm) {
    const parsed = parseValidationFormData(formData);
    const lengthError = validateValidationNarratives(parsed, "save");
    if (lengthError) return { error: lengthError };
    validationData = parsed;
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
      ...(validationData ? { validationData } : {}),
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(approvals).values({
    initiativeId,
    approverId: user.id,
    fromStage,
    toStage: "fast-track",
    decision: "approved",
    comment,
  });

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "converted_to_fast_track",
    details: {
      comment,
      approver: user.name,
      fromStage,
      jiraKey: created.key,
      jiraUrl: created.url,
    },
  });

  await notifyOwner({
    initiativeId,
    actorUserId: user.id,
    actorName: user.name,
    kind: "status",
    status: "approved",
    remark: comment,
    headline: "moved this initiative to Fast-Track",
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/initiatives");
  revalidatePath("/pipeline/validation");
  revalidatePath("/fast-track");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
  redirect("/fast-track");
}

export type CreateFastTrackResult = {
  error?: string;
  key?: string;
};

function revalidateFastTrack(initiativeId?: number) {
  if (initiativeId != null) revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/fast-track");
  revalidatePath("/dashboard");
  revalidatePath("/overview");
}

export async function createFastTrackTask(input: {
  title: string;
  description: string;
}): Promise<CreateFastTrackResult> {
  const user = await getCurrentUser();
  if (!user || !canAddFastTrack(user)) {
    return { error: "Only leadership can add a task from Fast-Track." };
  }

  const title = input.title.trim();
  const description = input.description.trim();

  if (!title) {
    return { error: "Title is required." };
  }
  if (title.length > FAST_TRACK_FIELD_LIMITS.title.max) {
    return {
      error: `Title must be ${FAST_TRACK_FIELD_LIMITS.title.max} characters or fewer.`,
    };
  }
  if (description.length > FAST_TRACK_FIELD_LIMITS.description.max) {
    return {
      error: `Description must be ${FAST_TRACK_FIELD_LIMITS.description.max} characters or fewer.`,
    };
  }

  const [{ nextVal }] = await db
    .select({ nextVal: sql<number>`coalesce(max(${initiatives.id}), 999) + 1` })
    .from(initiatives);
  const ticketId = `WS-${nextVal + 1000}`;

  let created: { key: string; url: string };
  try {
    created = await createFastTrackIssue({
      title,
      description,
      ticketId,
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

  const [row] = await db
    .insert(initiatives)
    .values({
      ticketId,
      title,
      description,
      submitterId: user.id,
      sponsorId: user.id,
      currentStage: "idea",
      status: "approved",
      isFastTrack: true,
      fastTrackJiraKey: created.key,
      fastTrackJiraUrl: created.url,
    })
    .returning({ id: initiatives.id });

  await db.insert(activityLog).values({
    initiativeId: row.id,
    userId: user.id,
    action: "fast_track_created",
    details: {
      title,
      by: user.name,
      jiraKey: created.key,
      jiraUrl: created.url,
    },
  });

  revalidateFastTrack(row.id);
  return { key: created.key };
}
