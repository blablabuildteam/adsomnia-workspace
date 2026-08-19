/** Client-safe validation types & helpers (no database imports). */

export type BusinessValueType = "speed" | "cost-efficiency" | "growth";

/** Impact score 1–10 for a selected business value type. */
export type BusinessValueImpact = number;

export type BusinessValueData = {
  types: BusinessValueType[];
  /** Impact scores 1–10. Legacy free-text strings may still exist in stored data. */
  expectations: Partial<Record<BusinessValueType, BusinessValueImpact | string>>;
};

export type ValidationData = {
  /** Structured value types + impact scores; legacy free-text string still supported. */
  businessValue?: BusinessValueData | string;
  solutionDirection?: string;
  tShirtSize?: string;
  priority?: string;
  leadProductionParty?: string;
  dependencies?: string;
  /** Optional Other Notes. Key kept as `risks` so existing drafts still load. */
  risks?: string;
  attachments?: Attachment[];
};

export const BUSINESS_VALUE_TYPES: {
  id: BusinessValueType;
  label: string;
}[] = [
  { id: "speed", label: "Speed" },
  { id: "cost-efficiency", label: "Cost Efficiency" },
  { id: "growth", label: "Growth" },
];

export const IMPACT_MIN = 1;
export const IMPACT_MAX = 10;
export const IMPACT_DEFAULT = 5;

export const EMPTY_IMPACTS: Record<BusinessValueType, number | null> = {
  speed: null,
  "cost-efficiency": null,
  growth: null,
};

export function impactScoreLabel(score: number): string {
  if (score <= 2) return "Minimal";
  if (score <= 4) return "Low";
  if (score <= 6) return "Moderate";
  if (score <= 8) return "High";
  return "Critical";
}

export function resolveBusinessValueState(
  stored: ValidationData["businessValue"],
): {
  types: BusinessValueType[];
  impacts: Record<BusinessValueType, number | null>;
} {
  if (!stored || typeof stored === "string" || !isBusinessValueData(stored)) {
    return { types: [], impacts: { ...EMPTY_IMPACTS } };
  }
  const impacts = { ...EMPTY_IMPACTS };
  for (const type of stored.types) {
    impacts[type] =
      parseImpactScore(stored.expectations[type]) ?? IMPACT_DEFAULT;
  }
  return { types: stored.types, impacts };
}

export function buildBusinessValueData(
  types: BusinessValueType[],
  impacts: Record<BusinessValueType, number | null>,
): BusinessValueData {
  const expectations: BusinessValueData["expectations"] = {};
  for (const type of types) {
    const score = impacts[type];
    if (score !== null) expectations[type] = score;
  }
  return { types, expectations };
}

export function isBusinessValueData(
  value: ValidationData["businessValue"],
): value is BusinessValueData {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(value.types) &&
    typeof value.expectations === "object" &&
    value.expectations !== null
  );
}

/** Normalize a stored expectation to a 1–10 score, or null if unset/unparseable. */
export function parseImpactScore(
  value: BusinessValueImpact | string | undefined | null,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.round(value);
    return n >= IMPACT_MIN && n <= IMPACT_MAX ? n : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    if (Number.isFinite(n)) {
      const rounded = Math.round(n);
      return rounded >= IMPACT_MIN && rounded <= IMPACT_MAX ? rounded : null;
    }
  }
  return null;
}

/** True when at least one type is selected and every selected type has a 1–10 impact. */
export function isBusinessValueComplete(
  value: ValidationData["businessValue"],
): boolean {
  if (!value) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (!isBusinessValueData(value) || value.types.length === 0) return false;
  return value.types.every((type) => parseImpactScore(value.expectations[type]) !== null);
}

/* ─── Attachments (shared by Validation & Scoping) ──────── */

export type AttachmentKind =
  | "google-doc"
  | "google-sheet"
  | "google-slides"
  | "google-form"
  | "google-drive"
  | "link"
  | "file";

export type Attachment = {
  id: string;
  kind: AttachmentKind;
  title: string;
  url?: string;
  /** Fetched HTML <title> / og:title, shown under the chip for links. */
  pageTitle?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

const GOOGLE_URL_PATTERNS: { pattern: RegExp; kind: AttachmentKind }[] = [
  { pattern: /docs\.google\.com\/document/, kind: "google-doc" },
  { pattern: /docs\.google\.com\/spreadsheets/, kind: "google-sheet" },
  { pattern: /docs\.google\.com\/presentation/, kind: "google-slides" },
  { pattern: /docs\.google\.com\/forms/, kind: "google-form" },
  { pattern: /drive\.google\.com/, kind: "google-drive" },
];

export function detectAttachmentKind(url: string): AttachmentKind {
  for (const { pattern, kind } of GOOGLE_URL_PATTERNS) {
    if (pattern.test(url)) return kind;
  }
  return "link";
}

export function attachmentKindLabel(kind: AttachmentKind): string {
  switch (kind) {
    case "google-doc": return "Google Doc";
    case "google-sheet": return "Google Sheet";
    case "google-slides": return "Google Slides";
    case "google-form": return "Google Form";
    case "google-drive": return "Google Drive";
    case "link": return "Link";
    case "file": return "File";
  }
}

/**
 * Accepts bare domains (`google.nl`), `www.` hosts, or full URLs.
 * Returns a normalized `https://…` href, or null if it is not a usable link.
 */
export function normalizeUrl(raw: string): string | null {
  const input = raw.trim().replace(/^['"]|['"]$/g, "");
  if (!input) return null;

  if (/^[a-z][a-z0-9+.-]*:/i.test(input) && !/^https?:\/\//i.test(input)) {
    return null;
  }

  const candidate = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Hostname used as the chip title for generic links (`google.nl`). */
export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 60);
  }
}

/**
 * Extract a human-readable title from a Google URL.
 * Falls back to the domain + path tail.
 */
export function titleFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/").filter(Boolean);
    if (u.hostname.includes("google.com") && segments.length >= 3) {
      const last = segments[segments.length - 1];
      if (last === "edit" || last === "view" || last === "preview") {
        return decodeURIComponent(segments[segments.length - 2]).replace(/[-_]/g, " ");
      }
      return decodeURIComponent(last).replace(/[-_]/g, " ");
    }
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.hostname.replace(/^www\./, "")}${path}`.slice(0, 60);
  } catch {
    return url.slice(0, 60);
  }
}

/* ─── Scoping Data ──────────────────────────────────────── */

export type ScopingMilestone = {
  id: string;
  epic: string;
  milestone: string;
  startDate?: string;
  endDate?: string;
  color?: string;
};

export type ScopingTeamMember = {
  id: string;
  role: string;
  /** Catalog role id from `ROLE_CATALOG` — optional on older drafts. */
  roleId?: string;
  /** Snapshotted €/h at selection time so later catalog updates don't rewrite history. */
  hourlyRate?: number;
  name: string;
  totalHours: number;
  hoursPerDay: number;
  startDate?: string;
  endDate?: string;
  party?: string;
};

export type ScopingScopeItem = {
  id: string;
  label: string;
  inScope: boolean;
};

export type ScopingValueMetric = {
  type: BusinessValueType;
  metric: string;
  target: number | null;
  unit: string;
};

export type ScopingData = {
  milestones?: ScopingMilestone[];
  team?: ScopingTeamMember[];
  /** Refined Impact carried forward from Validation. */
  impact?: BusinessValueData;
  /** @deprecated Replaced by `impact`. Kept so existing drafts still parse. */
  valueMetrics?: ScopingValueMetric[];
  scopeItems?: ScopingScopeItem[];
  dependencies?: string;
  attachments?: Attachment[];
};

export function isScopingComplete(data: ScopingData | null | undefined): boolean {
  if (!data) return false;
  const hasMilestones = (data.milestones?.length ?? 0) > 0 &&
    data.milestones!.every((m) => m.epic.trim() && m.milestone.trim());
  const hasTeam = (data.team?.length ?? 0) > 0 &&
    data.team!.every((t) => t.role.trim() && t.name.trim() && t.totalHours > 0);
  const hasImpact = isBusinessValueComplete(data.impact);
  const hasScope = (data.scopeItems?.length ?? 0) > 0;
  return hasMilestones && hasTeam && hasImpact && hasScope;
}

/* ─── Project Setup Data (Phase 5) ─────────────────────── */

export type SetupTaskStatus = "pending" | "in-progress" | "completed" | "skipped" | "error";

export type SetupTaskId =
  | "slack"
  | "drive"
  | "jira"
  | "jira-planning"
  | "documentation"
  | "team"
  | "scope"
  | "planning"
  | "budget"
  | "kickoff-meeting"
  | "kickoff-prep"
  | "invite-team";

export type SlackSetupData = {
  status: SetupTaskStatus;
  suggestedName: string;
  channelName?: string;
  completedAt?: string;
};

export type DriveSetupData = {
  status: SetupTaskStatus;
  suggestedName: string;
  driveName?: string;
  driveUrl?: string;
  completedAt?: string;
};

export type JiraSetupData = {
  status: SetupTaskStatus;
  suggestedName?: string;
  boardUrl?: string;
  /** @deprecated Kept so older setup drafts still parse. */
  projectUrl?: string;
  workspace?: "adsomnia" | "btr" | "hn";
  projectKey?: string;
  projectName?: string;
  projectId?: string;
  template?: "scrum" | "kanban";
  error?: string;
  completedAt?: string;
};

export type JiraPlanningData = {
  status: SetupTaskStatus;
  notes?: string;
  completedAt?: string;
};

export type SetupTeamMember = {
  id: string;
  name: string;
  email?: string;
  role: string;
  party?: string;
  totalHours: number;
  hoursPerDay: number;
  startDate?: string;
  endDate?: string;
};

export type TeamSetupData = {
  status: SetupTaskStatus;
  members: SetupTeamMember[];
  completedAt?: string;
};

export type DriveFolderLink = {
  name: string;
  id: string;
  url: string;
};

export type DocsSetupData = {
  status: SetupTaskStatus;
  linkedDocs: Attachment[];
  folders?: DriveFolderLink[];
  completedAt?: string;
};

export type ScopeConfirmData = {
  status: SetupTaskStatus;
  confirmedItems?: ScopingScopeItem[];
  notes?: string;
  completedAt?: string;
};

export type PlanningConfirmData = {
  status: SetupTaskStatus;
  confirmedMilestones?: ScopingMilestone[];
  notes?: string;
  completedAt?: string;
};

export type BudgetConfirmData = {
  status: SetupTaskStatus;
  originalBudget?: number;
  adjustedBudget?: number;
  notes?: string;
  completedAt?: string;
};

export type KickoffMeetingData = {
  status: SetupTaskStatus;
  meetingDate?: string;
  notes?: string;
  completedAt?: string;
};

export type KickoffPrepData = {
  status: SetupTaskStatus;
  notes?: string;
  completedAt?: string;
};

export type InviteTeamData = {
  status: SetupTaskStatus;
  completedAt?: string;
};

export type SetupData = {
  slack: SlackSetupData;
  drive: DriveSetupData;
  jira: JiraSetupData;
  jiraPlanning: JiraPlanningData;
  documentation: DocsSetupData;
  team: TeamSetupData;
  scope: ScopeConfirmData;
  planning: PlanningConfirmData;
  budget: BudgetConfirmData;
  kickoffMeeting: KickoffMeetingData;
  kickoffPrep: KickoffPrepData;
  inviteTeam?: InviteTeamData;
};

export const SETUP_TASKS: {
  id: SetupTaskId;
  dataKey: keyof SetupData;
  label: string;
  phase: "A" | "B" | "C";
  logo?: string;
  optional?: boolean;
}[] = [
  { id: "slack", dataKey: "slack", label: "Create Slack Channel", phase: "A", logo: "/logos/slack.png" },
  { id: "drive", dataKey: "drive", label: "Create Google Drive", phase: "A", logo: "/logos/google-drive.png" },
  { id: "documentation", dataKey: "documentation", label: "Set Up Google Drive With Documentation", phase: "A", logo: "/logos/google-drive.png" },
  { id: "jira", dataKey: "jira", label: "Create Jira Board", phase: "A", logo: "/logos/jira.png" },
  { id: "jira-planning", dataKey: "jiraPlanning", label: "Set Up Jira Epic Planning", phase: "A", logo: "/logos/jira.png" },
  { id: "kickoff-meeting", dataKey: "kickoffMeeting", label: "Book Kickoff Meeting", phase: "C", logo: "/logos/google-calendar.png" },
  { id: "invite-team", dataKey: "inviteTeam", label: "Invite Team to Tools", phase: "C" },
];

export function setupTaskIdToDataKey(taskId: SetupTaskId): keyof SetupData {
  const found = SETUP_TASKS.find((t) => t.id === taskId);
  return found?.dataKey ?? (taskId as keyof SetupData);
}

export function suggestedDriveName(title: string, ticketId: string): string {
  return `${title} - ${ticketId}`;
}

export const RECOMMENDED_DRIVE_FOLDERS: {
  name: string;
  hint: string;
}[] = [
  { name: "01_Brief & Business Case", hint: "Initiative, validation, GO decision" },
  { name: "02_Scope & Requirements", hint: "Scoping proposal, boundaries, acceptance" },
  { name: "03_Planning", hint: "Timeline, milestones, capacity" },
  { name: "04_Design & Assets", hint: "Creative, references, source files" },
  { name: "05_Production", hint: "Working files, builds, delivery" },
  { name: "06_Meetings & Kickoff", hint: "Agenda, notes, recordings" },
  { name: "07_Reporting", hint: "Weekly updates, leadership decks" },
  { name: "99_Archive", hint: "Superseded versions only" },
];

export function createDefaultSetupData(
  ticketId: string,
  title: string,
  scopingData?: ScopingData | null,
): SetupData {
  const slug = `${ticketId}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  return {
    slack: { status: "pending", suggestedName: slug },
    drive: { status: "pending", suggestedName: suggestedDriveName(title, ticketId) },
    jira: { status: "pending", suggestedName: suggestedDriveName(title, ticketId) },
    jiraPlanning: { status: "pending" },
    documentation: {
      status: "pending",
      linkedDocs: scopingData?.attachments ? [...scopingData.attachments] : [],
    },
    team: {
      status: "pending",
      members: (scopingData?.team ?? []).map((t) => ({
        id: t.id,
        name: t.name,
        role: t.role,
        party: t.party,
        totalHours: t.totalHours,
        hoursPerDay: t.hoursPerDay,
        startDate: t.startDate,
        endDate: t.endDate,
      })),
    },
    scope: { status: "pending" },
    planning: { status: "pending" },
    budget: { status: "pending" },
    kickoffMeeting: { status: "pending" },
    kickoffPrep: { status: "pending" },
    inviteTeam: { status: "pending" },
  };
}

export function isSetupTaskDone(
  data: SetupData | null | undefined,
  taskId: SetupTaskId,
): boolean {
  const task = SETUP_TASKS.find((t) => t.id === taskId);
  if (!task || !data) return false;
  const taskData = data[task.dataKey] as { status?: SetupTaskStatus } | undefined;
  return taskData?.status === "completed" || taskData?.status === "skipped";
}

export function isSetupPhaseComplete(
  data: SetupData | null | undefined,
  phase: "A" | "B" | "C",
): boolean {
  return SETUP_TASKS.filter((task) => task.phase === phase).every((task) =>
    isSetupTaskDone(data, task.id),
  );
}

/** Kickoff unlocks after Environment Setup. */
export function isSetupPhaseUnlocked(
  data: SetupData | null | undefined,
  phase: "A" | "B" | "C",
): boolean {
  if (phase === "A") return true;
  return isSetupPhaseComplete(data, "A");
}

export function getSetupPhaseUnlockHint(phase: "A" | "B" | "C"): string | null {
  if (phase === "A") return null;
  return "Complete Environment Setup first";
}

export function getSetupProgress(data: SetupData | null | undefined): {
  completed: number;
  total: number;
  allDone: boolean;
} {
  if (!data) return { completed: 0, total: SETUP_TASKS.length, allDone: false };
  let completed = 0;
  for (const task of SETUP_TASKS) {
    const taskData = data[task.dataKey] as { status?: SetupTaskStatus } | undefined;
    if (taskData?.status === "completed" || taskData?.status === "skipped") {
      completed++;
    }
  }
  return {
    completed,
    total: SETUP_TASKS.length,
    allDone: completed === SETUP_TASKS.length,
  };
}

/* ─── Onboarding & Kickoff Data (Phase 6) ──────────────── */

export type OnboardingTaskId =
  | "briefing-initiative"
  | "briefing-validation"
  | "briefing-scoping"
  | "tool-access"
  | "meeting-cadence"
  | "absences"
  | "scope-signoff"
  | "backlog";

/** Briefing blocks Coen walks the team through before the action items. */
export type BriefingReviewData = {
  status: SetupTaskStatus;
  completedAt?: string;
};

export type ToolAccessData = {
  status: SetupTaskStatus;
  completedAt?: string;
};

export type MeetingCadenceItem = {
  id: string;
  label: string;
  /** Free-format cadence, e.g. "Mondays 10:00". */
  schedule?: string;
  booked?: boolean;
};

export type MeetingCadenceData = {
  status: SetupTaskStatus;
  meetings: MeetingCadenceItem[];
  completedAt?: string;
};

export type AbsenceEntry = {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  note?: string;
};

export type AbsenceLogData = {
  status: SetupTaskStatus;
  entries: AbsenceEntry[];
  /** Set when the team reported no planned absences at all. */
  noneReported?: boolean;
  completedAt?: string;
};

export type ScopeSignoffData = {
  status: SetupTaskStatus;
  /** Definition of Done as agreed with the team during kickoff. */
  definitionOfDone?: string;
  /** Questions raised during the Q&A that still need an answer. */
  openQuestions?: string;
  completedAt?: string;
};

export type BacklogData = {
  status: SetupTaskStatus;
  completedAt?: string;
};

/** Links captured during onboarding itself, not during Project Setup. */
export type OnboardingLinks = {
  slackChannelUrl?: string;
  notesUrl?: string;
};

export type OnboardingData = {
  briefingInitiative: BriefingReviewData;
  briefingValidation: BriefingReviewData;
  briefingScoping: BriefingReviewData;
  toolAccess: ToolAccessData;
  meetingCadence: MeetingCadenceData;
  absences: AbsenceLogData;
  scopeSignoff: ScopeSignoffData;
  backlog: BacklogData;
  links?: OnboardingLinks;
};

export type OnboardingPhase = "briefing" | "actions";

export const ONBOARDING_TASKS: {
  id: OnboardingTaskId;
  dataKey: keyof OnboardingData;
  label: string;
  phase: OnboardingPhase;
  logo?: string;
}[] = [
  {
    id: "briefing-initiative",
    dataKey: "briefingInitiative",
    label: "The Initiative",
    phase: "briefing",
  },
  {
    id: "briefing-validation",
    dataKey: "briefingValidation",
    label: "Validation & Business Case",
    phase: "briefing",
  },
  {
    id: "briefing-scoping",
    dataKey: "briefingScoping",
    label: "Scope, Timeline & Team",
    phase: "briefing",
  },
  {
    id: "tool-access",
    dataKey: "toolAccess",
    label: "Confirm Team Tool Access",
    phase: "actions",
  },
  {
    id: "meeting-cadence",
    dataKey: "meetingCadence",
    label: "Book Recurring Team Meetings",
    phase: "actions",
    logo: "/logos/google-calendar.png",
  },
  {
    id: "absences",
    dataKey: "absences",
    label: "Log Holidays & Absences",
    phase: "actions",
  },
  {
    id: "scope-signoff",
    dataKey: "scopeSignoff",
    label: "Confirm Scope & Definition of Done",
    phase: "actions",
  },
  {
    id: "backlog",
    dataKey: "backlog",
    label: "Prioritize First-Phase Backlog",
    phase: "actions",
    logo: "/logos/jira.png",
  },
];

export const ONBOARDING_BRIEFING_TASKS = ONBOARDING_TASKS.filter(
  (task) => task.phase === "briefing",
);

export const ONBOARDING_ACTION_TASKS = ONBOARDING_TASKS.filter(
  (task) => task.phase === "actions",
);

export function onboardingTaskIdToDataKey(
  taskId: OnboardingTaskId,
): keyof OnboardingData {
  const found = ONBOARDING_TASKS.find((t) => t.id === taskId);
  return found?.dataKey ?? (taskId as keyof OnboardingData);
}

export const DEFAULT_MEETING_CADENCE: { id: string; label: string }[] = [
  { id: "weekly-sync", label: "Weekly status sync with Head of Production" },
  { id: "demo", label: "Demo / delivery review" },
  { id: "escalation", label: "Escalation session" },
];

export function createDefaultOnboardingData(): OnboardingData {
  return {
    briefingInitiative: { status: "pending" },
    briefingValidation: { status: "pending" },
    briefingScoping: { status: "pending" },
    toolAccess: { status: "pending" },
    meetingCadence: {
      status: "pending",
      meetings: DEFAULT_MEETING_CADENCE.map((m) => ({ ...m, booked: false })),
    },
    absences: { status: "pending", entries: [] },
    scopeSignoff: { status: "pending" },
    backlog: { status: "pending" },
    links: {},
  };
}

export function isOnboardingTaskDone(
  data: OnboardingData | null | undefined,
  taskId: OnboardingTaskId,
): boolean {
  const task = ONBOARDING_TASKS.find((t) => t.id === taskId);
  if (!task || !data) return false;
  const taskData = data[task.dataKey] as { status?: SetupTaskStatus } | undefined;
  return taskData?.status === "completed" || taskData?.status === "skipped";
}

export function isOnboardingPhaseComplete(
  data: OnboardingData | null | undefined,
  phase: OnboardingPhase,
): boolean {
  return ONBOARDING_TASKS.filter((task) => task.phase === phase).every((task) =>
    isOnboardingTaskDone(data, task.id),
  );
}

/** Action items unlock once the whole kickoff briefing has been walked through. */
export function isOnboardingPhaseUnlocked(
  data: OnboardingData | null | undefined,
  phase: OnboardingPhase,
): boolean {
  if (phase === "briefing") return true;
  return isOnboardingPhaseComplete(data, "briefing");
}

export function getOnboardingPhaseUnlockHint(
  phase: OnboardingPhase,
): string | null {
  if (phase === "briefing") return null;
  return "Walk through the briefing first";
}

export function getOnboardingProgress(
  data: OnboardingData | null | undefined,
  phase?: OnboardingPhase,
): { completed: number; total: number; allDone: boolean } {
  const tasks = phase
    ? ONBOARDING_TASKS.filter((task) => task.phase === phase)
    : ONBOARDING_TASKS;
  if (!data) return { completed: 0, total: tasks.length, allDone: false };
  let completed = 0;
  for (const task of tasks) {
    if (isOnboardingTaskDone(data, task.id)) completed++;
  }
  return {
    completed,
    total: tasks.length,
    allDone: completed === tasks.length,
  };
}

/**
 * Server-side completion rules for the onboarding action items.
 * Returns an error message when the task cannot be marked complete yet.
 */
export function validateOnboardingTask(
  taskId: OnboardingTaskId,
  data: Record<string, unknown>,
): string | null {
  if (taskId === "meeting-cadence") {
    const meetings = Array.isArray(data.meetings)
      ? (data.meetings as MeetingCadenceItem[])
      : [];
    if (meetings.length === 0) {
      return "Add at least one recurring meeting before confirming.";
    }
    if (meetings.some((m) => !m.label?.trim())) {
      return "Every meeting needs a name.";
    }
    if (meetings.some((m) => !m.booked)) {
      return "Mark every meeting as booked before confirming.";
    }
  }

  if (taskId === "absences") {
    const entries = Array.isArray(data.entries)
      ? (data.entries as AbsenceEntry[])
      : [];
    if (data.noneReported === true) return null;
    if (entries.length === 0) {
      return "Log at least one absence, or confirm there are none planned.";
    }
    if (entries.some((e) => !e.name?.trim() || !e.startDate || !e.endDate)) {
      return "Every absence needs a name, a start date, and an end date.";
    }
  }

  return null;
}

/* ─── Business Value helpers ────────────────────────────── */

export function formatBusinessValueSummary(
  value: ValidationData["businessValue"],
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (!isBusinessValueData(value) || value.types.length === 0) return null;

  const parts = value.types.map((type) => {
    const label =
      BUSINESS_VALUE_TYPES.find((t) => t.id === type)?.label ?? type;
    const score = parseImpactScore(value.expectations[type]);
    return score !== null ? `${label}: ${score}/10` : label;
  });
  return parts.join(" · ");
}
