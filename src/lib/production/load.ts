import {
  getAvailableInstances,
  getProjectEpicTasks,
  getProjectsEpicProgress,
  type JiraEpicSummary,
  type JiraEpicTaskProgress,
  type JiraInstance,
} from "@/lib/integrations/jira";
import {
  canViewInitiative,
  type PermissionUser,
} from "@/lib/permissions";
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

const JIRA_PROGRESS_TTL_MS = 60_000;

type EpicProgressRow = JiraEpicSummary & { progress: JiraEpicTaskProgress };

type CachedEpicProgress = {
  fetchedAt: number;
  rows: EpicProgressRow[];
};

const epicProgressCache = new Map<string, CachedEpicProgress>();
const epicTasksCache = new Map<string, { fetchedAt: number; byEpic: Record<string, ProductionTask[]> }>();

function epicProgressCacheKey(instance: JiraInstance, projectKey: string) {
  return `${instance}:${projectKey.trim().toUpperCase()}`;
}

export function clearProductionJiraCache() {
  epicProgressCache.clear();
  epicTasksCache.clear();
}

function readCachedEpicProgress(
  instance: JiraInstance,
  projectKey: string,
  allowStale: boolean,
): EpicProgressRow[] | undefined {
  const entry = epicProgressCache.get(
    epicProgressCacheKey(instance, projectKey),
  );
  if (!entry) return undefined;
  if (!allowStale && Date.now() - entry.fetchedAt >= JIRA_PROGRESS_TTL_MS) {
    return undefined;
  }
  return entry.rows;
}

function writeCachedEpicProgress(
  instance: JiraInstance,
  projectKey: string,
  rows: EpicProgressRow[],
) {
  epicProgressCache.set(epicProgressCacheKey(instance, projectKey), {
    fetchedAt: Date.now(),
    rows,
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

async function loadLiveEpicProgress(
  instance: JiraInstance,
  projectKeys: string[],
): Promise<{ byProject: Map<string, EpicProgressRow[]>; error?: string }> {
  const unique = [
    ...new Set(
      projectKeys.map((key) => key.trim().toUpperCase()).filter(Boolean),
    ),
  ];
  const byProject = new Map<string, EpicProgressRow[]>();
  if (unique.length === 0) return { byProject };

  try {
    const fetched = await getProjectsEpicProgress(instance, unique);
    for (const [key, rows] of fetched) {
      byProject.set(key, rows);
      writeCachedEpicProgress(instance, key, rows);
    }
    return { byProject };
  } catch (error) {
    return {
      byProject,
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
  const initiatives = await getInitiativesByStage("production", user);
  const today = todayIso();

  const neededByInstance = new Map<JiraInstance, string[]>();
  const progressByItem = new Map<number, JiraProgressResult>();

  for (const item of initiatives) {
    const target = resolveJiraTarget(item.setupData?.jira);
    if (!target.instance || !target.projectKey) continue;

    const archived = Boolean(item.archivedAt);
    const cached = readCachedEpicProgress(
      target.instance,
      target.projectKey,
      archived,
    );
    if (cached) {
      progressByItem.set(item.id, { rows: cached });
      continue;
    }
    if (archived) continue;

    const keys = neededByInstance.get(target.instance) ?? [];
    keys.push(target.projectKey);
    neededByInstance.set(target.instance, keys);
  }

  const live = await Promise.all(
    [...neededByInstance.entries()].map(async ([instance, keys]) => ({
      instance,
      ...(await loadLiveEpicProgress(instance, keys)),
    })),
  );

  for (const result of live) {
    for (const item of initiatives) {
      if (progressByItem.has(item.id)) continue;
      const target = resolveJiraTarget(item.setupData?.jira);
      if (target.instance !== result.instance || !target.projectKey) continue;
      if (item.archivedAt) continue;
      progressByItem.set(item.id, {
        rows: result.byProject.get(target.projectKey.toUpperCase()),
        error: result.error,
      });
    }
  }

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
  if (!item || !canViewInitiative(user, { submitterId: item.submitter.id })) {
    return { byEpic: {}, error: "Project not found." };
  }

  const target = resolveJiraTarget(item.setupData?.jira);
  if (!target.instance || !target.projectKey) {
    return { byEpic: {} };
  }

  const cacheKey = epicProgressCacheKey(target.instance, target.projectKey);
  const cached = epicTasksCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < JIRA_PROGRESS_TTL_MS) {
    return { byEpic: cached.byEpic };
  }

  try {
    const fetched = await getProjectEpicTasks(
      target.instance,
      target.projectKey,
    );
    const byEpic = Object.fromEntries(fetched);
    epicTasksCache.set(cacheKey, { fetchedAt: Date.now(), byEpic });
    return { byEpic };
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
