import { createCloudClient } from "jira.js";

export type JiraInstance = "adsomnia" | "btr" | "hn";

type JiraConfig = {
  host: string;
  email: string;
  apiToken: string;
};

const INSTANCE_LABELS: Record<JiraInstance, string> = {
  adsomnia: "Adsomnia",
  btr: "Bending The Rules",
  hn: "Harlem Next",
};

/** Map initiative lead party → Jira Cloud instance. `bbb` has no dedicated site. */
export function leadPartyToJiraInstance(
  leadParty: string | null | undefined,
): JiraInstance | null {
  switch (leadParty) {
    case "as":
    case "adsomnia":
      return "adsomnia";
    case "btr":
      return "btr";
    case "hn":
      return "hn";
    default:
      return null;
  }
}

export function getInstanceLabel(instance: JiraInstance): string {
  return INSTANCE_LABELS[instance];
}

function getInstanceConfig(instance: JiraInstance): JiraConfig | null {
  const prefix = `JIRA_${instance.toUpperCase()}`;
  const host = process.env[`${prefix}_HOST`];
  const email = process.env[`${prefix}_EMAIL`];
  const apiToken = process.env[`${prefix}_API_TOKEN`];

  if (!host || !email || !apiToken) return null;
  return { host, email, apiToken };
}

function normalizeHost(host: string): string {
  return host.startsWith("https://") ? host : `https://${host}`;
}

function createClient(config: JiraConfig) {
  return createCloudClient({
    host: normalizeHost(config.host),
    auth: {
      type: "basic" as const,
      email: config.email,
      apiToken: config.apiToken,
    },
  });
}

export function getAvailableInstances(): {
  id: JiraInstance;
  label: string;
  host: string;
}[] {
  const instances: { id: JiraInstance; label: string; host: string }[] = [];
  for (const id of ["adsomnia", "btr", "hn"] as JiraInstance[]) {
    const config = getInstanceConfig(id);
    if (config) {
      instances.push({
        id,
        label: INSTANCE_LABELS[id],
        host: config.host,
      });
    }
  }
  return instances;
}

export async function createProject(
  instance: JiraInstance,
  opts: {
    key: string;
    name: string;
    description?: string;
    template: "scrum" | "kanban";
    leadAccountId?: string;
  },
): Promise<{ id: string; key: string; self: string }> {
  const config = getInstanceConfig(instance);
  if (!config) {
    throw new Error(`Jira instance "${instance}" is not configured.`);
  }

  const client = createClient(config);

  const templateKey =
    opts.template === "scrum"
      ? "com.pyxis.greenhopper.jira:gh-simplified-agility-scrum"
      : "com.pyxis.greenhopper.jira:gh-simplified-agility-kanban";

  const params: Record<string, unknown> = {
    key: opts.key.toUpperCase(),
    name: opts.name,
    description: opts.description,
    projectTypeKey: "software",
    projectTemplateKey: templateKey,
  };
  if (opts.leadAccountId) {
    params.leadAccountId = opts.leadAccountId;
  }

  const result = await client.projects.createProject(
    params as Parameters<typeof client.projects.createProject>[0],
  );

  return {
    id: String(result.id),
    key: result.key ?? opts.key.toUpperCase(),
    self: result.self ?? "",
  };
}

export function getProjectUrl(
  instance: JiraInstance,
  projectKey: string,
): string {
  const config = getInstanceConfig(instance);
  if (!config) return "#";
  return `${normalizeHost(config.host)}/jira/software/projects/${projectKey}/board`;
}

export async function searchUsers(
  instance: JiraInstance,
  query: string,
): Promise<{ accountId: string; displayName: string; emailAddress?: string }[]> {
  const config = getInstanceConfig(instance);
  if (!config) return [];

  const client = createClient(config);
  const results = await client.userSearch.findUsers({ query, maxResults: 20 });

  return (results ?? []).map((u) => ({
    accountId: u.accountId ?? "",
    displayName: u.displayName ?? "",
    emailAddress: u.emailAddress,
  }));
}

export function getIntegrationStatus(): {
  jira: { configured: boolean; instances: string[] };
} {
  const instances = getAvailableInstances();
  return {
    jira: {
      configured: instances.length > 0,
      instances: instances.map((i) => i.id),
    },
  };
}

/* ─── Production Overview reads ─────────────────────────── */

export type JiraStatusCategoryKey = "new" | "indeterminate" | "done" | "undefined";

export type JiraEpicSummary = {
  key: string;
  name: string;
  /** ISO date when available (Start date / target start). */
  startDate?: string;
  /** ISO date when available (Due date / target end). */
  endDate?: string;
  status?: string;
  statusCategory?: JiraStatusCategoryKey;
};

export type JiraEpicTaskProgress = {
  epicKey: string;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
};

type IssueFields = {
  summary?: string;
  duedate?: string | null;
  status?: {
    name?: string;
    statusCategory?: { key?: string; name?: string };
  };
  /** Common custom / roadmap fields — present when configured on the site. */
  customfield_10015?: string | null; // often Start date (team-managed)
  [key: string]: unknown;
};

function asIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.slice(0, 10);
}

function pickEpicDates(fields: IssueFields): {
  startDate?: string;
  endDate?: string;
} {
  const startDate =
    asIsoDate(fields.customfield_10015) ||
    asIsoDate(fields["customfield_10020"]) ||
    asIsoDate(fields["start date"]);
  const endDate = asIsoDate(fields.duedate);
  return { startDate, endDate };
}

function statusCategoryKey(
  fields: IssueFields,
): JiraStatusCategoryKey {
  const key = fields.status?.statusCategory?.key;
  if (key === "new" || key === "indeterminate" || key === "done") return key;
  return "undefined";
}

/**
 * List Epics in a project for Production Overview.
 * Date fields differ per Cloud site — refine once Adsomnia’s field IDs are known.
 */
export async function listProjectEpics(
  instance: JiraInstance,
  projectKey: string,
): Promise<JiraEpicSummary[]> {
  const config = getInstanceConfig(instance);
  if (!config) {
    throw new Error(`Jira instance "${instance}" is not configured.`);
  }

  const client = createClient(config);
  const jql = `project = "${projectKey.replace(/"/g, '\\"')}" AND issuetype = Epic ORDER BY created ASC`;

  const result = await client.issueSearch.searchAndReconsileIssuesUsingJqlPost({
    jql,
    maxResults: 100,
    fields: ["summary", "status", "duedate", "customfield_10015"],
  });

  const issues = result.issues ?? [];
  return issues.map((issue) => {
    const fields = (issue.fields ?? {}) as IssueFields;
    const { startDate, endDate } = pickEpicDates(fields);
    return {
      key: issue.key ?? "",
      name: fields.summary ?? issue.key ?? "",
      startDate,
      endDate,
      status: fields.status?.name,
      statusCategory: statusCategoryKey(fields),
    };
  });
}

/**
 * Count nested tasks under an Epic by status category (To Do / In Progress / Done).
 * Uses parent link (team-managed / next-gen) with Epic Link fallback via JQL.
 */
export async function getEpicTaskProgress(
  instance: JiraInstance,
  epicKey: string,
): Promise<JiraEpicTaskProgress> {
  const config = getInstanceConfig(instance);
  if (!config) {
    throw new Error(`Jira instance "${instance}" is not configured.`);
  }

  const client = createClient(config);
  const safeKey = epicKey.replace(/"/g, '\\"');
  const jql = `parent = "${safeKey}" OR "Epic Link" = "${safeKey}" ORDER BY created ASC`;

  const result = await client.issueSearch.searchAndReconsileIssuesUsingJqlPost({
    jql,
    maxResults: 200,
    fields: ["status"],
  });

  const issues = result.issues ?? [];
  let todo = 0;
  let inProgress = 0;
  let done = 0;

  for (const issue of issues) {
    const fields = (issue.fields ?? {}) as IssueFields;
    switch (statusCategoryKey(fields)) {
      case "done":
        done += 1;
        break;
      case "indeterminate":
        inProgress += 1;
        break;
      default:
        todo += 1;
        break;
    }
  }

  return {
    epicKey,
    total: issues.length,
    todo,
    inProgress,
    done,
  };
}

/**
 * Convenience for Production Overview: all epics in a project with task progress.
 */
export async function getProjectEpicProgress(
  instance: JiraInstance,
  projectKey: string,
): Promise<(JiraEpicSummary & { progress: JiraEpicTaskProgress })[]> {
  const epics = await listProjectEpics(instance, projectKey);
  const withProgress = await Promise.all(
    epics.map(async (epic) => ({
      ...epic,
      progress: await getEpicTaskProgress(instance, epic.key),
    })),
  );
  return withProgress;
}
