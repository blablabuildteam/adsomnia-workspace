import {
  getFastTrackBoardUrl,
  listFastTrackIssues,
  type FastTrackJiraIssue,
} from "@/lib/integrations/jira";
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

export type FastTrackItem = {
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
  initiative: FastTrackInitiativeDetails | null;
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

function fromInitiative(
  item: InitiativeWithUsers,
  jira: FastTrackJiraIssue | undefined,
  remark: string | null,
): FastTrackItem {
  return {
    id: jira?.key ?? item.fastTrackJiraKey ?? `ws-${item.id}`,
    title: jira?.title ?? item.title,
    status: jira?.status ?? "Fast-Track",
    statusCategory: jira?.statusCategory ?? "new",
    priority: jira?.priority ?? "—",
    assignee: jira?.assignee ?? null,
    reporter: jira?.reporter ?? null,
    description: jira?.description ?? "",
    created: jira?.created ?? item.createdAt.toISOString(),
    updated: jira?.updated ?? item.updatedAt.toISOString(),
    url: jira?.url ?? item.fastTrackJiraUrl,
    jiraKey: jira?.key ?? item.fastTrackJiraKey,
    initiative: toInitiativeDetails(item, remark),
  };
}

function fromJiraOnly(issue: FastTrackJiraIssue): FastTrackItem {
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
    initiative: null,
  };
}

export async function loadFastTrackOverview(): Promise<{
  items: FastTrackItem[];
  boardUrl: string | null;
  fetchError: string | null;
}> {
  const workspaceItems = await getFastTrackInitiatives();
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
        : "Could not load Fast-Track tasks from Jira.";
  }

  const jiraByKey = new Map(
    jiraIssues
      .filter((issue) => issue.key)
      .map((issue) => [issue.key, issue]),
  );
  const seenKeys = new Set<string>();
  const items: FastTrackItem[] = [];

  for (const item of workspaceItems) {
    const key = item.fastTrackJiraKey;
    const jira = key ? jiraByKey.get(key) : undefined;
    if (key) seenKeys.add(key);
    items.push(
      fromInitiative(item, jira, remarks.get(item.id) ?? null),
    );
  }

  for (const issue of jiraIssues) {
    if (seenKeys.has(issue.key)) continue;
    items.push(fromJiraOnly(issue));
  }

  return {
    items,
    boardUrl: getFastTrackBoardUrl(),
    fetchError,
  };
}
