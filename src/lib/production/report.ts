import {
  daysUntil,
  todayIso,
  type EpicFlagReason,
  type ProductionHealth,
  type ProductionLeadParty,
  type ProductionProject,
} from "./health";

export type AttentionKind =
  | "critical"
  | "at-risk"
  | "overdue"
  | "due-soon"
  | "flagged-epics"
  | "jira";

export type ReportAttentionItem = {
  projectId: number;
  ticketId: string;
  title: string;
  kind: AttentionKind;
  detail: string;
  leadPartyId: ProductionLeadParty | null;
  health: ProductionHealth;
  daysUntil?: number;
};

export type ReportUpcomingItem = {
  projectId: number;
  ticketId: string;
  title: string;
  date: string;
  daysUntil: number;
  leadPartyId: ProductionLeadParty | null;
  kind: "epic-end" | "milestone";
  label?: string;
};

export type ReportPartyId = ProductionLeadParty | "unassigned";

export type ReportPartyRollup = {
  partyId: ReportPartyId;
  projects: number;
  critical: number;
  atRisk: number;
  onTrack: number;
  unscored: number;
  bookedHours: number;
};

export type ReportRow = {
  projectId: number;
  ticketId: string;
  title: string;
  health: ProductionHealth;
  leadPartyId: ProductionLeadParty | null;
  ticketsDonePct: number;
  doneTickets: number;
  totalTickets: number;
  nearestEndDate?: string;
  daysUntil?: number;
  consensusPriority?: string;
};

export type ReportPulse = {
  active: number;
  critical: number;
  atRisk: number;
  onTrack: number;
  unscored: number;
  doneTickets: number;
  inProgressTickets: number;
  totalTickets: number;
  bookedHours: number;
};

export type ProductionReport = {
  generatedAt: string;
  weekOf: string;
  pulse: ReportPulse;
  attention: ReportAttentionItem[];
  upcoming: ReportUpcomingItem[];
  byParty: ReportPartyRollup[];
  rows: ReportRow[];
};

const ATTENTION_LIMIT = 10;
const UPCOMING_LIMIT = 8;
const DUE_SOON_DAYS = 14;
const UPCOMING_DAYS = 28;

const ATTENTION_RANK: Record<AttentionKind, number> = {
  critical: 0,
  "at-risk": 1,
  overdue: 2,
  "due-soon": 3,
  "flagged-epics": 4,
  jira: 5,
};

const FLAG_LABEL: Record<EpicFlagReason, string> = {
  "no-end-date": "no end date",
  "no-start-date": "no start date",
  "no-tickets": "no tickets",
};

const TRACKED_PARTIES: ProductionLeadParty[] = ["adsomnia", "btr", "hn"];

function weekOfIso(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + offset);
  return todayIso(date);
}

function emptyParty(partyId: ReportPartyId): ReportPartyRollup {
  return {
    partyId,
    projects: 0,
    critical: 0,
    atRisk: 0,
    onTrack: 0,
    unscored: 0,
    bookedHours: 0,
  };
}

function bumpHealth(rollup: ReportPartyRollup, health: ProductionHealth) {
  if (health === "critical") rollup.critical += 1;
  else if (health === "at-risk") rollup.atRisk += 1;
  else if (health === "on-track") rollup.onTrack += 1;
  else rollup.unscored += 1;
}

function datePhrase(days: number, iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
  if (days < 0) {
    const ago = Math.abs(days);
    return `ended ${ago}d ago (${label})`;
  }
  if (days === 0) return `ends today (${label})`;
  return `ends in ${days}d (${label})`;
}

function flaggedDetail(project: ProductionProject): string {
  const flagged = project.epics.filter((epic) => epic.flagged);
  if (flagged.length === 1) {
    const epic = flagged[0];
    const reason = epic.flagReason ? FLAG_LABEL[epic.flagReason] : "incomplete";
    return `${epic.name} — ${reason}`;
  }
  return `${flagged.length} epics missing dates or tickets`;
}

function attentionCandidate(
  project: ProductionProject,
  today: string,
): ReportAttentionItem | null {
  const endDays =
    project.nearestEndDate !== undefined
      ? daysUntil(project.nearestEndDate, today)
      : undefined;

  let kind: AttentionKind | null = null;
  let detail = "";

  if (project.health === "critical") {
    kind = "critical";
    detail =
      endDays !== undefined
        ? `Critical — ${datePhrase(endDays, project.nearestEndDate!)}`
        : "Behind ticket pace versus calendar";
  } else if (project.health === "at-risk") {
    kind = "at-risk";
    detail =
      endDays !== undefined
        ? `At risk — ${datePhrase(endDays, project.nearestEndDate!)}`
        : "Ticket pace is slipping versus calendar";
  } else if (endDays !== undefined && endDays < 0) {
    kind = "overdue";
    detail = datePhrase(endDays, project.nearestEndDate!);
  } else if (endDays !== undefined && endDays <= DUE_SOON_DAYS) {
    kind = "due-soon";
    detail = datePhrase(endDays, project.nearestEndDate!);
  } else if (project.flaggedEpicCount > 0) {
    kind = "flagged-epics";
    detail = flaggedDetail(project);
  } else if (project.jira.fetchError) {
    kind = "jira";
    detail = project.jira.fetchError;
  }

  if (!kind) return null;

  return {
    projectId: project.id,
    ticketId: project.ticketId,
    title: project.title,
    kind,
    detail,
    leadPartyId: project.leadPartyId,
    health: project.health,
    daysUntil: endDays,
  };
}

function collectUpcoming(
  project: ProductionProject,
  today: string,
): ReportUpcomingItem[] {
  const items: ReportUpcomingItem[] = [];
  const seen = new Set<string>();

  if (project.nearestEndDate) {
    const days = daysUntil(project.nearestEndDate, today);
    if (days >= 0 && days <= UPCOMING_DAYS) {
      seen.add(project.nearestEndDate);
      items.push({
        projectId: project.id,
        ticketId: project.ticketId,
        title: project.title,
        date: project.nearestEndDate,
        daysUntil: days,
        leadPartyId: project.leadPartyId,
        kind: "epic-end",
      });
    }
  }

  for (const milestone of project.brief.milestones) {
    const date = milestone.endDate ?? milestone.startDate;
    if (!date || seen.has(date)) continue;
    const days = daysUntil(date, today);
    if (days < 0 || days > UPCOMING_DAYS) continue;
    seen.add(date);
    items.push({
      projectId: project.id,
      ticketId: project.ticketId,
      title: project.title,
      date,
      daysUntil: days,
      leadPartyId: project.leadPartyId,
      kind: "milestone",
      label: milestone.milestone || milestone.epic,
    });
  }

  return items;
}

function toRow(project: ProductionProject, today: string): ReportRow {
  const days = project.nearestEndDate
    ? daysUntil(project.nearestEndDate, today)
    : undefined;
  return {
    projectId: project.id,
    ticketId: project.ticketId,
    title: project.title,
    health: project.health,
    leadPartyId: project.leadPartyId,
    ticketsDonePct: project.ticketsDonePct,
    doneTickets: project.doneTickets,
    totalTickets: project.totalTickets,
    nearestEndDate: project.nearestEndDate,
    daysUntil: days,
    consensusPriority: project.brief.consensusPriority,
  };
}

export function buildProductionReport(
  projects: ProductionProject[],
  now: Date = new Date(),
): ProductionReport {
  const today = todayIso(now);
  const pulse: ReportPulse = {
    active: projects.length,
    critical: 0,
    atRisk: 0,
    onTrack: 0,
    unscored: 0,
    doneTickets: 0,
    inProgressTickets: 0,
    totalTickets: 0,
    bookedHours: 0,
  };

  const partyMap = new Map<ReportPartyId, ReportPartyRollup>();
  for (const partyId of TRACKED_PARTIES) {
    partyMap.set(partyId, emptyParty(partyId));
  }

  const attention: ReportAttentionItem[] = [];
  const upcoming: ReportUpcomingItem[] = [];

  for (const project of projects) {
    if (project.health === "critical") pulse.critical += 1;
    else if (project.health === "at-risk") pulse.atRisk += 1;
    else if (project.health === "on-track") pulse.onTrack += 1;
    else pulse.unscored += 1;

    pulse.doneTickets += project.doneTickets;
    pulse.inProgressTickets += project.inProgressTickets;
    pulse.totalTickets += project.totalTickets;
    pulse.bookedHours += project.brief.teamHours ?? 0;

    const partyId: ReportPartyId = project.leadPartyId ?? "unassigned";
    let rollup = partyMap.get(partyId);
    if (!rollup) {
      rollup = emptyParty(partyId);
      partyMap.set(partyId, rollup);
    }
    rollup.projects += 1;
    rollup.bookedHours += project.brief.teamHours ?? 0;
    bumpHealth(rollup, project.health);

    const item = attentionCandidate(project, today);
    if (item) attention.push(item);
    upcoming.push(...collectUpcoming(project, today));
  }

  attention.sort((a, b) => {
    const rank = ATTENTION_RANK[a.kind] - ATTENTION_RANK[b.kind];
    if (rank !== 0) return rank;
    const aDays = a.daysUntil ?? Number.POSITIVE_INFINITY;
    const bDays = b.daysUntil ?? Number.POSITIVE_INFINITY;
    if (aDays !== bDays) return aDays - bDays;
    return a.title.localeCompare(b.title);
  });

  upcoming.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.title.localeCompare(b.title);
  });

  const byParty = TRACKED_PARTIES.map((id) => partyMap.get(id)!);
  const unassigned = partyMap.get("unassigned");
  if (unassigned && unassigned.projects > 0) byParty.push(unassigned);

  return {
    generatedAt: now.toISOString(),
    weekOf: weekOfIso(today),
    pulse,
    attention: attention.slice(0, ATTENTION_LIMIT),
    upcoming: upcoming.slice(0, UPCOMING_LIMIT),
    byParty,
    rows: projects.map((project) => toRow(project, today)),
  };
}
