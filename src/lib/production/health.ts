import type {
  JiraEpicTask,
  JiraStatusCategoryKey,
} from "@/lib/integrations/jira";

export type ProductionTask = JiraEpicTask;

export type ProductionHealth =
  | "critical"
  | "at-risk"
  | "on-track"
  | "unscored";

export type EpicFlagReason = "no-end-date" | "no-start-date" | "no-tickets";

export type ProductionEpic = {
  key: string;
  name: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  statusCategory?: JiraStatusCategoryKey;
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  tasks: ProductionTask[];
  flagged: boolean;
  flagReason?: EpicFlagReason;
  timeElapsedPct?: number;
  ticketsDonePct?: number;
  healthScore?: number;
  health?: Exclude<ProductionHealth, "unscored">;
};

export type ProductionLeadParty = "adsomnia" | "btr" | "hn";

export type ProductionProjectBrief = {
  tShirtSize?: string;
  priority?: string;
  consensusPriority?: string;
  solutionDirection?: string;
  problemStatement?: string | null;
  expectedImpact?: string | null;
  businessValueSummary?: string;
  budget?: number;
  originalBudget?: number;
  budgetConfirmed?: boolean;
  budgetUsesAssumedRates?: boolean;
  teamHours?: number;
  timelineStart?: string;
  timelineEnd?: string;
  submitterName: string;
  sponsorName: string;
  team: { name: string; role: string; party?: string }[];
  milestones: { epic: string; milestone: string; startDate?: string; endDate?: string }[];
};

export type ProductionProject = {
  id: number;
  ticketId: string;
  title: string;
  description: string | null;
  leadPartyId: ProductionLeadParty | null;
  leadPartyRaw: string | null;
  jira: {
    instance?: "adsomnia" | "btr" | "hn";
    projectKey?: string;
    boardUrl?: string;
    projectName?: string;
    fetchError?: string;
  };
  tools: {
    jira?: { href: string; label: string };
    slack?: { href: string; label: string };
    drive?: { href: string; label: string };
  };
  epics: ProductionEpic[];
  health: ProductionHealth;
  scoredEpicCount: number;
  flaggedEpicCount: number;
  totalTickets: number;
  doneTickets: number;
  inProgressTickets: number;
  ticketsDonePct: number;
  timeElapsedPct?: number;
  nearestEndDate?: string;
  archivedAt?: string;
  brief: ProductionProjectBrief;
};

export const HEALTH_RANK: Record<ProductionHealth, number> = {
  critical: 0,
  "at-risk": 1,
  unscored: 2,
  "on-track": 3,
};

export const HEALTH_META: Record<
  ProductionHealth,
  { label: string; color: string }
> = {
  critical: { label: "Critical", color: "#FF3B3B" },
  "at-risk": { label: "At Risk", color: "#EAB308" },
  "on-track": { label: "On Track", color: "#22C55E" },
  unscored: { label: "Unscored", color: "#A1A1A1" },
};

const CRITICAL_THRESHOLD = -30;
const AT_RISK_THRESHOLD = -15;
const DAY_MS = 86_400_000;

export function normalizeLeadParty(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (value === "as") return "adsomnia";
  return value;
}

export function isTrackedLeadParty(
  party: string | null,
): party is ProductionLeadParty {
  return party === "adsomnia" || party === "btr" || party === "hn";
}

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dateToMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function timeElapsedPct(
  startDate: string,
  endDate: string,
  today: string,
): number {
  const start = dateToMs(startDate);
  const end = dateToMs(endDate);
  const now = dateToMs(today);
  if (end <= start) return now >= end ? 100 : 0;
  if (now <= start) return 0;
  if (now >= end) return 100;
  return ((now - start) / (end - start)) * 100;
}

export function healthFromScore(
  score: number,
): Exclude<ProductionHealth, "unscored"> {
  if (score < CRITICAL_THRESHOLD) return "critical";
  if (score < AT_RISK_THRESHOLD) return "at-risk";
  return "on-track";
}

export function scoreEpic(
  input: {
    key: string;
    name: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    statusCategory?: JiraStatusCategoryKey;
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    tasks?: ProductionTask[];
  },
  today: string,
): ProductionEpic {
  const base: ProductionEpic = {
    key: input.key,
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    status: input.status,
    statusCategory: input.statusCategory,
    total: input.total,
    todo: input.todo,
    inProgress: input.inProgress,
    done: input.done,
    tasks: input.tasks ?? [],
    flagged: false,
  };

  if (!input.endDate) {
    return { ...base, flagged: true, flagReason: "no-end-date" };
  }
  if (!input.startDate) {
    return { ...base, flagged: true, flagReason: "no-start-date" };
  }
  if (input.total === 0) {
    return { ...base, flagged: true, flagReason: "no-tickets" };
  }

  const elapsed = timeElapsedPct(input.startDate, input.endDate, today);
  const donePct = (input.done / input.total) * 100;
  const score = donePct - elapsed;

  return {
    ...base,
    timeElapsedPct: elapsed,
    ticketsDonePct: donePct,
    healthScore: score,
    health: healthFromScore(score),
  };
}

export function worstHealth(
  healths: ProductionHealth[],
): ProductionHealth {
  if (healths.length === 0) return "unscored";
  return healths.reduce((worst, next) =>
    HEALTH_RANK[next] < HEALTH_RANK[worst] ? next : worst,
  );
}

export function buildProjectHealth(
  epics: ProductionEpic[],
): Pick<
  ProductionProject,
  | "health"
  | "scoredEpicCount"
  | "flaggedEpicCount"
  | "totalTickets"
  | "doneTickets"
  | "inProgressTickets"
  | "ticketsDonePct"
  | "timeElapsedPct"
  | "nearestEndDate"
> {
  const scored = epics.filter((epic) => !epic.flagged && epic.health);
  const flagged = epics.filter((epic) => epic.flagged);
  const totalTickets = epics.reduce((sum, epic) => sum + epic.total, 0);
  const doneTickets = epics.reduce((sum, epic) => sum + epic.done, 0);
  const inProgressTickets = epics.reduce(
    (sum, epic) => sum + epic.inProgress,
    0,
  );

  let weightedElapsed = 0;
  let weight = 0;
  for (const epic of scored) {
    if (
      epic.startDate &&
      epic.endDate &&
      epic.timeElapsedPct !== undefined
    ) {
      const span = Math.max(dateToMs(epic.endDate) - dateToMs(epic.startDate), DAY_MS);
      weightedElapsed += epic.timeElapsedPct * span;
      weight += span;
    }
  }

  const endDates = epics
    .map((epic) => epic.endDate)
    .filter((value): value is string => Boolean(value))
    .sort();

  return {
    health: worstHealth(scored.map((epic) => epic.health!)),
    scoredEpicCount: scored.length,
    flaggedEpicCount: flagged.length,
    totalTickets,
    doneTickets,
    inProgressTickets,
    ticketsDonePct: totalTickets === 0 ? 0 : (doneTickets / totalTickets) * 100,
    timeElapsedPct: weight > 0 ? weightedElapsed / weight : undefined,
    nearestEndDate: endDates[0],
  };
}

export function sortProductionProjects(
  projects: ProductionProject[],
): ProductionProject[] {
  return [...projects].sort((a, b) => {
    const healthDelta = HEALTH_RANK[a.health] - HEALTH_RANK[b.health];
    if (healthDelta !== 0) return healthDelta;

    if (a.nearestEndDate && b.nearestEndDate) {
      const dateDelta = a.nearestEndDate.localeCompare(b.nearestEndDate);
      if (dateDelta !== 0) return dateDelta;
    } else if (a.nearestEndDate) {
      return -1;
    } else if (b.nearestEndDate) {
      return 1;
    }

    return a.title.localeCompare(b.title);
  });
}

export function daysUntil(iso: string, today: string): number {
  return Math.round((dateToMs(iso) - dateToMs(today)) / DAY_MS);
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}
