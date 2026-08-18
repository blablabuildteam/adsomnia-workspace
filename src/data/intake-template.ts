/**
 * Project Intake Template — Stages 1–3
 * Used to collect Initiative / Validation / Scoping information before Jira Project Setup.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "select"
  | "date"
  | "number"
  | "epic-table"
  | "role-hours";

export type IntakeField = {
  id: string;
  label: string;
  /** Clear description of what is expected in this field. */
  expectation: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
};

export type IntakeStageSection = {
  stageId: "idea" | "validation" | "scoping";
  number: number;
  name: string;
  owner: string;
  purpose: string;
  fields: IntakeField[];
};

export const LEAD_PARTY_OPTIONS = [
  "Bending The Rules (BTR)",
  "Harlem Next (HN)",
  "blablabuild (BBB)",
  "Adsomnia Internal (AS)",
] as const;

export const PRIORITY_OPTIONS = ["Now", "Next", "Later", "Rollout"] as const;

export const TSHIRT_OPTIONS = ["S", "M", "L", "XL"] as const;

export const SPONSOR_OPTIONS = ["Sietse", "Jasper", "Oleg", "Coen"] as const;

export const INTAKE_SECTIONS: IntakeStageSection[] = [
  {
    stageId: "idea",
    number: 1,
    name: "Initiative",
    owner: "Adsomnia Leadership Team",
    purpose:
      "Capture the minimal intake so the initiative can be registered. Keep answers short and concrete — this is not a business case yet.",
    fields: [
      {
        id: "title",
        label: "Title & Short Description",
        expectation:
          "State the core initiative in 1–2 plain sentences. Name what you want to build or change — not the full solution design.",
        type: "textarea",
        required: true,
        placeholder: "e.g. Automate retargeting pixel deployment across affiliate landing pages.",
      },
      {
        id: "problem",
        label: "Problem Statement",
        expectation:
          "Describe the concrete problem this solves — the pain, gap, or risk if we do nothing. Prefer one clear pain point over a list of wishes.",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. Manual pixel placement causes delays and inconsistent tracking across partner sites.",
      },
      {
        id: "opportunity",
        label: "Opportunity / Solution",
        expectation:
          "Describe the opportunity or proposed solution direction in plain terms — what should we build or change?",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. A self-serve pixel deployment tool that partners can configure without Affil Ops support.",
      },
      {
        id: "impact",
        label: "Expected Impact / Value (Hypothesis)",
        expectation:
          "Describe the intended outcome and how you would recognise success (revenue, efficiency, data quality, churn, etc.). A hypothesis is enough at this stage — numbers can be refined in Validation.",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. ~40% less setup time for pixels; fewer tracking gaps in retargeting data.",
      },
      {
        id: "audience",
        label: "Target Audience / Stakeholder",
        expectation:
          "Who is this for, and who is affected? Name the internal team, end user, or business unit that benefits or must adopt the change.",
        type: "text",
        required: true,
        placeholder: "e.g. Affiliate Ops & Media Buying",
      },
      {
        id: "submitter",
        label: "Submitter",
        expectation:
          "Who is proposing this initiative? Full name (and role if helpful).",
        type: "text",
        required: true,
        placeholder: "e.g. Sarah K. — Affiliate Ops",
      },
      {
        id: "sponsor",
        label: "Sponsor",
        expectation:
          "Which decision maker sponsors this into the pipeline? Required for the initiative to move to Validation.",
        type: "select",
        required: true,
        options: [...SPONSOR_OPTIONS],
      },
    ],
  },
  {
    stageId: "validation",
    number: 2,
    name: "Validation",
    owner: "Adsomnia Leadership Team / Head of Production / Team Lead",
    purpose:
      "Enrich the initiative into a Business Case. Leadership uses this to decide whether the initiative may be scoped.",
    fields: [
      {
        id: "businessValue",
        label: "Expected Business Value",
        expectation:
          "Turn the impact hypothesis into measurable value. Where possible include KPI, current baseline, and rough upside. If exact numbers are unknown, state assumptions clearly.",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. KPI: hours/week on pixel setup. Baseline: ~10h. Target: ~6h (−40%). Upside: faster campaign launch + cleaner retargeting data.",
      },
      {
        id: "solutionDirection",
        label: "High-Level Approach of the Solution",
        expectation:
          "Outline the preferred approach and main building blocks (systems, integrations, build vs buy). No detailed design — enough for Scoping to estimate Epics and hours.",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. Shared config service + templates in Workspace; push to partner sites via existing CMS API; HN owns build.",
      },
      {
        id: "tShirtSize",
        label: "Investment Estimate (T-Shirt Size)",
        expectation:
          "Choose S / M / L / XL for overall effort, then add a one-line rationale. This is a portfolio-level size, not a detailed hour estimate (that comes in Scoping).",
        type: "select",
        required: true,
        options: [...TSHIRT_OPTIONS],
      },
      {
        id: "priority",
        label: "Strategic Fit & Priority",
        expectation:
          "Explain why this belongs in the portfolio now, and propose placement: Now / Next / Later / Rollout.",
        type: "select",
        required: true,
        options: [...PRIORITY_OPTIONS],
      },
      {
        id: "leadProductionParty",
        label: "Lead Production Party",
        expectation:
          "Choose which party will most likely lead Production for this initiative, assisting the Head of Production from Validation onward.",
        type: "select",
        required: true,
        options: [
          { value: "adsomnia", label: "Adsomnia" },
          { value: "btr", label: "Bending The Rules" },
          { value: "hn", label: "Harlem Next" },
          { value: "bbb", label: "blablabuild" },
          { value: "as", label: "Adsomnia Internal" },
        ],
      },
      {
        id: "dependencies",
        label: "Risks, Dependencies & Blockers",
        expectation:
          "Optional — call out risks if we proceed, plus other initiatives, teams, vendors, or systems this depends on. Include anything that could block start or delivery.",
        type: "textarea",
        required: false,
        placeholder:
          "e.g. Depends on CMS API access from Partner Success; blocked until DE offer-page redirects are fixed (WS-1098).",
      },
      {
        id: "risks",
        label: "Other Notes",
        expectation:
          "Optional notes that do not fit elsewhere — leftover context, open questions, or anything leadership should see.",
        type: "textarea",
        required: false,
        placeholder:
          "Optional — leftover context, open questions, or anything leadership should see.",
      },
      {
        id: "validationSignOff",
        label: "Leadership Sign-off (Validation)",
        expectation:
          "Confirm who signed off that this Business Case may proceed to Scoping (Sietse / Jasper / Oleg — date).",
        type: "text",
        required: true,
        placeholder: "e.g. Sietse, Jasper, Oleg — 2026-08-01",
      },
    ],
  },
  {
    stageId: "scoping",
    number: 3,
    name: "Scoping",
    owner: "Head of Production (Coen) + chosen lead party",
    purpose:
      "Produce a Scoping Proposal that Project Setup can turn into Jira Epics, Milestones, and booked resources. Incomplete timeline or role hours will block setup.",
    fields: [
      {
        id: "leadParty",
        label: "Lead Party (Scoping)",
        expectation:
          "Choose exactly one lead party accountable for Scoping. Other parties may collaborate under that lead — collaboration does not replace the lead choice.",
        type: "select",
        required: true,
        options: [...LEAD_PARTY_OPTIONS],
      },
      {
        id: "collaborators",
        label: "Collaborating Parties (optional)",
        expectation:
          "List any additional parties that will support under the lead (if any). Leave blank if the lead delivers alone.",
        type: "text",
        placeholder: "e.g. blablabuild supports AI copy module under HN lead",
      },
      {
        id: "scopeIn",
        label: "Scope Boundaries — In Scope",
        expectation:
          "What is explicitly included in the first delivery slice? Be precise enough that Jira Epics can be created without re-negotiation.",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. Pixel templates for DE/NL affiliate pages; Workspace config UI; HN delivery backlog in Jira.",
      },
      {
        id: "scopeOut",
        label: "Scope Boundaries — Out of Scope / Deferred",
        expectation:
          "What is explicitly excluded or deferred to a later phase? Prevents scope creep during Production.",
        type: "textarea",
        required: true,
        placeholder: "e.g. Self-serve partner portal; FR/ES markets; automated QA bots (Later).",
      },
      {
        id: "epicTimeline",
        label: "Epic & Milestone Timeline",
        expectation:
          "Break delivery into Epics and Milestones with target start and end dates (or sprint windows). This is the planning spine for Jira Project Setup — without it, boards and capacity booking cannot be created reliably.",
        type: "epic-table",
        required: true,
      },
      {
        id: "roleHours",
        label: "Role-based Production Hour Estimates",
        expectation:
          "Add each person/role needed for the scoped delivery. For every row provide: a free-format role description, the person’s name, total hours, hours per day, and the period they are active. Used to book resources and for Go/No-Go (value vs cost).",
        type: "role-hours",
        required: true,
      },
      {
        id: "deliveryDependencies",
        label: "Delivery Dependencies & Assumptions",
        expectation:
          "Technical, partner, and calendar dependencies that affect the timeline or hour estimates. State critical assumptions (access, environments, decision latency).",
        type: "textarea",
        required: true,
        placeholder:
          "e.g. Assumes CMS API credentials by kickoff week; staging env available; weekly Coen sync confirmed.",
      },
      {
        id: "scopingNotes",
        label: "Additional Scoping Notes",
        expectation:
          "Anything else Project Setup or Go/No-Go should know (constraints, open questions, links to docs).",
        type: "textarea",
        placeholder: "e.g. Open question: who owns pixel QA sign-off — Affiliate Ops or HN?",
      },
    ],
  },
];

export type EpicRow = {
  id: string;
  epic: string;
  milestone: string;
  start: string;
  end: string;
  notes: string;
};

export type RoleHourRow = {
  id: string;
  /** Free-format role description (e.g. Senior Frontend Engineer, PM). */
  roleDescription: string;
  /** Person’s name. */
  name: string;
  totalHours: string;
  hoursPerDay: string;
  periodStart: string;
  periodEnd: string;
  party: string;
};

let rowIdCounter = 0;

function nextRowId(prefix: string): string {
  rowIdCounter += 1;
  return `${prefix}-${rowIdCounter}`;
}

export function emptyEpicRows(count = 4): EpicRow[] {
  return Array.from({ length: count }, () => ({
    id: nextRowId("epic"),
    epic: "",
    milestone: "",
    start: "",
    end: "",
    notes: "",
  }));
}

export function createRoleHourRow(): RoleHourRow {
  return {
    id: nextRowId("role"),
    roleDescription: "",
    name: "",
    totalHours: "",
    hoursPerDay: "",
    periodStart: "",
    periodEnd: "",
    party: "",
  };
}

export function emptyRoleHourRows(count = 3): RoleHourRow[] {
  return Array.from({ length: count }, () => createRoleHourRow());
}
