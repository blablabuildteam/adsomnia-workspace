import type { PartyId } from "@/data/workflow";

export type InitiativeStatus = "active" | "on-hold" | "no-go" | "closed";
export type InitiativePriority = "now" | "next" | "later" | "rollout";
export type TShirtSize = "S" | "M" | "L" | "XL";

export type Initiative = {
  id: string;
  title: string;
  summary: string;
  stageId: string;
  status: InitiativeStatus;
  priority: InitiativePriority;
  leadParty?: PartyId;
  tShirtSize?: TShirtSize;
  submitter: string;
  sponsor: string;
  targetAudience: string;
  expectedImpact: string;
  problemStatement: string;
  updatedAt: string;
  isFastTrack?: boolean;
};

export const MOCK_INITIATIVES: Initiative[] = [
  {
    id: "WS-1042",
    title: "Retargeting Pixel Automation",
    summary:
      "Automate pixel deployment across affiliate landing pages to reduce manual setup time.",
    stageId: "production",
    status: "active",
    priority: "now",
    leadParty: "hn",
    tShirtSize: "L",
    submitter: "Sarah K.",
    sponsor: "Sietse",
    targetAudience: "Affiliate Ops & Media Buying",
    expectedImpact: "40% reduction in pixel setup time; improved data quality for retargeting",
    problemStatement:
      "Manual pixel placement causes delays and inconsistent tracking across partner sites.",
    updatedAt: "2026-07-25",
  },
  {
    id: "WS-1087",
    title: "Leadership Reporting Dashboard",
    summary:
      "Unified Now / Next / Later view for weekly leadership updates from Head of Production.",
    stageId: "validation",
    status: "active",
    priority: "next",
    submitter: "Coen V.",
    sponsor: "Jasper",
    targetAudience: "Adsomnia Leadership Team",
    expectedImpact: "Single source of truth for initiative status; faster Go/No-Go decisions",
    problemStatement:
      "Status updates are scattered across email and Jira — no central governance view.",
    updatedAt: "2026-07-24",
  },
  {
    id: "WS-1091",
    title: "Partner Onboarding Checklist",
    summary:
      "Standardized intake template for new affiliate partners entering the network.",
    stageId: "scoping",
    status: "active",
    priority: "next",
    leadParty: "btr",
    tShirtSize: "M",
    submitter: "Lisa M.",
    sponsor: "Oleg",
    targetAudience: "Partner Success Team",
    expectedImpact: "Faster partner activation; fewer onboarding errors",
    problemStatement:
      "Each new partner onboarding follows ad-hoc steps with no shared checklist.",
    updatedAt: "2026-07-23",
  },
  {
    id: "WS-1098",
    title: "Fix broken redirect on /offers/de",
    summary: "Broken 301 redirect on German offers landing page — estimated < 4h fix.",
    stageId: "production",
    status: "active",
    priority: "now",
    leadParty: "as",
    submitter: "Tom R.",
    sponsor: "Coen",
    targetAudience: "End users (DE market)",
    expectedImpact: "Restore conversion path; stop revenue leakage",
    problemStatement: "German offers page returns 404 for 12% of traffic since July 20.",
    updatedAt: "2026-07-27",
    isFastTrack: true,
  },
  {
    id: "WS-1055",
    title: "AI Copy Variant Generator",
    summary:
      "Generate A/B test copy variants for landing pages using blablabuild AI pipeline.",
    stageId: "go-nogo",
    status: "active",
    priority: "later",
    leadParty: "bbb",
    tShirtSize: "XL",
    submitter: "Mark D.",
    sponsor: "Sietse",
    targetAudience: "Creative & Media Buying",
    expectedImpact: "3× faster variant production; higher CTR on tested pages",
    problemStatement:
      "Creative team bottleneck on copy variants slows down A/B testing velocity.",
    updatedAt: "2026-07-22",
  },
  {
    id: "WS-1033",
    title: "Legacy CRM Data Migration",
    summary: "Migrate historical partner data from legacy CRM to Workspace.",
    stageId: "setup",
    status: "active",
    priority: "rollout",
    leadParty: "hn",
    tShirtSize: "XL",
    submitter: "Anna P.",
    sponsor: "Jasper",
    targetAudience: "Data & Pricing Team",
    expectedImpact: "Unified partner history; better reporting accuracy",
    problemStatement: "Partner data split across two systems causes reporting gaps.",
    updatedAt: "2026-07-21",
  },
  {
    id: "WS-1012",
    title: "Mobile App Push Notifications",
    summary: "Push notification layer for partner mobile app engagement.",
    stageId: "go-nogo",
    status: "on-hold",
    priority: "later",
    submitter: "James W.",
    sponsor: "Oleg",
    targetAudience: "Partner mobile app users",
    expectedImpact: "15% increase in partner engagement",
    problemStatement: "Partners miss time-sensitive offer updates without push alerts.",
    updatedAt: "2026-07-15",
  },
];

export function getInitiative(id: string): Initiative | undefined {
  return MOCK_INITIATIVES.find((i) => i.id === id);
}

export function countByStage(stageId: string): number {
  return MOCK_INITIATIVES.filter((i) => i.stageId === stageId && i.status === "active").length;
}

export function countByPriority(priority: InitiativePriority): number {
  return MOCK_INITIATIVES.filter(
    (i) => i.priority === priority && i.status === "active",
  ).length;
}
