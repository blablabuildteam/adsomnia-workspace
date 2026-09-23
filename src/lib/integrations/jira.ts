import { createCloudClient, isApiError } from "jira.js";
import {
  JIRA_EPIC_COLORS,
  JIRA_ISSUE_SUMMARY_MAX,
  JIRA_PROJECT_KEY_MAX,
  clampJiraProjectName,
  jiraSoftwareProjectListUrl,
  toIsoDate,
  validateJiraProjectName,
  type JiraEpicSeed,
} from "./jira-plan";

export const JIRA_INSTANCES = ["adsomnia", "btr", "hn", "bbb"] as const;
export type JiraInstance = (typeof JIRA_INSTANCES)[number];

type JiraConfig = {
  host: string;
  email: string;
  apiToken: string;
};

const INSTANCE_LABELS: Record<JiraInstance, string> = {
  adsomnia: "Adsomnia",
  btr: "Bending The Rules",
  hn: "Harlem Next",
  bbb: "blablabuild",
};

export function isJiraInstance(
  value: string | null | undefined,
): value is JiraInstance {
  return (
    value === "adsomnia" ||
    value === "btr" ||
    value === "hn" ||
    value === "bbb"
  );
}

/** Map initiative lead party → Jira Cloud instance. */
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
    case "bbb":
      return "bbb";
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
  reason: "lead" | "fallback" | "selected";
};

export type JiraEnvironmentOption = {
  id: JiraInstance;
  label: string;
  host: string | null;
  configured: boolean;
};

/** Resolve a user-selected Jira Cloud instance for Project Setup create. */
export function resolveJiraInstance(
  instance: string | null | undefined,
): JiraSetupTarget | null {
  if (!isJiraInstance(instance)) return null;
  const config = getInstanceConfig(instance);
  if (!config) return null;
  return {
    instance,
    label: INSTANCE_LABELS[instance],
    host: config.host,
    reason: "selected",
  };
}

/**
 * Suggested default for the Project Setup picker (lead party when that
 * site is connected). Creation always uses the explicit selected instance.
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

function hostName(host: string): string {
  return host.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
}

export type ParsedJiraSpaceUrl = {
  host: string;
  projectKey: string;
};

/** Extract a Jira Cloud space key from a project, board, or browse URL. */
export function parseJiraSpaceUrl(raw: string): ParsedJiraSpaceUrl | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.host.toLowerCase();
  const path = url.pathname;

  const fromPath = path.match(
    /\/(?:jira\/(?:software\/(?:c\/)?|core\/))?projects\/([A-Za-z][A-Za-z0-9]+)/i,
  );
  if (fromPath?.[1]) {
    return { host, projectKey: fromPath[1].toUpperCase() };
  }

  const fromBrowse = path.match(
    /\/browse\/([A-Za-z][A-Za-z0-9]+)(?:-\d+)?/i,
  );
  if (fromBrowse?.[1]) {
    return { host, projectKey: fromBrowse[1].toUpperCase() };
  }

  const selected =
    url.searchParams.get("selectedIssue") ||
    url.searchParams.get("projectKey");
  if (selected) {
    const key = selected.match(/^([A-Za-z][A-Za-z0-9]+)/);
    if (key?.[1]) return { host, projectKey: key[1].toUpperCase() };
  }

  return null;
}

export type ResolvedJiraSpace =
  | {
      ok: true;
      instance: JiraInstance;
      projectKey: string;
      boardUrl: string;
    }
  | { ok: false; error: string };

function instanceFromHost(host: string): JiraInstance | null {
  const needle = hostName(host);
  for (const site of getAvailableInstances()) {
    if (hostName(site.host) === needle) return site.id;
  }
  return null;
}

/**
 * Resolve a pasted Jira URL to a connected Cloud site + project key.
 * Lead production party is not used — the host in the URL picks the board.
 */
export function resolveJiraSpaceFromUrl(rawUrl: string): ResolvedJiraSpace {
  const parsed = parseJiraSpaceUrl(rawUrl);
  if (!parsed) {
    return {
      ok: false,
      error:
        "Paste a Jira space URL, for example https://….atlassian.net/jira/software/projects/KEY.",
    };
  }

  const instance = instanceFromHost(parsed.host);
  if (!instance) {
    const connected = getAvailableInstances();
    if (connected.length === 0) {
      return { ok: false, error: "No Jira site is connected." };
    }
    const hosts = connected.map((site) => hostName(site.host)).join(", ");
    return {
      ok: false,
      error: `This URL is not on a connected Jira site (${hosts}).`,
    };
  }

  return {
    ok: true,
    instance,
    projectKey: parsed.projectKey,
    boardUrl: rawUrl,
  };
}

export async function getJiraProject(
  instance: JiraInstance,
  projectKey: string,
): Promise<{ id: string; key: string; name: string }> {
  const { client } = requireClient(instance);
  const project = await client.projects.getProject({
    projectIdOrKey: projectKey,
  });
  return {
    id: String(project.id ?? ""),
    key: (project.key ?? projectKey).toUpperCase(),
    name: project.name ?? projectKey,
  };
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

export function listJiraEnvironments(): JiraEnvironmentOption[] {
  return JIRA_INSTANCES.map((id) => {
    const config = getInstanceConfig(id);
    return {
      id,
      label: INSTANCE_LABELS[id],
      host: config?.host ?? null,
      configured: Boolean(config),
    };
  });
}

export function getAvailableInstances(): {
  id: JiraInstance;
  label: string;
  host: string;
}[] {
  return listJiraEnvironments().flatMap((site) =>
    site.configured && site.host
      ? [{ id: site.id, label: site.label, host: site.host }]
      : [],
  );
}

export type { JiraEpicSeed } from "./jira-plan";
export {
  JIRA_ISSUE_SUMMARY_MAX,
  JIRA_PROJECT_KEY_MAX,
  JIRA_PROJECT_NAME_MAX,
  JIRA_PROJECT_NAME_MIN,
  clampJiraProjectName,
  milestonesToEpicSeeds,
  sanitizeEpicSeeds,
  suggestedJiraName,
  ticketIdToProjectKeyHint,
  validateJiraProjectName,
} from "./jira-plan";

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

type ClassicCreateResult = {
  id?: number | string;
  key?: string;
  self?: string;
  errorMessages?: string[];
  errors?: Record<string, string>;
  message?: string;
};

function instanceEnv(instance: JiraInstance, suffix: string): string | undefined {
  const value = process.env[`JIRA_${instance.toUpperCase()}_${suffix}`];
  return value?.trim() || undefined;
}

/**
 * Company-managed spaces can share a workflow scheme. blablabuild uses the
 * Production scheme by default; other sites opt in with
 * JIRA_<INSTANCE>_WORKFLOW_SCHEME (id or name) or
 * JIRA_<INSTANCE>_TEMPLATE_PROJECT_KEY.
 */
function workflowSchemeRef(instance: JiraInstance): string | undefined {
  return instanceEnv(instance, "WORKFLOW_SCHEME")
    ?? (instance === "bbb" ? "Production" : undefined);
}

async function jiraJson<T>(
  config: JiraConfig,
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: T }> {
  const response = await fetch(`${normalizeHost(config.host)}${path}`, {
    ...init,
    headers: {
      Authorization: jiraAuthHeader(config),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => ({}))) as T;
  return { ok: response.ok, status: response.status, body };
}

function adminPermissionHint(status: number, message: string): string {
  if (status === 401 || status === 403) {
    return `${message} The Jira token user needs Administer Jira on this site.`;
  }
  return message;
}

async function workflowSchemeIdFromProject(
  config: JiraConfig,
  projectKey: string,
): Promise<string | null> {
  const project = await jiraJson<{ id?: string | number }>(
    config,
    `/rest/api/3/project/${encodeURIComponent(projectKey)}`,
  );
  if (!project.ok || project.body.id == null) return null;

  const associated = await jiraJson<{
    values?: { workflowScheme?: { id?: number | string } }[];
  }>(
    config,
    `/rest/api/3/workflowscheme/project?projectId=${encodeURIComponent(String(project.body.id))}`,
  );
  const schemeId = associated.body.values?.[0]?.workflowScheme?.id;
  return schemeId != null ? String(schemeId) : null;
}

async function workflowSchemeIdByName(
  config: JiraConfig,
  name: string,
): Promise<string | null> {
  const needle = name.trim().toLowerCase();
  let startAt = 0;
  for (let page = 0; page < 10; page += 1) {
    const result = await jiraJson<{
      isLast?: boolean;
      maxResults?: number;
      values?: { id?: number | string; name?: string }[];
    }>(
      config,
      `/rest/api/3/workflowscheme?startAt=${startAt}&maxResults=50`,
    );
    if (!result.ok) {
      throw new Error(
        adminPermissionHint(
          result.status,
          "Could not list workflow schemes.",
        ),
      );
    }
    const match = result.body.values?.find(
      (scheme) => (scheme.name ?? "").trim().toLowerCase() === needle,
    );
    if (match?.id != null) return String(match.id);
    if (result.body.isLast !== false) break;
    startAt += result.body.maxResults ?? 50;
  }
  return null;
}

async function resolveWorkflowSchemeId(
  instance: JiraInstance,
  config: JiraConfig,
): Promise<string | null> {
  const templateKey = instanceEnv(instance, "TEMPLATE_PROJECT_KEY");
  if (templateKey) {
    const fromTemplate = await workflowSchemeIdFromProject(config, templateKey);
    if (fromTemplate) return fromTemplate;
  }

  const ref = workflowSchemeRef(instance);
  if (!ref) return null;
  if (/^\d+$/.test(ref)) return ref;

  const fromName = await workflowSchemeIdByName(config, ref);
  if (fromName) return fromName;

  if (instance === "bbb") {
    throw new Error(
      `Could not find the "${ref}" workflow scheme on blablabuild Jira. Confirm it exists, or set JIRA_BBB_WORKFLOW_SCHEME / JIRA_BBB_TEMPLATE_PROJECT_KEY.`,
    );
  }
  return null;
}

async function createClassicProject(
  config: JiraConfig,
  opts: {
    key: string;
    name: string;
    description?: string;
    templateKey: string;
    leadAccountId: string;
  },
): Promise<{ id: string; key: string; self: string }> {
  const result = await jiraJson<ClassicCreateResult>(
    config,
    "/rest/api/3/project",
    {
      method: "POST",
      body: JSON.stringify({
        key: opts.key,
        name: opts.name,
        description: opts.description,
        projectTypeKey: "software",
        projectTemplateKey: opts.templateKey,
        leadAccountId: opts.leadAccountId,
        assigneeType: "PROJECT_LEAD",
      }),
    },
  );
  if (!result.ok) {
    throw new Error(
      adminPermissionHint(result.status, simplifiedCreateError(result.body)),
    );
  }

  const key = result.body.key ?? opts.key;
  return {
    id: String(result.body.id ?? ""),
    key,
    self: result.body.self ?? "",
  };
}

async function assignWorkflowScheme(
  config: JiraConfig,
  projectId: string,
  workflowSchemeId: string,
): Promise<void> {
  const result = await jiraJson<SimplifiedCreateResult>(
    config,
    "/rest/api/3/workflowscheme/project",
    {
      method: "PUT",
      body: JSON.stringify({
        projectId,
        workflowSchemeId,
      }),
    },
  );
  if (!result.ok) {
    throw new Error(
      adminPermissionHint(
        result.status,
        simplifiedCreateError(result.body) ||
          "Jira could not attach the Production workflow scheme.",
      ),
    );
  }
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

  const requestedKey = opts.key
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, JIRA_PROJECT_KEY_MAX);
  let key = requestedKey;
  try {
    const suggested = await client.projectKeyAndNameValidation.getValidProjectKey({
      key: requestedKey,
    });
    key = asProjectKey(suggested, requestedKey);
  } catch {
    key = requestedKey;
  }

  const name = clampJiraProjectName(opts.name);
  const nameError = validateJiraProjectName(name);
  if (nameError) {
    throw new Error(nameError);
  }

  const workflowSchemeId = await resolveWorkflowSchemeId(instance, config);
  if (workflowSchemeId) {
    const me = await client.myself.getCurrentUser();
    const leadAccountId = opts.leadAccountId ?? me.accountId;
    if (!leadAccountId) {
      throw new Error(
        "Jira could not determine a project lead for this company-managed space.",
      );
    }
    const created = await createClassicProject(config, {
      key,
      name,
      description: opts.description,
      leadAccountId,
      templateKey:
        opts.template === "scrum"
          ? "com.pyxis.greenhopper.jira:gh-simplified-scrum-classic"
          : "com.pyxis.greenhopper.jira:gh-simplified-kanban-classic",
    });
    if (!created.id) {
      throw new Error(
        "Jira created the space but did not return an id, so the Production workflow could not be attached.",
      );
    }
    await assignWorkflowScheme(config, created.id, workflowSchemeId);
    return created;
  }

  const templateKey =
    opts.template === "scrum"
      ? "com.pyxis.greenhopper.jira:gh-simplified-agility-scrum"
      : "com.pyxis.greenhopper.jira:gh-simplified-agility-kanban";
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
      summary: name.slice(0, JIRA_ISSUE_SUMMARY_MAX),
      issuetype: { id: epicType.id },
    };
    if (seed.description?.trim()) {
      fieldsPayload.description = adfParagraph(seed.description.trim());
    }
    if (epicNameFieldId) {
      fieldsPayload[epicNameFieldId] = name.slice(0, JIRA_ISSUE_SUMMARY_MAX);
    }
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
  return jiraSoftwareProjectListUrl(normalizeHost(config.host), projectKey);
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

/**
 * Harlem Next (and similar) board statuses → Workspace buckets.
 * Open / in progress / done in the UI correspond to Jira categories
 * `new` / `indeterminate` / `done`.
 */
const STATUS_NAME_TO_CATEGORY: Record<string, JiraStatusCategoryKey> = {
  // Open
  backlog: "new",
  "on hold": "new",
  "on-hold": "new",
  "ready for refinement": "new",
  "selected for development": "new",
  "to do": "new",
  todo: "new",
  open: "new",
  // In progress
  "in progress": "indeterminate",
  "pending release": "indeterminate",
  "quality assurance": "indeterminate",
  qa: "indeterminate",
  review: "indeterminate",
  // Done
  done: "done",
  cancelled: "done",
  canceled: "done",
};

function normalizeStatusName(name: string | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function statusCategoryKey(fields: IssueFields): JiraStatusCategoryKey {
  const fromName =
    STATUS_NAME_TO_CATEGORY[normalizeStatusName(fields.status?.name)];
  if (fromName) return fromName;
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
  maxPages = 5,
): Promise<{ key?: string; fields?: IssueFields }[]> {
  const collected: { key?: string; fields?: IssueFields }[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
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
  options?: { includeTasks?: boolean },
): Promise<(JiraEpicSummary & { progress: JiraEpicTaskProgress })[]> {
  const byProject = await getProjectsEpicProgress(instance, [projectKey], {
    includeTasks: options?.includeTasks ?? true,
  });
  return byProject.get(projectKey.toUpperCase()) ?? [];
}

function projectKeyFromIssueKey(issueKey: string): string {
  const dash = issueKey.lastIndexOf("-");
  return (dash > 0 ? issueKey.slice(0, dash) : issueKey).toUpperCase();
}

function jqlProjectInList(projectKeys: string[]): string {
  return projectKeys
    .map((key) => `"${key.replace(/"/g, '\\"')}"`)
    .join(", ");
}

function mapEpicIssue(
  issue: { key?: string; fields?: IssueFields },
): JiraEpicSummary & { progress: JiraEpicTaskProgress } {
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
}

const PROJECT_PROGRESS_CHUNK = 12;

const CHILD_COUNT_FIELDS = ["status", "parent", "customfield_10014"];
const CHILD_TASK_FIELDS = [
  "summary",
  "status",
  "assignee",
  "updated",
  "parent",
  "customfield_10014",
];

function toEpicTask(
  issue: { key?: string; fields?: IssueFields },
  category: JiraStatusCategoryKey,
): JiraEpicTask {
  const fields = issue.fields ?? {};
  return {
    key: issue.key ?? "",
    name: fields.summary ?? issue.key ?? "Untitled",
    status: fields.status?.name,
    statusCategory: category,
    assignee: assigneeName(fields),
    updated: typeof fields.updated === "string" ? fields.updated : undefined,
  };
}

/**
 * One epic search + one child-issue search per Jira site, covering many
 * software projects. Production Overview uses this so adding boards does not
 * multiply Jira round-trips.
 */
export async function getProjectsEpicProgress(
  instance: JiraInstance,
  projectKeys: string[],
  options?: { includeTasks?: boolean },
): Promise<
  Map<string, (JiraEpicSummary & { progress: JiraEpicTaskProgress })[]>
> {
  const includeTasks = Boolean(options?.includeTasks);
  const unique = [
    ...new Set(
      projectKeys
        .map((key) => key.trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const out = new Map<
    string,
    (JiraEpicSummary & { progress: JiraEpicTaskProgress })[]
  >();
  for (const key of unique) out.set(key, []);
  if (unique.length === 0) return out;

  const config = getInstanceConfig(instance);
  if (!config) {
    throw new Error(`Jira instance "${instance}" is not configured.`);
  }
  const client = createClient(config);

  for (let i = 0; i < unique.length; i += PROJECT_PROGRESS_CHUNK) {
    const chunk = unique.slice(i, i + PROJECT_PROGRESS_CHUNK);
    const inList = jqlProjectInList(chunk);
    const [epicIssues, childIssues] = await Promise.all([
      searchIssues(
        client,
        `project in (${inList}) AND issuetype = Epic ORDER BY created ASC`,
        ["summary", "status", "duedate", "customfield_10015"],
      ),
      searchIssues(
        client,
        `project in (${inList}) AND issuetype != Epic ORDER BY created ASC`,
        includeTasks ? CHILD_TASK_FIELDS : CHILD_COUNT_FIELDS,
        200,
        10,
      ),
    ]);

    const byKey = new Map<
      string,
      JiraEpicSummary & { progress: JiraEpicTaskProgress }
    >();
    for (const issue of epicIssues) {
      const epic = mapEpicIssue(issue);
      if (!epic.key) continue;
      byKey.set(epic.key, epic);
      const projectKey = projectKeyFromIssueKey(epic.key);
      const list = out.get(projectKey);
      if (list) list.push(epic);
    }

    for (const issue of childIssues) {
      const fields = issue.fields ?? {};
      const epicKey = parentEpicKey(fields);
      if (!epicKey) continue;
      const epic = byKey.get(epicKey);
      if (!epic) continue;
      const category = statusCategoryKey(fields);
      addStatusCount(epic.progress, category);
      if (includeTasks) {
        epic.progress.tasks.push(toEpicTask(issue, category));
      }
    }
  }

  return out;
}

/**
 * Ticket names for one Jira project, grouped by parent epic. Used when the
 * Production drawer or timeline hover needs the list after the board has
 * already loaded counts.
 */
export async function getProjectEpicTasks(
  instance: JiraInstance,
  projectKey: string,
): Promise<Map<string, JiraEpicTask[]>> {
  const config = getInstanceConfig(instance);
  if (!config) {
    throw new Error(`Jira instance "${instance}" is not configured.`);
  }

  const client = createClient(config);
  const safeKey = projectKey.replace(/"/g, '\\"');
  const childIssues = await searchIssues(
    client,
    `project = "${safeKey}" AND issuetype != Epic ORDER BY created ASC`,
    CHILD_TASK_FIELDS,
    200,
    10,
  );

  const byEpic = new Map<string, JiraEpicTask[]>();
  for (const issue of childIssues) {
    const fields = issue.fields ?? {};
    const epicKey = parentEpicKey(fields);
    if (!epicKey) continue;
    const category = statusCategoryKey(fields);
    const list = byEpic.get(epicKey) ?? [];
    list.push(toEpicTask(issue, category));
    byEpic.set(epicKey, list);
  }
  return byEpic;
}

/** Shared Adsomnia Kanban board for Fast-Track tasks. */
export const FAST_TRACK_JIRA_INSTANCE: JiraInstance = "adsomnia";
export const FAST_TRACK_JIRA_PROJECT_KEY = "KAN";

export function getFastTrackBoardUrl(): string | null {
  const config = getInstanceConfig(FAST_TRACK_JIRA_INSTANCE);
  if (!config) return null;
  return `${normalizeHost(config.host)}/jira/software/projects/${FAST_TRACK_JIRA_PROJECT_KEY}/list`;
}

export function getFastTrackIssueUrl(key: string): string | null {
  const config = getInstanceConfig(FAST_TRACK_JIRA_INSTANCE);
  if (!config) return null;
  return `${normalizeHost(config.host)}/browse/${key}`;
}

function adfFromParagraphs(paragraphs: string[]) {
  const content = paragraphs
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text }],
    }));
  if (content.length === 0) return undefined;
  return { type: "doc" as const, version: 1 as const, content };
}

function flattenAdf(node: unknown): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node !== "object") return "";
  const value = node as { type?: string; text?: string; content?: unknown[] };
  if (typeof value.text === "string") return value.text;
  const parts = (value.content ?? []).map(flattenAdf);
  const join =
    value.type === "paragraph" ||
    value.type === "heading" ||
    value.type === "listItem"
      ? "\n"
      : "";
  return parts.join(join).replace(/\n{3,}/g, "\n\n").trim();
}

export type FastTrackJiraIssue = {
  key: string;
  title: string;
  status: string;
  statusCategory: JiraStatusCategoryKey;
  priority: string;
  assignee: string | null;
  reporter: string | null;
  description: string;
  created: string | null;
  updated: string | null;
  url: string;
  issueType: string;
  isEpic: boolean;
  /** Direct parent issue key (Epic for a task, Epic Link fallback). */
  parentKey: string | null;
};

function mapFastTrackIssue(
  issue: { key?: string; fields?: IssueFields },
  host: string,
): FastTrackJiraIssue {
  const fields = issue.fields ?? {};
  const key = issue.key ?? "";
  const priority = fields.priority;
  const priorityName =
    priority && typeof priority === "object" && "name" in priority
      ? String((priority as { name?: string }).name ?? "None")
      : "None";
  const reporter = fields.reporter;
  const reporterName =
    reporter && typeof reporter === "object" && "displayName" in reporter
      ? String((reporter as { displayName?: string }).displayName ?? "").trim()
      : "";

  return {
    key,
    title: fields.summary ?? key,
    status: fields.status?.name ?? "Unknown",
    statusCategory: statusCategoryKey(fields),
    priority: priorityName || "None",
    assignee: assigneeName(fields) ?? null,
    reporter: reporterName || null,
    description: flattenAdf(fields.description),
    created: typeof fields.created === "string" ? fields.created : null,
    updated: typeof fields.updated === "string" ? fields.updated : null,
    url: `${normalizeHost(host)}/browse/${key}`,
    issueType: issueTypeName(fields),
    isEpic: isEpicIssueType(fields),
    parentKey: parentEpicKey(fields) ?? null,
  };
}

export async function listFastTrackIssues(): Promise<FastTrackJiraIssue[]> {
  const { client, config } = requireClient(FAST_TRACK_JIRA_INSTANCE);
  const fields = [
    "summary",
    "status",
    "priority",
    "assignee",
    "reporter",
    "description",
    "issuetype",
    "parent",
    "customfield_10014",
    "created",
    "updated",
  ];
  let issues: { key?: string; fields?: IssueFields }[];
  try {
    issues = await searchIssues(
      client,
      `project = "${FAST_TRACK_JIRA_PROJECT_KEY}" ORDER BY created DESC`,
      fields,
      200,
    );
  } catch {
    issues = await searchIssues(
      client,
      `project = ${FAST_TRACK_JIRA_PROJECT_KEY}`,
      fields,
      200,
    );
  }
  return issues
    .filter((issue) => issue.key)
    .map((issue) => mapFastTrackIssue(issue, config.host));
}

type FastTrackCreateType = {
  id?: string;
  name?: string;
  hierarchyLevel?: number;
};

function issueTypeName(fields: IssueFields): string {
  const issueType = fields.issuetype;
  if (!issueType || typeof issueType !== "object") return "";
  const name = (issueType as { name?: string }).name?.trim();
  return name || "";
}

function isEpicIssueType(fields: IssueFields): boolean {
  const issueType = fields.issuetype;
  if (!issueType || typeof issueType !== "object") return false;
  const typed = issueType as { name?: string; hierarchyLevel?: number };
  if ((typed.name ?? "").toLowerCase() === "epic") return true;
  return typed.hierarchyLevel === 1;
}

function jiraFailureMessage(error: unknown, fallback: string): string {
  if (isApiError(error) && error.body && typeof error.body === "object") {
    const body = error.body as {
      errorMessages?: unknown;
      errors?: Record<string, unknown>;
      message?: unknown;
    };
    if (Array.isArray(body.errorMessages)) {
      const first = body.errorMessages.find(
        (item) => typeof item === "string" && item.trim(),
      );
      if (typeof first === "string") return first;
    }
    if (body.errors) {
      const first = Object.values(body.errors).find(
        (item) => typeof item === "string" && item.trim(),
      );
      if (typeof first === "string") return first;
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function jiraFieldErrors(error: unknown): Record<string, unknown> | null {
  if (!isApiError(error) || !error.body || typeof error.body !== "object") {
    return null;
  }
  const errors = (error.body as { errors?: Record<string, unknown> }).errors;
  return errors ?? null;
}

async function fastTrackIssueTypes(
  client: ReturnType<typeof createClient>,
): Promise<FastTrackCreateType[]> {
  const meta = await client.issues.getCreateIssueMetaIssueTypes({
    projectIdOrKey: FAST_TRACK_JIRA_PROJECT_KEY,
    maxResults: 50,
  });
  return [...(meta.issueTypes ?? []), ...(meta.createMetaIssueType ?? [])];
}

function pickEpicIssueType(
  types: FastTrackCreateType[],
): FastTrackCreateType | undefined {
  return (
    types.find((type) => (type.name ?? "").toLowerCase() === "epic") ??
    types.find((type) => type.hierarchyLevel === 1)
  );
}

function pickTaskIssueType(
  types: FastTrackCreateType[],
): FastTrackCreateType | undefined {
  const skip = new Set(["epic", "sub-task", "subtask"]);
  return (
    types.find((type) => (type.name ?? "").toLowerCase() === "task") ??
    types.find((type) => (type.name ?? "").toLowerCase() === "story") ??
    types.find(
      (type) =>
        !skip.has((type.name ?? "").toLowerCase()) &&
        (type.hierarchyLevel ?? 0) === 0,
    )
  );
}

async function fastTrackTypeFields(
  client: ReturnType<typeof createClient>,
  issueTypeId: string,
): Promise<EpicFieldMeta[]> {
  const fieldPage = await client.issues.getCreateIssueMetaIssueTypeId({
    projectIdOrKey: FAST_TRACK_JIRA_PROJECT_KEY,
    issueTypeId,
    maxResults: 100,
  });
  return [...(fieldPage.fields ?? []), ...(fieldPage.results ?? [])] as EpicFieldMeta[];
}

async function applyRequiredReporter(
  client: ReturnType<typeof createClient>,
  fields: EpicFieldMeta[],
  payload: Record<string, unknown>,
) {
  const reporterRequired = fields.some(
    (field) => field.fieldId === "reporter" && field.required,
  );
  if (!reporterRequired) return;
  const me = await client.myself.getCurrentUser();
  if (me.accountId) payload.reporter = { accountId: me.accountId };
}

export async function createFastTrackIssue(input: {
  title: string;
  description?: string | null;
  problemStatement?: string | null;
  opportunitySolution?: string | null;
  expectedImpact?: string | null;
  targetAudience?: string | null;
  ticketId?: string;
  remark?: string | null;
}): Promise<{ key: string; url: string }> {
  const { client, config } = requireClient(FAST_TRACK_JIRA_INSTANCE);
  const epicType = pickEpicIssueType(await fastTrackIssueTypes(client));
  if (!epicType?.id) {
    throw new Error("Could not find an Epic issue type on the Fast Track board.");
  }

  const typeFields = await fastTrackTypeFields(client, epicType.id);
  const epicNameFieldId = pickFieldId(
    typeFields,
    (field) =>
      (field.name ?? "").toLowerCase() === "epic name" ||
      (field.schema?.custom ?? "").includes("gh-epic-label"),
  );

  const description = adfFromParagraphs([
    input.description ?? "",
    input.ticketId ? `Workspace ticket: ${input.ticketId}` : "",
    input.problemStatement ? `Problem: ${input.problemStatement}` : "",
    input.opportunitySolution
      ? `Opportunity / solution: ${input.opportunitySolution}`
      : "",
    input.expectedImpact ? `Expected impact: ${input.expectedImpact}` : "",
    input.targetAudience ? `Target audience: ${input.targetAudience}` : "",
    input.remark ? `Leadership remark: ${input.remark}` : "",
  ]);

  const summary = input.title.trim().slice(0, JIRA_ISSUE_SUMMARY_MAX);
  const fieldsPayload: Record<string, unknown> = {
    project: { key: FAST_TRACK_JIRA_PROJECT_KEY },
    summary,
    issuetype: { id: epicType.id },
  };
  if (description) fieldsPayload.description = description;
  if (epicNameFieldId) fieldsPayload[epicNameFieldId] = summary;
  await applyRequiredReporter(client, typeFields, fieldsPayload);

  let issue: { key?: string };
  try {
    issue = await client.issues.createIssue({ fields: fieldsPayload });
  } catch (error) {
    throw new Error(
      jiraFailureMessage(error, "Could not create the Fast-Track epic in Jira."),
    );
  }
  const key = issue.key;
  if (!key) {
    throw new Error("Jira created the Fast-Track epic but did not return a key.");
  }
  return {
    key,
    url: `${normalizeHost(config.host)}/browse/${key}`,
  };
}

export async function createFastTrackChildIssue(input: {
  parentKey: string;
  title: string;
  description?: string | null;
}): Promise<{ key: string; url: string }> {
  const parentKey = input.parentKey.trim().toUpperCase();
  const prefix = `${FAST_TRACK_JIRA_PROJECT_KEY}-`;
  if (!parentKey.startsWith(prefix) || !/^\d+$/.test(parentKey.slice(prefix.length))) {
    throw new Error("That epic is not on the Fast Track board.");
  }

  const { client, config } = requireClient(FAST_TRACK_JIRA_INSTANCE);

  let parentIssue: { fields?: IssueFields };
  try {
    parentIssue = await client.issues.getIssue({
      issueIdOrKey: parentKey,
      fields: ["issuetype", "project"],
    });
  } catch (error) {
    if (isApiError(error) && error.status === 404) {
      throw new Error("That epic is not on the Fast Track board.");
    }
    throw new Error(
      jiraFailureMessage(error, "Could not load that Fast-Track epic from Jira."),
    );
  }

  const parentFields = (parentIssue.fields ?? {}) as IssueFields;
  const project = parentFields.project;
  const projectKey =
    project && typeof project === "object" && "key" in project
      ? String((project as { key?: string }).key ?? "")
      : "";
  if (projectKey.toUpperCase() !== FAST_TRACK_JIRA_PROJECT_KEY) {
    throw new Error("That epic is not on the Fast Track board.");
  }
  if (!isEpicIssueType(parentFields)) {
    throw new Error("Tasks can only be added under a Fast-Track epic.");
  }

  const taskType = pickTaskIssueType(await fastTrackIssueTypes(client));
  if (!taskType?.id) {
    throw new Error("Could not find a Task issue type on the Fast Track board.");
  }

  const typeFields = await fastTrackTypeFields(client, taskType.id);
  const description = adfFromParagraphs([input.description ?? ""]);
  const fieldsPayload: Record<string, unknown> = {
    project: { key: FAST_TRACK_JIRA_PROJECT_KEY },
    summary: input.title.trim().slice(0, JIRA_ISSUE_SUMMARY_MAX),
    issuetype: { id: taskType.id },
  };
  if (description) fieldsPayload.description = description;
  await applyRequiredReporter(client, typeFields, fieldsPayload);

  let issue: { key?: string };
  try {
    issue = await client.issues.createIssue({
      fields: { ...fieldsPayload, parent: { key: parentKey } },
    });
  } catch (error) {
    const fieldErrors = jiraFieldErrors(error);
    if (!fieldErrors || !("parent" in fieldErrors)) {
      throw new Error(
        jiraFailureMessage(error, "Could not create the task in Jira."),
      );
    }
    try {
      issue = await client.issues.createIssue({
        fields: { ...fieldsPayload, customfield_10014: parentKey },
      });
    } catch (epicLinkError) {
      throw new Error(
        jiraFailureMessage(epicLinkError, "Could not create the task in Jira."),
      );
    }
  }

  const key = issue.key;
  if (!key) {
    throw new Error("Jira created the task but did not return a key.");
  }
  return {
    key,
    url: `${normalizeHost(config.host)}/browse/${key}`,
  };
}
