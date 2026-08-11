"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { initiatives, approvals, activityLog, comments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, canApprove } from "@/lib/session";

export type ApprovalResult = {
  error?: string;
  success?: boolean;
};

export type CommentResult = {
  error?: string;
  success?: boolean;
};

export async function addComment(
  initiativeId: number,
  _prev: CommentResult,
  formData: FormData,
): Promise<CommentResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in to comment." };
  }

  const body = (formData.get("body") as string)?.trim();
  if (!body) {
    return { error: "Comment cannot be empty." };
  }

  await db.insert(comments).values({
    initiativeId,
    userId: user.id,
    body,
  });

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "comment_added",
    details: { preview: body.slice(0, 120) },
  });

  revalidatePath(`/initiatives/${initiativeId}`);
  return { success: true };
}

export async function approveToValidation(
  initiativeId: number,
  _prev: ApprovalResult,
  formData: FormData,
): Promise<ApprovalResult> {
  const user = await getCurrentUser();
  if (!user || !canApprove(user)) {
    return { error: "Only leadership admins can approve initiatives." };
  }

  const comment = (formData.get("comment") as string)?.trim() || null;
  if (!comment) {
    return { error: "A remark is required when making an approval decision." };
  }

  await db
    .update(initiatives)
    .set({
      currentStage: "validation",
      status: "approved",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(approvals).values({
    initiativeId,
    approverId: user.id,
    fromStage: "idea",
    toStage: "validation",
    decision: "approved",
    comment,
  });

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "approved_to_validation",
    details: {
      comment,
      approver: user.name,
      fromStage: "Initiative",
      toStage: "Validation",
    },
  });

  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectInitiative(
  initiativeId: number,
  _prev: ApprovalResult,
  formData: FormData,
): Promise<ApprovalResult> {
  const user = await getCurrentUser();
  if (!user || !canApprove(user)) {
    return { error: "Only leadership admins can reject initiatives." };
  }

  const comment = (formData.get("comment") as string)?.trim() || null;
  if (!comment) {
    return { error: "A remark is required when making an approval decision." };
  }

  await db
    .update(initiatives)
    .set({
      status: "rejected",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(approvals).values({
    initiativeId,
    approverId: user.id,
    fromStage: "idea",
    toStage: null,
    decision: "rejected",
    comment,
  });

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "idea_rejected",
    details: { comment, approver: user.name },
  });

  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function putOnHold(
  initiativeId: number,
  _prev: ApprovalResult,
  formData: FormData,
): Promise<ApprovalResult> {
  const user = await getCurrentUser();
  if (!user || !canApprove(user)) {
    return { error: "Only leadership admins can put initiatives on hold." };
  }

  const comment = (formData.get("comment") as string)?.trim() || null;
  if (!comment) {
    return { error: "A remark is required when making an approval decision." };
  }

  await db
    .update(initiatives)
    .set({
      status: "on-hold",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(approvals).values({
    initiativeId,
    approverId: user.id,
    fromStage: "idea",
    toStage: null,
    decision: "on-hold",
    comment,
  });

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "idea_on_hold",
    details: { comment, approver: user.name },
  });

  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
