import { db } from "@/db";
import {
  initiatives,
  users,
  approvals,
  activityLog,
  comments,
} from "@/db/schema";
import { eq, desc, count, inArray, isNull } from "drizzle-orm";
import type {
  ValidationData,
  ScopingData,
  SetupData,
  OnboardingData,
} from "@/lib/validation-data";

export type {
  Attachment,
  BusinessValueType,
  BusinessValueData,
  ValidationData,
  ScopingData,
  ScopingMilestone,
  ScopingTeamMember,
  ScopingScopeItem,
  ScopingValueMetric,
  SetupData,
  SetupTaskId,
  SetupTaskStatus,
  DriveFolderLink,
  OnboardingData,
  OnboardingTaskId,
} from "@/lib/validation-data";
export {
  BUSINESS_VALUE_TYPES,
  isBusinessValueData,
  isBusinessValueComplete,
  isScopingComplete,
  formatBusinessValueSummary,
  SETUP_TASKS,
  getSetupProgress,
  createDefaultSetupData,
  setupTaskIdToDataKey,
  isSetupPhaseUnlocked,
  ONBOARDING_TASKS,
  getOnboardingProgress,
  createDefaultOnboardingData,
  onboardingTaskIdToDataKey,
  isOnboardingPhaseUnlocked,
  validateOnboardingTask,
  normalizeUrl,
} from "@/lib/validation-data";

export type InitiativeWithUsers = {
  id: number;
  ticketId: string;
  title: string;
  description: string | null;
  problemStatement: string | null;
  opportunitySolution: string | null;
  expectedImpact: string | null;
  targetAudience: string | null;
  validationData: ValidationData | null;
  scopingData: ScopingData | null;
  setupData: SetupData | null;
  onboardingData: OnboardingData | null;
  currentStage: string;
  status: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submitter: { id: string; name: string };
  sponsor: { id: string; name: string };
};

const initiativeSelect = {
  id: initiatives.id,
  ticketId: initiatives.ticketId,
  title: initiatives.title,
  description: initiatives.description,
  problemStatement: initiatives.problemStatement,
  opportunitySolution: initiatives.opportunitySolution,
  expectedImpact: initiatives.expectedImpact,
  targetAudience: initiatives.targetAudience,
  validationData: initiatives.validationData,
  scopingData: initiatives.scopingData,
  setupData: initiatives.setupData,
  onboardingData: initiatives.onboardingData,
  currentStage: initiatives.currentStage,
  status: initiatives.status,
  archivedAt: initiatives.archivedAt,
  createdAt: initiatives.createdAt,
  updatedAt: initiatives.updatedAt,
  submitterId: initiatives.submitterId,
  sponsorId: initiatives.sponsorId,
};

type InitiativeRow = {
  id: number;
  ticketId: string;
  title: string;
  description: string | null;
  problemStatement: string | null;
  opportunitySolution: string | null;
  expectedImpact: string | null;
  targetAudience: string | null;
  validationData: unknown;
  scopingData: unknown;
  setupData: unknown;
  onboardingData: unknown;
  currentStage: string;
  status: string;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submitterId: string;
  sponsorId: string;
};

async function hydrateInitiatives(
  rows: InitiativeRow[],
): Promise<InitiativeWithUsers[]> {
  if (rows.length === 0) return [];

  const userIds = [
    ...new Set(rows.flatMap((r) => [r.submitterId, r.sponsorId])),
  ];
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds));

  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return rows.map((r) => ({
    id: r.id,
    ticketId: r.ticketId,
    title: r.title,
    description: r.description,
    problemStatement: r.problemStatement,
    opportunitySolution: r.opportunitySolution,
    expectedImpact: r.expectedImpact,
    targetAudience: r.targetAudience,
    validationData: (r.validationData as ValidationData) ?? null,
    scopingData: (r.scopingData as ScopingData) ?? null,
    setupData: (r.setupData as SetupData) ?? null,
    onboardingData: (r.onboardingData as OnboardingData) ?? null,
    currentStage: r.currentStage,
    status: r.status,
    archivedAt: r.archivedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    submitter: userMap.get(r.submitterId) ?? { id: r.submitterId, name: "Unknown" },
    sponsor: userMap.get(r.sponsorId) ?? { id: r.sponsorId, name: "Unknown" },
  }));
}

export async function getInitiativesByStage(
  stage: string,
): Promise<InitiativeWithUsers[]> {
  const rows = await db
    .select(initiativeSelect)
    .from(initiatives)
    .where(
      eq(
        initiatives.currentStage,
        stage as (typeof initiatives.$inferSelect)["currentStage"],
      ),
    )
    .orderBy(desc(initiatives.updatedAt));

  return hydrateInitiatives(rows);
}

export async function getAllInitiatives(): Promise<InitiativeWithUsers[]> {
  const rows = await db
    .select(initiativeSelect)
    .from(initiatives)
    .orderBy(desc(initiatives.updatedAt));

  return hydrateInitiatives(rows);
}

export async function getInitiativeById(
  id: number,
): Promise<InitiativeWithUsers | null> {
  const [row] = await db
    .select({
      id: initiatives.id,
      ticketId: initiatives.ticketId,
      title: initiatives.title,
      description: initiatives.description,
      problemStatement: initiatives.problemStatement,
      opportunitySolution: initiatives.opportunitySolution,
      expectedImpact: initiatives.expectedImpact,
      targetAudience: initiatives.targetAudience,
      validationData: initiatives.validationData,
      scopingData: initiatives.scopingData,
      setupData: initiatives.setupData,
      onboardingData: initiatives.onboardingData,
      currentStage: initiatives.currentStage,
      status: initiatives.status,
      archivedAt: initiatives.archivedAt,
      createdAt: initiatives.createdAt,
      updatedAt: initiatives.updatedAt,
      submitterId: initiatives.submitterId,
      sponsorId: initiatives.sponsorId,
    })
    .from(initiatives)
    .where(eq(initiatives.id, id))
    .limit(1);

  if (!row) return null;

  const userIds = [...new Set([row.submitterId, row.sponsorId])];
  const userRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds));

  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return {
    ...row,
    validationData: (row.validationData as ValidationData) ?? null,
    scopingData: (row.scopingData as ScopingData) ?? null,
    setupData: (row.setupData as SetupData) ?? null,
    onboardingData: (row.onboardingData as OnboardingData) ?? null,
    submitter: userMap.get(row.submitterId) ?? {
      id: row.submitterId,
      name: "Unknown",
    },
    sponsor: userMap.get(row.sponsorId) ?? {
      id: row.sponsorId,
      name: "Unknown",
    },
  };
}

export type ActivityEntry = {
  id: number;
  action: string;
  details: unknown;
  createdAt: Date;
  userName: string;
};

export async function getActivityForInitiative(
  initiativeId: number,
): Promise<ActivityEntry[]> {
  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      userName: users.name,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .where(eq(activityLog.initiativeId, initiativeId))
    .orderBy(desc(activityLog.createdAt));

  return rows;
}

export async function getApprovalHistory(initiativeId: number) {
  return db
    .select({
      id: approvals.id,
      decision: approvals.decision,
      fromStage: approvals.fromStage,
      toStage: approvals.toStage,
      comment: approvals.comment,
      createdAt: approvals.createdAt,
      approverName: users.name,
    })
    .from(approvals)
    .innerJoin(users, eq(approvals.approverId, users.id))
    .where(eq(approvals.initiativeId, initiativeId))
    .orderBy(desc(approvals.createdAt));
}

export type CommentEntry = {
  id: number;
  body: string;
  createdAt: Date;
  userName: string;
};

export async function getCommentsForInitiative(
  initiativeId: number,
): Promise<CommentEntry[]> {
  return db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      userName: users.name,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.initiativeId, initiativeId))
    .orderBy(desc(comments.createdAt));
}

/**
 * Returns initiative IDs whose latest approval for a given stage has the
 * specified decision. Useful for detecting "feedback" items that share
 * the same DB status as regular drafts.
 */
export async function getInitiativeIdsWithLatestDecision(
  stage: string,
  decision: string,
): Promise<Set<number>> {
  const rows = await db
    .select({
      initiativeId: approvals.initiativeId,
      decision: approvals.decision,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .where(eq(approvals.fromStage, stage))
    .orderBy(desc(approvals.createdAt));

  const latest = new Map<number, string>();
  for (const row of rows) {
    if (!latest.has(row.initiativeId)) {
      latest.set(row.initiativeId, row.decision);
    }
  }

  const result = new Set<number>();
  for (const [id, dec] of latest) {
    if (dec === decision) result.add(id);
  }
  return result;
}

export async function getStageCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      stage: initiatives.currentStage,
      count: count(),
    })
    .from(initiatives)
    .where(isNull(initiatives.archivedAt))
    .groupBy(initiatives.currentStage);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.stage] = row.count;
  }
  return result;
}

export async function getStatusCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      status: initiatives.status,
      count: count(),
    })
    .from(initiatives)
    .groupBy(initiatives.status);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = row.count;
  }
  return result;
}
