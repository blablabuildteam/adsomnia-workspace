import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { systemAlerts } from "@/db/schema";
import { notifyLeadershipAlert } from "./slack-notify";
import type { JiraHealthIssue } from "./jira-health";
import type { JiraInstance } from "./jira";
import {
  getJiraTokenReminder,
  type JiraTokenReminder,
} from "./jira-token-reminder";

const ATLASSIAN_TOKENS_URL =
  "https://id.atlassian.com/manage-profile/security/api-tokens";
const REMINDER_KEY = "jira-token-reminder";

type Site = { id: JiraInstance; label: string; host: string };

/**
 * Only production sends Slack alerts. Local dev shares the database and often
 * runs with stale tokens; letting it write alert state would also stop
 * production from alerting about the same problem.
 */
function alertsEnabled(): boolean {
  if (process.env.JIRA_ALERTS_ENABLED === "false") return false;
  return (
    process.env.VERCEL_ENV === "production" ||
    process.env.JIRA_ALERTS_ENABLED === "true"
  );
}

/**
 * Moves an alert to a new state and reports whether this call made the move.
 * Two checks racing on the same change: only one wins, so only one DM goes out.
 */
async function transition(
  key: string,
  next: string,
): Promise<{ changed: boolean; previous: string | null }> {
  const [row] = await db
    .select({ state: systemAlerts.state })
    .from(systemAlerts)
    .where(eq(systemAlerts.key, key))
    .limit(1);

  if (!row) {
    const inserted = await db
      .insert(systemAlerts)
      .values({ key, state: next })
      .onConflictDoNothing()
      .returning({ key: systemAlerts.key });
    return { changed: inserted.length > 0, previous: null };
  }

  if (row.state === next) return { changed: false, previous: row.state };

  const updated = await db
    .update(systemAlerts)
    .set({ state: next, updatedAt: new Date() })
    .where(and(eq(systemAlerts.key, key), eq(systemAlerts.state, row.state)))
    .returning({ key: systemAlerts.key });
  return { changed: updated.length > 0, previous: row.state };
}

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function problemLine(issue: JiraHealthIssue): string {
  return issue.kind === "auth"
    ? `• *${issue.label}* (${issue.host}): API token rejected`
    : `• *${issue.label}* (${issue.host}): not configured`;
}

async function alertSiteChanges(
  sites: Site[],
  issues: JiraHealthIssue[],
): Promise<void> {
  const issueBySite = new Map(issues.map((issue) => [issue.instance, issue]));
  const broken: JiraHealthIssue[] = [];
  const restored: Site[] = [];

  for (const site of sites) {
    const issue = issueBySite.get(site.id);
    // "Not reachable" is usually a short Jira or network blip; keep the last
    // known state so a hiccup does not send a pair of DMs.
    if (issue?.kind === "unreachable") continue;

    const next = issue ? issue.kind : "ok";
    const { changed, previous } = await transition(`jira-site:${site.id}`, next);
    if (!changed) continue;

    if (issue) broken.push(issue);
    else if (previous && previous !== "ok") restored.push(site);
  }

  if (broken.length > 0) {
    const names = joinLabels(broken.map((issue) => issue.label));
    const needsToken = broken.some((issue) => issue.kind === "auth");
    await notifyLeadershipAlert({
      header: `Jira connection problem: ${names}`,
      body: [
        "Adsomnia Workspace can no longer read Jira for:",
        broken.map(problemLine).join("\n"),
        "Projects stay listed, but live Jira status, progress and tasks are missing from Production and Fast Track until this is fixed.",
        needsToken
          ? "The token owner creates a new API token (valid for one year) and sends it with its expiry date to *blablabuild*, who updates it in Vercel."
          : "Contact *blablabuild* to set up the connection.",
      ].join("\n\n"),
      fallback: `Jira connection problem: ${names}. Live Jira data is missing in Adsomnia Workspace until a valid API token is set.`,
      link: needsToken
        ? { url: ATLASSIAN_TOKENS_URL, label: "Manage Atlassian API tokens" }
        : undefined,
    });
  }

  if (restored.length > 0) {
    const names = joinLabels(restored.map((site) => site.label));
    await notifyLeadershipAlert({
      header: `Jira connected again: ${names}`,
      body: `Adsomnia Workspace can read Jira for *${names}* again. Production and Fast Track show live Jira data.`,
      fallback: `Jira connected again: ${names}.`,
    });
  }
}

function reminderState(reminder: JiraTokenReminder | null): string {
  if (!reminder) return "none";
  return `${reminder.expired ? "expired" : "soon"}:${reminder.expiresOn}`;
}

function formatExpiry(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  });
}

async function alertReminderChange(): Promise<void> {
  const reminder = getJiraTokenReminder();
  const { changed } = await transition(REMINDER_KEY, reminderState(reminder));
  if (!changed || !reminder) return;

  const date = formatExpiry(reminder.expiresOn);
  const header = reminder.expired
    ? "Jira API token has expired"
    : `Jira API token expires in ${reminder.daysRemaining} days`;
  await notifyLeadershipAlert({
    header,
    body: reminder.expired
      ? `The Jira API token used by Adsomnia Workspace expired on *${date}*. Jira data is missing until a new token is in place. Ask *blablabuild* to update it in Vercel.`
      : `The Jira API token used by Adsomnia Workspace expires on *${date}*. The token owner creates a new one (valid for one year) and sends it with its expiry date to *blablabuild* before then.`,
    fallback: `${header} (${date}).`,
    link: { url: ATLASSIAN_TOKENS_URL, label: "Manage Atlassian API tokens" },
  });
}

/**
 * DM Coen, Sietse and Oleg when a Jira site breaks or recovers, or when the
 * token enters its 30-day expiry window. Each change is sent once.
 * Never throws: alerting must not break the workspace.
 */
export async function syncJiraAlerts(
  sites: Site[],
  issues: JiraHealthIssue[],
): Promise<void> {
  if (!alertsEnabled()) return;
  try {
    await alertSiteChanges(sites, issues);
    await alertReminderChange();
  } catch (error) {
    console.error("Jira Slack alerts failed:", error);
  }
}
