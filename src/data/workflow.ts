export type PartyId = "adsomnia" | "btr" | "hn" | "bbb" | "as";

export type Party = {
  id: PartyId;
  label: string;
  short: string;
  color: string;
  /** Optional chip fill (defaults to transparent). */
  background?: string;
};

export const PARTIES: Party[] = [
  { id: "adsomnia", label: "Adsomnia", short: "AS", color: "#FFFFFF" },
  { id: "btr", label: "Bending The Rules", short: "BTR", color: "#E8A07C" },
  { id: "hn", label: "Harlem Next", short: "HN", color: "#7E90A3" },
  { id: "bbb", label: "blablabuild", short: "BBB", color: "#CEFF00" },
  {
    id: "as",
    label: "Adsomnia Internal",
    short: "AS",
    color: "#FFFFFF",
    background: "#000000",
  },
];

export type StageBranch = {
  id: string;
  label: string;
  party: PartyId;
};

/** Scoping / Production: one lead party is chosen; others may still collaborate. */
export type LeadPartyChoice = {
  title: string;
  rule: string;
  collaborationNote: string;
};

export type WorkflowStage = {
  id: string;
  number: number;
  name: string;
  /** Short overview-board copy: why this phase exists in the pipeline. */
  purpose: string;
  /** Original Dutch stage name from the source PDF (for reference only). */
  nameNl?: string;
  owner: string;
  parties: PartyId[];
  inputs: string[];
  outputs: string[];
  branches?: StageBranch[];
  /** When set, branches are mutually exclusive lead options (choose one). */
  leadPartyChoice?: LeadPartyChoice;
  layers?: {
    title: string;
    items: string[];
  }[];
  /** Skipped when Fast-Track is active (all stages except Production). */
  fastTrackBypass?: boolean;
  /** Destination stage for Fast-Track requests. */
  fastTrackLanding?: boolean;
};

/** Phrase used for UI highlighting of the Workspace system of record. */
export const WORKSPACE_SYSTEM = "Adsomnia Workspace System";

/** Delivery / backlog tooling used alongside Workspace (Setup + Production). */
export const JIRA_SYSTEM = "Jira";

export const STAGES: WorkflowStage[] = [
  {
    id: "idea",
    number: 1,
    name: "Initiative",
    purpose:
      "Capture new requests with the minimum intake needed to register an initiative and route it into the pipeline.",
    nameNl: "Idee",
    owner: "Adsomnia Leadership Team",
    parties: ["adsomnia"],
    inputs: [
      "Title & Short Description — state the core initiative in 1–2 plain sentences (what are we building or changing?)",
      "Problem Statement — name the concrete problem this solves (pain, gap, or risk if we do nothing)",
      "Opportunity / Solution — describe the opportunity or proposed solution direction in plain terms",
      "Expected Impact / Value (Hypothesis) — describe the intended outcome and how you would recognise success (e.g. revenue, efficiency, data/retargeting quality, churn reduction)",
      "Target Audience / Stakeholder — who is this for (internal team, end user, business unit) and who is affected by the change?",
      "Submitter & Sponsor — who proposes it, and which decision maker (Sietse / Jasper / Oleg) sponsors it into the pipeline?",
    ],
    outputs: [
      `A registered initiative ticket in the ${WORKSPACE_SYSTEM}, capturing the minimal intake (problem statement, expected impact, and submitter)`,
    ],
    fastTrackBypass: true,
  },
  {
    id: "validation",
    number: 2,
    name: "Validation",
    purpose:
      "Turn the initiative into a business case with measurable value, effort estimate, and leadership sign-off.",
    nameNl: "Validatie",
    owner: "Adsomnia Leadership Team / Head of Production / Team Lead",
    parties: ["adsomnia"],
    inputs: [
      "Expected Business Value — turn the impact hypothesis into measurable value (KPI, baseline, and rough upside where possible)",
      "High-Level Approach of the Solution — outline the preferred approach and main building blocks (systems, integrations, build vs buy) without detailed design",
      "Investment Estimate — T-shirt size S / M / L / XL for overall effort, with a one-line rationale for the chosen size",
      "Adsomnia Priority — Adsomnia's own placement (Now / Near / Later / Backlog). Consensus with the lead production party is reached later in Scoping",
      "Risks, Dependencies & Blockers (optional) — risks if we proceed, plus other initiatives, teams, vendors, or systems this depends on",
      "Other Notes (optional) — leftover context, open questions, or anything leadership should see",
    ],
    outputs: [
      `The initiative ticket in the ${WORKSPACE_SYSTEM} is enriched into a Business Case (including T-shirt size and KPIs)`,
      "Formal Sign-off from the leadership team (Sietse, Jasper, Oleg) is logged in the system",
    ],
    fastTrackBypass: true,
  },
  {
    id: "scoping",
    number: 3,
    name: "Scoping",
    purpose:
      "Define delivery approach, timeline, hour estimates, and scope boundaries under a chosen lead party.",
    owner: "Head of Production (Coen)",
    parties: ["btr", "hn", "bbb", "as"],
    inputs: [
      "Approved Business Case — problem, expected value, solution direction, T-shirt size, Adsomnia priority, and leadership sign-off confirming the initiative may be scoped",
      "Consensus Priority — agreed Now / Near / Later / Backlog placement between Adsomnia and the lead production party (Adsomnia's Validation assignment is the starting point)",
      "Lead party decision — choose which party owns Scoping (BTR, Harlem Next, blablabuild, or Adsomnia Internal); collaborators may support but do not replace the lead",
      "Epic & Milestone Timeline — break the delivery into Epics and Milestones with target start/end dates (or sprint windows) so Project Setup can create the Jira structure and book capacity",
      "Role-based Production Hour Estimates — for each person/role: free-format role description, name, total hours, hours per day, and active period — so resources can be booked and Go/No-Go can weigh cost vs value",
      "Delivery Dependencies & Assumptions — technical, partner, and calendar dependencies that affect the timeline or hour estimates",
      "Scope Boundaries — what is explicitly in scope for the first delivery slice, and what is out of scope / deferred",
    ],
    outputs: [
      "Lead party is recorded: one party owns Scoping; additional parties may collaborate when needed",
      `The ticket in the ${WORKSPACE_SYSTEM} is updated by the lead party with a complete Scoping Proposal`,
      "Scoping Proposal includes: consensus priority, Epic & Milestone Timeline, role-based production hour estimates, scope boundaries, and identified dependencies — ready for Go/No-Go and Jira Project Setup",
    ],
    leadPartyChoice: {
      title: "Choose lead party",
      rule: "One party is always in the lead for Scoping.",
      collaborationNote:
        "Multiple parties may still work together — collaborators support the lead, they do not replace the lead choice.",
    },
    branches: [
      { id: "scope-btr", label: "Lead: Bending The Rules", party: "btr" },
      { id: "scope-hn", label: "Lead: Harlem Next", party: "hn" },
      { id: "scope-bbb", label: "Lead: blablabuild", party: "bbb" },
      { id: "scope-as", label: "Lead: Adsomnia Internal", party: "as" },
    ],
    fastTrackBypass: true,
  },
  {
    id: "go-nogo",
    number: 4,
    name: "Go / No-Go",
    purpose:
      "Decide whether to commit budget and capacity to proceed, hold, or close the initiative.",
    owner: "Adsomnia Leadership Team (Sietse & Coen)",
    parties: ["adsomnia"],
    inputs: [
      "Scoping Proposal — Epic & Milestone Timeline, role-based production hour estimates, scope boundaries, dependencies & risks",
      "Business Case — expected business value / ROI and consensus priority (with Adsomnia's original assignment as reference)",
    ],
    outputs: [
      `Formal status change of the ticket in the ${WORKSPACE_SYSTEM} to GO (proceed to Project Setup), NO-GO (closed), or ON-HOLD (back to backlog)`,
      "Final approval from Sietse/Coen on budget and capacity is registered in the system",
    ],
    fastTrackBypass: true,
  },
  {
    id: "setup",
    number: 5,
    name: "Project Setup",
    purpose:
      "Stand up the project in Workspace and Jira, book resources, and link all governance documentation.",
    owner: "Head of Production (Coen)",
    parties: ["adsomnia", "btr", "hn", "bbb", "as"],
    inputs: [
      "Business Case",
      `Registered GO decision from the ${WORKSPACE_SYSTEM} — definitive approval from Sietse/Coen on budget, priority, and capacity`,
      "Approved Scoping Proposal — Epic & Milestone Timeline, role-based hour estimates, scope boundaries, and assigned main executor",
      "Assigned main executor (Harlem Next — IT/Product, Data & Pricing; Bending The Rules; blablabuild; or Adsomnia Internal)",
    ],
    outputs: [
      `Dual tooling: project environment in the ${WORKSPACE_SYSTEM}, linked to Jira (required for HN/BTR; used for delivery backlog across parties)`,
      `Created Epics, Milestones, and target delivery dates in ${WORKSPACE_SYSTEM} and mirrored/linked in Jira from the Scoping Timeline`,
      "Booked resources / capacity using the role-based hour estimates from Scoping",
      "Assigned team members, roles, and permissions / access rights in both systems as needed",
      "Linked project documentation (Business Case, Requirements & Scoping Proposal)",
      "Defined reporting route — linked to central Now / Next / Later / Rollout dashboards",
      "Scheduled meeting cadence with team members",
    ],
    fastTrackBypass: true,
  },
  {
    id: "onboarding",
    number: 6,
    name: "Onboarding & Kickoff",
    purpose:
      "Align the team on scope, meeting cadence, and prioritized backlog before active production.",
    owner: "Head of Production (Coen)",
    parties: ["adsomnia"],
    inputs: [
      `Fully configured Project Environment from the ${WORKSPACE_SYSTEM} — project structure, Epics, Milestones, delivery dates`,
      "Linked Jira project / boards for execution backlog (especially HN/BTR)",
      "Linked documentation (Business Case, Scoping & Requirements)",
      "Team & Permissions — assigned members (internal and/or external partners HN, BTR, blablabuild) and access rights",
      "Proposed Meeting Cadence — e.g. weekly status sync with Coen, demos, escalation sessions",
    ],
    outputs: [
      `Project formally receives status ‘In Production’ / ‘Active’ in the ${WORKSPACE_SYSTEM}`,
      "Confirmed Meeting Cadence — recurring check-ins scheduled in calendars / the system",
      "Sign-off on Definition of Done & Scope — team confirms scope and DoD are clear",
      "Prioritized Backlog — first-phase tickets created and assigned in Jira, linked to Now / Next / Later",
    ],
    fastTrackBypass: true,
  },
  {
    id: "production",
    number: 7,
    name: "Production & Reporting",
    purpose:
      "Execute delivery in Jira under a lead party and report project governance to leadership.",
    nameNl: "Productie & Reporting",
    owner: "Head of Production + Project Managers",
    parties: ["adsomnia", "btr", "hn", "bbb", "as"],
    inputs: [
      `Active project status & governance in the ${WORKSPACE_SYSTEM}`,
      "Execution backlog and day-to-day delivery work tracked in Jira (Now / Next / Later)",
      "Lead party for Production — one of AS, BBB, BTR, or HN is always in the lead (with a Project Manager)",
      "Optional collaborating parties when delivery needs more than one partner",
      "Agreed meeting cadence and reporting route to Head of Production",
    ],
    outputs: [
      "Lead party runs delivery in Jira (daily stand-ups & weekly reports); collaborators contribute under that lead",
      `Project Governance and Workspace status managed in the ${WORKSPACE_SYSTEM} by Head of Production`,
      `Weekly Leadership Updates + Manage Workspace Status — Head of Production → Leadership via the ${WORKSPACE_SYSTEM}`,
    ],
    fastTrackLanding: true,
    leadPartyChoice: {
      title: "Choose lead party",
      rule: "One party is always in the lead for Production.",
      collaborationNote:
        "Multiple parties may work together on delivery — one lead remains accountable; others collaborate as needed.",
    },
    branches: [
      { id: "prod-as", label: "Lead: Adsomnia Internal", party: "as" },
      { id: "prod-bbb", label: "Lead: blablabuild", party: "bbb" },
      { id: "prod-btr", label: "Lead: Bending The Rules", party: "btr" },
      { id: "prod-hn", label: "Lead: Harlem Next", party: "hn" },
    ],
    layers: [
      {
        title: "Reporting",
        items: [
          `Weekly Leadership Updates + Manage Workspace Status in the ${WORKSPACE_SYSTEM}`,
        ],
      },
      {
        title: "Governance",
        items: ["Project Governance — Head of Production"],
      },
      {
        title: "Execution",
        items: [
          "One lead party lane (AS, BBB, BTR, or HN) — Project Manager accountable",
          "Optional collaborating parties support the lead when needed",
        ],
      },
    ],
  },
];

export const FAST_TRACK = {
  id: "fast-track",
  name: "Fast-Track",
  condition: "Request takes less than 4 hours",
  action: `Skips all standard stages (Initiative through Onboarding) and goes straight into Production & Reporting. A ticket is created in the ${WORKSPACE_SYSTEM} Fast-Track View`,
  landingStageId: "production" as const,
  bypassStageIds: [
    "idea",
    "validation",
    "scoping",
    "go-nogo",
    "setup",
    "onboarding",
  ] as const,
};

export function getParty(id: PartyId): Party {
  return PARTIES.find((p) => p.id === id)!;
}

/**
 * Lead-party accent for a stage (process visualizer / ownership cue).
 * Prefer {@link getStageColor} when indicating *which phase* something is in.
 */
export function stageAccent(stage: WorkflowStage): string {
  if (stage.parties.length === 1) {
    return getParty(stage.parties[0]).color;
  }
  return "#FFFFFF";
}

/** Canonical stage IDs — matches DB `initiative_stage` enum. */
export type StageId =
  | "idea"
  | "validation"
  | "scoping"
  | "go-nogo"
  | "setup"
  | "onboarding"
  | "production";

/**
 * Distinct phase colors for kanban columns, badges, steppers, and charts.
 * Cool-to-hot temperature ramp on black (intake gray -> production green);
 * intentionally avoids all party colors so "phase" never reads as "owner".
 */
export const STAGE_COLORS: Record<StageId, string> = {
  idea: "#9CA3AF",
  validation: "#22D3EE",
  scoping: "#3B82F6",
  "go-nogo": "#9333EA",
  setup: "#F472B6",
  onboarding: "#FB923C",
  production: "#22C55E",
};

/** Fast-Track is not a pipeline stage; lands on Production. */
export const FAST_TRACK_COLOR = "#FF3B1F";

export function getStageColor(stageId: string): string {
  if (stageId in STAGE_COLORS) {
    return STAGE_COLORS[stageId as StageId];
  }
  if (stageId === FAST_TRACK.id) {
    return FAST_TRACK_COLOR;
  }
  return "#FFFFFF";
}

/** In-progress fill: phase accent at ~60% strength. Complete: success green. */
export function getPhaseProgressFill(stageColor: string, complete: boolean): string {
  if (complete) return STAGE_COLORS.production;
  return `${stageColor}99`;
}

export function isStageId(value: string): value is StageId {
  return value in STAGE_COLORS;
}
