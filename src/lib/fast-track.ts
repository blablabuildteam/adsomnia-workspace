import { cache } from "react";
import {
  fastTrackIssueStillExists,
  getFastTrackBoardUrl,
  getFastTrackIssue,
  listFastTrackChildIssues,
  listFastTrackIssues,
  type FastTrackJiraIssue,
} from "@/lib/integrations/jira";
import { seesAllWorkstreams, type PermissionUser } from "@/lib/permissions";
import {
  getFastTrackInitiativeByJiraKey,
  getFastTrackInitiatives,
  getFastTrackRemarks,
  getInitiativeById,
  listFastTrackJiraKeys,
  type InitiativeWithUsers,
} from "@/lib/queries";
import {
  verifyFastTrackShareToken,
  createFastTrackSharePath,
  type FastTrackShareSubject,
} from "@/lib/share";

export type FastTrackInitiativeDetails = {
  id: number;
  ticketId: string;
  title: string;
  problemStatement: string | null;
  opportunitySolution: string | null;
  expectedImpact: string | null;
  targetAudience: string | null;
  submitter: string;
  sponsor: string;
  remark: string | null;
};

export type FastTrackTask = {
  id: string;
  title: string;
  status: string;
  statusCategory: FastTrackJiraIssue["statusCategory"];
  priority: string;
  assignee: string | null;
  reporter: string | null;
  description: string;
  created: string | null;
  updated: string | null;
  /** ISO date (YYYY-MM-DD) from Jira `duedate`, if set. */
  dueDate: string | null;
  url: string | null;
  jiraKey: string | null;
  issueType: string;
  /** Public path for this item. Null until the server has a stable id. */
  sharePath: string | null;
};

export type FastTrackItem = FastTrackTask & {
  isEpic: boolean;
  initiative: FastTrackInitiativeDetails | null;
  tasks: FastTrackTask[];
};

export type SharedFastTrackItem = FastTrackItem & {
  parentTitle: string | null;
};

function toInitiativeDetails(
  item: InitiativeWithUsers,
  remark: string | null,
): FastTrackInitiativeDetails {
  return {
    id: item.id,
    ticketId: item.ticketId,
    title: item.title,
    problemStatement: item.problemStatement,
    opportunitySolution: item.opportunitySolution,
    expectedImpact: item.expectedImpact,
    targetAudience: item.targetAudience,
    submitter: item.submitter.name,
    sponsor: item.sponsor.name,
    remark,
  };
}

function sharePathFor(
  jiraKey: string | null | undefined,
  initiativeId?: number,
): string | null {
  const key = jiraKey?.trim();
  if (key) return createFastTrackSharePath({ jiraKey: key });
  if (initiativeId) return createFastTrackSharePath({ initiativeId });
  return null;
}

function toTask(issue: FastTrackJiraIssue): FastTrackTask {
  return {
    id: issue.key,
    title: issue.title,
    status: issue.status,
    statusCategory: issue.statusCategory,
    priority: issue.priority,
    assignee: issue.assignee,
    reporter: issue.reporter,
    description: issue.description,
    created: issue.created,
    updated: issue.updated,
    dueDate: issue.dueDate,
    url: issue.url,
    jiraKey: issue.key,
    issueType: issue.issueType || "Task",
    sharePath: sharePathFor(issue.key),
  };
}

function tasksFor(
  parentKey: string | null | undefined,
  childrenByParent: Map<string, FastTrackJiraIssue[]>,
  hiddenKeys: Set<string>,
): FastTrackTask[] {
  if (!parentKey) return [];
  return (childrenByParent.get(parentKey) ?? [])
    .filter((issue) => issue.key && !hiddenKeys.has(issue.key))
    .slice()
    .sort((a, b) => {
      const aTime = a.created ? Date.parse(a.created) : 0;
      const bTime = b.created ? Date.parse(b.created) : 0;
      return aTime - bTime;
    })
    .map(toTask);
}

function fromInitiative(
  item: InitiativeWithUsers,
  jira: FastTrackJiraIssue | undefined,
  remark: string | null,
  tasks: FastTrackTask[],
): FastTrackItem {
  return {
    id: jira?.key ?? item.fastTrackJiraKey ?? `ws-${item.id}`,
    title: jira?.title ?? item.title,
    status: jira?.status ?? "Fast-Track",
    statusCategory: jira?.statusCategory ?? "new",
    priority: jira?.priority ?? "—",
    assignee: jira?.assignee ?? null,
    reporter: jira?.reporter ?? null,
    description: jira?.description || item.description || "",
    created: jira?.created ?? item.createdAt.toISOString(),
    updated: jira?.updated ?? item.updatedAt.toISOString(),
    dueDate: jira?.dueDate ?? null,
    url: jira?.url ?? item.fastTrackJiraUrl,
    jiraKey: jira?.key ?? item.fastTrackJiraKey,
    issueType: jira?.issueType || (jira?.isEpic ? "Epic" : ""),
    sharePath: sharePathFor(jira?.key ?? item.fastTrackJiraKey, item.id),
    isEpic: jira?.isEpic ?? false,
    initiative: toInitiativeDetails(item, remark),
    tasks,
  };
}

function fromJiraOnly(
  issue: FastTrackJiraIssue,
  tasks: FastTrackTask[],
): FastTrackItem {
  return {
    ...toTask(issue),
    isEpic: issue.isEpic,
    initiative: null,
    tasks,
  };
}

export async function loadFastTrackOverview(
  user: PermissionUser,
): Promise<{
  items: FastTrackItem[];
  boardUrl: string | null;
  fetchError: string | null;
}> {
  const workspaceItems = await getFastTrackInitiatives(user);
  const remarks = await getFastTrackRemarks(workspaceItems.map((item) => item.id));

  let jiraIssues: FastTrackJiraIssue[] = [];
  let fetchError: string | null = null;
  try {
    jiraIssues = await listFastTrackIssues();
  } catch (error) {
    console.error("Fast-Track Jira list failed:", error);
    fetchError =
      error instanceof Error
        ? error.message
        : "Could not load Fast-Track work from Jira.";
  }

  const jiraByKey = new Map(
    jiraIssues
      .filter((issue) => issue.key)
      .map((issue) => [issue.key, issue]),
  );
  const childrenByParent = new Map<string, FastTrackJiraIssue[]>();
  for (const issue of jiraIssues) {
    if (!issue.parentKey) continue;
    const list = childrenByParent.get(issue.parentKey) ?? [];
    list.push(issue);
    childrenByParent.set(issue.parentKey, list);
  }

  const workspaceKeys = new Set(
    workspaceItems
      .map((item) => item.fastTrackJiraKey)
      .filter((key): key is string => Boolean(key)),
  );
  const removedFromJira = new Set<string>();
  if (!fetchError) {
    const missingKeys = [
      ...new Set(
        [...workspaceKeys].filter((key) => !jiraByKey.has(key)),
      ),
    ];
    await Promise.all(
      missingKeys.map(async (key) => {
        const exists = await fastTrackIssueStillExists(key);
        if (exists === false) removedFromJira.add(key);
      }),
    );
  }
  const seenKeys = new Set<string>();
  const items: FastTrackItem[] = [];

  for (const item of workspaceItems) {
    const key = item.fastTrackJiraKey;
    if (key && removedFromJira.has(key)) continue;
    const jira = key ? jiraByKey.get(key) : undefined;
    if (key) seenKeys.add(key);
    items.push(
      fromInitiative(
        item,
        jira,
        remarks.get(item.id) ?? null,
        tasksFor(key, childrenByParent, workspaceKeys),
      ),
    );
  }

  if (seesAllWorkstreams(user)) {
    for (const issue of jiraIssues) {
      if (!issue.key || seenKeys.has(issue.key)) continue;
      if (
        issue.parentKey &&
        (seenKeys.has(issue.parentKey) || jiraByKey.has(issue.parentKey))
      ) {
        continue;
      }
      seenKeys.add(issue.key);
      items.push(
        fromJiraOnly(
          issue,
          tasksFor(issue.key, childrenByParent, workspaceKeys),
        ),
      );
    }
  }

  return {
    items,
    boardUrl: seesAllWorkstreams(user) ? getFastTrackBoardUrl() : null,
    fetchError,
  };
}

async function childTasks(
  parentKey: string | null,
  hiddenKeys: Set<string>,
): Promise<FastTrackTask[]> {
  if (!parentKey) return [];
  try {
    const children = await listFastTrackChildIssues(parentKey);
    const childrenByParent = new Map<string, FastTrackJiraIssue[]>([
      [parentKey, children],
    ]);
    return tasksFor(parentKey, childrenByParent, hiddenKeys);
  } catch (error) {
    console.error("Fast-Track child list failed:", error);
    return [];
  }
}

async function withParentTitle(
  item: FastTrackItem,
  issue: FastTrackJiraIssue | null,
): Promise<SharedFastTrackItem> {
  if (!issue || issue.isEpic || !issue.parentKey) {
    return { ...item, parentTitle: null };
  }
  try {
    const parent = await getFastTrackIssue(issue.parentKey);
    return { ...item, parentTitle: parent?.title ?? null };
  } catch (error) {
    console.error("Fast-Track parent lookup failed:", error);
    return { ...item, parentTitle: null };
  }
}

async function itemFromSubject(
  subject: FastTrackShareSubject,
): Promise<SharedFastTrackItem | null> {
  if ("initiativeId" in subject) {
    const initiative = await getInitiativeById(subject.initiativeId);
    if (!initiative?.isFastTrack) return null;

    const key = initiative.fastTrackJiraKey;
    const issuePromise = key
      ? getFastTrackIssue(key).catch((error: unknown) => {
          console.error("Fast-Track share lookup failed:", error);
          return null;
        })
      : Promise.resolve(null);

    const [issue, remarks, hiddenKeys] = await Promise.all([
      issuePromise,
      getFastTrackRemarks([initiative.id]),
      listFastTrackJiraKeys(),
    ]);
    const parentKey = issue?.isEpic ? issue.key : !issue && key ? key : null;
    const tasks = await childTasks(parentKey, new Set(hiddenKeys));
    return withParentTitle(
      fromInitiative(
        initiative,
        issue ?? undefined,
        remarks.get(initiative.id) ?? null,
        tasks,
      ),
      issue,
    );
  }

  const issuePromise = getFastTrackIssue(subject.jiraKey);
  const [initiative, hiddenKeys] = await Promise.all([
    getFastTrackInitiativeByJiraKey(subject.jiraKey),
    listFastTrackJiraKeys(),
  ]);

  let issue: FastTrackJiraIssue | null = null;
  try {
    issue = await issuePromise;
  } catch (error) {
    if (!initiative) throw error;
    console.error("Fast-Track share lookup failed:", error);
  }
  if (!issue && !initiative) return null;

  const parentKey = issue?.isEpic
    ? issue.key
    : !issue && initiative?.fastTrackJiraKey
      ? initiative.fastTrackJiraKey
      : null;
  const tasks = await childTasks(parentKey, new Set(hiddenKeys));

  if (initiative) {
    const remarks = await getFastTrackRemarks([initiative.id]);
    return withParentTitle(
      fromInitiative(
        initiative,
        issue ?? undefined,
        remarks.get(initiative.id) ?? null,
        tasks,
      ),
      issue,
    );
  }
  if (!issue) return null;
  return withParentTitle(fromJiraOnly(issue, tasks), issue);
}

/** One Fast-Track item for a public share link. Deduped within a request. */
export const loadSharedFastTrackItem = cache(
  async (token: string): Promise<SharedFastTrackItem | null> => {
    const subject = verifyFastTrackShareToken(token);
    if (!subject) return null;
    return itemFromSubject(subject);
  },
);
