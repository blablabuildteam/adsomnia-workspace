import { db } from "@/db";
import {
  initiatives,
  users,
  approvals,
  activityLog,
  comments,
} from "@/db/schema";
import { eq, desc, count, inArray } from "drizzle-orm";
import type { ValidationData, ScopingData } from "@/lib/validation-data";

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
} from "@/lib/validation-data";
export {
  BUSINESS_VALUE_TYPES,
  isBusinessValueData,
  isBusinessValueComplete,
  isScopingComplete,
  formatBusinessValueSummary,
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
  currentStage: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  submitter: { id: string; name: string };
  sponsor: { id: string; name: string };
};

export async function getAllInitiatives(): Promise<InitiativeWithUsers[]> {
  const rows = await db
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
      currentStage: initiatives.currentStage,
      status: initiatives.status,
      createdAt: initiatives.createdAt,
      updatedAt: initiatives.updatedAt,
      submitterId: initiatives.submitterId,
      sponsorId: initiatives.sponsorId,
    })
    .from(initiatives)
    .orderBy(desc(initiatives.updatedAt));

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
    currentStage: r.currentStage,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    submitter: userMap.get(r.submitterId) ?? { id: r.submitterId, name: "Unknown" },
    sponsor: userMap.get(r.sponsorId) ?? { id: r.sponsorId, name: "Unknown" },
  }));
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
      currentStage: initiatives.currentStage,
      status: initiatives.status,
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
