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

function getInstanceConfig(instance: JiraInstance): JiraConfig | null {
  const prefix = `JIRA_${instance.toUpperCase()}`;
  const host = process.env[`${prefix}_HOST`];
  const email = process.env[`${prefix}_EMAIL`];
  const apiToken = process.env[`${prefix}_API_TOKEN`];

  if (!host || !email || !apiToken) return null;
  return { host, email, apiToken };
}

function createClient(config: JiraConfig) {
  const host = config.host.startsWith("https://")
    ? config.host
    : `https://${config.host}`;
  return createCloudClient({
    host,
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
  const host = config.host.startsWith("https://")
    ? config.host
    : `https://${config.host}`;
  return `${host}/jira/software/projects/${projectKey}/board`;
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
