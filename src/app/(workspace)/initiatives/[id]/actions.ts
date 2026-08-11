"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { initiatives, approvals, activityLog, comments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, canApprove } from "@/lib/session";
import type { ValidationData } from "@/lib/queries";

export type ApprovalResult = {
  error?: string;
  success?: boolean;
  decision?: "approved" | "rejected" | "on-hold";
  comment?: string;
  approverName?: string;
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
  return {
    success: true,
    decision: "approved",
    comment,
    approverName: user.name,
  };
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
  return {
    success: true,
    decision: "rejected",
    comment,
    approverName: user.name,
  };
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
  return {
    success: true,
    decision: "on-hold",
    comment,
    approverName: user.name,
  };
}

export type ValidationResult = {
  error?: string;
  success?: boolean;
};

export async function saveValidationData(
  initiativeId: number,
  _prev: ValidationResult,
  formData: FormData,
): Promise<ValidationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const data: ValidationData = {
    businessValue: (formData.get("businessValue") as string)?.trim() || undefined,
    solutionDirection: (formData.get("solutionDirection") as string)?.trim() || undefined,
    tShirtSize: (formData.get("tShirtSize") as string)?.trim() || undefined,
    priority: (formData.get("priority") as string)?.trim() || undefined,
    leadProductionParty: (formData.get("leadProductionParty") as string)?.trim() || undefined,
    dependencies: (formData.get("dependencies") as string)?.trim() || undefined,
    risks: (formData.get("risks") as string)?.trim() || undefined,
  };

  await db
    .update(initiatives)
    .set({ validationData: data, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "validation_saved",
    details: { updatedBy: user.name },
  });

  revalidatePath(`/initiatives/${initiativeId}`);
  return { success: true };
}

export async function submitValidationForApproval(
  initiativeId: number,
  _prev: ValidationResult,
  formData: FormData,
): Promise<ValidationResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const data: ValidationData = {
    businessValue: (formData.get("businessValue") as string)?.trim() || undefined,
    solutionDirection: (formData.get("solutionDirection") as string)?.trim() || undefined,
    tShirtSize: (formData.get("tShirtSize") as string)?.trim() || undefined,
    priority: (formData.get("priority") as string)?.trim() || undefined,
    leadProductionParty: (formData.get("leadProductionParty") as string)?.trim() || undefined,
    dependencies: (formData.get("dependencies") as string)?.trim() || undefined,
    risks: (formData.get("risks") as string)?.trim() || undefined,
  };

  const required: (keyof ValidationData)[] = [
    "businessValue",
    "solutionDirection",
    "tShirtSize",
    "priority",
    "leadProductionParty",
    "dependencies",
    "risks",
  ];
  const missing = required.filter((k) => !data[k]);
  if (missing.length > 0) {
    return { error: "All validation fields must be completed before submitting." };
  }

  await db
    .update(initiatives)
    .set({
      validationData: data,
      status: "submitted",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "validation_submitted",
    details: {
      submittedBy: user.name,
      fromStage: "Validation",
    },
  });

  revalidatePath(`/initiatives/${initiativeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
