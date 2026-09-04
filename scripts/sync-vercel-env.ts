import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const SYNC_KEYS = [
  "SESSION_SECRET",
  "SEED_USER_PASSWORD",
  "LOGIN_SIETSE_EMAIL",
  "LOGIN_SIETSE_PASSWORD",
  "LOGIN_OLEG_EMAIL",
  "LOGIN_OLEG_PASSWORD",
  "LOGIN_JASPER_EMAIL",
  "LOGIN_JASPER_PASSWORD",
  "LOGIN_COEN_EMAIL",
  "LOGIN_COEN_PASSWORD",
  "LOGIN_XENNITH_EMAIL",
  "LOGIN_XENNITH_PASSWORD",
  "LOGIN_KEVIN_EMAIL",
  "LOGIN_KEVIN_PASSWORD",
  "NEXT_PUBLIC_APP_URL",
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "SLACK_SIGNING_SECRET",
  "GOOGLE_LOGIN_CLIENT_ID",
  "GOOGLE_LOGIN_CLIENT_SECRET",
  "GOOGLE_ALLOWED_DOMAINS",
  "JIRA_ADSOMNIA_HOST",
  "JIRA_ADSOMNIA_EMAIL",
  "JIRA_ADSOMNIA_API_TOKEN",
  "JIRA_BTR_HOST",
  "JIRA_BTR_EMAIL",
  "JIRA_BTR_API_TOKEN",
  "JIRA_HN_HOST",
  "JIRA_HN_EMAIL",
  "JIRA_HN_API_TOKEN",
] as const;

const SENSITIVE_KEYS = new Set([
  "SESSION_SECRET",
  "SEED_USER_PASSWORD",
  "LOGIN_SIETSE_PASSWORD",
  "LOGIN_OLEG_PASSWORD",
  "LOGIN_JASPER_PASSWORD",
  "LOGIN_COEN_PASSWORD",
  "LOGIN_XENNITH_PASSWORD",
  "LOGIN_KEVIN_PASSWORD",
  "SLACK_CLIENT_SECRET",
  "SLACK_SIGNING_SECRET",
  "GOOGLE_LOGIN_CLIENT_SECRET",
  "JIRA_ADSOMNIA_API_TOKEN",
  "JIRA_BTR_API_TOKEN",
  "JIRA_HN_API_TOKEN",
]);

const TARGETS = ["production", "preview", "development"] as const;

function loadEnvLocal(): Map<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  const vars = new Map<string, string>();

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    vars.set(key, value);
  }

  return vars;
}

function getAuthToken(): string {
  const authPath = path.join(
    os.homedir(),
    "Library/Application Support/com.vercel.cli/auth.json",
  );
  const auth = JSON.parse(fs.readFileSync(authPath, "utf8")) as {
    token: string;
  };
  return auth.token;
}

function getProjectConfig(): { projectId: string; teamId: string } {
  const configPath = path.join(process.cwd(), ".vercel/project.json");
  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
    projectId: string;
    orgId: string;
  };
  return { projectId: config.projectId, teamId: config.orgId };
}

type EnvRecord = {
  id: string;
  key: string;
  target?: string[];
  gitBranch?: string | null;
};

async function listEnvVars(
  token: string,
  projectId: string,
  teamId: string,
): Promise<EnvRecord[]> {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) {
    throw new Error(`Failed to list env vars: ${res.status}`);
  }
  const data = (await res.json()) as { envs: EnvRecord[] };
  return data.envs;
}

async function createEnvVar(
  token: string,
  projectId: string,
  teamId: string,
  key: string,
  value: string,
  target: (typeof TARGETS)[number],
): Promise<void> {
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key,
        value,
        type: SENSITIVE_KEYS.has(key) && target !== "development"
          ? "sensitive"
          : "encrypted",
        target: [target],
      }),
    },
  );

  if (!res.ok) {
    const data = await res.json();
    throw new Error(
      `Failed to create ${key} (${target}): ${data.error?.message ?? res.status}`,
    );
  }
}

async function updateEnvVar(
  token: string,
  projectId: string,
  teamId: string,
  id: string,
  key: string,
  value: string,
  target: (typeof TARGETS)[number],
): Promise<void> {
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${projectId}/env/${id}?teamId=${teamId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        value,
        type: SENSITIVE_KEYS.has(key) && target !== "development"
          ? "sensitive"
          : "encrypted",
        target: [target],
      }),
    },
  );

  if (!res.ok) {
    const data = await res.json();
    throw new Error(
      `Failed to update ${key} (${target}): ${data.error?.message ?? res.status}`,
    );
  }
}

async function main() {
  const local = loadEnvLocal();
  const token = getAuthToken();
  const { projectId, teamId } = getProjectConfig();
  const existing = await listEnvVars(token, projectId, teamId);

  const productionAppUrl =
    local.get("VERCEL_PRODUCTION_APP_URL") ||
    "https://adsomnia-workspace.vercel.app";

  for (const key of SYNC_KEYS) {
    const localValue = local.get(key);
    if (!localValue) {
      console.warn(`Skipping ${key} — not found in .env.local`);
      continue;
    }

    for (const target of TARGETS) {
      const value =
        key === "NEXT_PUBLIC_APP_URL" && target !== "development"
          ? productionAppUrl
          : localValue;

      if (
        key === "NEXT_PUBLIC_APP_URL" &&
        target !== "development" &&
        localValue.includes("localhost")
      ) {
        console.log(
          `Using ${productionAppUrl} for ${key} (${target}) instead of localhost`,
        );
      }

      const match = existing.find(
        (env) =>
          env.key === key &&
          env.target?.includes(target) &&
          !env.gitBranch,
      );

      if (match) {
        await updateEnvVar(token, projectId, teamId, match.id, key, value, target);
        console.log(`Updated ${key} (${target})`);
      } else {
        await createEnvVar(token, projectId, teamId, key, value, target);
        console.log(`Created ${key} (${target})`);
      }
    }
  }

  console.log("\nDone — credential env vars synced to Vercel.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
