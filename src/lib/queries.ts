import { db } from "@/db";
import {
  initiatives,
  users,
  approvals,
  activityLog,
  comments,
  feedbackSubmissions,
  workstreamAccess,
} from "@/db/schema";
import {
  eq,
  desc,
  asc,
  count,
  inArray,
  isNull,
  notInArray,
  and,
  or,
  exists,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  seesAllWorkstreams,
  type PermissionUser,
  type WorkspaceRole,
} from "@/lib/permissions";
import { displayName } from "@/lib/session";
import type {
  ValidationData,
  ScopingData,
  SetupData,
  OnboardingData,
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
  isFastTrack: boolean;
  fastTrackJiraKey: string | null;
  fastTrackJiraUrl: string | null;
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
  isFastTrack: initiatives.isFastTrack,
  fastTrackJiraKey: initiatives.fastTrackJiraKey,
  fastTrackJiraUrl: initiatives.fastTrackJiraUrl,
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
  isFastTrack: boolean;
  fastTrackJiraKey: string | null;
  fastTrackJiraUrl: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  submitterId: string;
  sponsorId: string;
};

/** Team accounts see their own submissions and workstreams they were added to. */
function ownerVisibility(user: PermissionUser): SQL | undefined {
  if (seesAllWorkstreams(user)) return undefined;
  return or(
    eq(initiatives.submitterId, user.id),
    exists(
      db
        .select({ id: workstreamAccess.id })
        .from(workstreamAccess)
        .where(
          and(
            eq(workstreamAccess.initiativeId, initiatives.id),
            eq(workstreamAccess.userId, user.id),
          ),
        ),
    ),
  );
}

function whereVisible(
  user: PermissionUser,
  ...conditions: SQL[]
): SQL | undefined {
  const extra = ownerVisibility(user);
  const parts = extra ? [...conditions, extra] : conditions;
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return and(...parts);
}

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
    isFastTrack: r.isFastTrack,
    fastTrackJiraKey: r.fastTrackJiraKey,
    fastTrackJiraUrl: r.fastTrackJiraUrl,
    archivedAt: r.archivedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    submitter: userMap.get(r.submitterId) ?? { id: r.submitterId, name: "Unknown" },
    sponsor: userMap.get(r.sponsorId) ?? { id: r.sponsorId, name: "Unknown" },
  }));
}

export async function getInitiativesByStage(
  stage: string,
  user: PermissionUser,
): Promise<InitiativeWithUsers[]> {
  const rows = await db
    .select(initiativeSelect)
    .from(initiatives)
    .where(
      whereVisible(
        user,
        eq(
          initiatives.currentStage,
          stage as (typeof initiatives.$inferSelect)["currentStage"],
        ),
        eq(initiatives.isFastTrack, false),
      ),
    )
    .orderBy(desc(initiatives.updatedAt));

  return hydrateInitiatives(rows);
}

export async function getAllInitiatives(
  user: PermissionUser,
): Promise<InitiativeWithUsers[]> {
  const rows = await db
    .select(initiativeSelect)
    .from(initiatives)
    .where(whereVisible(user, eq(initiatives.isFastTrack, false)))
    .orderBy(desc(initiatives.updatedAt));

  return hydrateInitiatives(rows);
}

export async function getFastTrackInitiatives(
  user: PermissionUser,
): Promise<InitiativeWithUsers[]> {
  const rows = await db
    .select(initiativeSelect)
    .from(initiatives)
    .where(whereVisible(user, eq(initiatives.isFastTrack, true)))
    .orderBy(desc(initiatives.updatedAt));

  return hydrateInitiatives(rows);
}

export async function getFastTrackRemarks(
  initiativeIds: number[],
): Promise<Map<number, string>> {
  if (initiativeIds.length === 0) return new Map();

  const rows = await db
    .select({
      initiativeId: activityLog.initiativeId,
      details: activityLog.details,
    })
    .from(activityLog)
    .where(
      and(
        inArray(activityLog.initiativeId, initiativeIds),
        eq(activityLog.action, "converted_to_fast_track"),
      ),
    )
    .orderBy(desc(activityLog.createdAt));

  const remarks = new Map<number, string>();
  for (const row of rows) {
    if (remarks.has(row.initiativeId)) continue;
    const details = row.details as { comment?: string } | null;
    const comment = details?.comment?.trim();
    if (comment) remarks.set(row.initiativeId, comment);
  }
  return remarks;
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
      isFastTrack: initiatives.isFastTrack,
      fastTrackJiraKey: initiatives.fastTrackJiraKey,
      fastTrackJiraUrl: initiatives.fastTrackJiraUrl,
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

const NOISY_ACTIVITY = [
  "validation_saved",
  "scoping_saved",
  "comment_added",
  "setup_task_reset",
  "onboarding_task_reset",
] as const;

export type WorkspaceActivityEntry = {
  id: number;
  action: string;
  details: unknown;
  createdAt: Date;
  userName: string;
  initiativeId: number;
  ticketId: string;
  title: string;
};

/** Recent workspace-wide activity for the dashboard launchpad. */
export async function getRecentWorkspaceActivity(
  limit = 12,
): Promise<WorkspaceActivityEntry[]> {
  const rows = await db
    .select({
      id: activityLog.id,
      action: activityLog.action,
      details: activityLog.details,
      createdAt: activityLog.createdAt,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      initiativeId: initiatives.id,
      ticketId: initiatives.ticketId,
      title: initiatives.title,
    })
    .from(activityLog)
    .innerJoin(users, eq(activityLog.userId, users.id))
    .innerJoin(initiatives, eq(activityLog.initiativeId, initiatives.id))
    .where(notInArray(activityLog.action, [...NOISY_ACTIVITY]))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    details: row.details,
    createdAt: row.createdAt,
    userName: displayName(row),
    initiativeId: row.initiativeId,
    ticketId: row.ticketId,
    title: row.title,
  }));
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
  userId: string | null;
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
      userId: comments.userId,
      userName: sql<string>`coalesce(${users.name}, ${comments.guestAuthorName}, 'Guest')`,
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.initiativeId, initiativeId))
    .orderBy(desc(comments.createdAt));
}

export type MentionPerson = {
  id: string;
  handle: string;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
};

/** Workspace accounts that can be @mentioned in workstream chat. */
export async function getMentionablePeople(): Promise<MentionPerson[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      jobTitle: users.jobTitle,
    })
    .from(users)
    .orderBy(asc(users.name));

  return rows
    .map((row) => ({
      id: row.id,
      handle: displayName(row),
      firstName: row.firstName,
      lastName: row.lastName,
      jobTitle: row.jobTitle,
    }))
    .filter((person) => person.handle.length > 0)
    .sort((a, b) => a.handle.localeCompare(b.handle, "en"));
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
    .where(and(isNull(initiatives.archivedAt), eq(initiatives.isFastTrack, false)))
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
    .where(eq(initiatives.isFastTrack, false))
    .groupBy(initiatives.status);

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.status] = row.count;
  }
  return result;
}

export type FeedbackSubmissionEntry = {
  id: number;
  title: string;
  description: string;
  pagePath: string;
  pageUrl: string | null;
  userAgent: string | null;
  viewport: string | null;
  imageFileName: string | null;
  imageMimeType: string | null;
  hasImage: boolean;
  status: "open" | "resolved";
  createdAt: Date;
  submitter: { id: string; name: string; email: string };
};

/** Newest first. Callers must already have gated for blablabuild. */
export async function getFeedbackSubmissions(): Promise<
  FeedbackSubmissionEntry[]
> {
  const rows = await db
    .select({
      id: feedbackSubmissions.id,
      title: feedbackSubmissions.title,
      description: feedbackSubmissions.description,
      pagePath: feedbackSubmissions.pagePath,
      pageUrl: feedbackSubmissions.pageUrl,
      userAgent: feedbackSubmissions.userAgent,
      viewport: feedbackSubmissions.viewport,
      imageFileName: feedbackSubmissions.imageFileName,
      imageMimeType: feedbackSubmissions.imageMimeType,
      status: feedbackSubmissions.status,
      createdAt: feedbackSubmissions.createdAt,
      submitterId: users.id,
      submitterName: users.name,
      submitterFirstName: users.firstName,
      submitterLastName: users.lastName,
      submitterEmail: users.email,
    })
    .from(feedbackSubmissions)
    .innerJoin(users, eq(feedbackSubmissions.submitterId, users.id))
    .orderBy(desc(feedbackSubmissions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    pagePath: row.pagePath,
    pageUrl: row.pageUrl,
    userAgent: row.userAgent,
    viewport: row.viewport,
    imageFileName: row.imageFileName,
    imageMimeType: row.imageMimeType,
    hasImage: Boolean(row.imageFileName),
    status: row.status,
    createdAt: row.createdAt,
    submitter: {
      id: row.submitterId,
      name: displayName({
        name: row.submitterName,
        firstName: row.submitterFirstName,
        lastName: row.submitterLastName,
      }),
      email: row.submitterEmail,
    },
  }));
}

export type RegisteredUserEntry = {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  role: WorkspaceRole;
  profileComplete: boolean;
  createdAt: string;
};

/** Newest registrations first. Callers must already have gated for leadership. */
export async function getRegisteredUsers(): Promise<RegisteredUserEntry[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      jobTitle: users.jobTitle,
      role: users.role,
      profileCompletedAt: users.profileCompletedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt), asc(users.email));

  return rows.map((row) => ({
    id: row.id,
    name: displayName({
      name: row.name,
      firstName: row.firstName,
      lastName: row.lastName,
    }),
    email: row.email,
    jobTitle: row.jobTitle?.trim() || null,
    role: row.role,
    profileComplete: Boolean(row.profileCompletedAt),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getFeedbackImage(
  id: number,
): Promise<{ imageData: string; imageFileName: string | null } | null> {
  const [row] = await db
    .select({
      imageData: feedbackSubmissions.imageData,
      imageFileName: feedbackSubmissions.imageFileName,
    })
    .from(feedbackSubmissions)
    .where(eq(feedbackSubmissions.id, id))
    .limit(1);

  if (!row?.imageData) return null;
  return { imageData: row.imageData, imageFileName: row.imageFileName };
}
