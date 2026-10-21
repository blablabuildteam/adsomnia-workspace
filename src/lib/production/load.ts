import { unstable_cache, updateTag } from "next/cache";
import {
  getAvailableInstances,
  getProjectEpicTasks,
  getProjectsEpicProgress,
  jiraSpacesStillExist,
  type JiraEpicSummary,
  type JiraEpicTaskProgress,
  type JiraInstance,
} from "@/lib/integrations/jira";
import {
  canViewInitiative,
  type PermissionUser,
} from "@/lib/permissions";
import { loadInitiativeAccess } from "@/lib/workstream-access";
import {
  getActivityForInitiative,
  getInitiativeById,
  getInitiativesByStage,
  type ActivityEntry,
  type InitiativeWithUsers,
} from "@/lib/queries";
import { summarizeTeamCost } from "@/data/role-rates";
import { toJiraSoftwareProjectListUrl } from "@/lib/integrations/jira-plan";
import {
  formatBusinessValueSummary,
  isManualProductionProject,
  type JiraSetupData,
} from "@/lib/validation-data";
import {
  buildProjectHealth,
  isTrackedLeadParty,
  normalizeLeadParty,
  scoreEpic,
  sortProductionProjects,
  todayIso,
  type ProductionLeadParty,
  type ProductionProject,
  type ProductionTask,
} from "./health";

const HOST_TO_INSTANCE: Record<string, JiraInstance> = {};

const PRODUCTION_JIRA_TAG = "production-jira";
/** Seconds before cached Jira data is refreshed in the background. */
const JIRA_REVALIDATE_SECONDS = 60;
const ARCHIVED_JIRA_REVALIDATE_SECONDS = 24 * 60 * 60;

type EpicProgressRow = JiraEpicSummary & { progress: JiraEpicTaskProgress };

/*
 * Jira reads go through Next's data cache: it is shared across server
 * instances and serves the last result while a refresh runs in the
 * background, so page loads only wait on Jira the first time a project
 * is seen.
 */
async function fetchEpicProgress(
  instance: JiraInstance,
  projectKey: string,
): Promise<EpicProgressRow[]> {
  const byProject = await getProjectsEpicProgress(instance, [projectKey]);
  return byProject.get(projectKey) ?? [];
}

const cachedEpicProgress = unstable_cache(
  fetchEpicProgress,
  ["production-epic-progress"],
  { revalidate: JIRA_REVALIDATE_SECONDS, tags: [PRODUCTION_JIRA_TAG] },
);

const cachedArchivedEpicProgress = unstable_cache(
  fetchEpicProgress,
  ["production-epic-progress-archived"],
  { revalidate: ARCHIVED_JIRA_REVALIDATE_SECONDS, tags: [PRODUCTION_JIRA_TAG] },
);

const cachedEpicTasks = unstable_cache(
  async (
    instance: JiraInstance,
    projectKey: string,
  ): Promise<Record<string, ProductionTask[]>> =>
    Object.fromEntries(await getProjectEpicTasks(instance, projectKey)),
  ["production-epic-tasks"],
  { revalidate: JIRA_REVALIDATE_SECONDS, tags: [PRODUCTION_JIRA_TAG] },
);

const cachedSpacePresence = unstable_cache(
  async (
    instance: JiraInstance,
    projectKeys: string[],
  ): Promise<Record<string, boolean | null>> =>
    Object.fromEntries(await jiraSpacesStillExist(instance, projectKeys)),
  ["production-space-presence"],
  { revalidate: JIRA_REVALIDATE_SECONDS, tags: [PRODUCTION_JIRA_TAG] },
);

/** Expires cached Jira data. Only callable from a Server Action. */
export function clearProductionJiraCache() {
  updateTag(PRODUCTION_JIRA_TAG);
}

/** Drop production projects whose Jira space has been deleted. */
export async function withoutDeletedJiraSpaces(
  items: InitiativeWithUsers[],
): Promise<InitiativeWithUsers[]> {
  const keysByInstance = new Map<JiraInstance, Set<string>>();
  for (const item of items) {
    if (item.currentStage !== "production") continue;
    const target = resolveJiraTarget(item.setupData?.jira);
    if (!target.instance || !target.projectKey) continue;
    const keys = keysByInstance.get(target.instance) ?? new Set<string>();
    keys.add(target.projectKey.toUpperCase());
    keysByInstance.set(target.instance, keys);
  }

  const presence = new Map<string, boolean | null>();
  await Promise.all(
    [...keysByInstance].map(async ([instance, keys]) => {
      const found = await cachedSpacePresence(instance, [...keys].sort());
      for (const [key, exists] of Object.entries(found)) {
        presence.set(`${instance}:${key}`, exists);
      }
    }),
  );

  return items.filter((item) => {
    if (item.currentStage !== "production") return true;
    const target = resolveJiraTarget(item.setupData?.jira);
    if (!target.instance || !target.projectKey) return true;
    return (
      presence.get(`${target.instance}:${target.projectKey.toUpperCase()}`) !==
      false
    );
  });
}

function instanceByHost(): Record<string, JiraInstance> {
  if (Object.keys(HOST_TO_INSTANCE).length > 0) return HOST_TO_INSTANCE;
  for (const site of getAvailableInstances()) {
    const host = site.host.replace(/^https?:\/\//, "").toLowerCase();
    HOST_TO_INSTANCE[host] = site.id;
  }
  return HOST_TO_INSTANCE;
}

export function resolveJiraTarget(jira: JiraSetupData | undefined): {
  instance?: JiraInstance;
  projectKey?: string;
  boardUrl?: string;
  projectName?: string;
} {
  if (!jira) return {};

  const boardUrl = jira.boardUrl || jira.projectUrl;
  let instance = jira.workspace;
  let projectKey = jira.projectKey;

  if ((!instance || !projectKey) && boardUrl) {
    try {
      const url = new URL(boardUrl);
      const host = url.host.toLowerCase();
      instance = instance ?? instanceByHost()[host];
      const fromPath = url.pathname.match(/\/projects\/([A-Z][A-Z0-9]+)/i);
      if (!projectKey && fromPath?.[1]) projectKey = fromPath[1].toUpperCase();
    } catch {
      // Keep whatever was stored.
    }
  }

  return {
    instance,
    projectKey,
    boardUrl,
    projectName: jira.projectName,
  };
}

function toBrief(item: InitiativeWithUsers) {
  const team = item.scopingData?.team ?? [];
  const teamCost = team.length ? summarizeTeamCost(team) : null;
  const setupBudget = item.setupData?.budget;
  const adjusted = setupBudget?.adjustedBudget;
  const original = setupBudget?.originalBudget ?? teamCost?.total;
  const budget = adjusted ?? original ?? undefined;
  const dates = (item.scopingData?.milestones ?? [])
    .flatMap((milestone) => [milestone.startDate, milestone.endDate])
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    tShirtSize: item.validationData?.tShirtSize,
    priority: item.validationData?.priority,
    consensusPriority: item.scopingData?.consensusPriority,
    solutionDirection: item.validationData?.solutionDirection,
    problemStatement: item.problemStatement,
    expectedImpact: item.expectedImpact,
    businessValueSummary:
      formatBusinessValueSummary(item.validationData?.businessValue) ??
      undefined,
    budget,
    originalBudget: original ?? undefined,
    budgetConfirmed: setupBudget?.status === "completed",
    budgetUsesAssumedRates:
      adjusted == null ? Boolean(teamCost?.usesAssumedRates) : false,
    teamHours: team.reduce((sum, member) => sum + (member.totalHours || 0), 0),
    timelineStart: dates[0],
    timelineEnd: dates.length > 1 ? dates[dates.length - 1] : undefined,
    submitterName: item.submitter.name,
    sponsorName: item.sponsor.name,
    team: team.map((member) => ({
      name: member.name,
      role: member.role,
      party: member.party,
    })),
    milestones: (item.scopingData?.milestones ?? []).map((milestone) => ({
      epic: milestone.epic,
      milestone: milestone.milestone,
      startDate: milestone.startDate,
      endDate: milestone.endDate,
    })),
  };
}

type JiraProgressResult = {
  rows?: EpicProgressRow[];
  error?: string;
};

function toProductionProject(
  item: InitiativeWithUsers,
  today: string,
  jiraProgress?: JiraProgressResult,
): ProductionProject {
  const rawParty = item.validationData?.leadProductionParty ?? null;
  const normalized = normalizeLeadParty(rawParty);
  const leadPartyId: ProductionLeadParty | null = isTrackedLeadParty(normalized)
    ? normalized
    : null;
  const target = resolveJiraTarget(item.setupData?.jira);
  const slackHref =
    item.onboardingData?.links?.slackChannelUrl ||
    item.setupData?.slack?.channelUrl;
  const slackName = item.setupData?.slack?.channelName?.replace(/^#/, "");
  const driveHref = item.setupData?.drive?.driveUrl;
  const addedManually = isManualProductionProject(item.setupData);
  const base: ProductionProject = {
    id: item.id,
    ticketId: item.ticketId,
    title: item.title,
    description: item.description,
    leadPartyId,
    leadPartyRaw: rawParty,
    jira: {
      instance: target.instance,
      projectKey: target.projectKey,
      boardUrl: target.boardUrl,
      projectName: target.projectName,
    },
    tools: {
      jira: target.boardUrl
        ? {
            href: toJiraSoftwareProjectListUrl(
              target.boardUrl,
              target.projectKey,
            ),
            label: target.projectName || "Jira board",
          }
        : undefined,
      slack: slackHref
        ? {
            href: slackHref,
            label: slackName ? `#${slackName}` : "Slack",
          }
        : undefined,
      drive: driveHref
        ? {
            href: driveHref,
            label: item.setupData?.drive?.driveName || "Google Drive",
          }
        : undefined,
    },
    addedManually,
    addedAt: addedManually
      ? item.setupData?.addedAt ?? item.createdAt.toISOString()
      : undefined,
    epics: [],
    health: "unscored",
    scoredEpicCount: 0,
    flaggedEpicCount: 0,
    totalTickets: 0,
    doneTickets: 0,
    inProgressTickets: 0,
    ticketsDonePct: 0,
    archivedAt: item.archivedAt ? item.archivedAt.toISOString() : undefined,
    brief: toBrief(item),
  };

  if (!target.instance || !target.projectKey) {
    return {
      ...base,
      jira: {
        ...base.jira,
        fetchError: target.boardUrl
          ? "Jira board is linked but the project key or workspace is missing."
          : "No Jira board is linked yet.",
      },
    };
  }

  if (jiraProgress?.error) {
    return {
      ...base,
      jira: {
        ...base.jira,
        fetchError: jiraProgress.error,
      },
    };
  }

  if (!jiraProgress?.rows) {
    return base;
  }

  const epics = jiraProgress.rows.map((row) =>
    scoreEpic(
      {
        key: row.key,
        name: row.name,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
        statusCategory: row.statusCategory,
        total: row.progress.total,
        todo: row.progress.todo,
        inProgress: row.progress.inProgress,
        done: row.progress.done,
      },
      today,
    ),
  );
  return { ...base, epics, ...buildProjectHealth(epics) };
}

async function loadEpicProgress(
  item: InitiativeWithUsers,
): Promise<JiraProgressResult | undefined> {
  const target = resolveJiraTarget(item.setupData?.jira);
  if (!target.instance || !target.projectKey) return undefined;
  const load = item.archivedAt ? cachedArchivedEpicProgress : cachedEpicProgress;
  try {
    return { rows: await load(target.instance, target.projectKey.toUpperCase()) };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not load Jira progress.",
    };
  }
}

export type ProductionOverviewData = {
  active: ProductionProject[];
  archived: ProductionProject[];
};

export async function getProductionOverview(
  user: PermissionUser,
): Promise<ProductionOverviewData> {
  const items = await getInitiativesByStage("production", user);
  const today = todayIso();

  // The space check and progress load run side by side; a deleted space's
  // progress request simply fails and is dropped with the project.
  const [initiatives, progress] = await Promise.all([
    withoutDeletedJiraSpaces(items),
    Promise.all(
      items.map(async (item) => [item.id, await loadEpicProgress(item)] as const),
    ),
  ]);
  const progressByItem = new Map(progress);

  const projects = initiatives.map((item) =>
    toProductionProject(item, today, progressByItem.get(item.id)),
  );
  const active = sortProductionProjects(
    projects.filter((project) => !project.archivedAt),
  );
  const archived = [...projects]
    .filter((project) => project.archivedAt)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  return { active, archived };
}

export async function getProductionEpicTasks(
  user: PermissionUser,
  initiativeId: number,
): Promise<{ byEpic: Record<string, ProductionTask[]>; error?: string }> {
  const item = await getInitiativeById(initiativeId);
  if (
    !item ||
    !canViewInitiative(
      user,
      await loadInitiativeAccess(user, initiativeId, {
        submitterId: item.submitter.id,
        currentStage: item.currentStage,
        status: item.status,
      }),
    )
  ) {
    return { byEpic: {}, error: "Project not found." };
  }

  return loadEpicTasks(item);
}

async function loadEpicTasks(
  item: InitiativeWithUsers,
): Promise<{ byEpic: Record<string, ProductionTask[]>; error?: string }> {
  const target = resolveJiraTarget(item.setupData?.jira);
  if (!target.instance || !target.projectKey) {
    return { byEpic: {} };
  }

  try {
    return {
      byEpic: await cachedEpicTasks(
        target.instance,
        target.projectKey.toUpperCase(),
      ),
    };
  } catch (error) {
    return {
      byEpic: {},
      error:
        error instanceof Error
          ? error.message
          : "Could not load Jira tickets.",
    };
  }
}

export type SharedProductionProject = {
  project: ProductionProject;
  journey: JourneyStage[] | null;
  tasksByEpic: Record<string, ProductionTask[]>;
};

/** Loads one Production project for a public share link, without a session. */
export async function getSharedProductionProject(
  initiativeId: number,
): Promise<SharedProductionProject | null> {
  const item = await getInitiativeById(initiativeId);
  if (!item || item.currentStage !== "production") return null;

  const [visible, progress] = await Promise.all([
    withoutDeletedJiraSpaces([item]),
    loadEpicProgress(item),
  ]);
  if (visible.length === 0) return null;

  const project = toProductionProject(item, todayIso(), progress);
  const [tasks, journey] = await Promise.all([
    loadEpicTasks(item),
    project.addedManually ? null : getProductionJourney(item.id),
  ]);
  return { project, journey, tasksByEpic: tasks.byEpic };
}

export type JourneyStageId =
  | "idea"
  | "validation"
  | "scoping"
  | "go-nogo"
  | "setup"
  | "onboarding"
  | "production";

export type JourneyStage = {
  id: JourneyStageId;
  label: string;
  enteredAt?: string;
};

const JOURNEY_STAGES: { id: JourneyStageId; label: string; actions: string[] }[] =
  [
    { id: "idea", label: "Initiative", actions: ["idea_submitted"] },
    {
      id: "validation",
      label: "Validation",
      actions: ["approved_to_validation"],
    },
    { id: "scoping", label: "Scoping", actions: ["validation_approved"] },
    { id: "go-nogo", label: "Go/No-Go", actions: ["scoping_submitted"] },
    { id: "setup", label: "Project Setup", actions: ["gonogo_approved"] },
    { id: "onboarding", label: "Onboarding & Kickoff", actions: ["setup_completed"] },
    {
      id: "production",
      label: "Production & Reporting",
      actions: ["onboarding_completed"],
    },
  ];

function earliestIso(entries: ActivityEntry[], actions: string[]): string | undefined {
  const match = entries
    .filter((entry) => actions.includes(entry.action))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
  return match?.createdAt.toISOString();
}

export async function getProductionJourney(
  initiativeId: number,
): Promise<JourneyStage[]> {
  const activity = await getActivityForInitiative(initiativeId);
  return JOURNEY_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    enteredAt: earliestIso(activity, stage.actions),
  }));
}
