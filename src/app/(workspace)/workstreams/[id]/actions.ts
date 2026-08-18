"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { initiatives, approvals, activityLog, comments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, canApprove } from "@/lib/session";
import {
  isBusinessValueComplete,
  isScopingComplete,
  type BusinessValueData,
  type BusinessValueType,
  type ValidationData,
  type ScopingData,
  type ScopingMilestone,
  type ScopingTeamMember,
  type ScopingScopeItem,
} from "@/lib/queries";

const BUSINESS_VALUE_TYPE_IDS: BusinessValueType[] = [
  "speed",
  "cost-efficiency",
  "growth",
];

function parseBusinessValue(formData: FormData): BusinessValueData | undefined {
  const types = formData
    .getAll("businessValueTypes")
    .map(String)
    .filter((t): t is BusinessValueType =>
      BUSINESS_VALUE_TYPE_IDS.includes(t as BusinessValueType),
    );

  if (types.length === 0) return undefined;

  const expectations: BusinessValueData["expectations"] = {};
  for (const type of types) {
    const raw = (formData.get(`businessValueExpectation_${type}`) as string)
      ?.trim();
    const score = Number(raw);
    if (Number.isFinite(score)) {
      const rounded = Math.round(score);
      if (rounded >= 1 && rounded <= 10) expectations[type] = rounded;
    }
  }

  return { types, expectations };
}

function parseValidationFormData(formData: FormData): ValidationData {
  return {
    businessValue: parseBusinessValue(formData),
    solutionDirection:
      (formData.get("solutionDirection") as string)?.trim() || undefined,
    tShirtSize: (formData.get("tShirtSize") as string)?.trim() || undefined,
    priority: (formData.get("priority") as string)?.trim() || undefined,
    leadProductionParty:
      (formData.get("leadProductionParty") as string)?.trim() || undefined,
    dependencies: (formData.get("dependencies") as string)?.trim() || undefined,
    risks: (formData.get("risks") as string)?.trim() || undefined,
  };
}

export type IdeaUpdateResult = {
  error?: string;
  success?: boolean;
};

/** Creator (or leadership) updates initiative details, even after submission. */
export async function updateIdeaDetails(
  initiativeId: number,
  _prev: IdeaUpdateResult,
  formData: FormData,
): Promise<IdeaUpdateResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "You must be logged in." };
  }

  const [existing] = await db
    .select({
      submitterId: initiatives.submitterId,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!existing) {
    return { error: "Initiative not found." };
  }
  if (existing.submitterId !== user.id && !canApprove(user)) {
    return { error: "Only the creator or leadership can edit this initiative." };
  }
  if (existing.currentStage !== "idea") {
    return {
      error: "Initiative details can only be edited before Validation approval.",
    };
  }
  if (existing.status === "rejected") {
    return { error: "Rejected initiatives cannot be edited." };
  }

  const title = (formData.get("title") as string)?.trim();
  const problemStatement = (formData.get("problemStatement") as string)?.trim();
  const opportunitySolution = (
    formData.get("opportunitySolution") as string
  )?.trim();
  const expectedImpact = (formData.get("expectedImpact") as string)?.trim();
  const targetAudience = (formData.get("targetAudience") as string)?.trim();

  if (!title || !problemStatement || !opportunitySolution || !expectedImpact) {
    return { error: "Title, problem, solution, and impact are required." };
  }

  await db
    .update(initiatives)
    .set({
      title,
      problemStatement,
      opportunitySolution,
      expectedImpact,
      targetAudience: targetAudience || null,
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "idea_updated",
    details: { updatedBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

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

  revalidatePath(`/workstreams/${initiativeId}`);
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

  revalidatePath(`/workstreams/${initiativeId}`);
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

  revalidatePath(`/workstreams/${initiativeId}`);
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

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/dashboard");
  return {
    success: true,
    decision: "on-hold",
    comment,
    approverName: user.name,
  };
}

export type ValidationDecisionResult = {
  error?: string;
  success?: boolean;
  decision?: "approved" | "rejected" | "feedback";
  comment?: string;
  approverName?: string;
};

async function recordValidationDecision(
  initiativeId: number,
  formData: FormData,
  opts: {
    decision: "approved" | "rejected" | "feedback";
    newStatus: "draft" | "approved" | "rejected";
    newStage?: "scoping";
    toStage: string | null;
    action: string;
    permissionError: string;
  },
): Promise<ValidationDecisionResult> {
  const user = await getCurrentUser();
  if (!user || !canApprove(user)) {
    return { error: opts.permissionError };
  }

  const comment = (formData.get("comment") as string)?.trim() || null;
  if (!comment) {
    return { error: "A remark is required when making a review decision." };
  }

  await db
    .update(initiatives)
    .set({
      status: opts.newStatus,
      ...(opts.newStage ? { currentStage: opts.newStage } : {}),
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(approvals).values({
    initiativeId,
    approverId: user.id,
    fromStage: "validation",
    toStage: opts.toStage,
    decision: opts.decision,
    comment,
  });

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: opts.action,
    details: { comment, approver: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/validation");
  revalidatePath("/dashboard");
  return {
    success: true,
    decision: opts.decision,
    comment,
    approverName: user.name,
  };
}

/** Approve the business case and advance the initiative to Scoping. */
export async function approveValidationToScoping(
  initiativeId: number,
  _prev: ValidationDecisionResult,
  formData: FormData,
): Promise<ValidationDecisionResult> {
  return recordValidationDecision(initiativeId, formData, {
    decision: "approved",
    newStatus: "approved",
    newStage: "scoping",
    toStage: "scoping",
    action: "validation_approved",
    permissionError: "Only leadership admins can approve the business case.",
  });
}

/** Reject the business case; stays in Validation under the Rejected filter. */
export async function rejectValidation(
  initiativeId: number,
  _prev: ValidationDecisionResult,
  formData: FormData,
): Promise<ValidationDecisionResult> {
  return recordValidationDecision(initiativeId, formData, {
    decision: "rejected",
    newStatus: "rejected",
    toStage: null,
    action: "validation_rejected",
    permissionError: "Only leadership admins can reject the business case.",
  });
}

/** Send the business case back to the creator with feedback (editable again). */
export async function requestValidationChanges(
  initiativeId: number,
  _prev: ValidationDecisionResult,
  formData: FormData,
): Promise<ValidationDecisionResult> {
  return recordValidationDecision(initiativeId, formData, {
    decision: "feedback",
    newStatus: "draft",
    toStage: null,
    action: "validation_feedback",
    permissionError: "Only leadership admins can send feedback.",
  });
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

  const data = parseValidationFormData(formData);

  await db
    .update(initiatives)
    .set({
      validationData: data,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "validation_saved",
    details: { updatedBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/validation");
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

  const data = parseValidationFormData(formData);

  const required: (keyof ValidationData)[] = [
    "solutionDirection",
    "tShirtSize",
    "priority",
    "leadProductionParty",
  ];
  const missing = required.filter((k) => !data[k]);
  if (missing.length > 0 || !isBusinessValueComplete(data.businessValue)) {
    return {
      error:
        "All validation fields must be completed before submitting. Select at least one business value type and set its impact score (1–10).",
    };
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

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

/* ─── Scoping (Phase 3) ────────────────────────────────── */

export type ScopingResult = {
  error?: string;
  success?: boolean;
};

function parseScopingFormData(formData: FormData): ScopingData {
  const milestonesRaw = formData.get("milestones") as string | null;
  const teamRaw = formData.get("team") as string | null;
  const scopeRaw = formData.get("scopeItems") as string | null;
  const impactRaw = formData.get("impact") as string | null;
  const dependencies = (formData.get("scopeDependencies") as string)?.trim() || undefined;

  let milestones: ScopingMilestone[] | undefined;
  let team: ScopingTeamMember[] | undefined;
  let scopeItems: ScopingScopeItem[] | undefined;
  let impact: BusinessValueData | undefined;

  try { milestones = milestonesRaw ? JSON.parse(milestonesRaw) : undefined; } catch { /* skip */ }
  try { team = teamRaw ? JSON.parse(teamRaw) : undefined; } catch { /* skip */ }
  try { scopeItems = scopeRaw ? JSON.parse(scopeRaw) : undefined; } catch { /* skip */ }
  try { impact = impactRaw ? JSON.parse(impactRaw) : undefined; } catch { /* skip */ }

  return { milestones, team, impact, scopeItems, dependencies };
}

export async function saveScopingData(
  initiativeId: number,
  _prev: ScopingResult,
  formData: FormData,
): Promise<ScopingResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const data = parseScopingFormData(formData);

  await db
    .update(initiatives)
    .set({
      scopingData: data,
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "scoping_saved",
    details: { updatedBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/validation");
  return { success: true };
}

export async function submitScopingForApproval(
  initiativeId: number,
  _prev: ScopingResult,
  formData: FormData,
): Promise<ScopingResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const data = parseScopingFormData(formData);

  if (!isScopingComplete(data)) {
    return {
      error: "All scoping fields must be completed before submitting. Ensure impact, milestones, team, and scope items are all provided.",
    };
  }

  await db
    .update(initiatives)
    .set({
      scopingData: data,
      status: "submitted",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "scoping_submitted",
    details: { submittedBy: user.name, fromStage: "Scoping" },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
