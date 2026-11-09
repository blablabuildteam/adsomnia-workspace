import { unstable_cache } from "next/cache";
import {
  assertJiraAuthenticated,
  getAvailableInstances,
  isJiraConnectionError,
  type JiraConnectionErrorKind,
  type JiraInstance,
} from "./jira";
import { syncJiraAlerts } from "./jira-alerts";

/** How often the workspace re-asks Jira whether each token still works. */
const JIRA_HEALTH_REVALIDATE_SECONDS = 300;

export type JiraHealthIssue = {
  instance: JiraInstance;
  label: string;
  host: string;
  kind: JiraConnectionErrorKind;
};

async function checkJiraHealth(): Promise<JiraHealthIssue[]> {
  const instances = getAvailableInstances();
  const results = await Promise.all(
    instances.map(async (site): Promise<JiraHealthIssue | null> => {
      try {
        await assertJiraAuthenticated(site.id);
        return null;
      } catch (error) {
        console.warn(
          `Jira health check failed (${site.id}):`,
          error instanceof Error ? error.message : error,
        );
        return {
          instance: site.id,
          label: site.label,
          host: site.host,
          kind: isJiraConnectionError(error) ? error.kind : "unreachable",
        };
      }
    }),
  );
  const issues = results.filter(
    (issue): issue is JiraHealthIssue => issue !== null,
  );
  // Runs at most once per cache window, so Slack alerts piggyback on it.
  await syncJiraAlerts(instances, issues);
  return issues;
}

const cachedJiraHealth = unstable_cache(checkJiraHealth, ["jira-health"], {
  revalidate: JIRA_HEALTH_REVALIDATE_SECONDS,
  tags: ["jira-health"],
});

/**
 * Jira sites whose token is rejected or that cannot be reached right now.
 * Empty when every configured site answers, so the workspace notice clears
 * itself within a few minutes of a fix.
 */
export async function getJiraHealthIssues(): Promise<JiraHealthIssue[]> {
  try {
    return await cachedJiraHealth();
  } catch (error) {
    console.error("Jira health check crashed:", error);
    return [];
  }
}
