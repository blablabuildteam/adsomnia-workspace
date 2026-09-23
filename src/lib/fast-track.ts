import {
  fastTrackIssueStillExists,
  getFastTrackBoardUrl,
  listFastTrackIssues,
  type FastTrackJiraIssue,
} from "@/lib/integrations/jira";
import { seesAllWorkstreams, type PermissionUser } from "@/lib/permissions";
import {
  getFastTrackInitiatives,
  getFastTrackRemarks,
  type InitiativeWithUsers,
} from "@/lib/queries";

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
  url: string | null;
  jiraKey: string | null;
  issueType: string;
};

export type FastTrackItem = FastTrackTask & {
  isEpic: boolean;
  initiative: FastTrackInitiativeDetails | null;
  tasks: FastTrackTask[];
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
    url: issue.url,
    jiraKey: issue.key,
    issueType: issue.issueType || "Task",
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
    url: jira?.url ?? item.fastTrackJiraUrl,
    jiraKey: jira?.key ?? item.fastTrackJiraKey,
    issueType: jira?.issueType || (jira?.isEpic ? "Epic" : ""),
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
