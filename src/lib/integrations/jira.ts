import { createCloudClient } from "jira.js";
import {
  JIRA_EPIC_COLORS,
  toIsoDate,
  type JiraEpicSeed,
} from "./jira-plan";

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

export type JiraSetupTarget = {
  instance: JiraInstance;
  label: string;
  host: string;
  reason: "lead" | "fallback";
};

/**
 * Site to create the Project Setup board on.
 * Partner sites are used only when their env is present. blablabuild falls
 * back to Adsomnia. An unconfigured partner (e.g. BTR) returns null so the
 * UI can keep the paste-URL fallback instead of creating on the wrong site.
 */
export function resolveSetupJiraInstance(
  leadParty: string | null | undefined,
): JiraSetupTarget | null {
  const mapped = leadPartyToJiraInstance(leadParty);
  if (mapped) {
    const config = getInstanceConfig(mapped);
    if (!config) return null;
    return {
      instance: mapped,
      label: INSTANCE_LABELS[mapped],
      host: config.host,
      reason: "lead",
    };
  }

  const adsomnia = getInstanceConfig("adsomnia");
  if (!adsomnia) return null;
  return {
    instance: "adsomnia",
    label: INSTANCE_LABELS.adsomnia,
    host: adsomnia.host,
    reason: "fallback",
  };
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

export type { JiraEpicSeed } from "./jira-plan";
export { milestonesToEpicSeeds, sanitizeEpicSeeds } from "./jira-plan";

export type CreatedJiraEpic = {
  key: string;
  name: string;
  startDate?: string;
  endDate?: string;
  url: string;
  color?: string;
};

function requireClient(instance: JiraInstance) {
  const config = getInstanceConfig(instance);
  if (!config) {
    throw new Error(`Jira instance "${instance}" is not configured.`);
  }
  return { config, client: createClient(config) };
}

function asProjectKey(value: unknown, fallback: string): string {
  const raw = typeof value === "string" ? value : fallback;
  return raw.replace(/^"+|"+$/g, "").toUpperCase() || fallback;
}

/** Jira project keys: 2–10 letters/digits, must start with a letter. */
export function ticketIdToProjectKeyHint(ticketId: string): string {
  const compact = ticketId.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const keyed = compact.replace(/^[^A-Z]+/, "") || "WS";
  return keyed.slice(0, 10);
}

function adfParagraph(text: string) {
  return {
    type: "doc" as const,
    version: 1 as const,
    content: [
      {
        type: "paragraph" as const,
        content: [{ type: "text" as const, text }],
      },
    ],
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type SimplifiedCreateResult = {
  projectId?: number | string;
  projectKey?: string;
  projectName?: string;
  returnUrl?: string;
  errorMessages?: string[];
  errors?: Record<string, string>;
  message?: string;
};

function jiraAuthHeader(config: JiraConfig): string {
  return `Basic ${Buffer.from(`${config.email}:${config.apiToken}`).toString("base64")}`;
}

function simplifiedCreateError(body: SimplifiedCreateResult): string {
  const fieldError = body.errors
    ? Object.values(body.errors).find(Boolean)
    : undefined;
  return (
    body.errorMessages?.[0] ||
    fieldError ||
    body.message ||
    "Jira could not create this space."
  );
}

/**
 * Team-managed create. The official POST /rest/api/3/project requires
 * Administer Jira; this site only grants Create project, which is enough
 * for /rest/simplified/latest/project (same path the Jira UI uses).
 */
async function createSimplifiedProject(
  config: JiraConfig,
  opts: { key: string; name: string; templateKey: string },
): Promise<{ id: string; key: string; self: string }> {
  const response = await fetch(
    `${normalizeHost(config.host)}/rest/simplified/latest/project`,
    {
      method: "POST",
      headers: {
        Authorization: jiraAuthHeader(config),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: opts.name,
        key: opts.key,
        templateKey: opts.templateKey,
      }),
    },
  );

  const body = (await response.json().catch(() => ({}))) as SimplifiedCreateResult;
  if (!response.ok) {
    throw new Error(simplifiedCreateError(body));
  }

  const key = body.projectKey ?? opts.key;
  return {
    id: String(body.projectId ?? ""),
    key,
    self: body.returnUrl
      ? `${normalizeHost(config.host)}${body.returnUrl}`
      : "",
  };
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
  const { client, config } = requireClient(instance);

  const templateKey =
    opts.template === "scrum"
      ? "com.pyxis.greenhopper.jira:gh-simplified-agility-scrum"
      : "com.pyxis.greenhopper.jira:gh-simplified-agility-kanban";

  const requestedKey = opts.key.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  let key = requestedKey;
  try {
    const suggested = await client.projectKeyAndNameValidation.getValidProjectKey({
      key: requestedKey,
    });
    key = asProjectKey(suggested, requestedKey);
  } catch {
    key = requestedKey;
  }

  const name = opts.name.trim().slice(0, 80);
  if (name.length < 2) {
    throw new Error("Space title must be at least 2 characters.");
  }

  return createSimplifiedProject(config, { key, name, templateKey });
}

type EpicFieldMeta = {
  fieldId: string;
  name?: string;
  required?: boolean;
  schema?: { custom?: string; system?: string; type?: string };
};

async function waitForEpicType(
  client: ReturnType<typeof createClient>,
  projectKey: string,
): Promise<{ id: string; name?: string }> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const meta = await client.issues.getCreateIssueMetaIssueTypes({
      projectIdOrKey: projectKey,
      maxResults: 50,
    });
    const types = [
      ...(meta.issueTypes ?? []),
      ...(meta.createMetaIssueType ?? []),
    ];
    const epic =
      types.find((t) => (t.name ?? "").toLowerCase() === "epic") ??
      types.find((t) => t.hierarchyLevel === 1);
    if (epic?.id) return { id: epic.id, name: epic.name };
    await sleep(1000);
  }
  throw new Error(
    "The Jira project was created, but Epic issue types are not ready yet. Add epics in Jira, then confirm planning.",
  );
}

function pickFieldId(
  fields: EpicFieldMeta[],
  match: (field: EpicFieldMeta) => boolean,
): string | undefined {
  return fields.find(match)?.fieldId;
}

export async function createEpics(
  instance: JiraInstance,
  projectKey: string,
  seeds: JiraEpicSeed[],
): Promise<CreatedJiraEpic[]> {
  if (seeds.length === 0) return [];

  const { client, config } = requireClient(instance);
  const epicType = await waitForEpicType(client, projectKey);
  const fieldPage = await client.issues.getCreateIssueMetaIssueTypeId({
    projectIdOrKey: projectKey,
    issueTypeId: epicType.id,
    maxResults: 100,
  });
  const fields = [
    ...(fieldPage.fields ?? []),
    ...(fieldPage.results ?? []),
  ] as EpicFieldMeta[];

  const me = await client.myself.getCurrentUser();
  const startFieldId =
    pickFieldId(fields, (f) => (f.name ?? "").toLowerCase() === "start date") ??
    pickFieldId(fields, (f) => (f.name ?? "").toLowerCase() === "target start") ??
    pickFieldId(fields, (f) => f.fieldId === "customfield_10015");
  const epicNameFieldId = pickFieldId(
    fields,
    (f) =>
      (f.name ?? "").toLowerCase() === "epic name" ||
      (f.schema?.custom ?? "").includes("gh-epic-label"),
  );
  const dueDateAvailable = fields.some(
    (f) => f.fieldId === "duedate" || f.schema?.system === "duedate",
  );
  const reporterRequired = fields.some(
    (f) => f.fieldId === "reporter" && f.required,
  );
  const colorFieldId =
    pickFieldId(fields, (f) => (f.name ?? "").toLowerCase() === "issue color") ??
    pickFieldId(fields, (f) => (f.schema?.custom ?? "").includes("issue-color")) ??
    pickFieldId(fields, (f) => f.fieldId === "customfield_10017");

  const created: CreatedJiraEpic[] = [];
  for (const [index, seed] of seeds.entries()) {
    const name = seed.name.trim();
    if (!name) continue;
    const startDate = toIsoDate(seed.startDate);
    const endDate = toIsoDate(seed.endDate);
    const fieldsPayload: Record<string, unknown> = {
      project: { key: projectKey },
      summary: name.slice(0, 255),
      issuetype: { id: epicType.id },
    };
    if (seed.description?.trim()) {
      fieldsPayload.description = adfParagraph(seed.description.trim());
    }
    if (epicNameFieldId) fieldsPayload[epicNameFieldId] = name.slice(0, 255);
    if (startFieldId && startDate) fieldsPayload[startFieldId] = startDate;
    if (dueDateAvailable && endDate) fieldsPayload.duedate = endDate;
    if (reporterRequired && me.accountId) {
      fieldsPayload.reporter = { accountId: me.accountId };
    }
    if (colorFieldId && seed.color) {
      fieldsPayload[colorFieldId] = seed.color;
    } else if (colorFieldId) {
      fieldsPayload[colorFieldId] =
        JIRA_EPIC_COLORS[index % JIRA_EPIC_COLORS.length];
    }

    const issue = await client.issues.createIssue({ fields: fieldsPayload });
    created.push({
      key: issue.key,
      name,
      startDate,
      endDate,
      url: `${normalizeHost(config.host)}/browse/${issue.key}`,
      color:
        seed.color ??
        (colorFieldId
          ? JIRA_EPIC_COLORS[index % JIRA_EPIC_COLORS.length]
          : undefined),
    });
  }
  return created;
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

export type JiraEpicTask = {
  key: string;
  name: string;
  status?: string;
  statusCategory: JiraStatusCategoryKey;
  assignee?: string;
  /** ISO timestamp from Jira `updated` — used to pick latest done tickets. */
  updated?: string;
};

export type JiraEpicTaskProgress = {
  epicKey: string;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  tasks: JiraEpicTask[];
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
    tasks: [],
  };
}

type SearchClient = ReturnType<typeof createClient>;

async function searchIssues(
  client: SearchClient,
  jql: string,
  fields: string[],
  maxResults = 100,
): Promise<{ key?: string; fields?: IssueFields }[]> {
  const collected: { key?: string; fields?: IssueFields }[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const result = await client.issueSearch.searchAndReconsileIssuesUsingJqlPost({
      jql,
      maxResults,
      fields,
      nextPageToken,
    });
    const issues = result.issues ?? [];
    for (const issue of issues) {
      collected.push({
        key: issue.key,
        fields: (issue.fields ?? {}) as IssueFields,
      });
    }
    if (!result.nextPageToken || issues.length === 0) break;
    nextPageToken = result.nextPageToken;
  }

  return collected;
}

function emptyProgress(epicKey: string): JiraEpicTaskProgress {
  return { epicKey, total: 0, todo: 0, inProgress: 0, done: 0, tasks: [] };
}

function assigneeName(fields: IssueFields): string | undefined {
  const assignee = fields.assignee;
  if (!assignee || typeof assignee !== "object") return undefined;
  const name = (assignee as { displayName?: string }).displayName?.trim();
  return name || undefined;
}

function addStatusCount(
  progress: JiraEpicTaskProgress,
  category: JiraStatusCategoryKey,
) {
  progress.total += 1;
  switch (category) {
    case "done":
      progress.done += 1;
      break;
    case "indeterminate":
      progress.inProgress += 1;
      break;
    default:
      progress.todo += 1;
      break;
  }
}

function parentEpicKey(fields: IssueFields): string | undefined {
  const parent = fields.parent;
  if (parent && typeof parent === "object" && "key" in parent) {
    const key = (parent as { key?: string }).key;
    if (key) return key;
  }
  const epicLink = fields.customfield_10014;
  return typeof epicLink === "string" && epicLink ? epicLink : undefined;
}

/**
 * Convenience for Production Overview: all epics in a project with task progress.
 * Loads child issues in one project-wide search instead of one request per epic.
 */
export async function getProjectEpicProgress(
  instance: JiraInstance,
  projectKey: string,
): Promise<(JiraEpicSummary & { progress: JiraEpicTaskProgress })[]> {
  const config = getInstanceConfig(instance);
  if (!config) {
    throw new Error(`Jira instance "${instance}" is not configured.`);
  }

  const client = createClient(config);
  const safeKey = projectKey.replace(/"/g, '\\"');
  const [epicIssues, childIssues] = await Promise.all([
    searchIssues(
      client,
      `project = "${safeKey}" AND issuetype = Epic ORDER BY created ASC`,
      ["summary", "status", "duedate", "customfield_10015"],
    ),
    searchIssues(
      client,
      `project = "${safeKey}" AND issuetype != Epic ORDER BY created ASC`,
      ["summary", "status", "assignee", "updated", "parent", "customfield_10014"],
      200,
    ),
  ]);

  const epics: (JiraEpicSummary & { progress: JiraEpicTaskProgress })[] =
    epicIssues.map((issue) => {
      const fields = issue.fields ?? {};
      const { startDate, endDate } = pickEpicDates(fields);
      const key = issue.key ?? "";
      return {
        key,
        name: fields.summary ?? key,
        startDate,
        endDate,
        status: fields.status?.name,
        statusCategory: statusCategoryKey(fields),
        progress: emptyProgress(key),
      };
    });

  const byKey = new Map(epics.map((epic) => [epic.key, epic]));
  for (const issue of childIssues) {
    const fields = issue.fields ?? {};
    const epicKey = parentEpicKey(fields);
    if (!epicKey) continue;
    const epic = byKey.get(epicKey);
    if (!epic) continue;
    const category = statusCategoryKey(fields);
    addStatusCount(epic.progress, category);
    epic.progress.tasks.push({
      key: issue.key ?? "",
      name: fields.summary ?? issue.key ?? "Untitled",
      status: fields.status?.name,
      statusCategory: category,
      assignee: assigneeName(fields),
      updated:
        typeof fields.updated === "string" ? fields.updated : undefined,
    });
  }

  return epics;
}
