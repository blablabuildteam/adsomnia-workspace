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
  { id: "btr", label: "Bending The Rules", short: "BTR", color: "#FF3B1F" },
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
    name: "Idea",
    nameNl: "Idee",
    owner: "Adsomnia Leadership Team",
    parties: ["adsomnia"],
    inputs: [
      "Title & Short Description — what is the core of the idea in 1–2 sentences?",
      "Problem Statement or Opportunity — which concrete problem does this solve, or which opportunity is Adsomnia leaving on the table?",
      "Expected Impact / Value (Hypothesis) — what does it deliver? (e.g. more revenue, efficiency gains, better data/retargeting, churn reduction)",
      "Target Audience / Stakeholder — who are we building this for (internal teams, end user, specific unit)?",
      "Submitter & Sponsor — who proposes it, and who from decision makers (Sietse / Oleg) supports it?",
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
    nameNl: "Validatie",
    owner: "Adsomnia Leadership Team / Head of Production / Team Lead",
    parties: ["adsomnia"],
    inputs: [
      "Quantifiable Business Value (the ROI hypothesis)",
      "Global Solution Direction & High-Level Architecture",
      "Investment Estimate — T-Shirt Sizing S / M / L / XL (optional)",
      "Strategic Fit & Priority",
      "Dependencies & Blockers",
      "Risks & ‘Do Nothing’ Scenario",
    ],
    outputs: [
      `The initiative ticket in the ${WORKSPACE_SYSTEM} is enriched into a Lean Business Case (including T-shirt size and KPIs)`,
      "Formal Sign-off from the leadership team (Sietse, Jasper, Oleg) is logged in the system",
    ],
    fastTrackBypass: true,
  },
  {
    id: "scoping",
    number: 3,
    name: "Scoping",
    owner: "Head of Production (Coen)",
    parties: ["btr", "hn", "bbb", "as"],
    inputs: [
      "Email with Approved Lean Business Case — problem, expected value, global solution direction, and T-shirt sizing (S/M/L/XL)",
      "Formal Sign-off — confirmation from the leadership trio (Sietse, Jasper, Oleg) that the initiative may be scoped",
      "Lead party decision — choose which party owns Scoping (BTR, Harlem Next, blablabuild, or Adsomnia Internal)",
    ],
    outputs: [
      "Lead party is recorded: one party owns Scoping; additional parties may collaborate when needed",
      `The ticket in the ${WORKSPACE_SYSTEM} is updated by the lead party with the Scoping Proposal`,
      "Scoping Proposal includes Epic milestones, capacity/hours estimate, and identified dependencies",
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
    owner: "Adsomnia Leadership Team (Sietse & Coen)",
    parties: ["adsomnia"],
    inputs: [
      "Scoping Proposal — high-level timeline & Epic milestones, concrete hours/capacity estimate, dependencies & risks",
      "Lean Business Case — expected business value / ROI and strategic priority",
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
    owner: "Head of Production (Coen)",
    parties: ["adsomnia", "btr", "hn", "bbb", "as"],
    inputs: [
      "Lean Business Case",
      `Registered GO decision from the ${WORKSPACE_SYSTEM} — definitive approval from Sietse/Coen on budget, priority, and capacity`,
      "Approved Scoping Proposal — defined scope & Epic milestones, estimated hours/capacity",
      "Assigned main executor (Harlem Next — IT/Product, Data & Pricing; Bending The Rules; blablabuild; or Adsomnia Internal)",
    ],
    outputs: [
      `Dual tooling: project environment in the ${WORKSPACE_SYSTEM}, linked to Jira (required for HN/BTR; used for delivery backlog across parties)`,
      `Created Epics, Milestones, and target delivery dates in ${WORKSPACE_SYSTEM} and mirrored/linked in Jira`,
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
    owner: "Head of Production (Coen)",
    parties: ["adsomnia"],
    inputs: [
      `Fully configured Project Environment from the ${WORKSPACE_SYSTEM} — project structure, Epics, Milestones, delivery dates`,
      "Linked Jira project / boards for execution backlog (especially HN/BTR)",
      "Linked documentation (Lean Business Case, Scoping & Requirements)",
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
  action: `Skips all standard stages (Idea through Onboarding) and goes straight into Production & Reporting. A ticket is created in the ${WORKSPACE_SYSTEM} Fast-Track View`,
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

export function stageAccent(stage: WorkflowStage): string {
  if (stage.parties.length === 1) {
    return getParty(stage.parties[0]).color;
  }
  return "#FFFFFF";
}
