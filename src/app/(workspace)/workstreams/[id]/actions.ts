"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { initiatives, approvals, activityLog, comments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser, canApprove } from "@/lib/session";
import {
  isBusinessValueComplete,
  isScopingComplete,
  createDefaultSetupData,
  getSetupProgress,
  setupTaskIdToDataKey,
  isSetupPhaseUnlocked,
  SETUP_TASKS,
  ONBOARDING_TASKS,
  createDefaultOnboardingData,
  getOnboardingProgress,
  onboardingTaskIdToDataKey,
  isOnboardingPhaseUnlocked,
  validateOnboardingTask,
  normalizeUrl,
  type Attachment,
  type BusinessValueData,
  type BusinessValueType,
  type ValidationData,
  type ScopingData,
  type ScopingMilestone,
  type ScopingTeamMember,
  type ScopingScopeItem,
  type SetupData,
  type SetupTaskId,
  type SetupTaskStatus,
  type OnboardingData,
  type OnboardingTaskId,
} from "@/lib/queries";
import { canManageSetup, canManageOnboarding } from "@/lib/session";

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

function parseAttachments(formData: FormData): Attachment[] | undefined {
  const raw = formData.get("attachments") as string | null;
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
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
    attachments: parseAttachments(formData),
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
  if (existing.currentStage !== "idea") {
    return {
      error: "Initiative details can only be edited before Validation approval.",
    };
  }

  const isOwner = existing.submitterId === user.id;
  const isLeadership = canApprove(user);

  if (existing.status === "rejected") {
    if (!isOwner) {
      return { error: "Only the initiative owner can edit a rejected submission." };
    }
  } else if (!isOwner && !isLeadership) {
    return { error: "Only the creator or leadership can edit this initiative." };
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
  revalidatePath("/pipeline/initiatives");
  return { success: true };
}

/** Saves updated details AND resubmits the initiative for leadership review. */
export async function resubmitIdea(
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
  if (existing.currentStage !== "idea") {
    return { error: "This initiative is no longer in the Initiative stage." };
  }

  const isOwner = existing.submitterId === user.id;
  const isLeadership = canApprove(user);

  if (existing.status === "rejected") {
    if (!isOwner) {
      return { error: "Only the initiative owner can resubmit a rejected submission." };
    }
  } else if (existing.status === "draft" || existing.status === "on-hold") {
    if (!isOwner && !isLeadership) {
      return { error: "Only the creator or leadership can resubmit." };
    }
  } else {
    return {
      error: "Only feedback, on-hold, or rejected initiatives can be resubmitted.",
    };
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
      status: "submitted",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "idea_resubmitted",
    details: { resubmittedBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/dashboard");
  revalidatePath("/pipeline/initiatives");
  return { success: true };
}

export type ApprovalResult = {
  error?: string;
  success?: boolean;
  decision?: "approved" | "rejected" | "on-hold" | "feedback";
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
  revalidatePath("/pipeline/initiatives");
  revalidatePath("/pipeline/validation");
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
  revalidatePath("/pipeline/initiatives");
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
  revalidatePath("/pipeline/initiatives");
  revalidatePath("/dashboard");
  return {
    success: true,
    decision: "on-hold",
    comment,
    approverName: user.name,
  };
}

/** Send the initiative back to the creator with feedback (editable again). */
export async function requestIdeaFeedback(
  initiativeId: number,
  _prev: ApprovalResult,
  formData: FormData,
): Promise<ApprovalResult> {
  const user = await getCurrentUser();
  if (!user || !canApprove(user)) {
    return { error: "Only leadership admins can send feedback." };
  }

  const comment = (formData.get("comment") as string)?.trim() || null;
  if (!comment) {
    return { error: "A remark is required when sending feedback." };
  }

  await db
    .update(initiatives)
    .set({
      status: "draft",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(approvals).values({
    initiativeId,
    approverId: user.id,
    fromStage: "idea",
    toStage: null,
    decision: "feedback",
    comment,
  });

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "idea_feedback",
    details: { comment, approver: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/initiatives");
  revalidatePath("/dashboard");
  return {
    success: true,
    decision: "feedback",
    comment,
    approverName: user.name,
  };
}

export type ValidationDecisionResult = {
  error?: string;
  success?: boolean;
  decision?: "approved" | "rejected" | "on-hold" | "feedback";
  comment?: string;
  approverName?: string;
};

async function recordValidationDecision(
  initiativeId: number,
  formData: FormData,
  opts: {
    decision: "approved" | "rejected" | "on-hold" | "feedback";
    newStatus: "draft" | "approved" | "rejected" | "on-hold";
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
  revalidatePath("/pipeline/initiatives");
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

/** Put the business case on hold. */
export async function putValidationOnHold(
  initiativeId: number,
  _prev: ValidationDecisionResult,
  formData: FormData,
): Promise<ValidationDecisionResult> {
  return recordValidationDecision(initiativeId, formData, {
    decision: "on-hold",
    newStatus: "on-hold",
    toStage: null,
    action: "validation_on_hold",
    permissionError: "Only leadership admins can put items on hold.",
  });
}

/** Saves updated validation data AND resubmits for leadership review. */
export async function resubmitValidation(
  initiativeId: number,
  _prev: ValidationResult,
  formData: FormData,
): Promise<ValidationResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const [existing] = await db
    .select({
      submitterId: initiatives.submitterId,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!existing) return { error: "Initiative not found." };
  if (existing.currentStage !== "validation") {
    return { error: "This initiative is no longer in the Validation stage." };
  }

  const isOwner = existing.submitterId === user.id;
  const isLeadership = canApprove(user);

  if (existing.status === "rejected") {
    if (!isOwner) {
      return { error: "Only the initiative owner can resubmit a rejected business case." };
    }
  } else if (existing.status === "draft" || existing.status === "on-hold") {
    if (!isOwner && !isLeadership) {
      return { error: "Only the creator or leadership can resubmit." };
    }
  } else {
    return { error: "Only feedback, on-hold, or rejected items can be resubmitted." };
  }

  const data = parseValidationFormData(formData);

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
    action: "validation_resubmitted",
    details: { resubmittedBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/validation");
  revalidatePath("/dashboard");
  return { success: true };
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

  const [existing] = await db
    .select({ status: initiatives.status })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  const data = parseValidationFormData(formData);

  // Only transition from "approved" to "draft" on first save;
  // preserve on-hold / rejected status until explicit resubmission.
  const statusUpdate =
    existing?.status === "approved"
      ? { status: "draft" as const }
      : {};

  await db
    .update(initiatives)
    .set({
      validationData: data,
      ...statusUpdate,
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
  revalidatePath("/pipeline/initiatives");
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
  revalidatePath("/pipeline/validation");
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

  return { milestones, team, impact, scopeItems, dependencies, attachments: parseAttachments(formData) };
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
  revalidatePath("/pipeline/scoping");
  revalidatePath("/pipeline/go-nogo");
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
      currentStage: "go-nogo",
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
  revalidatePath("/pipeline/scoping");
  revalidatePath("/pipeline/go-nogo");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Saves updated scoping data AND resubmits for Go/No-Go review. */
export async function resubmitScoping(
  initiativeId: number,
  _prev: ScopingResult,
  formData: FormData,
): Promise<ScopingResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "You must be logged in." };

  const [existing] = await db
    .select({
      submitterId: initiatives.submitterId,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!existing) return { error: "Initiative not found." };
  if (existing.currentStage !== "go-nogo" && existing.currentStage !== "scoping") {
    return { error: "This initiative is no longer in Scoping or Go/No-Go." };
  }

  const isOwner = existing.submitterId === user.id;
  const isLeadership = canApprove(user);

  if (existing.status !== "draft" && existing.status !== "on-hold") {
    return { error: "Only feedback or on-hold items can be resubmitted." };
  }
  if (!isOwner && !isLeadership) {
    return { error: "Only the creator or leadership can resubmit." };
  }

  const data = parseScopingFormData(formData);
  if (!isScopingComplete(data)) {
    return {
      error:
        "All scoping fields must be completed before resubmitting. Ensure impact, milestones, team, and scope items are all provided.",
    };
  }

  await db
    .update(initiatives)
    .set({
      scopingData: data,
      currentStage: "go-nogo",
      status: "submitted",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "scoping_resubmitted",
    details: { resubmittedBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/scoping");
  revalidatePath("/pipeline/go-nogo");
  revalidatePath("/dashboard");
  return { success: true };
}

/* ─── Go/No-Go (Phase 4) ──────────────────────────────── */

export type GoNoGoDecisionResult = {
  error?: string;
  success?: boolean;
  decision?: "approved" | "rejected" | "feedback";
  comment?: string;
  approverName?: string;
};

async function recordGoNoGoDecision(
  initiativeId: number,
  formData: FormData,
  opts: {
    decision: "approved" | "rejected" | "feedback";
    newStatus: "draft" | "approved" | "rejected";
    newStage?: "setup";
    toStage: string | null;
    action: string;
    permissionError: string;
  },
): Promise<GoNoGoDecisionResult> {
  const user = await getCurrentUser();
  if (!user || !canApprove(user)) {
    return { error: opts.permissionError };
  }

  const comment = (formData.get("comment") as string)?.trim() || null;
  if (!comment) {
    return { error: "A remark is required when making a Go/No-Go decision." };
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
    fromStage: "go-nogo",
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
  revalidatePath("/pipeline/scoping");
  revalidatePath("/pipeline/go-nogo");
  revalidatePath("/dashboard");
  return {
    success: true,
    decision: opts.decision,
    comment,
    approverName: user.name,
  };
}

/** GO — approve and advance to Project Setup. */
export async function approveGoNoGoToSetup(
  initiativeId: number,
  _prev: GoNoGoDecisionResult,
  formData: FormData,
): Promise<GoNoGoDecisionResult> {
  const result = await recordGoNoGoDecision(initiativeId, formData, {
    decision: "approved",
    newStatus: "approved",
    newStage: "setup",
    toStage: "setup",
    action: "gonogo_approved",
    permissionError: "Only leadership can make Go/No-Go decisions.",
  });

  if (result.success) {
    const [row] = await db
      .select({
        ticketId: initiatives.ticketId,
        title: initiatives.title,
        scopingData: initiatives.scopingData,
      })
      .from(initiatives)
      .where(eq(initiatives.id, initiativeId))
      .limit(1);

    if (row) {
      const setupData = createDefaultSetupData(
        row.ticketId,
        row.title,
        row.scopingData as ScopingData | null,
      );
      await db
        .update(initiatives)
        .set({ setupData })
        .where(eq(initiatives.id, initiativeId));
    }

    revalidatePath("/pipeline/setup");
  }

  return result;
}

/** NO-GO — reject; initiative is closed. */
export async function rejectGoNoGo(
  initiativeId: number,
  _prev: GoNoGoDecisionResult,
  formData: FormData,
): Promise<GoNoGoDecisionResult> {
  return recordGoNoGoDecision(initiativeId, formData, {
    decision: "rejected",
    newStatus: "rejected",
    toStage: null,
    action: "gonogo_rejected",
    permissionError: "Only leadership can make Go/No-Go decisions.",
  });
}

/** FEEDBACK — send back to Scoping for revision. */
export async function requestGoNoGoChanges(
  initiativeId: number,
  _prev: GoNoGoDecisionResult,
  formData: FormData,
): Promise<GoNoGoDecisionResult> {
  return recordGoNoGoDecision(initiativeId, formData, {
    decision: "feedback",
    newStatus: "draft",
    toStage: null,
    action: "gonogo_feedback",
    permissionError: "Only leadership can send feedback.",
  });
}

/* ─── Project Setup (Phase 5) ──────────────────────────── */

export type SetupResult = {
  error?: string;
  success?: boolean;
};

const VALID_TASK_IDS: SetupTaskId[] = [
  "slack",
  "drive",
  "jira",
  "jira-planning",
  "documentation",
  "kickoff-meeting",
  "invite-team",
];

/** Completes a single setup checklist task with provided data. */
export async function completeSetupTask(
  initiativeId: number,
  formData: FormData,
): Promise<SetupResult> {
  "use server";

  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return { error: "Only the Head of Production can manage Project Setup." };
  }

  const taskId = formData.get("taskId") as SetupTaskId;
  if (!VALID_TASK_IDS.includes(taskId)) {
    return { error: `Invalid task ID: ${taskId}` };
  }

  const dataRaw = formData.get("data") as string;
  let taskData: Record<string, unknown> = {};
  try {
    taskData = dataRaw ? JSON.parse(dataRaw) : {};
  } catch {
    return { error: "Invalid task data." };
  }

  if (taskId === "slack") {
    const channelName =
      typeof taskData.channelName === "string"
        ? taskData.channelName.trim().replace(/^#/, "")
        : "";
    if (!channelName) {
      return { error: "Slack channel name is required." };
    }
    taskData.channelName = channelName;
  }

  if (taskId === "jira") {
    const boardUrl =
      typeof taskData.boardUrl === "string" ? taskData.boardUrl.trim() : "";
    if (!boardUrl) {
      return { error: "Jira board URL is required." };
    }
    taskData.boardUrl = boardUrl;
    taskData.projectUrl = boardUrl;
  }

  const [row] = await db
    .select({ setupData: initiatives.setupData, currentStage: initiatives.currentStage })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!row) return { error: "Initiative not found." };
  if (row.currentStage !== "setup") {
    return { error: "Initiative is not in the Project Setup stage." };
  }

  const setup = (row.setupData as SetupData | null) ?? {} as SetupData;
  const taskDef = SETUP_TASKS.find((t) => t.id === taskId);
  if (taskDef && !isSetupPhaseUnlocked(setup, taskDef.phase)) {
    return {
      error:
        "Complete Environment Setup before Kickoff Preparation.",
    };
  }
  const now = new Date().toISOString();
  const dataKey = setupTaskIdToDataKey(taskId);
  const markComplete = formData.get("complete") !== "0";

  const existingTask = setup[dataKey] as Record<string, unknown> | undefined;
  const updated: SetupData = {
    ...setup,
    [dataKey]: {
      ...(existingTask ?? {}),
      ...taskData,
      status: markComplete
        ? ("completed" as const)
        : ((existingTask?.status as "pending" | "completed" | "skipped" | "in-progress" | "error") ??
          "pending"),
      completedAt: markComplete
        ? now
        : ((existingTask?.completedAt as string | undefined) ?? undefined),
    },
  };

  await db
    .update(initiatives)
    .set({ setupData: updated, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));

  if (markComplete) {
    await db.insert(activityLog).values({
      initiativeId,
      userId: user.id,
      action: `setup_task_completed`,
      details: { taskId, completedBy: user.name },
    });
  }

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/setup");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Skips an optional setup task (e.g., Jira). */
export async function skipSetupTask(
  initiativeId: number,
  formData: FormData,
): Promise<SetupResult> {
  "use server";

  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return { error: "Only the Head of Production can manage Project Setup." };
  }

  const taskId = formData.get("taskId") as SetupTaskId;
  if (!VALID_TASK_IDS.includes(taskId)) {
    return { error: `Invalid task ID: ${taskId}` };
  }

  const [row] = await db
    .select({ setupData: initiatives.setupData, currentStage: initiatives.currentStage })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!row) return { error: "Initiative not found." };
  if (row.currentStage !== "setup") {
    return { error: "Initiative is not in the Project Setup stage." };
  }

  const setup = (row.setupData as SetupData | null) ?? {} as SetupData;
  const now = new Date().toISOString();
  const dataKey = setupTaskIdToDataKey(taskId);

  const existingTask = setup[dataKey] as Record<string, unknown> | undefined;
  const updated: SetupData = {
    ...setup,
    [dataKey]: {
      ...(existingTask ?? {}),
      status: "skipped" as const,
      completedAt: now,
    },
  };

  await db
    .update(initiatives)
    .set({ setupData: updated, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: `setup_task_skipped`,
    details: { taskId, skippedBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/setup");
  return { success: true };
}

/** Resets a completed/skipped setup task back to pending. */
export async function resetSetupTask(
  initiativeId: number,
  formData: FormData,
): Promise<SetupResult> {
  "use server";

  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return { error: "Only the Head of Production can manage Project Setup." };
  }

  const taskId = formData.get("taskId") as SetupTaskId;
  if (!VALID_TASK_IDS.includes(taskId)) {
    return { error: `Invalid task ID: ${taskId}` };
  }

  const [row] = await db
    .select({ setupData: initiatives.setupData, currentStage: initiatives.currentStage })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!row) return { error: "Initiative not found." };
  if (row.currentStage !== "setup") {
    return { error: "Initiative is not in the Project Setup stage." };
  }

  const setup = (row.setupData as SetupData | null) ?? {} as SetupData;
  const dataKey = setupTaskIdToDataKey(taskId);
  const existingTask = setup[dataKey] as Record<string, unknown> | undefined;

  const updated: SetupData = {
    ...setup,
    [dataKey]: {
      ...(existingTask ?? {}),
      status: "pending" as const,
      completedAt: null,
    },
  };

  await db
    .update(initiatives)
    .set({ setupData: updated, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "setup_task_reset",
    details: { taskId, resetBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/setup");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Advances the initiative from Project Setup to Onboarding & Kickoff. */
export async function advanceToOnboarding(
  initiativeId: number,
  _prev: SetupResult,
): Promise<SetupResult> {
  "use server";

  const user = await getCurrentUser();
  if (!user || !canManageSetup(user)) {
    return { error: "Only the Head of Production can advance to Onboarding." };
  }

  const [row] = await db
    .select({
      currentStage: initiatives.currentStage,
      setupData: initiatives.setupData,
      onboardingData: initiatives.onboardingData,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!row) return { error: "Initiative not found." };
  if (row.currentStage !== "setup") {
    return { error: "Initiative is not in the Project Setup stage." };
  }

  const progress = getSetupProgress(row.setupData as SetupData | null);
  if (!progress.allDone) {
    return {
      error: `Complete all setup tasks before advancing (${progress.completed}/${progress.total} done).`,
    };
  }

  await db
    .update(initiatives)
    .set({
      currentStage: "onboarding",
      status: "approved",
      onboardingData:
        (row.onboardingData as OnboardingData | null) ??
        createDefaultOnboardingData(),
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "setup_completed",
    details: { advancedBy: user.name, toStage: "Onboarding & Kickoff" },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/setup");
  revalidatePath("/pipeline/onboarding");
  revalidatePath("/dashboard");
  return { success: true };
}

/* ─── Onboarding & Kickoff (Phase 6) ───────────────────── */

export type OnboardingResult = {
  error?: string;
  success?: boolean;
};

const VALID_ONBOARDING_TASK_IDS: OnboardingTaskId[] = ONBOARDING_TASKS.map(
  (task) => task.id,
);

const ONBOARDING_PERMISSION_ERROR =
  "Only the Head of Production can manage Onboarding & Kickoff.";

/** Loads the initiative and guarantees an onboarding blob to write into. */
async function loadOnboarding(initiativeId: number): Promise<
  | { error: string }
  | { data: OnboardingData }
> {
  const [row] = await db
    .select({
      onboardingData: initiatives.onboardingData,
      currentStage: initiatives.currentStage,
    })
    .from(initiatives)
    .where(eq(initiatives.id, initiativeId))
    .limit(1);

  if (!row) return { error: "Initiative not found." };
  if (row.currentStage !== "onboarding") {
    return { error: "Initiative is not in the Onboarding & Kickoff stage." };
  }

  return {
    data:
      (row.onboardingData as OnboardingData | null) ??
      createDefaultOnboardingData(),
  };
}

/** Completes (or partially saves) a single onboarding task. */
export async function completeOnboardingTask(
  initiativeId: number,
  formData: FormData,
): Promise<OnboardingResult> {
  "use server";

  const user = await getCurrentUser();
  if (!user || !canManageOnboarding(user)) {
    return { error: ONBOARDING_PERMISSION_ERROR };
  }

  const taskId = formData.get("taskId") as OnboardingTaskId;
  if (!VALID_ONBOARDING_TASK_IDS.includes(taskId)) {
    return { error: `Invalid task ID: ${taskId}` };
  }

  const dataRaw = formData.get("data") as string;
  let taskData: Record<string, unknown> = {};
  try {
    taskData = dataRaw ? JSON.parse(dataRaw) : {};
  } catch {
    return { error: "Invalid task data." };
  }

  const loaded = await loadOnboarding(initiativeId);
  if ("error" in loaded) return { error: loaded.error };
  const onboarding = loaded.data;

  const taskDef = ONBOARDING_TASKS.find((t) => t.id === taskId);
  if (taskDef && !isOnboardingPhaseUnlocked(onboarding, taskDef.phase)) {
    return {
      error: "Walk through the kickoff briefing before the action items.",
    };
  }

  const markComplete = formData.get("complete") !== "0";
  const dataKey = onboardingTaskIdToDataKey(taskId);
  const existingTask = onboarding[dataKey] as Record<string, unknown> | undefined;
  const merged = { ...(existingTask ?? {}), ...taskData };

  if (markComplete) {
    const problem = validateOnboardingTask(taskId, merged);
    if (problem) return { error: problem };
  }

  const now = new Date().toISOString();
  const updated: OnboardingData = {
    ...onboarding,
    [dataKey]: {
      ...merged,
      status: markComplete
        ? ("completed" as const)
        : ((existingTask?.status as SetupTaskStatus) ?? "pending"),
      completedAt: markComplete
        ? now
        : ((existingTask?.completedAt as string | undefined) ?? undefined),
    },
  };

  await db
    .update(initiatives)
    .set({ onboardingData: updated, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));

  if (markComplete) {
    await db.insert(activityLog).values({
      initiativeId,
      userId: user.id,
      action: "onboarding_task_completed",
      details: { taskId, completedBy: user.name },
    });
  }

  if (markComplete) {
    revalidatePath(`/workstreams/${initiativeId}`);
    revalidatePath("/pipeline/onboarding");
    revalidatePath("/dashboard");
  }
  return { success: true };
}

/** Resets a completed onboarding task back to pending. */
export async function resetOnboardingTask(
  initiativeId: number,
  formData: FormData,
): Promise<OnboardingResult> {
  "use server";

  const user = await getCurrentUser();
  if (!user || !canManageOnboarding(user)) {
    return { error: ONBOARDING_PERMISSION_ERROR };
  }

  const taskId = formData.get("taskId") as OnboardingTaskId;
  if (!VALID_ONBOARDING_TASK_IDS.includes(taskId)) {
    return { error: `Invalid task ID: ${taskId}` };
  }

  const loaded = await loadOnboarding(initiativeId);
  if ("error" in loaded) return { error: loaded.error };

  const dataKey = onboardingTaskIdToDataKey(taskId);
  const existingTask = loaded.data[dataKey] as
    | Record<string, unknown>
    | undefined;

  const updated: OnboardingData = {
    ...loaded.data,
    [dataKey]: {
      ...(existingTask ?? {}),
      status: "pending" as const,
      completedAt: null,
    },
  };

  await db
    .update(initiatives)
    .set({ onboardingData: updated, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "onboarding_task_reset",
    details: { taskId, resetBy: user.name },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/onboarding");
  revalidatePath("/dashboard");
  return { success: true };
}

/** Saves the onboarding-only links (Slack channel deep link, kickoff notes). */
export async function saveOnboardingLinks(
  initiativeId: number,
  _prev: OnboardingResult,
  formData: FormData,
): Promise<OnboardingResult> {
  "use server";

  const user = await getCurrentUser();
  if (!user || !canManageOnboarding(user)) {
    return { error: ONBOARDING_PERMISSION_ERROR };
  }

  const loaded = await loadOnboarding(initiativeId);
  if ("error" in loaded) return { error: loaded.error };

  const rawSlack = ((formData.get("slackChannelUrl") as string) ?? "").trim();
  const rawNotes = ((formData.get("notesUrl") as string) ?? "").trim();

  const slackChannelUrl = rawSlack ? normalizeUrl(rawSlack) : null;
  const notesUrl = rawNotes ? normalizeUrl(rawNotes) : null;

  if (rawSlack && !slackChannelUrl) {
    return { error: "That Slack channel link is not a valid URL." };
  }
  if (rawNotes && !notesUrl) {
    return { error: "That kickoff notes link is not a valid URL." };
  }

  const updated: OnboardingData = {
    ...loaded.data,
    links: {
      ...(loaded.data.links ?? {}),
      slackChannelUrl: slackChannelUrl ?? undefined,
      notesUrl: notesUrl ?? undefined,
    },
  };

  await db
    .update(initiatives)
    .set({ onboardingData: updated, updatedAt: new Date() })
    .where(eq(initiatives.id, initiativeId));

  revalidatePath(`/workstreams/${initiativeId}`);
  return { success: true };
}

/** Advances the initiative from Onboarding & Kickoff to Production. */
export async function advanceToProduction(
  initiativeId: number,
  _prev: OnboardingResult,
): Promise<OnboardingResult> {
  "use server";

  const user = await getCurrentUser();
  if (!user || !canManageOnboarding(user)) {
    return { error: "Only the Head of Production can advance to Production." };
  }

  const loaded = await loadOnboarding(initiativeId);
  if ("error" in loaded) return { error: loaded.error };

  const progress = getOnboardingProgress(loaded.data);
  if (!progress.allDone) {
    return {
      error: `Complete all onboarding items before advancing (${progress.completed}/${progress.total} done).`,
    };
  }

  await db
    .update(initiatives)
    .set({
      currentStage: "production",
      status: "approved",
      updatedAt: new Date(),
    })
    .where(eq(initiatives.id, initiativeId));

  await db.insert(activityLog).values({
    initiativeId,
    userId: user.id,
    action: "onboarding_completed",
    details: { advancedBy: user.name, toStage: "Production & Reporting" },
  });

  revalidatePath(`/workstreams/${initiativeId}`);
  revalidatePath("/pipeline/onboarding");
  revalidatePath("/pipeline/production");
  revalidatePath("/dashboard");
  return { success: true };
}
