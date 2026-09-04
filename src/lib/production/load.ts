import {
  getAvailableInstances,
  getProjectEpicProgress,
  type JiraInstance,
} from "@/lib/integrations/jira";
import {
  getActivityForInitiative,
  getInitiativesByStage,
  type ActivityEntry,
  type InitiativeWithUsers,
} from "@/lib/queries";
import { summarizeTeamCost } from "@/data/role-rates";
import {
  formatBusinessValueSummary,
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
} from "./health";

const HOST_TO_INSTANCE: Record<string, JiraInstance> = {};

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

async function toProductionProject(
  item: InitiativeWithUsers,
  today: string,
): Promise<ProductionProject> {
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
            href: target.boardUrl,
            label: target.projectName || "Jira board",
          }
        : undefined,
      slack: slackHref
        ? { href: slackHref, label: slackName ? `#${slackName}` : "Slack" }
        : undefined,
      drive: driveHref
        ? {
            href: driveHref,
            label: item.setupData?.drive?.driveName || "Google Drive",
          }
        : undefined,
    },
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

  try {
    const rows = await getProjectEpicProgress(target.instance, target.projectKey);
    const epics = rows.map((row) =>
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
          tasks: row.progress.tasks,
        },
        today,
      ),
    );
    return { ...base, epics, ...buildProjectHealth(epics) };
  } catch (error) {
    return {
      ...base,
      jira: {
        ...base.jira,
        fetchError:
          error instanceof Error
            ? error.message
            : "Could not load Jira progress.",
      },
    };
  }
}

export type ProductionOverviewData = {
  active: ProductionProject[];
  archived: ProductionProject[];
};

export async function getProductionOverview(): Promise<ProductionOverviewData> {
  const initiatives = await getInitiativesByStage("production");
  const eligible = initiatives.filter(
    (item) => normalizeLeadParty(item.validationData?.leadProductionParty) !== "bbb",
  );
  const today = todayIso();
  const projects = await Promise.all(
    eligible.map((item) => toProductionProject(item, today)),
  );
  const active = sortProductionProjects(
    projects.filter((project) => !project.archivedAt),
  );
  const archived = [...projects]
    .filter((project) => project.archivedAt)
    .sort((a, b) => (b.archivedAt ?? "").localeCompare(a.archivedAt ?? ""));
  return { active, archived };
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
